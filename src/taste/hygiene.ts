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
 * Root Markdown named after an event or a status — what an agent writes at the
 * end of a session (`IMPLEMENTATION_COMPLETE.md`, `FIXES_SUMMARY.md`). It
 * describes one moment and goes stale the day it lands. Measured: none in Vue,
 * Vite, React, Oxc or SQLite; half of the vibe-coded projects sampled.
 */
export const WORKLOG = /(^|[_\-. ])(summary|complete|completed|completion|status|progress|report|reports|fix|fixes|fixed|bugfix|hotfix|done|improvements?|implementation|changes[_-]made|session|handoff|walkthrough)([_\-. ]|$)/i;

/** Root docs every project may have, whatever words they contain. */
export const STANDARD_DOCS = /^(readme|changelog|license|licence|contributing|security|code_of_conduct|agents|claude|support|governance)/i;
