import { tool } from "../../define";
import { deprecatedKeys } from "../../kinds";
import { projectOf } from "../../kit";

const MANIFEST = "https://doc.rust-lang.org/cargo/reference/manifest.html";

export default tool({
  id: "cargo",
  name: "Cargo",
  researched: "2026-11",
  facts: [
    deprecatedKeys({
      id: "cargoAuthors",
      file: "Cargo.toml",
      table: "package",
      keys: ["authors"],
      // A workspace repeats the field in every crate: one finding, counted.
      groupBy: (_rel, f) => `${projectOf(f)}**/Cargo.toml`,
      message: {
        en: "Cargo.toml files that set authors in [package]: {{count}}; Cargo has deprecated the field",
        zh: "{{count}} 个 Cargo.toml 在 [package] 里写了 authors，这个字段 Cargo 已废弃",
      },
      sources: [{ url: `${MANIFEST}#the-authors-field`, quote: "This field is deprecated." }],
      examples: {
        smell: [{ "Cargo.toml": '[package]\nname = "x"\nauthors = ["a"]\n' }, { "Cargo.toml": '[package]\nname = "x"\nauthors.workspace = true\n' }],
        clean: [{ "Cargo.toml": '[package]\nname = "x"\n\n[dependencies]\nauthors = "1"\n' }],
      },
    }),
  ],
});
