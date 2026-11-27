import ignore, { type Ignore } from "ignore";

const RUN = /[a-z0-9]+/g;
const WILD = "*?";

/**
 * The words a path must contain, whole, for this pattern to match it or one of
 * its parents: `ignored-12/**\/*.tmp` needs `ignored` and `12` and `tmp`. A
 * word touching a wildcard (`*foo`) may be part of a longer one, and a
 * character class or an escape can stand for anything; those give none.
 */
function wordsOf(pattern: string): string[] {
  const p = (pattern.startsWith("!") ? pattern.slice(1) : pattern).toLowerCase();
  if (/[[\]\\]/.test(p)) return [];
  const words: string[] = [];
  for (const m of p.matchAll(RUN)) {
    const before = p[m.index - 1];
    const after = p[m.index + m[0].length];
    if ((before && WILD.includes(before)) || (after && WILD.includes(after))) continue;
    words.push(m[0]);
  }
  return words;
}

/**
 * `ignore().add(patterns)`, answering in time that does not grow with the
 * number of patterns. The library tests every path against every pattern: a
 * .gitignore of 20 000 lines over 20 000 files is 400 million tests. Here each
 * pattern is filed under its rarest word, and a path is tested only against
 * the patterns filed under its own words (and those with none), in their
 * original order — patterns that cannot match a path never change its answer.
 */
export function gitignoreMatcher(patterns: string[]): { ignores(rel: string): boolean } {
  const lines = patterns.filter((p) => p.trim() && !p.startsWith("#"));
  const words = lines.map(wordsOf);
  const frequency = new Map<string, number>();
  for (const ws of words) for (const w of new Set(ws)) frequency.set(w, (frequency.get(w) ?? 0) + 1);

  const always: number[] = [];
  const byWord = new Map<string, number[]>();
  words.forEach((ws, i) => {
    if (ws.length === 0) return always.push(i);
    const rarest = ws.reduce((a, b) => (frequency.get(b)! < frequency.get(a)! ? b : a));
    const list = byWord.get(rarest);
    if (list) list.push(i);
    else byWord.set(rarest, [i]);
  });

  // Candidate sets overlap. Reuse the compiled rule when the same pattern occurs in another set.
  const compiled: Ignore[] = [];
  const matchers = new Map<string, Ignore>();
  const answers = new Map<string, boolean>();
  return {
    ignores(rel: string) {
      const known = answers.get(rel);
      if (known !== undefined) return known;
      const candidates = new Set(always);
      for (const [w] of rel.toLowerCase().matchAll(RUN)) for (const i of byWord.get(w) ?? []) candidates.add(i);
      const chosen = [...candidates].sort((a, b) => a - b);
      const key = chosen.join(",");
      let matcher = matchers.get(key);
      if (!matcher) {
        // Adding Ignore instances concatenates their rule arrays. Add strings in bulk for wide sets
        // to avoid repeatedly copying a growing array of rules.
        const rules = chosen.length > 256
          ? chosen.map((i) => lines[i]!)
          : chosen.map((i) => compiled[i] ??= ignore().add([lines[i]!]));
        matcher = ignore().add(rules);
        matchers.set(key, matcher);
      }
      const answer = chosen.length > 0 && matcher.ignores(rel);
      answers.set(rel, answer);
      return answer;
    },
  };
}
