import { defineKind } from "../types";

export default defineKind({
  id: "vite-app",
  name: "Vite app",
  signals: [
    { type: "files", patterns: ["vite.config.*"] },
    { type: "deps", names: ["vite"] },
  ],
});
