import { existsSync, lstatSync, readdirSync, statSync } from "node:fs";
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
  DECISION_RECORD,
  DOC_FILE,
  NAME_EXEMPT,
  NOT_OURS,
  ONE_OFF_SCRIPT,
  KNOWN_BY_CONTENT,
  RECORD_DIRS,
  SERIES,
  VERSION_NAMED,
  ROOT_CONTRACT_DOCS,
  ROOT_DOCS_LIMIT,
  languageOf,
  goStem,
  SYNONYM_DIRS,
  WORKLOG,
  backupOf,
  backupOnlyBeside,
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
      if (NOT_OURS.test(`${parent}/`)) continue;
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
      if (!marked || NOT_OURS.test(entry.relPath)) continue;
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

/** Text of the root's own files (package.json, configs, README), small ones only. */
function rootText(snapshot: RuleValidatorContext["snapshot"]): string {
  return snapshot.listDir(".")
    .filter((e) => !e.isDir && !ONE_OFF_SCRIPT.test(e.name))
    .map((e) => {
      try {
        return readText(e.absPath, 256_000);
      } catch {
        return "";
      }
    })
    .join("\n");
}

/** `a, b, c, d, e, …` */
function list(names: string[], max = 5): string {
  const sorted = [...names].sort();
  return sorted.slice(0, max).join(", ") + (sorted.length > max ? ", …" : "");
}

/** The first bytes of a file, as latin1; NULs dropped for text (desktop.ini is often UTF-16), kept for signatures. */
function head(path: string, bytes = 512, keepNul = false): string {
  const text = readBytes(path, bytes).toString("latin1");
  return keepNul ? text : text.replaceAll("\0", "");
}

/**
 * What a work session leaves behind. Smells where chous knows: OS junk (by
 * what the OS writes into it), built binaries, a copy next to its original, a
 * crowded root. Review where only the name speaks: work logs, one-off scripts,
 * a backup whose original is gone.
 */
export class LeftoverRuleValidator extends BaseRuleValidator<LeftoverRule> {
  canHandle(rule: Rule): rule is LeftoverRule {
    return rule.kind === "leftover";
  }

  protected async validateInternal(rule: LeftoverRule, context: RuleValidatorContext) {
    const { snapshot, rawIssues } = context;
    let hitCount = 0;
    const report = (rel: string, message: IssueMessage, verdict: Verdict = "smell") => {
      hitCount++;
      rawIssues.push(issueFromRule(rule, { path: resolve(context.root, rel), displayPath: rel, message, verdict }));
    };
    const extraDocs: string[] = [];
    const versionSeries = new Map<string, string[]>();
    const recordDirs = new Map<string, string[]>();
    const push = (map: Map<string, string[]>, key: string, name: string) => {
      const names = map.get(key);
      if (names) names.push(name);
      else map.set(key, [name]);
    };
    const rootLogs: string[] = [];
    // Named in package.json, a config or the README: someone runs it.
    const referenced = rule.scripts ? rootText(snapshot) : "";

    for (const [rel, entry] of snapshot.byRel) {
      if (NOT_OURS.test(rel)) continue;
      if (entry.isDir) {
        // `src copy/` or `src.bak/` beside `src/`: the whole folder, copied.
        const original = backupOf(entry.name);
        const sibling = original && (rel.includes("/") ? `${rel.slice(0, rel.lastIndexOf("/"))}/${original}` : original);
        if (sibling && snapshot.byRel.get(sibling)?.isDir) report(`${rel}/`, { key: "issue.leftover.backup", params: { original: `${original}/` } });
        continue;
      }
      const atRoot = !rel.includes("/");
      const name = entry.name;
      const stem = name.replace(/\.[^.]+$/, "");

      const known = KNOWN_BY_CONTENT.find((k) => k.name.test(name));
      if (known) {
        if (known.content.test(head(entry.absPath, 512, known.binary))) report(rel, { key: "issue.no.because", params: { reason: { t: known.reason } } });
        continue;
      }

      const named = backupOf(name);
      const original = named ?? backupOnlyBeside(name);
      const sibling = original && (rel.includes("/") ? `${rel.slice(0, rel.lastIndexOf("/"))}/${original}` : original);
      // A copy beside its original is a backup, whatever it holds, docs too. A name that only
      // says "old" or "backup" needs the same bytes as the original to be one.
      if (sibling && snapshot.byRel.has(sibling) && (named || sameBytes(entry.absPath, snapshot.byRel.get(sibling)!.absPath))) {
        report(rel, { key: "issue.leftover.backup", params: { original: original! } });
        continue;
      }

      if (DOC_FILE.test(name)) {
        if (atRoot && !ROOT_CONTRACT_DOCS.test(name)) extraDocs.push(name);
        const dir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : ".";
        if (VERSION_NAMED.test(stem)) push(versionSeries, dir, name);
        if (RECORD_DIRS.test(dir.split("/").at(-1)!)) push(recordDirs, dir, name);
        const format = DECISION_RECORD.test(rel) || (!atRoot && stem === "SUMMARY");
        if (!format && (atRoot || /^[A-Z0-9_-]+$/.test(stem)) && !ROOT_CONTRACT_DOCS.test(name) && WORKLOG.test(stem)) {
          if (atRoot) rootLogs.push(name);
          else report(rel, { key: "issue.leftover.worklog" }, "review");
        }
        continue;
      }

      if (rule.scripts && atRoot && ONE_OFF_SCRIPT.test(name) && !referenced.includes(name)) {
        report(rel, { key: "issue.leftover.script" }, "review");
        continue;
      }

      if (backupOf(name)) {
        report(rel, { key: "issue.leftover.maybeBackup" }, "review");
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

    for (const [dir, names] of versionSeries) {
      if (names.length >= SERIES) report(`${dir}/`, { key: "issue.leftover.versionNotes", params: { count: names.length, names: list(names) } }, "review");
    }
    for (const [dir, names] of recordDirs) {
      if (names.length >= SERIES) report(`${dir}/`, { key: "issue.leftover.records", params: { count: names.length, names: list(names) } }, "review");
    }

    // At the root they are one finding, not twenty.
    if (rootLogs.length === 1) report(rootLogs[0]!, { key: "issue.leftover.worklog" }, "review");
    if (rootLogs.length > 1) report("./", { key: "issue.leftover.worklogs", params: { count: rootLogs.length, names: list(rootLogs) } }, "review");

    if (rule.rootDocs && extraDocs.length > ROOT_DOCS_LIMIT) {
      hitCount++;
      rawIssues.push(issueFromRule(rule, {
        path: `${context.root}#root-docs`,
        displayPath: "./",
        message: { key: "issue.leftover.rootDocs", params: { count: extraDocs.length, limit: ROOT_DOCS_LIMIT, names: list(extraDocs) } },
        value: "order",
      }));
    }
    return { hitCount };
  }
}

/**
 * One concept, two names: `README.md` next to `Readme.md` (case-insensitive
 * file systems keep one), `test/` next to `tests/`, `plugin/` next to
 * `plugins/`, one directory naming files two ways, the same instructions twice.
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
    const dirsIn = new Map<string, Map<string, string>>(); // parent → lowercased name → name
    for (const rel of [...snapshot.byRel.keys()].sort()) {
      if (NOT_OURS.test(rel)) continue;
      // Compare within one directory: children of `Docs/` vs `docs/` are the same finding.
      const slash = rel.lastIndexOf("/");
      const parent = rel.slice(0, slash + 1);
      const name = rel.slice(slash + 1);
      // macOS and Windows fold case; macOS also folds the two Unicode forms of `é`.
      const key = `${parent.normalize("NFC")}${name.normalize("NFC").toLowerCase()}`;
      const other = seen.get(key);
      if (other === undefined) seen.set(key, rel);
      else report(rel, rel.normalize("NFC") === other.normalize("NFC") ? "issue.twins.unicode" : "issue.twins.case", other);
      if (snapshot.byRel.get(rel)?.isDir) {
        const siblings = dirsIn.get(parent) ?? new Map<string, string>();
        siblings.set(name.toLowerCase(), name);
        dirsIn.set(parent, siblings);
      }
    }

    // One concept, two names, in any directory: synonyms, and a plural beside its singular.
    for (const [parent, siblings] of dirsIn) {
      for (const group of SYNONYM_DIRS) {
        const present = group.flatMap((d) => (siblings.has(d) ? [siblings.get(d)!] : []));
        // `lib/test/ + __tests__/`: the parent once, so a workspace package's view of it is the same finding.
        if (present.length > 1) report(`${parent}${present.map((d) => `${d}/`).join(" + ")}`, "issue.twins.synonyms", undefined, undefined, `${resolve(context.root, parent + present[0]!)}#synonyms`);
      }
      for (const [lower, name] of siblings) {
        if (SYNONYM_DIRS.some((g) => g.includes(lower))) continue;
        const plural = [`${lower}s`, `${lower}es`, lower.endsWith("y") ? `${lower.slice(0, -1)}ies` : ""].find((p) => p && siblings.has(p));
        // At the root two names for one thing; deeper, `language/` beside `languages/` is as often two
        // things (zed's crates, routes that are URLs): the names are a fact, the meaning is for review.
        if (plural) report(`${parent}${name}/`, parent ? "issue.twins.pluralMaybe" : "issue.twins.plural", `${parent}${siblings.get(plural)}/`, parent ? "review" : undefined);
      }
    }

    // The same instructions twice. Bun and cal.com keep one file and symlink the other;
    // Claude Code's docs also offer `@AGENTS.md` in CLAUDE.md. Different contents are
    // fine: a CLAUDE.md may add to AGENTS.md on purpose.
    if (sameRegularFile(resolve(context.root, "AGENTS.md"), resolve(context.root, "CLAUDE.md"))) {
      report("CLAUDE.md", "issue.twins.copy", "AGENTS.md");
    }

    hitCount += mixedStyles(rule, context);
    return { hitCount };
  }
}

/** Two files with the same bytes; sizes are compared first, so large ones are rarely read. */
function sameBytes(a: string, b: string): boolean {
  try {
    const size = statSync(a).size;
    if (size !== statSync(b).size || size > 16 * 1024 * 1024) return false;
    return readBytes(a).equals(readBytes(b));
  } catch {
    return false;
  }
}

/** Two regular files (not symlinks) with the same text. */
function sameRegularFile(a: string, b: string): boolean {
  try {
    if (lstatSync(a).isSymbolicLink() || lstatSync(b).isSymbolicLink()) return false;
    return readText(a).trim() === readText(b).trim();
  } catch {
    return false;
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
  const angular = context.snapshot.manifest.deps.has("@angular/core");
  const byDir = new Map<string, Map<string, string[]>>();
  for (const [rel, entry] of context.snapshot.byRel) {
    const language = entry.isDir ? undefined : languageOf(entry.name);
    if (!language || NOT_OURS.test(rel) || NAME_EXEMPT.test(entry.name)) continue;
    if (angular && entry.name.endsWith(".ts")) continue; // Angular's style guide: hyphens
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
  let hits = 0;
  for (const [key, styles] of byDir) {
    if (styles.size < 2) continue;
    hits++;
    const [dir, language] = key.split("\u0000") as [string, string];
    const ordered = [...styles].sort((a, b) => b[1].length - a[1].length);
    context.rawIssues.push(issueFromRule(rule, {
      path: `${resolve(context.root, dir)}#styles:${language}`,
      displayPath: dir === "." ? "./" : `${dir}/`,
      message: {
        key: "issue.twins.styles",
        params: {
          styles: ordered.map(([s, names]) => `${s} ×${names.length}`).join(" + "),
          examples: ordered.map(([, names]) => names.sort()[0]).join(", "),
        },
      },
    }));
  }
  return hits;
}
