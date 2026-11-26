import { tool } from "../../define";
import { precedence } from "../../kinds";

export default tool({
  id: "pytest",
  name: "pytest",
  researched: "2026-11",
  configs: ["pytest.toml", ".pytest.toml", "pytest.ini"],
  facts: [
    precedence({
      id: "pytestConfigs",
      tool: "pytest",
      // pytest.toml, then pytest.ini, "take precedence over other files, even when empty"; the rest count with their section.
      order: ["pytest.toml", ".pytest.toml", "pytest.ini", ["pyproject.toml", /^\[tool\.pytest(\.ini_options)?\]/m], ["tox.ini", /^\[pytest\]/m], ["setup.cfg", /^\[tool:pytest\]/m]],
      sources: [
        {
          url: "https://docs.pytest.org/en/stable/reference/customize.html",
          check: "https://raw.githubusercontent.com/pytest-dev/pytest/main/doc/en/reference/customize.rst",
          quote: "pytest.ini files take precedence over other files (except pytest.toml and .pytest.toml), even when empty.",
        },
      ],
      examples: {
        smell: [{ "pytest.ini": "", "pyproject.toml": "[tool.pytest.ini_options]\naddopts = '-q'\n" }],
        clean: [{ "pytest.ini": "", "pyproject.toml": "[project]\nname = 'x'\n" }],
      },
    }),
  ],
});
