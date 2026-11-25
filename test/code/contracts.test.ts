import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { lintWorkspace } from "../../src/rules/lint";
import { field, frontmatter } from "../../src/taste/contracts";

/** `<contract id> <path>` for every contract finding. */
async function contracts(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "chous-contracts-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content, "utf8");
  }
  const result = await lintWorkspace({ root });
  return result.issues
    .filter((i) => i.ruleKind === "contracts")
    .map((i) => `${i.message.key.replace("issue.contract.", "")} ${i.displayPath}`)
    .sort();
}

const skill = (name: string, description = "Does a thing.") => `---\nname: ${name}\ndescription: ${description}\n---\n\nBody.\n`;

describe("frontmatter", () => {
  it("reads plain, quoted and folded scalars", () => {
    const { front, body } = frontmatter("---\nname: 'pdf'\ndescription: >\n  Reads PDFs\n  and forms.\n---\nHello");
    expect([field(front, "name"), field(front, "description"), body]).toEqual(["pdf", "Reads PDFs and forms.", "Hello"]);
  });
});

describe("agent instruction contracts", () => {
  it("holds AGENTS.md to Codex's 32 KiB and CLAUDE.md to Claude Code's 200 lines", async () => {
    expect(await contracts({ "AGENTS.md": "x".repeat(33 * 1024), "CLAUDE.md": "x\n".repeat(201), "docs/CLAUDE.md": "x\n".repeat(200) })).toEqual([
      "agentsMdBytes AGENTS.md",
      "claudeMdLines CLAUDE.md",
    ]);
  });

  it("checks skills against the Agent Skills spec", async () => {
    expect(
      await contracts({
        ".claude/skills/pdf-forms/SKILL.md": skill("pdf-forms"),
        ".claude/skills/agentdb/SKILL.md": skill("AgentDB Advanced"),
        ".agents/skills/review/SKILL.md": skill("reviewer"),
        ".agents/skills/long/SKILL.md": `${skill("long")}${"line\n".repeat(500)}`,
        "skills/wordy/SKILL.md": skill("wordy", "w".repeat(1025)),
      }),
    ).toEqual(["skillDescription skills/wordy/SKILL.md", "skillLines .agents/skills/long/SKILL.md", "skillName .agents/skills/review/SKILL.md", "skillName .claude/skills/agentdb/SKILL.md"]);
  });

  it("reports the older command format once per directory, and commands a skill shadows", async () => {
    expect(
      await contracts({
        ".claude/commands/deploy.md": "Deploy.",
        ".claude/commands/test.md": "Test.",
        ".claude/skills/deploy/SKILL.md": skill("deploy"),
      }),
    ).toEqual(["claudeCommands .claude/commands/", "commandShadowed .claude/commands/deploy.md"]);
  });

  it("knows Cursor, Copilot, VS Code, Devin and Cline file rules", async () => {
    expect(
      await contracts({
        ".cursor/rules/style.mdc": "Use tabs.",
        ".cursor/rules/role.md": "Be nice.",
        ".github/agents/review.agent.md": "---\nname: review\ninfer: true\n---\nReview.",
        ".github/chatmodes/plan.chatmode.md": "Plan.",
        ".github/instructions/react.instructions.md": "React.",
        ".github/instructions/vue.md": "Vue.",
        ".windsurfrules": "Old.",
        ".windsurf/rules/a.md": "A.",
        ".windsurf/rules/b.md": "B.",
        ".devin/rules/c.md": "C.",
        ".clinerules/one.md": "One.",
      }),
    ).toEqual([
      "chatmode .github/chatmodes/plan.chatmode.md",
      "clinerules .clinerules/",
      "copilotAgentInfer .github/agents/review.agent.md",
      "copilotInstructionsName .github/instructions/vue.md",
      "cursorRuleExtension .cursor/rules/",
      "windsurfLegacy .windsurf/rules/",
      "windsurfLegacy .windsurfrules",
    ]);
  });
});

describe("GitHub contracts", () => {
  it("knows where GitHub reads CODEOWNERS, Dependabot and workflows from", async () => {
    expect(
      await contracts({
        ".github/CODEOWNERS": "* @a",
        "docs/CODEOWNERS": "* @b",
        "dependabot.yml": "version: 2",
        ".github/workflow/ci.yml": "on: push\njobs:\n  test: {}\n",
        ".github/workflows/ok.yml": "on: push\njobs:\n  test: {}\n",
        ".github/labeler.yml": "area: ['src/**']\n",
      }),
    ).toEqual(["codeownersShadowed docs/CODEOWNERS", "dependabotPlace dependabot.yml", "workflowPlace .github/workflow/ci.yml"]);
  });
});

describe("tool format contracts", () => {
  it("knows Compose, ESLint, Tailwind and rustup formats by version and content", async () => {
    expect(
      await contracts({
        "docker-compose.yml": "version: '3.8'\nservices: {}\n",
        "compose.yaml": "services: {}\n",
        "package.json": JSON.stringify({ devDependencies: { eslint: "^9.0.0", tailwindcss: "^4.1.0" } }),
        ".eslintrc.json": "{}",
        "tailwind.config.js": "export default {}",
        "old/package.json": JSON.stringify({ devDependencies: { eslint: "^8.57.0", tailwindcss: "^3.4.0" } }),
        "old/.eslintrc.json": "{}",
        "old/tailwind.config.js": "module.exports = {}",
        "rust-toolchain": "stable\n",
        "crate/rust-toolchain": "[toolchain]\nchannel = \"stable\"\n",
      }),
    ).toEqual([
      "composeName docker-compose.yml",
      "composeVersion docker-compose.yml",
      "eslintrc .eslintrc.json",
      "rustToolchainLegacy rust-toolchain",
      "tailwindConfig tailwind.config.js",
    ]);
  });

  it("lets Tailwind 4 keep a config it loads with @config", async () => {
    expect(
      await contracts({
        "package.json": JSON.stringify({ devDependencies: { tailwindcss: "^4.1.0" } }),
        "tailwind.config.ts": "export default {}",
        "src/app.css": '@import "tailwindcss";\n@config "../tailwind.config.ts";\n',
      }),
    ).toEqual([]);
  });
});
