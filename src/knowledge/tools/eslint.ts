import { defineTool } from "../types";
import facts from "../../facts/tools/js/eslint";

/** Detected by the files the facts declare: one list, no copy to drift. */
const FILES = [...facts.legacy, ...facts.configs];

export default defineTool({
  id: "eslint",
  name: "ESLint",
  roles: {
    linter: {
      signals: [
        {
          type: "files",
          patterns: FILES,
        },
        { type: "deps", names: ["eslint"] },
      ],
      files: FILES,
    },
  },
});
