import { existsSync, readdirSync } from "node:fs";
import { readBytes, readTail, readText } from "../../fsutil";
import { join, resolve } from "node:path";
import type { ArtifactsRule, IssueMessage, LeftoverRule, Rule, TwinsRule, Verdict } from "../../types";
import type { MessageKey } from "../../i18n";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { BaseRuleValidator } from "./base";
import {
  ARTIFACT_DIRS,
  MARKED_OUTPUT,
  BUNDLER_CONFIG,
  EXECUTABLES,
  INSTALLERS,
  isCoreDump,
  DOC_FILE,
  NAME_EXEMPT,
  KNOWN_BY_CONTENT,
  ROOT_CONTRACT_DOCS,
  ROOT_DOCS_LIMIT,
  languageOf,
  OTHER_CODE,
  goStem,
  nameStyle,
} from "../../taste/hygiene";

function safeList(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

/** A `build` script in package.json, or a bundler config beside it. */
function buildsSomething(dir: string): boolean {
  try {
    const pkg = JSON.parse(readText(join(dir, "package.json")));
    if (pkg?.scripts && Object.keys(pkg.scripts).some((s) => /^build\b/.test(s))) return true;
  } catch {
    // no readable package.json
  }
  try {
    return readdirSync(dir).some((f) => BUNDLER_CONFIG.test(f));
  } catch {
    return false;
  }
}

/** Files that only keep a directory in git. */
const PLACEHOLDER = /^\.(gitkeep|keep|gitignore|gitattributes)$/;

/** Build output that is not gitignored, so it gets committed. */
export class ArtifactsRuleValidator extends BaseRuleValidator<ArtifactsRule> {
  canHandle(rule: Rule): rule is ArtifactsRule {
    return rule.kind === "artifacts";
  }

  protected async validateInternal(rule: ArtifactsRule, context: RuleValidatorContext) {
    const { root, snapshot, rawIssues } = context;
    const parents = ["", ...[...snapshot.byRel.values()].filter((e) => e.isDir).map((e) => e.relPath)];
    const ignored = (rel: string) => snapshot.ig.ignores(rel) || snapshot.ig.ignores(`${rel}/`);
    let hitCount = 0;
    const reported: string[] = [];
    const within = (rel: string) => reported.some((dir) => rel === dir || rel.startsWith(`${dir}/`));

    for (const parent of parents) {
      if (context.snapshot.notOurs.test(`${parent}/`)) continue;
      // An artifact's own contents are not candidates for more artifacts.
      if (ARTIFACT_DIRS.some(({ dir }) => parent === dir || parent.endsWith(`/${dir}`) || parent.includes(`/${dir}/`) || parent.startsWith(`${dir}/`))) continue;
      const parentAbs = resolve(root, parent);
      for (const { dir, when, unless, marker, markerMatch, built } of ARTIFACT_DIRS) {
        const rel = parent ? `${parent}/${dir}` : dir;
        if (!existsSync(join(parentAbs, dir)) || ignored(rel)) continue;
        if (when && !when.some((f) => existsSync(join(parentAbs, f)))) continue;
        if (unless?.some((f) => existsSync(join(parentAbs, f)))) continue;
        if (marker && !marker.some((f) => existsSync(join(parentAbs, dir, f)))) continue;
        if (markerMatch && !safeList(join(parentAbs, dir)).some((f) => markerMatch.test(f))) continue;
        if (built && !buildsSomething(parentAbs)) continue;
        hitCount++;
        reported.push(rel);
        rawIssues.push(issueFromRule(rule, {
          path: resolve(root, rel),
          displayPath: `${rel}/`,
          message: { key: "issue.leak.artifact" },
        }));
      }
    }

    // Shallow first, so a cache inside a reported virtual environment is not reported again.
    const files = [...snapshot.byRel.values()].filter((e) => !e.isDir).sort((a, b) => a.relPath.split("/").length - b.relPath.split("/").length);
    for (const entry of files) {
      const marked = MARKED_OUTPUT.find((m) => m.name.test(entry.name));
      if (!marked || context.snapshot.notOurs.test(entry.relPath)) continue;
      const rel = marked.dir ? entry.relPath.slice(0, -entry.name.length - 1) : entry.relPath;
      if (!rel || within(rel) || !marked.content.test(head(entry.absPath, 4096))) continue;
      // Matomo commits `tmp/CACHEDIR.TAG` beside a `.gitkeep` to tag the directory: the cache itself is not committed.
      if (marked.dir && !files.some((f) => f.relPath.startsWith(`${rel}/`) && !PLACEHOLDER.test(f.name) && !MARKED_OUTPUT.some((m) => m.name.test(f.name)))) continue;
      hitCount++;
      reported.push(rel);
      rawIssues.push(issueFromRule(rule, {
        path: resolve(root, rel),
        displayPath: marked.dir ? `${rel}/` : rel,
        message: { key: `issue.leak.${marked.key}` },
      }));
    }
    return { hitCount };
  }
}

/** The first bytes of a file, as latin1; NULs dropped for text (desktop.ini is often UTF-16), kept for signatures. */
function head(path: string, bytes = 512, keepNul = false): string {
  const text = readBytes(path, bytes).toString("latin1");
  return keepNul ? text : text.replaceAll("\0", "");
}

/**
 * What a work session leaves behind, known by what is in it: OS junk (by what
 * the OS writes into it), installers and binaries (by their signatures), a
 * crowded root. A name's words are never the evidence: `FIXES_SUMMARY.md`,
 * `index.ts.bak` or `报告-最终版.md` say nothing chous can check.
 */
export class LeftoverRuleValidator extends BaseRuleValidator<LeftoverRule> {
  canHandle(rule: Rule): rule is LeftoverRule {
    return rule.kind === "leftover";
  }

  protected async validateInternal(rule: LeftoverRule, context: RuleValidatorContext) {
    const { snapshot, rawIssues } = context;
    let hitCount = 0;
    const report = (rel: string, message: IssueMessage, verdict: Verdict = "smell", details?: Record<string, unknown>) => {
      hitCount++;
      rawIssues.push(issueFromRule(rule, { path: resolve(context.root, rel), displayPath: rel, message, verdict, ...(details ? { details } : {}) }));
    };
    const extraDocs: string[] = [];

    for (const [rel, entry] of snapshot.byRel) {
      if (entry.isDir || context.snapshot.notOurs.test(rel)) continue;
      const atRoot = !rel.includes("/");
      const name = entry.name;

      const known = KNOWN_BY_CONTENT.find((k) => k.name.test(name));
      if (known) {
        if (known.content.test(head(entry.absPath, 512, known.binary))) report(rel, { key: "issue.no.because", params: { reason: { t: known.reason } } });
        continue;
      }

      if (DOC_FILE.test(name)) {
        if (atRoot && !ROOT_CONTRACT_DOCS.test(name)) extraDocs.push(name);
        continue;
      }

      const installer = INSTALLERS.find((b) => b.ext.test(name));
      const signed = installer && (installer.trailer
        ? readTail(entry.absPath, 512).toString("latin1").startsWith(installer.trailer)
        : installer.magic.some((m) => head(entry.absPath, 8, true).startsWith(m)));
      if (signed) {
        report(rel, { key: "issue.leftover.installer" });
        continue;
      }
      const executable = EXECUTABLES.find((b) => b.ext.test(name));
      const header = executable ? head(entry.absPath, 18, true) : "";
      if (executable && isCoreDump(header)) report(rel, { key: "issue.no.because", params: { reason: { t: "reason.coreDump" } } });
      else if (executable && executable.magic.some((m) => header.startsWith(m))) {
        report(rel, { key: "issue.leftover.executable" }, "review");
      }
    }

    // The repository says two things: .gitignore keeps it out, the index has it in.
    for (const { path, files } of snapshot.ignoredTracked ?? []) {
      if (context.snapshot.notOurs.test(path)) continue;
      report(path, { key: "issue.leftover.ignoredTracked" }, "smell", { files });
    }

    if (rule.rootDocs && extraDocs.length > ROOT_DOCS_LIMIT) {
      hitCount++;
      rawIssues.push(issueFromRule(rule, {
        path: `${context.root}#root-docs`,
        displayPath: "./",
        message: { key: "issue.leftover.rootDocs", params: { count: extraDocs.length, limit: ROOT_DOCS_LIMIT } },
        value: "order",
        details: { docs: [...extraDocs].sort() },
      }));
    }
    return { hitCount };
  }
}

/** Microsoft's "Naming Files, Paths, and Namespaces": reserved device names, with or without an extension. */
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9\u00b9\u00b2\u00b3]|lpt[1-9\u00b9\u00b2\u00b3])(\.|$)/i;
/** The reserved characters, and the integers 0 through 31 (`/` cannot be in a name anywhere). */
const WINDOWS_CHARS = /[<>:"\\|?*\u0000-\u001f]/g;

export function windowsProblem(name: string): { key: MessageKey; chars?: string } | undefined {
  if (WINDOWS_RESERVED.test(name)) return { key: "issue.twins.winReserved" };
  const chars = [...new Set(name.match(WINDOWS_CHARS) ?? [])];
  if (chars.length) return { key: "issue.twins.winChars", chars: chars.map((c) => (c < " " ? `\\x${c.charCodeAt(0).toString(16).padStart(2, "0")}` : c)).join(" ") };
  if (/[ .]$/.test(name) && name !== "." && name !== "..") return { key: "issue.twins.winTrailing" };
  return undefined;
}

/**
 * One thing, two spellings: `README.md` next to `Readme.md` (case-insensitive
 * file systems keep one), one directory naming files two ways. What names mean (`test/` and `tests/`, `plugin/` and
 * `plugins/`) is a question of language, and chous does not read language.
 */
export class TwinsRuleValidator extends BaseRuleValidator<TwinsRule> {
  canHandle(rule: Rule): rule is TwinsRule {
    return rule.kind === "twins";
  }

  protected async validateInternal(rule: TwinsRule, context: RuleValidatorContext) {
    const { snapshot } = context;
    let hitCount = 0;
    const report = (rel: string, key: MessageKey, other?: string, verdict?: Verdict, path = resolve(context.root, rel)) => {
      hitCount++;
      context.rawIssues.push(issueFromRule(rule, {
        path,
        displayPath: rel,
        message: { key, params: other ? { other } : undefined },
        ...(verdict ? { verdict } : {}),
      }));
    };

    const seen = new Map<string, string>();
    for (const rel of [...snapshot.byRel.keys()].sort()) {
      if (context.snapshot.notOurs.test(rel)) continue;
      // Compare within one directory: children of `Docs/` vs `docs/` are the same finding.
      const slash = rel.lastIndexOf("/");
      const parent = rel.slice(0, slash + 1);
      const name = rel.slice(slash + 1);
      // macOS and Windows fold case; macOS also folds the two Unicode forms of `é`.
      const key = `${parent.normalize("NFC")}${name.normalize("NFC").toLowerCase()}`;
      const other = seen.get(key);
      if (other === undefined) seen.set(key, rel);
      else report(rel, rel.normalize("NFC") === other.normalize("NFC") ? "issue.twins.unicode" : "issue.twins.case", other);
      // A name Windows cannot create: git for Windows refuses to check it out.
      const windows = windowsProblem(name);
      if (windows) {
        hitCount++;
        context.rawIssues.push(issueFromRule(rule, {
          path: resolve(context.root, rel),
          displayPath: snapshot.byRel.get(rel)?.isDir ? `${rel}/` : rel,
          message: { key: windows.key, ...(windows.chars ? { params: { chars: windows.chars } } : {}) },
          reason: false,
        }));
      }
    }

    hitCount += mixedStyles(rule, context);
    return { hitCount };
  }
}

/**
 * One directory, one way of naming. Multi-word source files of one language
 * sharing a directory should agree: `asyncData.ts` beside `lazy-hydration.ts`
 * (Nuxt) is two conventions in one place. Which one is up to you. PascalCase
 * (components, classes) and one-word names fit any convention; names a tool
 * chose (`vite-env.d.ts`, `not-found.tsx`, Go's `_test` and `_linux`) are not
 * the project's choice.
 */
function mixedStyles(rule: TwinsRule, context: RuleValidatorContext): number {
  const byDir = new Map<string, Map<string, string[]>>();
  for (const [rel, entry] of context.snapshot.byRel) {
    const language = entry.isDir ? undefined : languageOf(entry.name);
    if (!language || context.snapshot.notOurs.test(rel) || NAME_EXEMPT.test(entry.name)) continue;
    // A leading `_` or `$` marks private or special files; the name after it is the style.
    const style = nameStyle((language === "go" ? goStem(entry.name) : entry.name.split(".")[0]!).replace(/^[_$]+/, ""));
    if (!style || (style === "camelCase" && language === "py")) continue; // PEP 8: no capitals
    // One finding per directory; languages are compared apart within it.
    const dir = `${rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "."}\u0000${language}`;
    const styles = byDir.get(dir) ?? new Map<string, string[]>();
    const names = styles.get(style);
    if (names) names.push(entry.name);
    else styles.set(style, [entry.name]);
    byDir.set(dir, styles);
  }
  // Directories are named too: siblings that hold only JavaScript or TypeScript should agree, like files.
  const code = new Map<string, "js" | "other">();
  for (const [rel, entry] of context.snapshot.byRel) {
    if (entry.isDir || context.snapshot.notOurs.test(rel)) continue;
    const kind = languageOf(entry.name) === "js" ? "js" : OTHER_CODE.test(entry.name) ? "other" : undefined;
    if (!kind) continue;
    for (let i = rel.indexOf("/"); i > 0; i = rel.indexOf("/", i + 1)) {
      const dir = rel.slice(0, i);
      if (code.get(dir) !== "other") code.set(dir, kind);
    }
  }
  for (const [rel, kind] of code) {
    // A dot directory is a tool's; node_modules is npm's, wherever it sits.
    if (kind !== "js" || rel.split("/").some((seg) => seg.startsWith(".") || seg === "node_modules")) continue;
    const name = rel.slice(rel.lastIndexOf("/") + 1);
    const style = nameStyle(name.replace(/^[_$]+/, ""));
    if (!style) continue;
    const key = `${rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "."}\u0000dirs`;
    const styles = byDir.get(key) ?? new Map<string, string[]>();
    styles.set(style, [...(styles.get(style) ?? []), name]);
    byDir.set(key, styles);
  }

  let hits = 0;
  for (const [key, styles] of byDir) {
    if (styles.size < 2) continue;
    hits++;
    const [dir, language] = key.split("\u0000") as [string, string];
    const ordered = [...styles].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    context.rawIssues.push(issueFromRule(rule, {
      path: `${resolve(context.root, dir)}#styles:${language}`,
      displayPath: dir === "." ? "./" : `${dir}/`,
      message: {
        key: language === "dirs" ? "issue.twins.dirStyles" : "issue.twins.styles",
        params: {
          styles: ordered.map(([s, names]) => `${s} ×${names.length}`).join(" + "),
          examples: ordered.map(([, names]) => names.sort()[0]).join(", "),
        },
      },
      details: { styles: Object.fromEntries(ordered.map(([s, names]) => [s, names.sort()])) },
    }));
  }
  return hits;
}
