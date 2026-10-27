import { defineTool } from "../types";

export default defineTool({
  id: "prettier",
  name: "Prettier",
  roles: {
    formatter: {
      signals: [
        { type: "files", patterns: [".prettierrc", ".prettierrc.*", "prettier.config.*"] },
        { type: "deps", names: ["prettier"] },
      ],
      files: [".prettierrc", ".prettierrc.*", "prettier.config.*"],
    },
  },
});
