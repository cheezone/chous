import { defineKind } from "../types";

export default defineKind({
  id: "nuxt",
  name: "Nuxt app",
  signals: [
    { type: "files", patterns: ["nuxt.config.*"] },
    { type: "deps", names: ["nuxt"] },
  ],
});
