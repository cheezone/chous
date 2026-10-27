import { defineTool } from "../types";

export default defineTool({
  id: "pnpm",
  name: "pnpm",
  roles: {
    "package-manager": {
      signals: [
        { type: "files", patterns: ["pnpm-lock.yaml", "pnpm-workspace.yaml"] },
        { type: "pkgField", field: "packageManager", equals: "pnpm" },
      ],
      files: ["pnpm-lock.yaml", "pnpm-workspace.yaml", ".npmrc"],
    },
  },
});
