import { defineTool } from "../types";
import facts from "../../facts/tools/js/oxlint";

export default defineTool({
  id: "oxlint",
  name: "Oxlint",
  roles: {
    linter: {
      signals: [
        { type: "files", patterns: [...facts.configs] },
        { type: "deps", names: ["oxlint"] },
      ],
    },
  },
});
