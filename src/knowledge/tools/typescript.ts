import { defineTool } from "../types";

export default defineTool({
  id: "typescript",
  name: "TypeScript",
  roles: {
    typechecker: {
      signals: [
        { type: "files", patterns: ["tsconfig.json", "tsconfig.*.json", "jsconfig.json"] },
        { type: "deps", names: ["typescript"] },
      ],
      files: ["tsconfig.json", "tsconfig.*.json", "jsconfig.json"],
    },
  },
});
