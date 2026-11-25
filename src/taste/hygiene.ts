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
export const ARTIFACT_DIRS: Array<{ dir: string; when?: string[]; unless?: string[]; marker?: string[] }> = [
  { dir: "node_modules", marker: [".package-lock.json", ".modules.yaml", ".yarn-integrity", ".yarn-state.yml"] },
  { dir: ".next" },
  { dir: ".nuxt" },
  { dir: ".output" },
  { dir: ".svelte-kit" },
  { dir: "__pycache__" },
  { dir: "coverage", marker: ["lcov.info", "coverage-final.json", "coverage-summary.json", "clover.xml", "lcov-report"] },
  { dir: "target", when: ["Cargo.toml", "pom.xml"] },
  { dir: "build", when: ["build.gradle", "build.gradle.kts"] },
  // GitHub's docs tell JavaScript actions to commit dist/.
  { dir: "dist", when: ["package.json"], unless: ["action.yml", "action.yaml"] },
];

/**
 * Leftovers: files that describe one moment of work, or copy what git already
 * keeps. Every pattern here was measured: zero hits in Vue, Vite, React, Oxc,
 * SQLite, Next.js Commerce, cal.com and nuxt.com; common in vibe-coded repos.
 */

/**
 * Markdown named after an event or a status — what an agent writes at the end
 * of a session (`IMPLEMENTATION_COMPLETE.md`, `FIXES_SUMMARY.md`,
 * `PHASE_4_PLAN.md`). Any name at the root; SCREAMING_CASE names deeper down.
 */
export const WORKLOG = /(^|[_\-. ])(summary|complete|completed|completion|status|progress|report|reports|fix|fixes|fixed|bugfix|hotfix|done|improvements?|implementation|changes[_-]made|session|handoff|walkthrough|plan|analysis|cleanup|audit|debug|phase[_-]?\d*|checklist|prompts?|brief)([_\-. ]|$)/i;

/**
 * Root directories that mean the same thing. Which name you pick is up to you;
 * two of them is a mess. Plain plurals (`plugin/` + `plugins/`) are found
 * without a list.
 */
export const SYNONYM_DIRS = [["test", "tests", "__tests__", "spec", "specs"]];

/** Decision records keep their history on purpose: `docs/adr/ADR-003-…`, `rfcs/0001-…`. */
export const DECISION_RECORD = /(^|\/)(adrs?|decisions|rfcs?)\/|(^|\/)(adr|rfc)[-_]?\d/i;

/** Root docs every project may have, whatever words they contain. */
export const STANDARD_DOCS = /^(readme|changelog|license|licence|contributing|security|code_of_conduct|agents|claude|support|governance)/i;

/** One-off scripts at the root: `fix_login.sh`, `test_api.py`, `debug-auth.js`. */
export const ONE_OFF_SCRIPT = /^(fix|test|debug|check|verify|temp|tmp|quick|try)[_-][\w.-]*\.(sh|bash|py|js|mjs|cjs|ts|bat|cmd|ps1)$/i;

/** Hand-made copies: `package.json.bak`, `logo.png_original`, `DOC (1).png`, `app copy.tsx`. */
export const BACKUP = /(\.(bak|backup|orig|old)|_original|~)$| \(\d+\)(\.\w+)?$| copy(\.\w+)?$/i;

/**
 * Installers and app bundles. Git keeps every version forever; GitHub points
 * binaries to Releases: https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github#distributing-large-binaries
 */
export const RELEASE_BINARY = /\.(apk|aab|ipa|exe|dmg|msi|msix|appimage|deb|rpm)$/i;

/** Test inputs and vendored code may be anything: `cargo vendor` writes `Cargo.toml.orig` itself. */
export const FIXTURE_DIR = /(^|\/)(fixtures?|__fixtures__|testdata|test-data|__snapshots__|vendor|third_party)\//i;

/**
 * More hand-written root docs than this, and the root reads as a junk drawer:
 * the official repos measured keep at most three besides the standard ones.
 */
export const ROOT_DOCS_LIMIT = 5;
