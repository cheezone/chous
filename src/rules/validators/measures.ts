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
 * side since. Found from paths and bytes alone. Candidates come from the
 * paths few directories share (`index.ts` or `package.json`, everywhere,
 * pairs nothing); a candidate is then judged on everything both hold. Only
 * the outermost pair is kept (`apps/a`, not also `apps/a/src`), and
 * directories copied from one another are one set, as long as the whole set
 * still is mostly the same; a set that is not stays apart.
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
  const pairs = new Map<string, { a: string; b: string; seen: number }>();
  for (const list of index.values()) {
    if (!list || list.length < 2) continue;
    const dirs = [...list].sort();
    for (let i = 0; i < dirs.length; i++) {
      for (let j = i + 1; j < dirs.length; j++) {
        const [a, b] = [dirs[i]!, dirs[j]!];
        if (b.startsWith(`${a}/`)) continue; // a directory and one inside it
        const key = `${a}\u0000${b}`;
        const pair = pairs.get(key) ?? { a, b, seen: 0 };
        pair.seen++;
        pairs.set(key, pair);
      }
    }
  }
  const depth = (p: { a: string; b: string }) => p.a.split("/").length + p.b.split("/").length;
  const candidates = [...pairs.values()]
    .filter((p) => p.seen >= MEASURES.mirrorFiles)
    .sort((x, y) => depth(x) - depth(y) || x.a.localeCompare(y.a) || x.b.localeCompare(y.b));

  // What each candidate directory holds, in full: common paths count once a pair is judged.
  const wanted = new Set(candidates.flatMap((p) => [p.a, p.b]));
  const contents = new Map<string, Set<string>>();
  for (const rel of sizes.keys()) {
    for (let i = rel.indexOf("/"); i > 0; i = rel.indexOf("/", i + 1)) {
      const dir = rel.slice(0, i);
      if (!wanted.has(dir)) continue;
      const set = contents.get(dir) ?? new Set<string>();
      set.add(rel.slice(i + 1));
      contents.set(dir, set);
    }
  }
  const same = (x: string, y: string) => sizes.get(x) === sizes.get(y) && hash(x) !== undefined && hash(x) === hash(y);
  /** The paths two or more of `dirs` hold, which of them are the same in all, and whether that is most of them. */
  const judge = (dirs: string[]) => {
    const count = new Map<string, number>();
    for (const d of dirs) for (const r of contents.get(d) ?? []) count.set(r, (count.get(r) ?? 0) + 1);
    const changed: string[] = [];
    const identical: string[] = [];
    for (const rest of [...count].filter(([, n]) => n >= 2).map(([r]) => r).sort()) {
      const holders = dirs.filter((d) => contents.get(d)?.has(rest)).map((d) => `${d}/${rest}`);
      if (holders.every((h) => same(holders[0]!, h))) identical.push(rest);
      else changed.push(rest);
    }
    const shared = identical.length + changed.length;
    const smallest = Math.min(...dirs.map((d) => under.get(d) ?? 0));
    const ok = identical.length >= MEASURES.mirrorFiles && identical.length * 2 >= shared && shared * 2 >= smallest;
    return { dirs: [...dirs].sort(), identical, changed, ok };
  };

  const sets: Array<Set<string> | undefined> = [];
  const setsOf = (dir: string) => sets.flatMap((s, i) => (s?.has(dir) ? [i] : []));
  // `apps/a/src` and `apps/b/src` say again what `apps/a` and `apps/b`, in one set, already say.
  const inside = ({ a, b }: { a: string; b: string }) => {
    for (let i = a.indexOf("/"); i > 0; i = a.indexOf("/", i + 1)) {
      const [x, offset] = [a.slice(0, i), a.slice(i)];
      if (!b.endsWith(offset)) continue;
      const y = b.slice(0, b.length - offset.length);
      if (sets.some((s) => s?.has(x) && s.has(y))) return true;
    }
    return false;
  };
  for (const p of candidates) {
    if (inside(p) || !judge([p.a, p.b]).ok) continue;
    const touching = [...new Set([...setsOf(p.a), ...setsOf(p.b)])];
    const merged = new Set<string>([p.a, p.b, ...touching.flatMap((i) => [...sets[i]!])]);
    if (touching.length && judge([...merged]).ok) {
      for (const i of touching) sets[i] = undefined;
      sets.push(merged);
    } else sets.push(new Set([p.a, p.b]));
  }

  const covered = new Set<string>();
  const result = sets.flatMap((s) => {
    if (!s) return [];
    const { dirs, identical, changed } = judge([...s]);
    for (const rest of identical) for (const d of dirs) if (contents.get(d)?.has(rest)) covered.add(`${d}/${rest}`);
    return [{ dirs, same: identical.length, differ: changed.length, changed }];
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
