import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { lintWorkspace } from "../../src/rules/lint";
import { field, frontmatter } from "../../src/facts/kit";

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
      "clinerules .clinerules/one.md",
      "copilotAgentInfer .github/agents/review.agent.md",
      "copilotInstructionsName .github/instructions/vue.md",
      "cursorRuleExtension .cursor/rules/role.md",
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

describe("ecosystem contracts", () => {
  it("knows what npm, pnpm 11 and Yarn 2 no longer read", async () => {
    expect(
      await contracts({
        "package.json": JSON.stringify({ name: "app", packageManager: "pnpm@11.2.0", pnpm: { overrides: {} } }),
        ".npmrc": "registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=${NPM_TOKEN}\nshamefully-hoist=true\nauto-install-peers=true\n",
        "npm-shrinkwrap.json": "{}",
        "lib/package.json": JSON.stringify({ name: "MyLib", files: ["dist"] }),
        "lib/.npmignore": "src",
        "old/package.json": JSON.stringify({ name: "old", private: true }),
        "old/.yarnrc": "registry x",
        "old/.yarnrc.yml": "nodeLinker: node-modules",
      }),
    ).toEqual(["npmName lib/package.json", "npmShrinkwrap npm-shrinkwrap.json", "npmignoreWithFiles lib/.npmignore", "pnpmField package.json", "pnpmNpmrc .npmrc", "yarnrc old/.yarnrc"]);
  });

  it("leaves .npmrc alone before pnpm 11, and private packages' names alone", async () => {
    expect(
      await contracts({
        "package.json": JSON.stringify({ name: "App", private: true, packageManager: "pnpm@10.0.0", pnpm: {} }),
        ".npmrc": "shamefully-hoist=true\n",
      }),
    ).toEqual([]);
  });

  it("names the config each tool never reads, by its own precedence", async () => {
    expect(
      await contracts({
        "package.json": JSON.stringify({ name: "a", private: true, prettier: {}, devDependencies: { prettier: "^3.0.0" } }),
        ".prettierrc.json": "{}",
        "eslint.config.js": "export default []",
        "eslint.config.ts": "export default []",
        "py/pytest.ini": "",
        "py/pyproject.toml": "[tool.pytest.ini_options]\naddopts = '-q'\n[tool.ruff]\nline-length = 100\n[tool.mypy]\nstrict = true\n",
        "py/ruff.toml": "line-length = 88",
        "py/mypy.ini": "[mypy]",
        "solo/package.json": JSON.stringify({ name: "s", private: true, devDependencies: { prettier: "^3.0.0" } }),
        "solo/.prettierrc": "{}",
      }),
    ).toEqual([
      "eslintConfigs eslint.config.ts",
      "mypyConfigs py/pyproject.toml",
      "prettierConfigs .prettierrc.json",
      "pytestConfigs py/pyproject.toml",
      "ruffConfigs py/pyproject.toml",
    ]);
  });

  it("lists the tsconfig options TypeScript 6 deprecated, and Node pinned twice", async () => {
    expect(
      await contracts({
        "tsconfig.json": '{\n  // comments are fine\n  "compilerOptions": { "baseUrl": ".", "moduleResolution": "Node", "strict": true, },\n}',
        "tsconfig.build.json": '{ "compilerOptions": { "moduleResolution": "bundler" } }',
        ".nvmrc": "20\n",
        ".node-version": "22.11.0\n",
      }),
    ).toEqual(["nodeVersions .nvmrc", "tsconfigDeprecated tsconfig.json"]);
  });
});

describe("Vite, Vitest, Oxc, Cargo and Poetry contracts", () => {
  it("knows the files these tools no longer read, or read only one of", async () => {
    expect(
      await contracts({
        "vitest.workspace.ts": "export default []",
        "vite.config.js": "export default {}",
        "vite.config.ts": "export default {}",
        ".oxlintrc.json": "{}",
        "oxlint.config.ts": "export default {}",
        "crate/.cargo/config": "[build]",
        "crate/.cargo/config.toml": "[build]",
        "crate/Cargo.toml": '[package]\nname = "x"\nauthors = ["a"]\n\n[dependencies]\nauthors = "1"\n\n[replace]\n"foo:0.1.0" = { path = "foo" }\n',
        "py/pyproject.toml": '[tool.poetry]\nname = "x"\nversion = "1.0.0"\n\n[tool.poetry.urls]\nDocs = "https://x"\n\n[tool.poetry.scripts]\nrun = "x:main"\n',
      }),
    ).toEqual([
      "cargoAuthors crate/Cargo.toml",
      "cargoConfigs crate/.cargo/config.toml",
      "cargoReplace crate/Cargo.toml",
      "oxlintConfigs .oxlintrc.json",
      "poetryFields py/pyproject.toml",
      "viteConfigs vite.config.ts",
      "vitestWorkspace vitest.workspace.ts",
    ]);
  });

  it("counts every crate that sets authors, inherited ones too, in one finding", async () => {
    expect(
      await contracts({
        "a/Cargo.toml": '[package]\nname = "a"\nauthors.workspace = true\n',
        "b/Cargo.toml": '[package]\nname = "b"\nauthors = ["x"]\n',
        "c/Cargo.toml": '[package]\nname = "c"\nedition.workspace = true\n',
      }),
    ).toEqual(["cargoAuthors **/Cargo.toml"]);
  });
});
