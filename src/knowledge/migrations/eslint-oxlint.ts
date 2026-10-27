import { defineMigration } from "../types";

export default defineMigration({
  role: "linter",
  from: "eslint",
  to: "oxlint",
  resolution: "agent",
  see: "https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint",
  notes: [
    "Rule IDs and options do not map 1:1 — review each custom rule.",
    "Plugins and shareable configs need Oxlint equivalents or must stay on ESLint.",
    "Flat config vs .oxlintrc.json: structure differs; do not blind-copy.",
    "Keep ESLint for typed linting / stylistic rules Oxlint does not cover yet.",
  ].join("\n"),
});
