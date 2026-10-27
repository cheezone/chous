import { defineTool } from "../types";

export default defineTool({
  id: "vite",
  name: "Vite",
  roles: {
    bundler: {
      signals: [
        { type: "files", patterns: ["vite.config.*"] },
        { type: "deps", names: ["vite"] },
      ],
      files: ["vite.config.*"],
    },
  },
});
