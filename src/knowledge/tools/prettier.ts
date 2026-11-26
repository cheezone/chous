import { defineTool } from "../types";
import facts from "../../facts/tools/js/prettier";

/** Detected by the files the facts declare: one list, no copy to drift. */
const FILES = [...facts.configs];

export default defineTool({
  id: "prettier",
  name: "Prettier",
  roles: {
    formatter: {
      signals: [
        { type: "files", patterns: FILES },
        { type: "deps", names: ["prettier"] },
      ],
      files: FILES,
    },
  },
});
