import { absent, tool } from "../../define";

/**
 * Linters their authors ended: TSLint (deprecated for ESLint) and JSCS
 * (merged into ESLint). JSHint is not here: it was never declared dead.
 */
export default tool({
  id: "retired-linters",
  name: "TSLint, JSCS",
  researched: "2026-11",
  facts: [],
  absent: [
    absent({
      id: "deadToolConfig",
      scope: "js",
      names: [".jscsrc", "tslint.json"],
      value: "modernity",
      message: { en: "leftover config of a dead tool", zh: "已死工具的残留配置" },
      sources: [
        { url: "https://github.com/palantir/tslint/issues/4534", check: "https://registry.npmjs.org/tslint", quote: "TSLint has been deprecated in favor of ESLint" },
        { url: "https://www.npmjs.com/package/jscs", check: "https://registry.npmjs.org/jscs", quote: "JSCS has merged with ESLint!" },
      ],
      examples: {
        smell: [{ "package.json": JSON.stringify({ name: "a", private: true }), "tslint.json": "{}" }, { "package.json": JSON.stringify({ name: "a", private: true }), ".jscsrc": "{}" }],
        clean: [{ "package.json": JSON.stringify({ name: "a", private: true }), "eslint.config.js": "export default []" }],
      },
    }),
  ],
});
