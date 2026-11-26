import { defineTool } from "../types";
import facts from "../../facts/tools/js/oxlint";

/** Detected by the files the facts declare: one list, no copy to drift. */
const FILES = [...facts.configs];

export default defineTool({
  id: "oxlint",
  name: "Oxlint",
  roles: {
    linter: {
      signals: [
        { type: "files", patterns: FILES },
        { type: "deps", names: ["oxlint"] },
      ],
      files: FILES,
    },
  },
});
