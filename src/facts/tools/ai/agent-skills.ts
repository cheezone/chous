import { tool } from "../../define";
import { custom, limit, measure } from "../../kinds";
import { field, frontmatter } from "../../kit";

const SPEC = { url: "https://agentskills.io/specification", check: "https://raw.githubusercontent.com/agentskills/agentskills/main/docs/specification.mdx" };
const SKILL = /(^|\/)SKILL\.md$/;
/** 1-64 of a-z, 0-9 and single hyphens, not at either end. */
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const skill = (name: string, extra = "") => `---\nname: ${name}\ndescription: Does a thing.\n${extra}---\n\nBody.\n`;

/** The open spec for SKILL.md, read by Claude Code, Codex, Copilot, Cursor and others. */
export default tool({
  id: "agent-skills",
  name: "Agent Skills",
  researched: "2026-11",
  facts: [
    limit({
      id: "skillLines",
      match: SKILL,
      measure: measure.lines,
      max: 500,
      params: (lines) => ({ lines, limit: 500 }),
      message: { en: "{{lines}} lines: Claude Code and the Agent Skills spec say to keep SKILL.md under {{limit}}", zh: "{{lines}} 行：Claude Code 和 Agent Skills 规范都要求 SKILL.md 不超过 {{limit}} 行" },
      sources: [
        { url: "https://code.claude.com/docs/en/skills", check: "https://code.claude.com/docs/en/skills.md", quote: "Keep SKILL.md under 500 lines." },
        { ...SPEC, quote: "Keep your main SKILL.md under 500 lines." },
      ],
      examples: { smell: [{ ".agents/skills/long/SKILL.md": `${skill("long")}${"line\n".repeat(500)}` }], clean: [{ ".agents/skills/short/SKILL.md": skill("short") }] },
    }),
    custom({
      id: "skillName",
      value: "convention",
      match: SKILL,
      check: (f) => {
        const name = field(frontmatter(f.text()).front, "name");
        if (name === undefined) return undefined;
        const folder = f.dir.split("/").at(-1) ?? "";
        return name.length > 64 || !NAME.test(name) || name !== folder ? { name, folder } : undefined;
      },
      message: {
        en: "name \"{{name}}\" breaks the Agent Skills spec: lowercase letters, digits and hyphens, at most 64, the same as its folder ({{folder}})",
        zh: "name「{{name}}」不符合 Agent Skills 规范：只能用小写字母、数字和连字符，最多 64 个字符，并且要和所在目录（{{folder}}）同名",
      },
      sources: [
        { ...SPEC, quote: "Max 64 characters. Lowercase letters, numbers, and hyphens only." },
        { ...SPEC, quote: "Must match the parent directory name" },
      ],
      examples: {
        smell: [{ ".claude/skills/agentdb/SKILL.md": skill("AgentDB Advanced") }, { ".agents/skills/review/SKILL.md": skill("reviewer") }],
        clean: [{ ".claude/skills/pdf-forms/SKILL.md": skill("pdf-forms") }],
      },
    }),
    limit({
      id: "skillDescription",
      match: SKILL,
      measure: measure.field("description"),
      max: 1024,
      params: (length) => ({ length, limit: 1024 }),
      message: { en: "description of {{length}} characters: the Agent Skills spec allows {{limit}}", zh: "description 有 {{length}} 个字符：Agent Skills 规范最多 {{limit}}" },
      sources: [{ ...SPEC, quote: "Max 1024 characters. Non-empty." }],
      examples: {
        smell: [{ "skills/wordy/SKILL.md": `---\nname: wordy\ndescription: ${"w".repeat(1025)}\n---\n` }],
        clean: [{ "skills/brief/SKILL.md": `---\nname: brief\ndescription: ${"w".repeat(1024)}\n---\n` }],
      },
    }),
    limit({
      id: "skillCompatibility",
      match: SKILL,
      measure: measure.field("compatibility"),
      max: 500,
      params: (length) => ({ length, limit: 500 }),
      message: { en: "compatibility of {{length}} characters: the Agent Skills spec allows {{limit}}", zh: "compatibility 有 {{length}} 个字符：Agent Skills 规范最多 {{limit}}" },
      sources: [{ ...SPEC, quote: "Max 500 characters. Indicates environment requirements" }],
      examples: {
        smell: [{ "skills/needy/SKILL.md": skill("needy", `compatibility: ${"c".repeat(501)}\n`) }],
        clean: [{ "skills/easy/SKILL.md": skill("easy", "compatibility: Requires git\n") }],
      },
    }),
  ],
});
