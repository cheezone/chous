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
import { type ContractFile, field, frontmatter, lines, major, parseJsonc, tomlTableKeys } from "../facts/kit";

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
  | "nodeVersions"
  | FactId;

const KiB = 1024;

/** Node major pinned by a version file, or undefined. */
function nodeMajorIn(file: ContractFile, rel: string): number | undefined {
  const text = file.read(rel);
  if (!text) return undefined;
  if (rel.endsWith(".tool-versions")) return major(/^(?:nodejs|node)\s+(\S+)/m.exec(text)?.[1]);
  return major(text.trim().split(/\r?\n/)[0]);
}

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

  // ── Tool formats ─────────────────────────────────────────────────

  // ── npm, pnpm, Yarn ──────────────────────────────────────────────

  // ── Configs read by precedence: one per directory, the rest never ─

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
];
