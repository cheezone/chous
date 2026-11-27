import { statSync } from "node:fs";
import { resolve } from "node:path";
import { hashFile, readBytes } from "../../fsutil";
import type { IssueMessage, MeasuresRule, Rule, Value, Verdict } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { BaseRuleValidator } from "./base";
import { MEASURES, ROOT_CONTRACT_DOCS, SOURCE_FILE } from "../../taste/hygiene";

/** A tool says it wrote the file: its name and size are the generator's, not the project's. */
const GENERATED = /@generated\b|\bDO NOT (EDIT|MODIFY)\b|\b[Gg]enerated\b[^\n]{0,80}\b[Dd]o not (edit|modify)\b/;

const kib = (bytes: number) => Math.max(1, Math.round(bytes / 1024));

/** One file on disk, however many paths reach it (a tracked symlink to it is the same file), and its size. */
function identity(path: string): { id: string; size: number } | undefined {
  try {
    const s = statSync(path);
    return { id: `${s.dev}:${s.ino}`, size: s.size };
  } catch {
    return undefined;
  }
}

/**
 * Directories that copy each other: `apps/a/src` and `apps/b/src` hold the
 * same relative paths, most of them byte for byte, and some changed on one
 * side since. Found from paths and bytes alone: for every file, each split
 * into a directory and the rest of its path; two directories that share many
 * rests are paired. A rest shared by many directories (`index.ts`, `package.json`)
 * pairs nothing. Only the outermost pair is kept (`apps/a`, not also `apps/a/src`),
 * and directories copied from one another are one set.
 */
export function mirrorSets(sizes: Map<string, number>, hash: (rel: string) => string | undefined) {
  const FANOUT = 8;
  const under = new Map<string, number>();
  const index = new Map<string, string[] | null>();
  for (const rel of sizes.keys()) {
    for (let i = rel.indexOf("/"); i > 0; i = rel.indexOf("/", i + 1)) {
      const dir = rel.slice(0, i);
      under.set(dir, (under.get(dir) ?? 0) + 1);
      const rest = rel.slice(i + 1);
      const list = index.get(rest);
      if (list === null) continue;
      if (!list) index.set(rest, [dir]);
      else if (list.length >= FANOUT) index.set(rest, null);
      else list.push(dir);
    }
  }
  const pairs = new Map<string, { a: string; b: string; rests: string[] }>();
  for (const [rest, list] of index) {
    if (!list || list.length < 2) continue;
    const dirs = [...list].sort();
    for (let i = 0; i < dirs.length; i++) {
      for (let j = i + 1; j < dirs.length; j++) {
        const [a, b] = [dirs[i]!, dirs[j]!];
        if (b.startsWith(`${a}/`)) continue; // a directory and one inside it
        const key = `${a}\u0000${b}`;
        const pair = pairs.get(key) ?? { a, b, rests: [] };
        pair.rests.push(rest);
        pairs.set(key, pair);
      }
    }
  }
  const same = (x: string, y: string) => sizes.get(x) === sizes.get(y) && hash(x) !== undefined && hash(x) === hash(y);
  const depth = (p: { a: string; b: string }) => p.a.split("/").length + p.b.split("/").length;
  const candidates = [...pairs.values()]
    .filter((p) => p.rests.length >= MEASURES.mirrorFiles && p.rests.length * 2 >= Math.min(under.get(p.a)!, under.get(p.b)!))
    .sort((x, y) => depth(x) - depth(y) || x.a.localeCompare(y.a) || x.b.localeCompare(y.b));
  // Copies of copies are one set.
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p === x) return x;
    const r = find(p);
    parent.set(x, r);
    return r;
  };
  // `apps/a/src` and `apps/b/src` say again what `apps/a` and `apps/b`, one set, already say.
  const inside = ({ a, b }: { a: string; b: string }) => {
    for (let i = a.indexOf("/"); i > 0; i = a.indexOf("/", i + 1)) {
      const [x, offset] = [a.slice(0, i), a.slice(i)];
      if (!b.endsWith(offset)) continue;
      const y = b.slice(0, b.length - offset.length);
      if (parent.has(x) && parent.has(y) && find(x) === find(y)) return true;
    }
    return false;
  };
  const kept: Array<{ a: string; b: string; rests: string[] }> = [];
  for (const p of candidates) {
    if (inside(p)) continue;
    const identical = p.rests.filter((r) => same(`${p.a}/${r}`, `${p.b}/${r}`)).length;
    if (identical < MEASURES.mirrorFiles || identical * 2 < p.rests.length) continue;
    kept.push(p);
    for (const d of [p.a, p.b]) if (!parent.has(d)) parent.set(d, d);
    parent.set(find(p.a), find(p.b));
  }
  const sets = new Map<string, { dirs: Set<string>; rests: Set<string> }>();
  for (const { a, b, rests } of kept) {
    const set = sets.get(find(a)) ?? { dirs: new Set<string>(), rests: new Set<string>() };
    set.dirs.add(a).add(b);
    for (const r of rests) set.rests.add(r);
    sets.set(find(a), set);
  }
  const covered = new Set<string>();
  const result = [...sets.values()].map(({ dirs, rests }) => {
    const members = [...dirs].sort();
    const changed: string[] = [];
    let identical = 0;
    for (const rest of [...rests].sort()) {
      const holders = members.map((m) => `${m}/${rest}`).filter((p) => sizes.has(p));
      if (holders.length < 2) continue;
      if (holders.every((p) => same(holders[0]!, p))) {
        identical++;
        for (const p of holders) covered.add(p);
      } else changed.push(rest);
    }
    return { dirs: members, same: identical, differ: changed.length, changed };
  });
  result.sort((x, y) => y.same + y.differ - (x.same + x.differ) || x.dirs[0]!.localeCompare(y.dirs[0]!));
  return { sets: result, covered };
}

/** Newlines in a buffer. */
function lineCount(bytes: Buffer): number {
  let lines = 0;
  for (let i = bytes.indexOf(10); i >= 0; i = bytes.indexOf(10, i + 1)) lines++;
  return lines;
}

/**
 * What can be counted in any repository, in any language, without knowing a
 * tool: how long source files are, how many sit in one directory, how crowded
 * the root is, which files are copies of each other, how much agents are told
 * to read every session, and what GitHub will not take. The numbers are
 * chous's stance (taste/hygiene.ts, `MEASURES`); what a long file means is for
 * a person or an agent, who must not split files mechanically.
 */
export class MeasuresRuleValidator extends BaseRuleValidator<MeasuresRule> {
  canHandle(rule: Rule): rule is MeasuresRule {
    return rule.kind === "measures";
  }

  protected async validateInternal(rule: MeasuresRule, context: RuleValidatorContext) {
    const { root, snapshot, rawIssues } = context;
    let hitCount = 0;
    const report = (path: string, displayPath: string, message: IssueMessage, verdict: Verdict, value: Value, details?: Record<string, unknown>) => {
      hitCount++;
      rawIssues.push(issueFromRule(rule, { path, displayPath, message, verdict, value, ...(details ? { details } : {}) }));
    };

    const files = [...snapshot.byRel.values()].filter((e) => !e.isDir).sort((a, b) => a.relPath.localeCompare(b.relPath));
    const seen = new Set<string>();
    const long: Array<{ path: string; lines: number; bytes: number }> = [];
    const perDir = new Map<string, number>();
    const bySize = new Map<number, string[]>();
    const ours = new Map<string, number>();
    let rootFiles = 0;

    for (const entry of files) {
      const rel = entry.relPath;
      const file = identity(entry.absPath);
      if (!file || seen.has(file.id)) continue;
      seen.add(file.id);
      const { size } = file;

      // Every file of the history counts here, whoever wrote it.
      if (size >= MEASURES.hugeBytes) {
        report(resolve(root, rel), rel, { key: "issue.measure.hugeFile", params: { size: Math.floor(size / 1024 / 1024) } }, "smell", "cleanliness");
      }
      if (!rel.includes("/")) rootFiles++;
      if (snapshot.notOurs.test(rel)) continue;
      ours.set(rel, size);

      // Copies: large files, and instructions at any size (a CLAUDE.md that repeats AGENTS.md).
      // A README or LICENSE in every package is what their hosts ask for.
      const instructions = MEASURES.instructions.test(rel);
      if (size > 0 && (instructions || (size >= MEASURES.duplicateBytes && !ROOT_CONTRACT_DOCS.test(entry.name)))) {
        const same = bySize.get(size);
        if (same) same.push(rel);
        else bySize.set(size, [rel]);
      }

      if (instructions) {
        const lines = lineCount(readBytes(entry.absPath, 4 * 1024 * 1024));
        if (lines > MEASURES.instructionLines) {
          report(resolve(root, rel), rel, { key: "issue.measure.instructions", params: { lines, limit: MEASURES.instructionLines } }, "review", "order");
        }
        continue;
      }

      if (!SOURCE_FILE.test(entry.name)) continue;
      const dir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/") + 1) : "./";
      perDir.set(dir, (perDir.get(dir) ?? 0) + 1);
      const text = readBytes(entry.absPath, 16 * 1024 * 1024);
      if (GENERATED.test(text.subarray(0, 1024).toString("latin1"))) continue;
      const lines = lineCount(text);
      // Line endings are the checkout's, not the content's: Windows turns \n into \r\n.
      let crlf = 0;
      for (let i = text.indexOf("\r\n"); i >= 0; i = text.indexOf("\r\n", i + 2)) crlf++;
      const bytes = size - crlf;
      if (lines > MEASURES.sourceLines || bytes > MEASURES.sourceBytes) long.push({ path: rel, lines, bytes });
    }

    if (long.length) {
      long.sort((a, b) => b.lines - a.lines || b.bytes - a.bytes || a.path.localeCompare(b.path));
      report(`${root}#measure:long`, "./", { key: "issue.measure.longFiles", params: { count: long.length, lines: MEASURES.sourceLines, kib: kib(MEASURES.sourceBytes) } }, "review", "order", { files: long });
    }
    const flat = [...perDir].filter(([, n]) => n > MEASURES.filesPerDir).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (flat.length) {
      report(`${root}#measure:flat`, "./", { key: "issue.measure.flatDirs", params: { count: flat.length, limit: MEASURES.filesPerDir } }, "review", "order", { dirs: flat.map(([path, files]) => ({ path, files })) });
    }
    if (rootFiles > MEASURES.rootFiles) {
      report(`${root}#measure:root`, "./", { key: "issue.measure.crowdedRoot", params: { count: rootFiles, limit: MEASURES.rootFiles } }, "review", "order");
    }

    // Same size first, then the same bytes: most files are never read twice.
    const groups: Array<{ files: string[]; bytes: number }> = [];
    for (const [bytes, paths] of bySize) {
      if (paths.length < 2) continue;
      const byHash = new Map<string, string[]>();
      for (const rel of paths) {
        const hash = hashFile(resolve(root, rel));
        if (!hash) continue;
        const same = byHash.get(hash);
        if (same) same.push(rel);
        else byHash.set(hash, [rel]);
      }
      for (const same of byHash.values()) if (same.length > 1) groups.push({ files: same, bytes });
    }
    // Whole directories copied: one finding for them, and their files leave the list of copies.
    const hashes = new Map<string, string | undefined>();
    const hashOf = (rel: string) => {
      if (!hashes.has(rel)) hashes.set(rel, hashFile(resolve(root, rel)));
      return hashes.get(rel);
    };
    const mirrors = mirrorSets(ours, hashOf);
    if (mirrors.sets.length) {
      report(`${root}#measure:mirrors`, "./", { key: "issue.measure.mirrors", params: { count: mirrors.sets.length } }, "review", "order", { mirrors: mirrors.sets });
    }
    groups.splice(0, groups.length, ...groups.filter((g) => !g.files.every((f) => mirrors.covered.has(f))));
    if (groups.length) {
      // The copies that cost the most first.
      groups.sort((a, b) => b.bytes * (b.files.length - 1) - a.bytes * (a.files.length - 1) || a.files[0]!.localeCompare(b.files[0]!));
      report(`${root}#measure:copies`, "./", { key: "issue.measure.copies", params: { count: groups.length } }, "review", "order", { groups });
    }
    return { hitCount };
  }
}
