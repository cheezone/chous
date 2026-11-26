import { NOT_OURS } from "../taste/hygiene";
import { relative, resolve, sep } from "node:path";
import type { Issue, LintResult, Rule } from "../types";
import { buildWorkspaceSnapshot, subSnapshot, type WorkspaceSnapshot } from "../vfs/snapshot";
import { resolveTaste } from "../taste";
import { IN_TESTS, LOCKFILES } from "../taste/js";
import { findValidator, type RuleValidatorContext } from "./validators";

/** Validate one root (the repo, or one workspace package) against its rules. */
async function checkRoot(root: string, rules: Rule[], snapshot: WorkspaceSnapshot, today?: string): Promise<Issue[]> {
  const context: RuleValidatorContext = { root, snapshot, rawIssues: [], today };
  for (const rule of rules) {
    try {
      await findValidator(rule)?.validate(rule, context);
    } catch (error) {
      // One check failing on a strange file must not take the others down; say so, and go on.
      process.stderr.write(`chous: the ${rule.kind} check stopped on ${root}: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  // Drop findings on gitignored paths and exact duplicates.
  const seen = new Set<string>();
  return context.rawIssues.filter((issue) => {
    // `path#contract` marks a finding about a file; a `#` may also be part of a real name (`foo#bar/`).
    const full = relative(root, issue.path).split(sep).join("/");
    const hash = issue.path.lastIndexOf("#");
    const rel = snapshot.byRel.has(full) || hash < 0 ? full : relative(root, issue.path.slice(0, hash)).split(sep).join("/");
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
  // A fixture package is a test input, not the project's own code.
  for (const pkg of snapshot.workspace.packages.filter((p) => !NOT_OURS.test(`${p}/`))) {
    const pkgRoot = resolve(root, pkg);
    const pkgTaste = resolveTaste(pkgRoot, { workspacePackage: true, runtime: taste.runtime });
    for (const issue of await checkRoot(pkgRoot, pkgTaste.rules, subSnapshot(snapshot, pkg), today)) {
      // The same finding reached from the root and from a package is reported once.
      if (seen.has(issueKey(issue))) continue;
      seen.add(issueKey(issue));
      issues.push({ ...issue, displayPath: within(pkg, issue.displayPath) });
    }
  }

  // Projects of their own inside the repository, outside the workspace: a package.json with its own lockfile.
  const packages = snapshot.workspace.packages;
  const nested = [...snapshot.byRel.values()]
    .filter((e) => !e.isDir && e.name === "package.json" && e.relPath.includes("/") && !NOT_OURS.test(e.relPath) && !IN_TESTS.test(e.relPath))
    .map((e) => e.relPath.slice(0, e.relPath.lastIndexOf("/")))
    .filter((dir) => LOCKFILES.some((lock) => snapshot.byRel.has(`${dir}/${lock}`)))
    .filter((dir) => !packages.some((p) => dir === p || dir.startsWith(`${p}/`)));
  for (const dir of nested) {
    const projectRoot = resolve(root, dir);
    const projectTaste = resolveTaste(projectRoot, { nestedProject: true });
    for (const issue of await checkRoot(projectRoot, projectTaste.rules, subSnapshot(snapshot, dir), today)) {
      if (seen.has(issueKey(issue))) continue;
      seen.add(issueKey(issue));
      issues.push({ ...issue, displayPath: within(dir, issue.displayPath) });
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

/** A path inside a package or nested project, as seen from the repository: its own root `./` is `pkg/`. */
const within = (dir: string, path: string) => (path === "./" ? `${dir}/` : `${dir}/${path}`);

function issueKey(issue: Issue): string {
  return `${issue.path}:${issue.message.key}`;
}
