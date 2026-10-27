import { defineTool } from "../types";

export default defineTool({
  id: "simple-git-hooks",
  name: "simple-git-hooks",
  roles: {
    "git-hooks": {
      signals: [
        { type: "files", patterns: [".githooks"] },
        { type: "deps", names: ["simple-git-hooks"] },
        { type: "pkgField", field: "simple-git-hooks", exists: true },
      ],
      files: [".githooks"],
    },
  },
});
