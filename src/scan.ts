import { type Dirent, existsSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { toDisplayPath } from "./fsutil";
import { lintWorkspace } from "./rules/lint";
import { formatIssueMessage } from "./rules/report";
import { getT, type TFunction } from "./i18n";
import type { Issue, LintResult } from "./types";

const DEFAULT_MAX_DEPTH = 4;

export type ScanRepoResult = {
  root: string;
  issues: Array<{
    displayPath: string;
    message: string;
    verdict: string;
    reason?: string;
    key: string;
    value: string;
    /** Every fact behind the finding, untruncated: the files, directories, copies. */
    details?: Record<string, unknown>;
  }>;
};

export type ScanResult = {
  repos: ScanRepoResult[];
};

/** Find directories that look like git repos (contain `.git`), up to maxDepth. */
export function findGitRepos(dir: string, maxDepth = DEFAULT_MAX_DEPTH): string[] {
  const abs = resolve(dir);
  const found: string[] = [];

  function walk(current: string, depth: number): void {
    if (depth > maxDepth) return;
    let entries: Dirent[];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((entry) => entry.name === ".git")) {
      found.push(current);
      // A repository is a unit: its nested folders are not searched.
      return;
    }
    if (depth >= maxDepth) return;
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const { name } = entry;
      if (name === "node_modules" || name === "dist" || name === "build" || name.startsWith(".")) continue;
      walk(join(current, name), depth + 1);
    }
  }

  walk(abs, 0);
  if (found.length === 0 && existsSync(abs)) found.push(abs);
  return found;
}

async function scanOneRepo(opts: { root: string; lang: string }): Promise<ScanRepoResult> {
  const { t } = getT(opts.lang);
  const result: LintResult = await lintWorkspace({ root: opts.root });
  const issues: ScanRepoResult["issues"] = result.issues.map((i: Issue) => ({
    displayPath: i.displayPath,
    message: formatIssueMessage(t, i.message),
    verdict: i.verdict,
    reason: i.reason && t(i.reason),
    key: i.message.key,
    value: i.value,
    ...(i.details ? { details: i.details } : {}),
  }));

  return { root: opts.root, issues };
}

export async function scanDirectory(opts: {
  dir: string;
  lang?: string;
  maxDepth?: number;
}): Promise<ScanResult> {
  const lang = opts.lang ?? "en";
  const repos = findGitRepos(opts.dir, opts.maxDepth ?? DEFAULT_MAX_DEPTH);
  const results: ScanRepoResult[] = [];
  for (const root of repos) {
    results.push(await scanOneRepo({ root, lang }));
  }
  return {
    repos: results.map((r) => ({
      ...r,
      root: relative(resolve(opts.dir), r.root) || ".",
    })),
  };
}

export function formatScanText(result: ScanResult, t: TFunction): string {
  const lines: string[] = [];
  for (const repo of result.repos) {
    lines.push(`# ${repo.root}`);
    lines.push(`  ${t("scan.issues", { count: repo.issues.length })}${repo.issues.length ? ":" : ""}`);
    for (const i of repo.issues.slice(0, 30)) {
      lines.push(`    - [${i.verdict}] ${i.displayPath}: ${i.message}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * The repositories to check when `dir` is a folder that holds some but is none
 * itself (nor inside one): each is its own project, with its own index and
 * ignore rules, as git sees it. Undefined when `dir` is checked as it is.
 */
export function reposBelow(dir: string): string[] | undefined {
  const abs = resolve(dir);
  for (let d = abs; ; d = dirname(d)) {
    if (existsSync(join(d, ".git"))) return undefined;
    if (dirname(d) === d) break;
  }
  const repos = findGitRepos(abs).filter((r) => r !== abs);
  return repos.length ? repos : undefined;
}

/** Paths inside a finding's details, from its repository's root to the folder's. */
function prefixDetails(details: Record<string, unknown>, prefix: string): Record<string, unknown> {
  const at = (p: unknown) => (typeof p === "string" ? `${prefix}${p}` : p);
  const out: Record<string, unknown> = { ...details };
  const list = (v: unknown) => (Array.isArray(v) ? v : undefined);
  if (list(out.files)) out.files = list(out.files)!.map((f) => (typeof f === "object" && f ? { ...f, path: at((f as { path: unknown }).path) } : at(f)));
  if (list(out.dirs)) out.dirs = list(out.dirs)!.map((d) => ({ ...(d as object), path: at((d as { path: unknown }).path) }));
  if (list(out.versions)) out.versions = list(out.versions)!.map((v) => ({ ...(v as object), path: at((v as { path: unknown }).path) }));
  if (list(out.docs)) out.docs = list(out.docs)!.map(at);
  if (list(out.mirrors)) out.mirrors = list(out.mirrors)!.map((m) => ({ ...(m as object), dirs: ((m as { dirs: unknown[] }).dirs ?? []).map(at) }));
  if (list(out.groups)) out.groups = list(out.groups)!.map((g) => ({ ...(g as object), files: ((g as { files: unknown[] }).files ?? []).map(at) }));
  return out;
}

/** Each repository checked on its own, then one report: the same finding in three repositories is one entry. */
export async function lintRepos(dir: string, repos: string[]): Promise<LintResult> {
  const abs = resolve(dir);
  const started = Date.now();
  const merged: LintResult = { root: abs, tastes: [], issues: [], workspacePackages: [], fileCount: 0 };
  const rels = repos.map((repo) => toDisplayPath(repo, abs));
  // The folder's own files are checked too, without the repositories inside it.
  const outer = { root: abs, prefix: "", result: await lintWorkspace({ root: abs, skipDirs: rels }) };
  const inner = [];
  for (const [i, repo] of repos.entries()) inner.push({ root: repo, prefix: `${rels[i]}/`, result: await lintWorkspace({ root: repo }) });
  for (const { prefix, result } of [outer, ...inner]) {
    for (const taste of result.tastes) if (!merged.tastes.includes(taste)) merged.tastes.push(taste);
    merged.workspacePackages!.push(...(result.workspacePackages ?? []).map((p) => `${prefix}${p}`));
    merged.fileCount! += result.fileCount ?? 0;
    for (const issue of result.issues) {
      merged.issues.push({
        ...issue,
        displayPath: issue.displayPath === "./" ? prefix || "./" : `${prefix}${issue.displayPath}`,
        ...(issue.details && prefix ? { details: prefixDetails(issue.details, prefix) } : issue.details ? { details: issue.details } : {}),
      });
    }
  }
  merged.duration = Date.now() - started;
  return merged;
}

