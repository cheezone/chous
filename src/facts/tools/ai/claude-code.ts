import { tool } from "../../define";
import { custom, legacy, limit, measure } from "../../kinds";

const SKILLS = { url: "https://code.claude.com/docs/en/skills", check: "https://code.claude.com/docs/en/skills.md" };
const COMMANDS = ".claude/commands/";
const skill = (name: string) => `---\nname: ${name}\ndescription: Does a thing.\n---\n\nBody.\n`;

export default tool({
  id: "claude-code",
  name: "Claude Code",
  researched: "2026-11",
  facts: [
    limit({
      id: "claudeMdLines",
      files: ["CLAUDE.md"],
      measure: measure.lines,
      max: 200,
      params: (lines) => ({ lines, limit: 200 }),
      message: {
        en: "{{lines}} lines: Claude Code's docs target under {{limit}} per CLAUDE.md; longer files consume more context and reduce adherence",
        zh: "{{lines}} 行：Claude Code 文档建议每个 CLAUDE.md 不超过 {{limit}} 行；越长越占上下文，也越不容易被遵守",
      },
      sources: [{ url: "https://code.claude.com/docs/en/memory", check: "https://code.claude.com/docs/en/memory.md", quote: "target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence." }],
      examples: { smell: [{ "CLAUDE.md": "x\n".repeat(201) }], clean: [{ "CLAUDE.md": "x\n".repeat(200) }] },
    }),
    legacy({
      id: "claudeCommands",
      match: /(^|\/)\.claude\/commands\/.+\.md$/,
      // One finding per commands folder: it can hold hundreds.
      groupBy: (rel) => rel.slice(0, rel.indexOf(COMMANDS) + COMMANDS.length),
      message: {
        en: "{{count}} commands in the older format: Claude Code merged custom commands into skills (.claude/skills/<name>/SKILL.md)",
        zh: "{{count}} 个旧格式的命令：Claude Code 已把自定义命令并入 skills（.claude/skills/<名字>/SKILL.md）",
      },
      sources: [
        { ...SKILLS, quote: "Custom commands have been merged into skills." },
        { ...SKILLS, quote: "is the older format and still works" },
      ],
      examples: { smell: [{ ".claude/commands/deploy.md": "Deploy.", ".claude/commands/test.md": "Test." }], clean: [{ ".claude/skills/deploy/SKILL.md": skill("deploy") }] },
    }),
    custom({
      id: "commandShadowed",
      value: "convention",
      match: /(^|\/)\.claude\/commands\/[^/]+\.md$/,
      // A skill and a command with one name: the skill wins, and the command is never run.
      check: (f) => {
        const root = f.rel.slice(0, f.rel.indexOf(COMMANDS));
        const name = f.name.replace(/\.md$/, "");
        return f.all.has(`${root}.claude/skills/${name}/SKILL.md`) ? { name } : undefined;
      },
      message: {
        en: "a skill named {{name}} exists too, and the skill wins: Claude Code never runs this command",
        zh: "还有一个同名的 skill（{{name}}），skill 优先：Claude Code 永远不会运行这个命令",
      },
      sources: [{ ...SKILLS, quote: "| A skill and a file in .claude/commands/ | The skill |" }],
      examples: {
        smell: [{ ".claude/commands/deploy.md": "Deploy.", ".claude/skills/deploy/SKILL.md": skill("deploy") }],
        clean: [{ ".claude/commands/test.md": "Test.", ".claude/skills/deploy/SKILL.md": skill("deploy") }],
      },
    }),
  ],
});
