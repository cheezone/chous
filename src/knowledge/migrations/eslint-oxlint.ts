import { defineMigration } from "../types";

export default defineMigration({
  role: "linter",
  from: "eslint",
  to: "oxlint",
  resolution: "agent",
  see: "https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint",
  notes: { en: "Rule IDs and options do not map 1:1 — review each custom rule.\nPlugins and shareable configs need Oxlint equivalents or must stay on ESLint.\nFlat config vs .oxlintrc.json: structure differs; do not blind-copy.\nKeep ESLint for typed linting / stylistic rules Oxlint does not cover yet.", zh: "规则 ID 和选项不是一一对应，逐条检查自定义规则。\n插件和共享配置要找到 Oxlint 的对应项，否则只能留在 ESLint。\nflat config 和 .oxlintrc.json 结构不同，不要照抄。\nOxlint 还不支持的类型感知规则和风格规则，先留在 ESLint。" },
});
