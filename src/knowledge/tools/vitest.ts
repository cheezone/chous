import { defineTool } from "../types";

export default defineTool({
  id: "vitest",
  name: "Vitest",
  roles: {
    "test-runner": {
      signals: [
        { type: "files", patterns: ["vitest.config.*", "vitest.workspace.*"] },
        { type: "deps", names: ["vitest"] },
        { type: "scripts", commands: ["vitest"] },
      ],
      files: ["vitest.config.*", "vitest.workspace.*"],
    },
  },
});
