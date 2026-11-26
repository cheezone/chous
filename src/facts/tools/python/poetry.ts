import { tool } from "../../define";
import { deprecatedKeys } from "../../kinds";

const DOCS = { url: "https://python-poetry.org/docs/pyproject/", check: "https://raw.githubusercontent.com/python-poetry/poetry/main/docs/pyproject.md" };

export default tool({
  id: "poetry",
  name: "Poetry",
  researched: "2026-11",
  facts: [
    deprecatedKeys({
      id: "poetryFields",
      file: "pyproject.toml",
      table: "tool.poetry",
      // `scripts` is left out: only console and gui scripts moved to project.scripts; file scripts stay.
      keys: ["name", "description", "license", "authors", "maintainers", "homepage", "repository", "documentation", "keywords", "extras", "plugins", "urls"],
      tables: true,
      message: {
        en: "fields Poetry deprecated in [tool.poetry]: {{fields}}; move them to the standard [project] table",
        zh: "Poetry 已废弃 [tool.poetry] 里的这些字段：{{fields}}；移到标准的 [project] 表",
      },
      sources: [
        { ...DOCS, quote: "Deprecated: Use project.name instead." },
        { ...DOCS, quote: "Deprecated: Use project.urls instead." },
      ],
      examples: {
        smell: [{ "pyproject.toml": '[tool.poetry]\nname = "x"\nversion = "1.0.0"\n\n[tool.poetry.urls]\nDocs = "https://x"\n' }],
        clean: [{ "pyproject.toml": '[project]\nname = "x"\n\n[tool.poetry]\nversion = "1.0.0"\n\n[tool.poetry.scripts]\nrun = "x:main"\n' }],
      },
    }),
  ],
});
