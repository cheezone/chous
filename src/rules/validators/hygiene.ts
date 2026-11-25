import { closeSync, existsSync, lstatSync, openSync, readdirSync, readFileSync, readSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ArtifactsRule, IssueMessage, LeftoverRule, Rule, TwinsRule, Verdict } from "../../types";
import type { MessageKey } from "../../i18n";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { BaseRuleValidator } from "./base";
import {
  ARTIFACT_DIRS,
  BUNDLER_CONFIG,
  EXECUTABLES,
  INSTALLERS,
  DECISION_RECORD,
  DOC_FILE,
  NAME_EXEMPT,
  NOT_OURS,
  ONE_OFF_SCRIPT,
  KNOWN_BY_CONTENT,
  CLAUDE_MD_LINES,
  RECORD_DIRS,
  SERIES,
  VERSION_NAMED,
  ROOT_CONTRACT_DOCS,
  ROOT_DOCS_LIMIT,
  SOURCE_FILE,
  SYNONYM_DIRS,
  WORKLOG,
  backupOf,
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
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
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
        rawIssues.push(issueFromRule(rule, {
          path: resolve(root, rel),
          displayPath: `${rel}/`,
          message: { key: "issue.leak.artifact" },
        }));
      }
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
        return statSync(e.absPath).size < 256_000 ? readFileSync(e.absPath, "utf8") : "";
      } catch {
        return "";
      }
    })
    .join("\n");
}

function lineCount(path: string): number {
  try {
    return readFileSync(path, "utf8").split(/\r?\n/).length - 1;
  } catch {
    return 0;
  }
}

/** `a, b, c, d, e, …` */
function list(names: string[], max = 5): string {
  const sorted = [...names].sort();
  return sorted.slice(0, max).join(", ") + (sorted.length > max ? ", …" : "");
}

/** The first bytes of a file, as latin1; NULs dropped for text (desktop.ini is often UTF-16), kept for signatures. */
function head(path: string, bytes = 512, keepNul = false): string {
  try {
    const fd = openSync(path, "r");
    const buf = Buffer.alloc(bytes);
    const n = readSync(fd, buf, 0, bytes, 0);
    closeSync(fd);
    const text = buf.subarray(0, n).toString("latin1");
    return keepNul ? text : text.replaceAll("\0", "");
  } catch {
    return "";
  }
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
    const push = (map: Map<string, string[]>, key: string, name: string) => map.set(key, [...(map.get(key) ?? []), name]);
    const rootLogs: string[] = [];
    // Named in package.json, a config or the README: someone runs it.
    const referenced = rule.scripts ? rootText(snapshot) : "";

    for (const [rel, entry] of snapshot.byRel) {
      if (entry.isDir || NOT_OURS.test(rel)) continue;
      const atRoot = !rel.includes("/");
      const name = entry.name;
      const stem = name.replace(/\.[^.]+$/, "");

      const known = KNOWN_BY_CONTENT.find((k) => k.name === name);
      if (known) {
        if (known.content.test(head(entry.absPath))) report(rel, { key: "issue.no.because", params: { reason: { t: known.reason } } });
        continue;
      }

      if (DOC_FILE.test(name)) {
        if (atRoot && !ROOT_CONTRACT_DOCS.test(name)) extraDocs.push(name);
        const dir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : ".";
        if (VERSION_NAMED.test(stem)) push(versionSeries, dir, name);
        if (RECORD_DIRS.test(dir.split("/").at(-1)!)) push(recordDirs, dir, name);
        if (name === "CLAUDE.md") {
          const lines = lineCount(entry.absPath);
          if (lines > CLAUDE_MD_LINES) {
            hitCount++;
            rawIssues.push(issueFromRule(rule, { path: entry.absPath, displayPath: rel, message: { key: "issue.leftover.claudeLong", params: { lines, limit: CLAUDE_MD_LINES } }, value: "convention" }));
          }
        }
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

      const original = backupOf(name);
      if (original) {
        const sibling = rel.includes("/") ? `${rel.slice(0, rel.lastIndexOf("/"))}/${original}` : original;
        if (snapshot.byRel.has(sibling)) report(rel, { key: "issue.leftover.backup", params: { original } });
        else report(rel, { key: "issue.leftover.maybeBackup" }, "review");
        continue;
      }

      const installer = INSTALLERS.find((b) => b.ext.test(name));
      if (installer && installer.magic.some((m) => head(entry.absPath, 8, true).startsWith(m))) {
        report(rel, { key: "issue.leftover.installer" });
        continue;
      }
      const executable = EXECUTABLES.find((b) => b.ext.test(name));
      if (executable && executable.magic.some((m) => head(entry.absPath, 8, true).startsWith(m))) {
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
    const report = (rel: string, key: MessageKey, other?: string) => {
      hitCount++;
      context.rawIssues.push(issueFromRule(rule, {
        path: resolve(context.root, rel),
        displayPath: rel,
        message: { key, params: other ? { other } : undefined },
      }));
    };

    const seen = new Map<string, string>();
    for (const rel of [...snapshot.byRel.keys()].sort()) {
      if (NOT_OURS.test(rel)) continue;
      // Compare within one directory: children of `Docs/` vs `docs/` are the same finding.
      const slash = rel.lastIndexOf("/");
      const key = `${rel.slice(0, slash + 1)}${rel.slice(slash + 1).toLowerCase()}`;
      const other = seen.get(key);
      if (other === undefined) seen.set(key, rel);
      else report(rel, "issue.twins.case", other);
    }

    const rootDirs = new Set(snapshot.listDir(".").filter((e) => e.isDir).map((e) => e.name));
    for (const group of SYNONYM_DIRS) {
      const present = group.filter((d) => rootDirs.has(d));
      if (present.length > 1) report(present.map((d) => `${d}/`).join(" + "), "issue.twins.synonyms");
    }

    // The same instructions twice. Bun and cal.com keep one file and symlink the other;
    // Claude Code's docs also offer `@AGENTS.md` in CLAUDE.md. Different contents are
    // fine: a CLAUDE.md may add to AGENTS.md on purpose.
    if (sameRegularFile(resolve(context.root, "AGENTS.md"), resolve(context.root, "CLAUDE.md"))) {
      report("CLAUDE.md", "issue.twins.copy", "AGENTS.md");
    }

    hitCount += mixedStyles(rule, context);

    for (const dir of rootDirs) {
      if (SYNONYM_DIRS.some((g) => g.includes(dir))) continue;
      if (rootDirs.has(`${dir}s`)) report(`${dir}/`, "issue.twins.plural", `${dir}s/`);
    }
    return { hitCount };
  }
}

/** Two regular files (not symlinks) with the same text. */
function sameRegularFile(a: string, b: string): boolean {
  try {
    if (lstatSync(a).isSymbolicLink() || lstatSync(b).isSymbolicLink()) return false;
    return readFileSync(a, "utf8").trim() === readFileSync(b, "utf8").trim();
  } catch {
    return false;
  }
}

/**
 * One directory, one way of naming. Multi-word source files sharing a
 * directory should agree: `asyncData.ts` beside `lazy-hydration.ts` (Nuxt) is
 * two conventions in one place. Which one is up to you. PascalCase (components,
 * classes) and one-word names fit any convention; names a tool chose
 * (`vite-env.d.ts`, `not-found.tsx`) are not the project's choice.
 */
function mixedStyles(rule: TwinsRule, context: RuleValidatorContext): number {
  const byDir = new Map<string, Map<string, string[]>>();
  for (const [rel, entry] of context.snapshot.byRel) {
    if (entry.isDir || NOT_OURS.test(rel) || !SOURCE_FILE.test(entry.name) || NAME_EXEMPT.test(entry.name)) continue;
    const style = nameStyle(entry.name.split(".")[0]!);
    if (!style) continue;
    const dir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : ".";
    const styles = byDir.get(dir) ?? new Map<string, string[]>();
    styles.set(style, [...(styles.get(style) ?? []), entry.name]);
    byDir.set(dir, styles);
  }
  let hits = 0;
  for (const [dir, styles] of byDir) {
    if (styles.size < 2) continue;
    hits++;
    const ordered = [...styles].sort((a, b) => b[1].length - a[1].length);
    context.rawIssues.push(issueFromRule(rule, {
      path: `${resolve(context.root, dir)}#styles`,
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
