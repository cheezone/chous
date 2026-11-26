import { absent, tool } from "../../define";
import { limit, measure, unread } from "../../kinds";

const RULES = ".cursor/rules/";
const DOCS = "https://cursor.com/docs/context/rules";

export default tool({
  id: "cursor",
  name: "Cursor",
  researched: "2026-11",
  facts: [
    unread({
      id: "cursorRuleExtension",
      match: /(^|\/)\.cursor\/rules\/.+$/,
      groupBy: (rel) => rel.slice(0, rel.indexOf(RULES) + RULES.length),
      when: (f) => (f.name.endsWith(".mdc") ? undefined : {}),
      message: {
        en: "{{count}} files that are not .mdc: Cursor says project rules must use the .mdc extension, so it never reads them as rules",
        zh: "{{count}} 个不是 .mdc 的文件：Cursor 规定项目规则必须用 .mdc 扩展名，它们不会被当成规则读取",
      },
      sources: [{ url: DOCS, quote: "Project rules must use the .mdc extension." }],
      examples: { smell: [{ ".cursor/rules/role.md": "Be nice." }], clean: [{ ".cursor/rules/style.mdc": "Use tabs." }] },
    }),
    limit({
      id: "cursorRuleLines",
      match: /(^|\/)\.cursor\/rules\/.+\.mdc$/,
      measure: measure.lines,
      max: 500,
      params: (lines) => ({ lines, limit: 500 }),
      message: { en: "{{lines}} lines: Cursor says to keep rules under {{limit}}", zh: "{{lines}} 行：Cursor 建议规则不超过 {{limit}} 行" },
      sources: [{ url: DOCS, quote: "Keep rules under 500 lines" }],
      examples: { smell: [{ ".cursor/rules/long.mdc": "x\n".repeat(501) }], clean: [{ ".cursor/rules/style.mdc": "Use tabs." }] },
    }),
  ],
  absent: [
    absent({
      id: "cursorrules",
      scope: "base",
      names: ["**/.cursorrules"],
      value: "modernity",
      message: { en: "legacy: Cursor says .cursorrules will be deprecated, move it to .cursor/rules or AGENTS.md", zh: "旧格式：Cursor 说 .cursorrules 将被废弃，迁到 .cursor/rules 或 AGENTS.md" },
      sources: [{ url: "https://cursor.com/help/customization/rules#how-do-i-migrate-from-cursorrules", check: "https://cursor.com/help/customization/rules", quote: "cursorrules file in your project root is legacy and will be deprecated." }],
      examples: { smell: [{ ".cursorrules": "Be nice." }], clean: [{ ".cursor/rules/style.mdc": "Be nice." }] },
    }),
  ],
});
