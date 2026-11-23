import { defineTool } from "../types";

/** antfu's shared ESLint flat config. */
export default defineTool({
  id: "@antfu/eslint-config",
  name: "@antfu/eslint-config",
  roles: {
    linter: {
      // eslint.config.* alone is plain ESLint; only the dependency identifies this config.
      signals: [{ type: "deps", names: ["@antfu/eslint-config"] }],
      files: [
        "eslint.config.js",
        "eslint.config.cjs",
        "eslint.config.mjs",
        "eslint.config.ts",
        ".eslintrc",
        ".eslintrc.*",
      ],
    },
    formatter: {
      // antfu eslint-config also formats — prettier is the sibling to forbid
      signals: [{ type: "deps", names: ["@antfu/eslint-config"] }],
      files: [],
    },
  },
});
