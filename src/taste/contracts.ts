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

/** What a contract can see of one file. */
export type ContractFile = {
  rel: string;
  name: string;
  dir: string;
  /** Size on disk, read when asked. */
  bytes(): number;
  text(): string;
  /** Every file of the project, relative. */
  all: Set<string>;
  /** The nearest package.json at or above this file, parsed. */
  pkg(): Record<string, any> | undefined;
  /** Some stylesheet of the project loads a config with `@config`. */
  cssLoadsConfig(): boolean;
  /** Text of another file of the project, by relative path ("" when absent). */
  read(rel: string): string;
  /** The package.json at the root of the project, parsed. */
  rootPkg(): Record<string, any> | undefined;
};

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
  | "eslintrc"
  | "tailwindConfig"
  | "rustToolchainLegacy"
  | "npmShrinkwrap"
  | "npmignoreWithFiles"
  | "npmName"
  | "pnpmNpmrc"
  | "pnpmField"
  | "yarnrc"
  | "prettierConfigs"
  | "eslintConfigs"
  | "pytestConfigs"
  | "ruffConfigs"
  | "mypyConfigs"
  | "tsconfigDeprecated"
  | "nodeVersions";

const KiB = 1024;
const MiB = 1024 * KiB;

const lines = (text: string) => text.split(/\r?\n/).length - (text.endsWith("\n") ? 1 : 0);

/** YAML frontmatter as raw text, and the body after it. */
export function frontmatter(text: string): { front: string; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  return m ? { front: m[1]!, body: m[2]! } : { front: "", body: text };
}

/** A top-level scalar from frontmatter, folded scalars joined. Enough for name and description. */
export function field(front: string, key: string): string | undefined {
  const m = new RegExp(`^${key}:[ \\t]*(?:[>|][-+]?)?[ \\t]*(.*(?:\\r?\\n[ \\t]+.*)*)`, "m").exec(front);
  if (!m) return undefined;
  return m[1]!.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join(" ").replace(/^(['"])(.*)\1$/, "$2");
}

function major(spec: unknown): number | undefined {
  const m = typeof spec === "string" ? /^[\^~>=v\s]*(\d+)/.exec(spec) : null;
  return m ? Number(m[1]) : undefined;
}

function depMajor(file: ContractFile, name: string): number | undefined {
  const pkg = file.pkg();
  return major({ ...pkg?.devDependencies, ...pkg?.dependencies }[name]);
}

/** `pnpm@11.2.0` → 11, for the package manager the project pins. */
function pinnedManager(file: ContractFile, name: string): number | undefined {
  const pm = file.rootPkg()?.packageManager;
  return typeof pm === "string" && pm.startsWith(`${name}@`) ? major(pm.slice(name.length + 1)) : undefined;
}

/** A sibling path in the same directory. */
const sibling = (file: ContractFile, name: string) => (file.dir ? `${file.dir}/${name}` : name);

/**
 * Of several config files in one directory, the one the tool reads: the first
 * of `order` that is present. Each entry is a file name, optionally with a test
 * of its text (a pyproject.toml only counts with its tool's section).
 */
type Counts = RegExp | ((text: string) => boolean);
const counts = (test: Counts | undefined, text: string) => !test || (typeof test === "function" ? test(text) : test.test(text));

function winner(file: ContractFile, order: Array<[string, Counts?]>): string | undefined {
  return order.find(([name, test]) => {
    const rel = sibling(file, name);
    return file.all.has(rel) && counts(test, file.read(rel));
  })?.[0];
}

/** The findings of a precedence contract: this file is present, counts, and is not the winner. */
function shadowed(file: ContractFile, order: Array<[string, Counts?]>): Record<string, string> | undefined {
  const mine = order.find(([name]) => name === file.name);
  if (!mine || !counts(mine[1], file.text())) return undefined;
  const used = winner(file, order);
  return used && used !== file.name ? { used } : undefined;
}

/** JSON with comments and trailing commas, as tsconfig allows. */
export function parseJsonc(text: string): any {
  const stripped = text
    .replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (_, str: string | undefined) => str ?? "")
    .replace(/,(\s*[}\]])/g, "$1");
  try {
    return JSON.parse(stripped);
  } catch {
    return undefined;
  }
}

/** tsconfig options TypeScript 6.0 deprecated, and TypeScript 7.0 does not support. */
const TS6_DEPRECATED: Array<[string, (v: unknown) => boolean]> = [
  ["target", (v) => typeof v === "string" && v.toLowerCase() === "es5"],
  ["downlevelIteration", (v) => v !== undefined],
  ["moduleResolution", (v) => typeof v === "string" && ["node", "node10", "classic"].includes(v.toLowerCase())],
  ["module", (v) => typeof v === "string" && ["amd", "umd", "system", "systemjs"].includes(v.toLowerCase())],
  ["baseUrl", (v) => v !== undefined],
  ["esModuleInterop", (v) => v === false],
  ["allowSyntheticDefaultImports", (v) => v === false],
  ["alwaysStrict", (v) => v === false],
  ["outFile", (v) => v !== undefined],
];

/** pnpm 11 reads only registry, auth, TLS and network settings from .npmrc. */
const PNPM_NPMRC = /^(registry|@[^:]+:registry|\/\/.*|_auth|_authToken|always-auth|ca|cafile|cert|certfile|key|keyfile|strict-ssl|proxy|http-proxy|https-proxy|no-proxy|noproxy|local-address|git-shallow-hosts|email|username|_password|tokenHelper)$/;

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
    // ESLint 9: eslintrc "is now deprecated and will not automatically be searched for"; ESLint 10 drops it.
    id: "eslintrc",
    value: "modernity",
    match: /(^|\/)\.eslintrc(\.(js|cjs|yaml|yml|json))?$/,
    check: (f) => {
      const eslint = depMajor(f, "eslint");
      return eslint !== undefined && eslint >= 9 ? { version: eslint } : undefined;
    },
  },
  {
    // Tailwind v4: JavaScript config files "are no longer detected automatically" — only with @config.
    id: "tailwindConfig",
    value: "convention",
    match: /(^|\/)tailwind\.config\.(js|cjs|mjs|ts|cts|mts)$/,
    check: (f) => {
      const tailwind = depMajor(f, "tailwindcss");
      if (tailwind === undefined || tailwind < 4) return undefined;
      return f.cssLoadsConfig() ? undefined : { version: tailwind };
    },
  },
  {
    // rustup: a rust-toolchain file holding just a toolchain name is the "legacy format".
    id: "rustToolchainLegacy",
    value: "modernity",
    match: /(^|\/)rust-toolchain$/,
    check: (f) => (/\[toolchain\]/.test(f.text()) ? undefined : {}),
  },

  // ── npm, pnpm, Yarn ──────────────────────────────────────────────
  {
    // npm: "As of npm v12, npm-shrinkwrap.json is no longer read or written by npm."
    id: "npmShrinkwrap",
    value: "modernity",
    match: /(^|\/)npm-shrinkwrap\.json$/,
    check: () => ({}),
  },
  {
    // npm: a root .npmignore "will not override the files field".
    id: "npmignoreWithFiles",
    value: "convention",
    match: /(^|\/)\.npmignore$/,
    check: (f) => {
      const pkg = parseJsonc(f.read(sibling(f, "package.json")));
      return pkg && Array.isArray(pkg.files) ? {} : undefined;
    },
  },
  {
    // npm: a name is at most 214 characters, lowercase for new packages, no leading dot or underscore unscoped, URL-safe.
    id: "npmName",
    value: "convention",
    match: /(^|\/)package\.json$/,
    check: (f) => {
      const pkg = parseJsonc(f.text());
      const name = pkg?.name;
      if (!pkg || pkg.private === true || typeof name !== "string") return undefined;
      const scoped = name.startsWith("@");
      const bad = name.length > 214 || name !== name.toLowerCase() || (!scoped && /^[._]/.test(name)) || /[^a-z0-9@/._~-]/.test(name.toLowerCase());
      return bad ? { name } : undefined;
    },
  },
  {
    // pnpm 11: "pnpm no longer reads non-auth settings from .npmrc".
    id: "pnpmNpmrc",
    value: "convention",
    match: /^\.npmrc$/,
    check: (f) => {
      if ((pinnedManager(f, "pnpm") ?? 0) < 11) return undefined;
      const keys = f
        .text()
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !/^[#;]/.test(l) && l.includes("="))
        .map((l) => l.slice(0, l.indexOf("=")).trim())
        .filter((k) => !PNPM_NPMRC.test(k));
      return keys.length ? { keys: [...new Set(keys)].join(", ") } : undefined;
    },
  },
  {
    // pnpm 11: "pnpm no longer reads the pnpm field in package.json".
    id: "pnpmField",
    value: "convention",
    match: /^package\.json$/,
    check: (f) => ((pinnedManager(f, "pnpm") ?? 0) >= 11 && parseJsonc(f.text())?.pnpm !== undefined ? {} : undefined),
  },
  {
    // Yarn Modern: "now uses .yarnrc.yml. Any other file is now ignored".
    id: "yarnrc",
    value: "convention",
    match: /(^|\/)\.yarnrc$/,
    check: (f) => ((pinnedManager(f, "yarn") ?? 0) >= 2 || f.all.has(sibling(f, ".yarnrc.yml")) ? {} : undefined),
  },

  // ── Configs read by precedence: one per directory, the rest never ─
  {
    // Prettier: config files "in order of precedence".
    id: "prettierConfigs",
    value: "order",
    match: /(^|\/)(package\.json|\.prettierrc(\.(json|yml|yaml|json5|js|ts|mjs|mts|cjs|cts|toml))?|prettier\.config\.(js|ts|mjs|mts|cjs|cts))$/,
    check: (f) =>
      shadowed(f, [
        // A top-level "prettier" key, not the devDependency of that name.
        ["package.json", (text) => parseJsonc(text)?.prettier !== undefined],
        [".prettierrc"],
        [".prettierrc.json"],
        [".prettierrc.yml"],
        [".prettierrc.yaml"],
        [".prettierrc.json5"],
        [".prettierrc.js"],
        ["prettier.config.js"],
        [".prettierrc.ts"],
        ["prettier.config.ts"],
        [".prettierrc.mjs"],
        ["prettier.config.mjs"],
        [".prettierrc.mts"],
        ["prettier.config.mts"],
        [".prettierrc.cjs"],
        ["prettier.config.cjs"],
        [".prettierrc.cts"],
        ["prettier.config.cts"],
        [".prettierrc.toml"],
      ]),
  },
  {
    // ESLint: "The order of precedence is as follows" — .js, .mjs, .cjs, .ts, .mts, .cts.
    id: "eslintConfigs",
    value: "order",
    match: /(^|\/)eslint\.config\.(js|mjs|cjs|ts|mts|cts)$/,
    check: (f) => shadowed(f, ["js", "mjs", "cjs", "ts", "mts", "cts"].map((e) => [`eslint.config.${e}`])),
  },
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
    // TypeScript 6.0 deprecated these options; "TypeScript 7.0 will not support any of these deprecated options".
    id: "tsconfigDeprecated",
    value: "modernity",
    match: /(^|\/)tsconfig(\.[\w.-]+)?\.json$/,
    check: (f) => {
      const options = parseJsonc(f.text())?.compilerOptions;
      if (!options || typeof options !== "object") return undefined;
      const found = TS6_DEPRECATED.filter(([key, bad]) => key in options && bad(options[key])).map(([key]) => `${key}: ${JSON.stringify(options[key])}`);
      return found.length ? { options: found.join(", ") } : undefined;
    },
  },
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
];
