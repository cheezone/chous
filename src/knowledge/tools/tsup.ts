import { defineTool } from "../types";

export default defineTool({
  id: "tsup",
  name: "tsup",
  roles: {
    bundler: {
      signals: [
        { type: "files", patterns: ["tsup.config.*"] },
        { type: "deps", names: ["tsup"] },
      ],
      files: ["tsup.config.*"],
    },
  },
});
