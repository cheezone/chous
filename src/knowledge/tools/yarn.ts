import { defineTool } from "../types";

export default defineTool({
  id: "yarn",
  name: "Yarn",
  roles: {
    "package-manager": {
      signals: [
        { type: "files", patterns: ["yarn.lock", ".yarnrc.yml", ".yarnrc"] },
        { type: "pkgField", field: "packageManager", equals: "yarn" },
      ],
      files: ["yarn.lock", ".yarnrc.yml", ".yarnrc"],
    },
  },
});
