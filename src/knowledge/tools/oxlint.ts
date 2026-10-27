import { defineTool } from "../types";

export default defineTool({
  id: "oxlint",
  name: "Oxlint",
  roles: {
    linter: {
      signals: [
        { type: "files", patterns: [".oxlintrc.json", "oxlint.config.ts", "oxlint.config.js"] },
        { type: "deps", names: ["oxlint"] },
      ],
      files: [".oxlintrc.json", "oxlint.config.ts", "oxlint.config.js"],
    },
  },
});
