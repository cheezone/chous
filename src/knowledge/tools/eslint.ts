import { defineTool } from "../types";

export default defineTool({
  id: "eslint",
  name: "ESLint",
  roles: {
    linter: {
      signals: [
        {
          type: "files",
          patterns: [
            ".eslintrc",
            ".eslintrc.*",
            "eslint.config.js",
            "eslint.config.cjs",
            "eslint.config.mjs",
            "eslint.config.ts",
          ],
        },
        { type: "deps", names: ["eslint"] },
      ],
      files: [
        ".eslintrc",
        ".eslintrc.*",
        "eslint.config.js",
        "eslint.config.cjs",
        "eslint.config.mjs",
        "eslint.config.ts",
      ],
    },
  },
});
