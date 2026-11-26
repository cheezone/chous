import { defineTool } from "../types";
import facts from "../../facts/tools/js/vite";

/** Detected by the files the facts declare: one list, no copy to drift. */
const FILES = [...facts.configs];

export default defineTool({
  id: "vite",
  name: "Vite",
  roles: {
    bundler: {
      signals: [
        { type: "files", patterns: FILES },
        { type: "deps", names: ["vite"] },
      ],
      files: FILES,
    },
  },
});
