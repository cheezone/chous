/**
 * Things that leak when committed. Only unambiguous facts:
 * key formats their vendors publish and that are secret by definition, and
 * directories that are build output by definition.
 *
 * Not here on purpose: Firebase config keys and Supabase `anon` keys (public by
 * design), Google Maps keys (meant for browsers), `.env` (Vite and Next.js say
 * it may be committed; only `.env*.local` may not).
 */

export type SecretFormat = {
  /** Shown to the user, e.g. "OpenAI API key". */
  name: string;
  pattern: RegExp;
  /** Only a secret when one of the surrounding lines matches (±2 lines). */
  near?: RegExp;
  /** Extra check on the matched text. */
  test?: (match: string) => boolean;
};

/** A JWT whose payload says `"role": "service_role"` — Supabase's admin key. */
function isServiceRole(token: string): boolean {
  const payload = token.split(".")[1];
  if (!payload) return false;
  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return json?.role === "service_role";
  } catch {
    return false;
  }
}

export const SECRETS: SecretFormat[] = [
  { name: "OpenAI API key", pattern: /\bsk-(?!ant-|or-)(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,}/g },
  { name: "OpenRouter API key", pattern: /\bsk-or-v1-[0-9a-f]{64}\b/g },
  { name: "Anthropic API key", pattern: /\bsk-ant-[A-Za-z0-9_-]{32,}/g },
  { name: "GitHub token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{60,})\b/g },
  { name: "AWS access key", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { name: "Stripe live key", pattern: /\b(?:sk|rk)_live_[0-9A-Za-z]{20,}/g },
  { name: "Slack token", pattern: /\bxox[abprs]-[0-9A-Za-z-]{10,}/g },
  { name: "Supabase service_role key", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, test: isServiceRole },
  // Google API keys are often public (Firebase, Maps). Gemini keys are not.
  { name: "Gemini API key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g, near: /gemini|generativelanguage|genai/i },
];

/** Documentation placeholders and vendor examples, never real keys. */
const PLACEHOLDER = /x{4,}|your[_-]|example|dummy|placeholder|<|\.\.\./i;

/** Ascending runs like `1234567` or `ABCDEFG`: typed by a person, never generated. */
function hasRun(text: string, length = 6): boolean {
  let run = 1;
  for (let i = 1; i < text.length; i++) {
    run = text.charCodeAt(i) === text.charCodeAt(i - 1) + 1 ? run + 1 : 1;
    if (run >= length) return true;
  }
  return false;
}

/** A short unit repeated over and over, like `a1B2a1B2a1B2…`. */
function isRepetitive(text: string): boolean {
  for (let unit = 1; unit <= 8; unit++) {
    const head = text.slice(0, unit);
    if (text.length >= unit * 4 && head.repeat(Math.ceil(text.length / unit)).startsWith(text)) return true;
  }
  return false;
}

/**
 * Test data and documentation, not keys: placeholders, vendor examples, and the
 * obviously typed fakes that redaction tests use. Real keys are random.
 */
export function looksFake(token: string): boolean {
  const body = token.replace(/^[a-z]+[-_](?:[a-z0-9]+[-_])?/i, "");
  return PLACEHOLDER.test(token) || hasRun(token) || isRepetitive(body);
}

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
