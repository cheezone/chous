import { defineTool } from "../types";

export default defineTool({
  id: "changelogen",
  name: "changelogen",
  roles: {
    release: {
      signals: [
        { type: "deps", names: ["changelogen"] },
        { type: "scripts", commands: ["changelogen"] },
      ],
    },
  },
});
