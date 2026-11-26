import { defineTool } from "../types";
import facts from "../../facts/tools/js/prettier";

export default defineTool({
  id: "prettier",
  name: "Prettier",
  roles: {
    formatter: {
      signals: [
        { type: "files", patterns: [...facts.configs] },
        { type: "deps", names: ["prettier"] },
      ],
    },
  },
});
