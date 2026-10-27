import { defineTool } from "../types";

export default defineTool({
  id: "npm",
  name: "npm",
  roles: {
    "package-manager": {
      signals: [
        { type: "files", patterns: ["package-lock.json", "npm-shrinkwrap.json"] },
        { type: "pkgField", field: "packageManager", equals: "npm" },
      ],
      files: ["package-lock.json", "npm-shrinkwrap.json"],
    },
  },
});
