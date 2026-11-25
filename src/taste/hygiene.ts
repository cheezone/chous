/**
 * Repository hygiene: build output that should never be committed, and agent
 * work logs that should never sit at the root.
 */

/**
 * Directories that are build output. A name alone can lie — Vite commits
 * hand-written `node_modules` fixtures, Oxc has a crate called `coverage` — so
 * generic names also need a sibling file (`when`) or a file that only the
 * generating tool writes inside (`marker`).
 */
export const ARTIFACT_DIRS: Array<{ dir: string; when?: string[]; unless?: string[]; marker?: string[]; built?: boolean }> = [
  { dir: "node_modules", marker: [".package-lock.json", ".modules.yaml", ".yarn-integrity", ".yarn-state.yml"] },
  { dir: ".next" },
  { dir: ".nuxt" },
  { dir: ".output" },
  { dir: ".svelte-kit" },
  { dir: "__pycache__" },
  // Gradle's docs: `.gradle` and `build` "are transient files Gradle uses to support features like incremental builds".
  { dir: ".gradle", when: ["settings.gradle", "settings.gradle.kts", "build.gradle", "build.gradle.kts", "gradlew"] },
  { dir: "coverage", marker: ["lcov.info", "coverage-final.json", "coverage-summary.json", "clover.xml", "lcov-report"] },
  { dir: "target", when: ["Cargo.toml", "pom.xml"] },
  { dir: "build", when: ["build.gradle", "build.gradle.kts"] },
  // GitHub's docs tell JavaScript actions to commit dist/.
  // Built only if something builds it: Deno's test registry hand-writes `dist/` packages.
  { dir: "dist", when: ["package.json"], unless: ["action.yml", "action.yaml"], built: true },
];

/** Signs that a package builds something: a `build` script, or a bundler's config next to package.json. */
export const BUNDLER_CONFIG = /^(vite|vitest|tsdown|tsup|rollup|rolldown|webpack|esbuild|unbuild|parcel|rspack|rsbuild|svelte|astro|nuxt|next)\.config\.[cm]?[jt]s$|^tsconfig(\.[\w-]+)?\.json$/;

/**
 * Leftovers. chous knows a file's name, place and content; it does not know
 * what the file is for. So a name alone never makes a smell: a file named
 * like a work log or a one-off script is put up for review, and a backup is a
 * smell only when the original sits right next to it.
 */

/** Named like a work log: `IMPLEMENTATION_COMPLETE.md`, `FIXES_SUMMARY.md`, `PHASE_4_PLAN.md`. Any name at the root; SCREAMING_CASE deeper down. */
export const WORKLOG = /(^|[_\-. ])(summary|complete|completed|completion|status|progress|report|reports|fix|fixes|fixed|bugfix|hotfix|done|improvements?|implementation|changes[_-]made|session|handoff|walkthrough|analysis|cleanup|audit|debug|phase[_-]?\d*|prompts?|brief)([_\-. ]|$)/i;

/**
 * Root directories that mean the same thing. Which name you pick is up to you;
 * two of them is a mess. `spec/` is left out: it may hold tests (RSpec) or
 * specifications (fastrender keeps the WHATWG specs there). Plain plurals (`plugin/` + `plugins/`) are found
 * without a list.
 */
export const SYNONYM_DIRS = [["test", "tests", "__tests__"]];

/**
 * Naming styles of multi-word file names. One word (`index`) fits every style;
 * PascalCase is left out on purpose: components and classes are PascalCase in
 * projects whose other files are kebab or camel (React, Vue, Svelte).
 */
export function nameStyle(stem: string): "kebab-case" | "snake_case" | "camelCase" | undefined {
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(stem)) return "kebab-case";
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(stem)) return "snake_case";
  if (/^[a-z][a-z0-9]*([A-Z][a-z0-9]*)+$/.test(stem)) return "camelCase";
  return undefined;
}

/** Source files whose names follow a convention. Rust is left to rustc's own `non_snake_case`. */
export const SOURCE_FILE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|vue|svelte|astro|py|go|zig|rb|kt|swift|dart)$/;

/** Names a tool chose, not the project: type shims, generated files, framework file conventions. */
export const NAME_EXEMPT = /\.d\.[mc]?ts$|\.gen\.|^(not-found|global-error|global-not-found|instrumentation-client)\./;

/** Decision records and book tables of contents are formats, not logs: `docs/adr/ADR-003-…`, mdBook's `src/SUMMARY.md`. */
export const DECISION_RECORD = /(^|\/)(adrs?|decisions|rfcs?)\/|(^|\/)(adr|rfc)[-_]?\d/i;

/**
 * Root docs with a claim to the root: hosts and tools look for them there.
 * README and LICENSE everywhere; GitHub's community health files; the files
 * coding agents read. Everything else is a doc like any other, and docs
 * belong together.
 */
export const ROOT_CONTRACT_DOCS = /^(readme|licen[cs]e|copying|unlicense|notice|changelog|contributing|security|code_of_conduct|support|governance|agents|claude|gemini)([.\-_].*)?$/i;

/** Prose, as opposed to config: what counts as a doc at the root. */
export const DOC_FILE = /\.(md|mdx|markdown|rst|adoc|asciidoc|org)$/i;

/**
 * chous's position, not a measurement: the root is an entrance. Past this many
 * docs besides the contract ones, they belong in `docs/`.
 */
export const ROOT_DOCS_LIMIT = 3;

/** Named like a one-off script: `fix_login.sh`, `test_api.py`, `debug-auth.js`. */
export const ONE_OFF_SCRIPT = /^(fix|test|debug|check|verify|temp|tmp|quick|try)[_-][\w.-]*\.(sh|bash|py|js|mjs|cjs|ts|bat|cmd|ps1)$/i;

/**
 * Hand-made copies, and the name of the original they were copied from:
 * `package.json.bak` ← `package.json`, `logo (1).png` ← `logo.png`.
 */
export function backupOf(name: string): string | undefined {
  const forms: Array<[RegExp, string]> = [
    [/^(.+)\.(bak|backup|orig|old)$/i, "$1"],
    [/^(.+)_original$/i, "$1"],
    [/^(.+)~$/, "$1"],
    [/^(.+) \(\d+\)(\.\w+)?$/, "$1$2"],
    [/^(.+) copy(\.\w+)?$/i, "$1$2"],
  ];
  for (const [re, to] of forms) if (re.test(name)) return name.replace(re, to);
  return undefined;
}

/**
 * Built binaries: executables, libraries, installers. Built things belong in
 * releases, not the source tree; git keeps every version of them forever.
 */
export const BUILT_BINARY = /\.(exe|dll|so|dylib|apk|aab|ipa|dmg|msi|msix|appimage|deb|rpm)$/i;

/**
 * Data, and other people's code: test fixtures may hold anything, `vendor/`
 * is someone else's taste. Tests and examples are the project's own code and
 * are checked like the rest.
 */
export const NOT_OURS = /(^|\/)(fixtures?|__fixtures__|testdata|test-data|__snapshots__|vendor|third_party)\//i;

/** What the OS writes into these files: a file by the same name that lacks it is something else (Zig tests a `desktop.ini`). */
export const OS_JUNK: Array<{ name: string; content: RegExp }> = [
  { name: ".DS_Store", content: /Bud1/ },
  // An OLE compound file: D0 CF 11 E0.
  { name: "Thumbs.db", content: new RegExp(`^${String.fromCharCode(0xd0, 0xcf, 0x11, 0xe0)}`) },
  { name: "desktop.ini", content: /ShellClassInfo|LocalizedFileNames|ViewState/i },
];
