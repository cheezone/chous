import { defineTool } from "../types";

export default defineTool({
  id: "nuxt",
  name: "Nuxt",
  roles: {
    framework: {
      signals: [
        { type: "files", patterns: ["nuxt.config.*"] },
        { type: "deps", names: ["nuxt"] },
      ],
      files: ["nuxt.config.*"],
    },
  },
});
