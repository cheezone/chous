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
  { name: "OpenAI API key", pattern: /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,}/g },
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
export const PLACEHOLDER = /x{4,}|your[_-]|example|dummy|placeholder|<|\.\.\./i;

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
