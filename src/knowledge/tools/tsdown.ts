import { defineTool } from "../types";

export default defineTool({
  id: "tsdown",
  name: "tsdown",
  roles: {
    bundler: {
      signals: [
        { type: "files", patterns: ["tsdown.config.*"] },
        { type: "deps", names: ["tsdown"] },
      ],
    },
  },
});
