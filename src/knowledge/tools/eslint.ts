import { defineTool } from "../types";
import facts from "../../facts/tools/js/eslint";

export default defineTool({
  id: "eslint",
  name: "ESLint",
  roles: {
    linter: {
      signals: [
        {
          type: "files",
          patterns: [...facts.legacy, ...facts.configs],
        },
        { type: "deps", names: ["eslint"] },
      ],
    },
  },
});
