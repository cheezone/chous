import { defineTool } from "../types";
import facts from "../../facts/tools/js/vite";

export default defineTool({
  id: "vite",
  name: "Vite",
  roles: {
    bundler: {
      signals: [
        { type: "files", patterns: [...facts.configs] },
        { type: "deps", names: ["vite"] },
      ],
    },
  },
});
