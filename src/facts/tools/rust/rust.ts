import { tool } from "../../define";
import { naming, STYLE } from "../../kinds";
import { type ContractFile, nearest } from "../../kit";

/** Where Cargo finds targets of their own: crates, whose names the guidelines call "unclear". */
const TARGETS = /^(src\/bin|tests|examples|benches)\/|^build\.rs$/;

/** Files a crate names with `#[path = "…"]`: the module keeps its own name, whatever the file is called. */
const pathed = new WeakMap<Set<string>, Map<string, Set<string>>>();
function namedByPath(f: ContractFile, crate: string): Set<string> {
  const byCrate = pathed.get(f.all) ?? new Map<string, Set<string>>();
  pathed.set(f.all, byCrate);
  let files = byCrate.get(crate);
  if (!files) {
    files = new Set();
    for (const rel of f.all) {
      if (!rel.startsWith(crate) || !rel.endsWith(".rs")) continue;
      for (const m of f.read(rel).matchAll(/#\[path\s*=\s*"([^"]+)"\]/g)) files.add(m[1]!.split("/").at(-1)!);
    }
    byCrate.set(crate, files);
  }
  return files;
}

/** The module a file is, by its name: a crate's own file, named as an identifier, not renamed by `#[path]`. */
function moduleName(f: ContractFile): string | undefined {
  const crate = nearest(f, "Cargo.toml");
  if (crate === undefined || TARGETS.test(f.rel.slice(crate.length))) return undefined;
  const name = f.name.slice(0, -".rs".length);
  // `lib.miri.rs`, `http-client.rs`: not an identifier, so not a module by its own name.
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return undefined;
  return STYLE.snake.test(name) || namedByPath(f, crate).has(f.name) ? undefined : name;
}

export default tool({
  id: "rust",
  name: "Rust",
  researched: "2026-11",
  facts: [
    naming({
      id: "rustModuleName",
      match: /\.rs$/,
      name: moduleName,
      style: STYLE.snake,
      message: {
        en: "Rust module files not in snake_case ({{count}}, e.g. {{name}}): Rust's API guidelines name modules in snake_case",
        zh: "不是 snake_case 的 Rust 模块文件（{{count}} 个，如 {{name}}）：Rust API 指南规定模块用 snake_case",
      },
      sources: [{ url: "https://rust-lang.github.io/api-guidelines/naming.html", check: "https://raw.githubusercontent.com/rust-lang/api-guidelines/master/src/naming.md", quote: "| Modules | `snake_case` |" }],
      examples: {
        smell: [{ "Cargo.toml": "[package]", "src/userStore.rs": "//! Builds ASTs intended for generated code.\n" }, { "crates/core/Cargo.toml": "[package]", "crates/core/HttpClient.rs": "" }],
        clean: [
          { "Cargo.toml": "[package]", "src/user_store.rs": "", "src/bin/MyTool.rs": "", "tests/MyTest.rs": "", "build.rs": "", "src/lib.miri.rs": "" },
          { "Cargo.toml": "[package]", "lib.rs": '#[path = "MimallocArena.rs"]\nmod mimalloc_arena;\n', "MimallocArena.rs": "" },
          { "Cargo.toml": "[workspace]", "tests/ui/BadName.rs": "", "fuzz/Cargo.toml": "[package]", "fuzz/examples/CheckMany.rs": "" },
        ],
      },
    }),
  ],
});
