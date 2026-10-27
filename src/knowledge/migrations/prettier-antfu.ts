import { defineMigration } from "../types";

export default defineMigration({
  role: "formatter",
  from: "prettier",
  to: "@antfu/eslint-config",
  resolution: "agent",
  notes: "Remove Prettier; formatting is covered by @antfu/eslint-config (eslint --fix).",
});
