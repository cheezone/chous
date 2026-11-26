import { defineTool } from "../types";

export default defineTool({
  id: "playwright",
  name: "Playwright",
  roles: {
    e2e: {
      signals: [
        { type: "files", patterns: ["playwright.config.*"] },
        { type: "deps", names: ["@playwright/test", "playwright"] },
      ],
    },
  },
});
