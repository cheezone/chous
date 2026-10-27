import { defineTool } from "../types";

export default defineTool({
  id: "turbo",
  name: "Turborepo",
  roles: {
    monorepo: {
      signals: [
        { type: "files", patterns: ["turbo.json"] },
        { type: "deps", names: ["turbo"] },
      ],
      files: ["turbo.json"],
    },
  },
});
