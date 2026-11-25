import { relative, resolve, sep } from "node:path";
import type { Issue, LintResult, Rule } from "../types";
import { buildWorkspaceSnapshot, subSnapshot, type WorkspaceSnapshot } from "../vfs/snapshot";
import { resolveTaste } from "../taste";
import { findValidator, type RuleValidatorContext } from "./validators";

/** Validate one root (the repo, or one workspace package) against its rules. */
async function checkRoot(root: string, rules: Rule[], snapshot: WorkspaceSnapshot, today?: string): Promise<Issue[]> {
  const context: RuleValidatorContext = { root, snapshot, rawIssues: [], today };
  for (const rule of rules) await findValidator(rule)?.validate(rule, context);

  // Drop findings on gitignored paths and exact duplicates.
  const seen = new Set<string>();
  return context.rawIssues.filter((issue) => {
    const rel = relative(root, issue.path.split("#")[0]!).split(sep).join("/");
    if (rel && !rel.startsWith("..") && snapshot.ig.ignores(rel)) return false;
    const key = issueKey(issue);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Lint a project: taste → snapshot → validate. In a monorepo every workspace
 * package is linted as its own project with its own taste.
 */
export async function lintWorkspace(opts: {
  root: string;
  relevantDirs?: Set<string>;
  /** YYYY-MM-DD; defaults to today. End-of-life checks compare against it. */
  today?: string;
}): Promise<LintResult> {
  const startTime = performance.now();
  const { root, relevantDirs, today } = opts;
  const snapshot = await buildWorkspaceSnapshot({ root, relevantDirs });
  // A pnpm-workspace.yaml may only hold settings; packages make it a monorepo.
  const monorepo = snapshot.workspace.packages.length > 0;
  const taste = resolveTaste(root, { monorepo });
  const issues = await checkRoot(root, taste.rules, snapshot, today);

  const seen = new Set(issues.map(issueKey));
  for (const pkg of snapshot.workspace.packages) {
    const pkgRoot = resolve(root, pkg);
    const pkgTaste = resolveTaste(pkgRoot, { workspacePackage: true, runtime: taste.runtime });
    for (const issue of await checkRoot(pkgRoot, pkgTaste.rules, subSnapshot(snapshot, pkg), today)) {
      // The same finding reached from the root and from a package is reported once.
      if (seen.has(issueKey(issue))) continue;
      seen.add(issueKey(issue));
      issues.push({ ...issue, displayPath: `${pkg}/${issue.displayPath}` });
    }
  }

  return {
    root,
    tastes: taste.ids,
    issues,
    ...(monorepo ? { workspacePackages: snapshot.workspace.packages } : {}),
    fileCount: snapshot.fileCount,
    duration: Math.round(performance.now() - startTime),
  };
}

function issueKey(issue: Issue): string {
  return `${issue.path}:${issue.message.key}`;
}
