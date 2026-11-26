import { tool } from "../../define";
import { precedence } from "../../kinds";

export default tool({
  id: "ruff",
  name: "Ruff",
  researched: "2026-11",
  configs: [".ruff.toml", "ruff.toml"],
  facts: [
    precedence({
      id: "ruffConfigs",
      tool: "Ruff",
      order: [".ruff.toml", "ruff.toml", ["pyproject.toml", /^\[tool\.ruff/m]],
      sources: [
        {
          url: "https://docs.astral.sh/ruff/configuration/",
          check: "https://raw.githubusercontent.com/astral-sh/ruff/main/docs/configuration.md",
          quote: "If Ruff detects multiple configuration files in the same directory, the .ruff.toml file will take precedence over the ruff.toml file",
        },
      ],
      examples: {
        smell: [{ "ruff.toml": "line-length = 88", "pyproject.toml": "[tool.ruff]\nline-length = 100\n" }],
        clean: [{ "ruff.toml": "line-length = 88", "pyproject.toml": "[project]\nname = 'x'\n" }],
      },
    }),
  ],
});
