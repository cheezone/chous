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

/** `a 6763, b 6503, …`: the largest first, a few for the message (the details hold them all). */
function top(items: Array<[string, number | string]>, max = 5): string {
  return items.slice(0, max).map(([name, n]) => `${name} ${n}`).join(", ") + (items.length > max ? ", …" : "");
}

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
      const files = top(long.map((f) => [f.path, `${f.lines} / ${kib(f.bytes)} KiB`]));
      report(`${root}#measure:long`, "./", { key: "issue.measure.longFiles", params: { count: long.length, lines: MEASURES.sourceLines, kib: kib(MEASURES.sourceBytes), files } }, "review", "order", { files: long });
    }
    const flat = [...perDir].filter(([, n]) => n > MEASURES.filesPerDir).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (flat.length) {
      report(`${root}#measure:flat`, "./", { key: "issue.measure.flatDirs", params: { count: flat.length, limit: MEASURES.filesPerDir, dirs: top(flat) } }, "review", "order", { dirs: flat.map(([path, files]) => ({ path, files })) });
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
    if (groups.length) {
      // The copies that cost the most first.
      groups.sort((a, b) => b.bytes * (b.files.length - 1) - a.bytes * (a.files.length - 1) || a.files[0]!.localeCompare(b.files[0]!));
      const size = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MiB` : `${Math.max(1, Math.round(bytes / 1024))} KiB`);
      const shown = groups.slice(0, 3).map((g) => `${g.files.length} × ${size(g.bytes)}: ${g.files.slice(0, 3).join(", ")}${g.files.length > 3 ? ", …" : ""}`);
      report(`${root}#measure:copies`, "./", { key: "issue.measure.copies", params: { count: groups.length, groups: shown.join("; ") + (groups.length > 3 ? "; …" : "") } }, "review", "order", { groups });
    }
    return { hitCount };
  }
}
