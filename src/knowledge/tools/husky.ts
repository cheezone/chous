import { defineTool } from "../types";

export default defineTool({
  id: "husky",
  name: "husky",
  roles: {
    "git-hooks": {
      signals: [
        { type: "files", patterns: [".husky"] },
        { type: "deps", names: ["husky"] },
      ],
      files: [".husky"],
    },
  },
});
