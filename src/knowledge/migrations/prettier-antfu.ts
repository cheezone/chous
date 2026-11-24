import { defineMigration } from "../types";

export default defineMigration({
  role: "formatter",
  from: "prettier",
  to: "@antfu/eslint-config",
  resolution: "agent",
  notes: { en: "Remove Prettier; formatting is covered by @antfu/eslint-config (eslint --fix).", zh: "删除 Prettier；格式化由 @antfu/eslint-config（eslint --fix）负责。" },
});
