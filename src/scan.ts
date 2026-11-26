import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
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
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    if (entries.includes(".git")) {
      found.push(current);
      // A repository is a unit: its nested folders are not searched.
      return;
    }
    for (const name of entries) {
      if (name === "node_modules" || name === "dist" || name === "build" || name.startsWith(".")) continue;
      const child = join(current, name);
      try {
        if (statSync(child).isDirectory()) walk(child, depth + 1);
      } catch {
        // skip
      }
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

