import { defineTool } from "../types";

export default defineTool({
  id: "oxfmt",
  name: "Oxfmt",
  roles: {
    formatter: {
      signals: [
        { type: "files", patterns: [".oxfmtrc.json", "oxfmt.config.ts"] },
        { type: "deps", names: ["oxfmt"] },
      ],
    },
  },
});
