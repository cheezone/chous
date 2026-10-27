import { defineTool } from "../types";

export default defineTool({
  id: "nx",
  name: "Nx",
  roles: {
    monorepo: {
      signals: [
        { type: "files", patterns: ["nx.json"] },
        { type: "deps", names: ["nx", "@nx/devkit"] },
      ],
      files: ["nx.json", "project.json"],
    },
  },
});
