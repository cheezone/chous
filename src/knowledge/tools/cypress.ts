import { defineTool } from "../types";

export default defineTool({
  id: "cypress",
  name: "Cypress",
  roles: {
    e2e: {
      signals: [
        { type: "files", patterns: ["cypress.config.*", "cypress"] },
        { type: "deps", names: ["cypress"] },
      ],
      files: ["cypress.config.*", "cypress"],
    },
  },
});
