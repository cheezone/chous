/**
 * Contracts: what tools say, in their own docs, about the files they read —
 * where a file must live, what it must be called, how large it may be, which
 * format they now call legacy. Each one is a fact chous can check, and each
 * has its words in sources.ts (`issue.contract.<id>`).
 *
 * A contract never infers. It reads names, sizes, frontmatter and package
 * versions — nothing that needs the code to be understood.
 */
import type { Value } from "../types";
import { FACTS, type FactId } from "../facts";
import { type ContractFile, field, frontmatter, lines, major, parseJsonc, shadowed, tomlTableKeys } from "../facts/kit";

export type { ContractFile };
export { field, frontmatter, parseJsonc, tomlTableKeys };

export type Contract = {
  id: ContractId;
  value: Value;
  /** The files it looks at, by relative path. */
  match: RegExp;
  /** Params of the finding, or undefined when the file keeps the contract. */
  check(file: ContractFile): Record<string, string | number> | undefined;
  /** Report each group once, not each file in it (`.claude/commands/` can hold hundreds): the group a file belongs to. */
  groupBy?(rel: string): string;
  /** Also look inside fixtures and vendored code: GitHub's limits apply to every file. */
  everywhere?: boolean;
};

export type ContractId =
  | "agentsMdBytes"
  | "claudeMdLines"
  | "skillLines"
  | "skillName"
  | "skillDescription"
  | "skillCompatibility"
  | "claudeCommands"
  | "commandShadowed"
  | "cursorRuleExtension"
  | "cursorRuleLines"
  | "copilotAgentPrompt"
  | "copilotAgentInfer"
  | "chatmode"
  | "copilotInstructionsName"
  | "windsurfLegacy"
  | "clinerules"
  | "largeFile"
  | "readmeSize"
  | "codeownersShadowed"
  | "codeownersSize"
  | "dependabotPlace"
  | "workflowPlace"
  | "composeVersion"
  | "composeName"
  | "rustToolchainLegacy"
  | "pytestConfigs"
  | "ruffConfigs"
  | "mypyConfigs"
  | "nodeVersions"
  | "poetryFields"
  | FactId;

const KiB = 1024;
const MiB = 1024 * KiB;

/** Node major pinned by a version file, or undefined. */
function nodeMajorIn(file: ContractFile, rel: string): number | undefined {
  const text = file.read(rel);
  if (!text) return undefined;
  if (rel.endsWith(".tool-versions")) return major(/^(?:nodejs|node)\s+(\S+)/m.exec(text)?.[1]);
  return major(text.trim().split(/\r?\n/)[0]);
}

/** [tool.poetry] fields Poetry deprecated in favor of the standard [project] table. */
// `scripts` is left out: only console and gui scripts moved to project.scripts; file scripts stay.
const POETRY_DEPRECATED = ["name", "description", "license", "authors", "maintainers", "homepage", "repository", "documentation", "keywords", "extras", "plugins", "urls"];

const SKILL = /(^|\/)SKILL\.md$/;
/** Agent Skills spec: 1-64 of a-z, 0-9 and single hyphens, not at either end. */
const SKILL_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const CONTRACTS: Contract[] = [
  // Tools declared as facts: src/facts/tools/.
  ...FACTS,

  // ── Agent instructions ───────────────────────────────────────────
  {
    // Codex: project_doc_max_bytes = 32768; past it the instructions are cut.
    id: "agentsMdBytes",
    value: "convention",
    match: /(^|\/)AGENTS\.md$/,
    check: (f) => (f.bytes() > 32 * KiB ? { kib: Math.round(f.bytes() / KiB), limit: 32 } : undefined),
  },
  {
    // Claude Code: "target under 200 lines per CLAUDE.md file".
    id: "claudeMdLines",
    value: "convention",
    match: /(^|\/)CLAUDE\.md$/,
    check: (f) => {
      const n = lines(f.text());
      return n > 200 ? { lines: n, limit: 200 } : undefined;
    },
  },
  {
    // Claude Code and the Agent Skills spec: "Keep SKILL.md under 500 lines."
    id: "skillLines",
    value: "convention",
    match: SKILL,
    check: (f) => {
      const n = lines(f.text());
      return n > 500 ? { lines: n, limit: 500 } : undefined;
    },
  },
  {
    // Agent Skills spec: name is 1-64 lowercase letters, digits and hyphens, and matches its directory.
    id: "skillName",
    value: "convention",
    match: SKILL,
    check: (f) => {
      const name = field(frontmatter(f.text()).front, "name");
      if (name === undefined) return undefined;
      const folder = f.dir.split("/").at(-1) ?? "";
      return name.length > 64 || !SKILL_NAME.test(name) || name !== folder ? { name, folder } : undefined;
    },
  },
  {
    // Agent Skills spec: description is 1-1024 characters.
    id: "skillDescription",
    value: "convention",
    match: SKILL,
    check: (f) => {
      const description = field(frontmatter(f.text()).front, "description");
      return description !== undefined && description.length > 1024 ? { length: description.length, limit: 1024 } : undefined;
    },
  },
  {
    // Agent Skills spec: compatibility is at most 500 characters.
    id: "skillCompatibility",
    value: "convention",
    match: SKILL,
    check: (f) => {
      const compatibility = field(frontmatter(f.text()).front, "compatibility");
      return compatibility !== undefined && compatibility.length > 500 ? { length: compatibility.length, limit: 500 } : undefined;
    },
  },
  {
    // Claude Code: "Custom commands have been merged into skills"; commands are "the older format".
    id: "claudeCommands",
    value: "modernity",
    match: /(^|\/)\.claude\/commands\/.+\.md$/,
    groupBy: (rel) => rel.slice(0, rel.indexOf(".claude/commands/") + ".claude/commands/".length),
    check: () => ({}),
  },
  {
    // Claude Code: a skill and a command with one name — the skill wins; the command is never run.
    id: "commandShadowed",
    value: "convention",
    match: /(^|\/)\.claude\/commands\/[^/]+\.md$/,
    check: (f) => {
      const root = f.rel.slice(0, f.rel.indexOf(".claude/commands/"));
      const name = f.name.replace(/\.md$/, "");
      return f.all.has(`${root}.claude/skills/${name}/SKILL.md`) ? { name } : undefined;
    },
  },
  {
    // Cursor: "Project rules must use the .mdc extension."
    id: "cursorRuleExtension",
    value: "convention",
    match: /(^|\/)\.cursor\/rules\/.+$/,
    groupBy: (rel) => rel.slice(0, rel.indexOf(".cursor/rules/") + ".cursor/rules/".length),
    check: (f) => (f.name.endsWith(".mdc") ? undefined : {}),
  },
  {
    // Cursor: "Keep rules under 500 lines."
    id: "cursorRuleLines",
    value: "convention",
    match: /(^|\/)\.cursor\/rules\/.+\.mdc$/,
    check: (f) => {
      const n = lines(f.text());
      return n > 500 ? { lines: n, limit: 500 } : undefined;
    },
  },
  {
    // GitHub Copilot: "The prompt can be a maximum of 30,000 characters."
    id: "copilotAgentPrompt",
    value: "convention",
    match: /(^|\/)\.github\/agents\/.+\.agent\.md$/,
    check: (f) => {
      const { body } = frontmatter(f.text());
      return body.length > 30_000 ? { length: body.length, limit: 30_000 } : undefined;
    },
  },
  {
    // GitHub Copilot: `infer` is retired; use `disable-model-invocation` and `user-invocable`.
    id: "copilotAgentInfer",
    value: "modernity",
    match: /(^|\/)\.github\/agents\/.+\.agent\.md$/,
    check: (f) => (/^infer:/m.test(frontmatter(f.text()).front) ? {} : undefined),
  },
  {
    // VS Code: custom agents "were previously known as custom chat modes"; rename `.chatmode.md` to `.agent.md`.
    id: "chatmode",
    value: "modernity",
    match: /\.chatmode\.md$/,
    check: () => ({}),
  },
  {
    // GitHub Copilot reads path-specific instructions from `.github/instructions/**/*.instructions.md`.
    id: "copilotInstructionsName",
    value: "convention",
    match: /(^|\/)\.github\/instructions\/.+\.md$/,
    check: (f) => (f.name.endsWith(".instructions.md") ? undefined : {}),
  },
  {
    // Devin (formerly Windsurf): these locations are "Legacy (read, fallback)".
    id: "windsurfLegacy",
    value: "modernity",
    match: /(^|\/)(\.windsurfrules|\.codeiumignore|\.windsurfignore|\.windsurf\/(rules|workflows|skills|plans)\/.+)$/,
    groupBy: (rel) => /^(.*?\.windsurf\/(rules|workflows|skills|plans)\/)/.exec(rel)?.[1] ?? rel,
    check: (f) => {
      if (f.name === ".windsurfrules") return { use: ".devin/rules/" };
      if (f.name === ".codeiumignore" || f.name === ".windsurfignore") return { use: ".devinignore" };
      const kind = /\.windsurf\/(rules|workflows|skills|plans)\//.exec(f.rel)![1];
      return { use: `.devin/${kind}/` };
    },
  },
  {
    // Cline: it "also reads the older .clinerules/ layout"; the project home is `.cline/`.
    id: "clinerules",
    value: "modernity",
    match: /(^|\/)\.clinerules(\/.+)?$/,
    groupBy: (rel) => /^(.*?\.clinerules\/?)/.exec(rel)![1]!,
    check: () => ({}),
  },

  // ── GitHub ───────────────────────────────────────────────────────
  {
    // GitHub warns on files over 50 MiB and blocks files over 100 MiB.
    id: "largeFile",
    value: "convention",
    match: /./,
    everywhere: true,
    check: (f) => (f.bytes() > 50 * MiB ? { mib: Math.round(f.bytes() / MiB) } : undefined),
  },
  {
    // GitHub: "any content beyond 500 KiB will be truncated."
    id: "readmeSize",
    value: "convention",
    match: /^(\.github\/|docs\/)?readme(\.[\w]+)?$/i,
    check: (f) => (f.bytes() > 500 * KiB ? { kib: Math.round(f.bytes() / KiB), limit: 500 } : undefined),
  },
  {
    // GitHub searches .github/, the root, then docs/ for CODEOWNERS "and use[s] the first one it finds".
    id: "codeownersShadowed",
    value: "convention",
    match: /^(\.github\/|docs\/)?CODEOWNERS$/,
    check: (f) => {
      const first = [".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS"].find((p) => f.all.has(p));
      return first && first !== f.rel ? { used: first } : undefined;
    },
  },
  {
    // GitHub: "CODEOWNERS files must be under 3 MB in size."
    id: "codeownersSize",
    value: "convention",
    match: /^(\.github\/|docs\/)?CODEOWNERS$/,
    check: (f) => (f.bytes() >= 3 * 1000 * 1000 ? { mb: Math.round(f.bytes() / 1e6) } : undefined),
  },
  {
    // GitHub: "You must store this file in the .github directory" (.github/dependabot.yml or .yaml).
    id: "dependabotPlace",
    value: "convention",
    match: /(^|\/)dependabot\.ya?ml$/,
    check: (f) => (f.rel === ".github/dependabot.yml" || f.rel === ".github/dependabot.yaml" ? undefined : {}),
  },
  {
    // GitHub: "You must store workflow files in the .github/workflows directory."
    id: "workflowPlace",
    value: "convention",
    match: /^\.github\/(?!workflows\/|ISSUE_TEMPLATE\/|DISCUSSION_TEMPLATE\/).+\.ya?ml$/,
    check: (f) => {
      const text = f.text();
      return /^on:/m.test(text) && /^jobs:/m.test(text) ? {} : undefined;
    },
  },

  // ── Tool formats ─────────────────────────────────────────────────
  {
    // Docker: the top-level `version` property is "obsolete".
    id: "composeVersion",
    value: "modernity",
    match: /(^|\/)(docker-)?compose(\.[\w-]+)?\.ya?ml$/,
    check: (f) => (/^version\s*:/m.test(f.text()) ? {} : undefined),
  },
  {
    // Docker: compose.yaml is preferred; docker-compose.y(a)ml is kept "for backwards compatibility of earlier versions".
    id: "composeName",
    value: "modernity",
    match: /(^|\/)docker-compose(\.[\w-]+)?\.ya?ml$/,
    check: () => ({}),
  },
  {
    // rustup: a rust-toolchain file holding just a toolchain name is the "legacy format".
    id: "rustToolchainLegacy",
    value: "modernity",
    match: /(^|\/)rust-toolchain$/,
    check: (f) => (/\[toolchain\]/.test(f.text()) ? undefined : {}),
  },

  // ── npm, pnpm, Yarn ──────────────────────────────────────────────

  // ── Configs read by precedence: one per directory, the rest never ─
  {
    // pytest: pytest.toml, then pytest.ini, "take precedence over other files, even when empty".
    id: "pytestConfigs",
    value: "order",
    match: /(^|\/)(pytest\.toml|\.pytest\.toml|pytest\.ini|pyproject\.toml|tox\.ini|setup\.cfg)$/,
    check: (f) =>
      shadowed(f, [
        ["pytest.toml"],
        [".pytest.toml"],
        ["pytest.ini"],
        ["pyproject.toml", /^\[tool\.pytest(\.ini_options)?\]/m],
        ["tox.ini", /^\[pytest\]/m],
        ["setup.cfg", /^\[tool:pytest\]/m],
      ]),
  },
  {
    // Ruff: ".ruff.toml ... will take precedence over the ruff.toml file, and the ruff.toml file ... over the pyproject.toml file".
    id: "ruffConfigs",
    value: "order",
    match: /(^|\/)(\.ruff\.toml|ruff\.toml|pyproject\.toml)$/,
    check: (f) => shadowed(f, [[".ruff.toml"], ["ruff.toml"], ["pyproject.toml", /^\[tool\.ruff/m]]),
  },
  {
    // mypy: mypy.ini, .mypy.ini, pyproject.toml, setup.cfg — "there is no merging".
    id: "mypyConfigs",
    value: "order",
    match: /(^|\/)(mypy\.ini|\.mypy\.ini|pyproject\.toml|setup\.cfg)$/,
    check: (f) => shadowed(f, [["mypy.ini"], [".mypy.ini"], ["pyproject.toml", /^\[tool\.mypy\]/m], ["setup.cfg", /^\[mypy\]/m]]),
  },

  // ── TypeScript, Node ─────────────────────────────────────────────
  {
    // Two files pinning Node to different majors: one fact said twice, and the two disagree.
    id: "nodeVersions",
    value: "order",
    match: /^(\.nvmrc|\.node-version|\.tool-versions)$/,
    check: (f) => {
      const files = [".nvmrc", ".node-version", ".tool-versions"].filter((p) => nodeMajorIn(f, p) !== undefined);
      if (files[0] !== f.rel) return undefined; // report once, on the first
      const majors = files.map((p) => `${p}: ${nodeMajorIn(f, p)}`);
      return new Set(files.map((p) => nodeMajorIn(f, p))).size > 1 ? { versions: majors.join(", ") } : undefined;
    },
  },

  // ── Vite, Vitest, Oxc ────────────────────────────────────────────

  // ── Rust, Python packaging ───────────────────────────────────────
  {
    // Poetry: "Deprecated: Use project.<field> instead."
    id: "poetryFields",
    value: "modernity",
    match: /(^|\/)pyproject\.toml$/,
    check: (f) => {
      const text = f.text();
      const keys = tomlTableKeys(text, "tool.poetry").filter((k) => POETRY_DEPRECATED.includes(k));
      const tables = POETRY_DEPRECATED.filter((k) => new RegExp(`^\\[tool\\.poetry\\.${k}\\]`, "m").test(text));
      const all = [...new Set([...keys, ...tables])];
      return all.length ? { fields: all.join(", ") } : undefined;
    },
  },
];
