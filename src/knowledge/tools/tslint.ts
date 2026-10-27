import { defineTool } from "../types";

export default defineTool({
  id: "tslint",
  name: "TSLint",
  status: "deprecated",
  roles: {
    linter: {
      signals: [
        { type: "files", patterns: ["tslint.json"] },
        { type: "deps", names: ["tslint"] },
      ],
      files: ["tslint.json"],
    },
  },
});
