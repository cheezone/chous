import { tool } from "../../define";
import { precedence } from "../../kinds";

export default tool({
  id: "mypy",
  name: "mypy",
  researched: "2026-11",
  configs: ["mypy.ini", ".mypy.ini"],
  facts: [
    precedence({
      id: "mypyConfigs",
      tool: "mypy",
      order: ["mypy.ini", ".mypy.ini", ["pyproject.toml", /^\[tool\.mypy\]/m], ["setup.cfg", /^\[mypy\]/m]],
      message: {
        en: "never read: mypy takes one config per directory, here {{used}}, and does not merge",
        zh: "永远不会被读：mypy 每个目录只用一份配置，这里是 {{used}}，而且不合并",
      },
      sources: [
        { url: "https://mypy.readthedocs.io/en/stable/config_file.html", check: "https://raw.githubusercontent.com/python/mypy/master/docs/source/config_file.rst", quote: "It is important to understand that there is no merging of configuration" },
      ],
      examples: {
        smell: [{ "mypy.ini": "[mypy]", "pyproject.toml": "[tool.mypy]\nstrict = true\n" }],
        clean: [{ "pyproject.toml": "[tool.mypy]\nstrict = true\n" }],
      },
    }),
  ],
});
