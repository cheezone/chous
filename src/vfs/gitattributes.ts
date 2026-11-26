/**
 * What a repository declares not its own, in GitHub's words: paths marked
 * `linguist-vendored` or `linguist-generated` in `.gitattributes`. Linguist's
 * docs: "Use the `linguist-vendored` attribute to vendor or un-vendor paths."
 * Any language can name its folders this way (`测试数据/** linguist-vendored`);
 * `-linguist-vendored` takes a path back as the project's own.
 *
 * Git's rules for attribute files: patterns match like .gitignore's, except
 * that a directory pattern does not reach inside it (`path/**` does); later
 * lines win, and a deeper .gitattributes wins over a shallower one.
 */
import picomatch from "picomatch";

type Rule = { match: (rel: string) => boolean; vendored?: boolean; generated?: boolean };

/** An attribute's setting on a line: `attr` set, `-attr` or `attr=false` unset, `!attr` back to unspecified. */
function setting(tokens: string[], attr: string): boolean | null | undefined {
  let value: boolean | null | undefined;
  for (const t of tokens) {
    if (t === attr || t === `${attr}=true`) value = true;
    else if (t === `-${attr}` || t === `${attr}=false`) value = false;
    else if (t === `!${attr}`) value = null;
  }
  return value;
}

/** A pattern from the .gitattributes in `base` (`""` or `dir/`), as a matcher for repository paths. */
function compile(pattern: string, base: string): ((rel: string) => boolean) | undefined {
  if (!pattern || pattern.endsWith("/")) return undefined; // a directory pattern names no file
  const anchored = pattern.includes("/");
  const glob = `${base}${anchored ? pattern.replace(/^\//, "") : `**/${pattern}`}`;
  try {
    // Git has no braces or extglobs: `{a,b}` is literal there, and never expands here.
    return picomatch(glob, { dot: true, nobrace: true, noextglob: true });
  } catch {
    return undefined;
  }
}

/** An attribute file is short; past this many vendoring lines the rest are not read. */
const MAX_RULES = 1000;

/**
 * Whether the repository declares a path not its own (`true`), its own
 * (`false`), or says nothing. `files` maps each .gitattributes' path,
 * relative to the root, to its text.
 */
export function declaredNotOurs(files: Map<string, string>): (rel: string) => boolean | undefined {
  const rules: Rule[] = [];
  // Shallow first: a deeper file overrides, as the later lines of one file do.
  const ordered = [...files].sort(([a], [b]) => a.split("/").length - b.split("/").length || a.localeCompare(b));
  for (const [path, text] of ordered) {
    const base = path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";
    for (const line of text.split(/\r?\n/)) {
      if (rules.length >= MAX_RULES) break;
      const tokens = line.trim().split(/[ \t]+/);
      const pattern = tokens.shift();
      if (!pattern || pattern.startsWith("#")) continue;
      const vendored = setting(tokens, "linguist-vendored");
      const generated = setting(tokens, "linguist-generated");
      if (vendored === undefined && generated === undefined) continue;
      const match = compile(pattern, base);
      if (match) rules.push({ match, ...(vendored !== undefined ? { vendored: vendored ?? undefined } : {}), ...(generated !== undefined ? { generated: generated ?? undefined } : {}) });
    }
  }
  if (rules.length === 0) return () => undefined;

  const answers = new Map<string, boolean | undefined>();
  return (rel) => {
    if (answers.has(rel)) return answers.get(rel);
    let vendored: boolean | undefined;
    let generated: boolean | undefined;
    for (const rule of rules) {
      if (!rule.match(rel)) continue;
      if ("vendored" in rule) vendored = rule.vendored;
      if ("generated" in rule) generated = rule.generated;
    }
    const answer = vendored || generated ? true : vendored === false || generated === false ? false : undefined;
    answers.set(rel, answer);
    return answer;
  };
}
