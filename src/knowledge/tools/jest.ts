import { defineTool } from "../types";

export default defineTool({
  id: "jest",
  name: "Jest",
  roles: {
    "test-runner": {
      signals: [
        { type: "files", patterns: ["jest.config.*"] },
        { type: "deps", names: ["jest"] },
        { type: "scripts", commands: ["jest"] },
      ],
      files: ["jest.config.*"],
    },
  },
});
