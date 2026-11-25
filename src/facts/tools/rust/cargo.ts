import { tool } from "../../define";
import { deprecatedKeys, deprecatedTable, precedence } from "../../kinds";

const MANIFEST = "https://doc.rust-lang.org/cargo/reference/manifest.html";

export default tool({
  id: "cargo",
  name: "Cargo",
  researched: "2026-11",
  facts: [
    precedence({
      id: "cargoConfigs",
      tool: "Cargo",
      dir: ".cargo",
      order: ["config", "config.toml"],
      message: {
        en: "never read: with {{used}} beside it, Cargo uses the file without the extension",
        zh: "永远不会被读：旁边有 {{used}} 时，Cargo 用的是不带扩展名的那份",
      },
      sources: [{ url: "https://doc.rust-lang.org/cargo/reference/config.html", quote: "If both files exist, Cargo will use the file without the extension." }],
      examples: {
        smell: [{ ".cargo/config": "[build]", ".cargo/config.toml": "[build]" }],
        clean: [{ ".cargo/config.toml": "[build]" }, { "config": "", "config.toml": "" }],
      },
    }),
    deprecatedKeys({
      id: "cargoAuthors",
      file: "Cargo.toml",
      table: "package",
      keys: ["authors"],
      // A workspace repeats the field in every crate: one finding, counted.
      groupBy: () => "**/Cargo.toml",
      message: {
        en: "{{count}} Cargo.toml files set authors in [package], a field Cargo has deprecated",
        zh: "{{count}} 个 Cargo.toml 在 [package] 里写了 authors，这个字段 Cargo 已废弃",
      },
      sources: [{ url: `${MANIFEST}#the-authors-field`, quote: "This field is deprecated." }],
      examples: {
        smell: [{ "Cargo.toml": '[package]\nname = "x"\nauthors = ["a"]\n' }, { "Cargo.toml": '[package]\nname = "x"\nauthors.workspace = true\n' }],
        clean: [{ "Cargo.toml": '[package]\nname = "x"\n\n[dependencies]\nauthors = "1"\n' }],
      },
    }),
    deprecatedTable({
      id: "cargoReplace",
      file: "Cargo.toml",
      table: "replace",
      message: { en: "[replace] is deprecated in Cargo; use [patch]", zh: "[replace] 在 Cargo 里已废弃，改用 [patch]" },
      sources: [{ url: MANIFEST, quote: "Override dependencies (deprecated)." }],
      examples: {
        smell: [{ "Cargo.toml": '[package]\nname = "x"\n\n[replace]\n"foo:0.1.0" = { path = "foo" }\n' }],
        clean: [{ "Cargo.toml": '[package]\nname = "x"\n\n[patch.crates-io]\nfoo = { path = "foo" }\n' }],
      },
    }),
  ],
});
