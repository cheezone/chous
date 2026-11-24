import { relative, resolve, sep } from "node:path";
import type { Issue, LintResult, MoveRule, Rule } from "../types";
import { toDisplayPath } from "../fsutil";
import { buildWorkspaceSnapshot, looksLikeMonorepo, subSnapshot, type WorkspaceSnapshot } from "../vfs/snapshot";
import { resolveTaste } from "../taste";
import { compileRules } from "./compile";
import {
  findValidator,
  processInDirOnlyGroup,
  type RuleValidatorContext,
} from "./validators";

function hasRootLevelOnlyRules(rules: Rule[]): boolean {
  return rules.every((rule) => {
    if (rule.kind === "inDirOnly") {
      return rule.dir === "." || rule.dir === "";
    }
    if (rule.kind === "thoseOnly") {
      const pattern = rule.pattern.trim();
      return (pattern.startsWith("./") || (!pattern.includes("/") && !pattern.includes("**"))) &&
        !pattern.startsWith("**");
    }
    if (rule.kind === "has" || rule.kind === "no" || rule.kind === "allow") {
      return rule.names.every((name) => {
        const trimmed = name.trim();
        return !trimmed.includes("/") && !trimmed.includes("**") &&
          (trimmed.startsWith("./") || trimmed.match(/^\.?\/?[^/]*$/));
      });
    }
    if (
      rule.kind === "deps" ||
      rule.kind === "stack" ||
      rule.kind === "exclusive" ||
      rule.kind === "manifest" ||
      rule.kind === "workspace"
    ) {
      return true;
    }
    if (rule.kind === "naming") {
      const pattern = rule.pattern.trim();
      return pattern === "." || pattern === "" ||
        (pattern.startsWith("./") && !pattern.includes("**") && !pattern.includes("*")) ||
        (!pattern.includes("/") && !pattern.startsWith("**") && pattern.includes("*"));
    }
    return false;
  });
}

type RootCheck = {
  issues: Issue[];
  compiled: ReturnType<typeof compileRules>;
  matchedGlobFiles: Set<string>;
};

/** Validate one root (the repo, or one workspace package) against its rules. */
async function checkRoot(root: string, rules: Rule[], snapshot: WorkspaceSnapshot): Promise<RootCheck> {
  const rawIssues: Issue[] = [];
  const compiled = compileRules(rules, snapshot.workspace);

  // Track files claimed by move rules so strict whitelist skips them
  const moveRules = compiled.rules.filter((r): r is MoveRule => r.kind === "move");
  const filesMatchedByMoveRules = new Set<string>();
  for (const rule of moveRules) {
    for (const abs of snapshot.match(rule.from, { onlyFiles: true })) {
      if (!toDisplayPath(abs, root).startsWith(`${rule.toDir}/`)) {
        filesMatchedByMoveRules.add(abs);
      }
    }
  }

  const validatorContext: RuleValidatorContext = {
    root,
    snapshot,
    rawIssues,
    inDirGroups: compiled.inDirGroups,
    rootAllowedSet: new Set<string>(),
    filesMatchedByMoveRules,
    config: { rules: compiled.rules },
    matchedGlobFiles: new Set<string>(),
  };

  // 1. Directory whitelists, one pass per directory.
  for (const [dir, group] of compiled.inDirGroups) {
    await processInDirOnlyGroup(dir, group, validatorContext, filesMatchedByMoveRules);
  }

  // 2. Everything else.
  for (const rule of compiled.rules) {
    if (rule.kind !== "inDirOnly") await findValidator(rule)?.validate(rule, validatorContext);
  }

  // 3. Dedup + gitignore filter. A ban that says why beats the generic whitelist miss.
  const explained = new Set(rawIssues.filter((i) => i.message.key === "issue.no.because").map((i) => i.path));
  const finalIssues: Issue[] = [];
  const seen = new Set<string>();
  for (const i of rawIssues) {
    const rel = relative(root, i.path.split("#")[0]!).split(sep).join("/");
    if (rel && !rel.startsWith("..") && snapshot.ig.ignores(rel)) continue;
    if (i.ruleKind === "inDirOnly" && explained.has(i.path)) continue;
    const key = `${i.ruleKind}:${i.path}:${i.message.key}`;
    if (seen.has(key)) continue;
    seen.add(key);
    finalIssues.push(i);
  }

  return { issues: finalIssues, compiled, matchedGlobFiles: validatorContext.matchedGlobFiles! };
}

/**
 * Lint a project: taste → snapshot → validate. In a monorepo every workspace
 * package is linted as its own project with its own taste.
 */
export async function lintWorkspace(opts: {
  root: string;
  relevantDirs?: Set<string>;
}): Promise<LintResult> {
  const startTime = performance.now();
  const { root, relevantDirs } = opts;
  const probe = resolveTaste(root);
  const rootOnly = !relevantDirs && !looksLikeMonorepo(root) && hasRootLevelOnlyRules(probe.rules);
  const snapshot = await buildWorkspaceSnapshot({ root, rootOnly, relevantDirs });
  // A pnpm-workspace.yaml may only hold settings; packages make it a monorepo.
  const taste = snapshot.workspace.packages.length > 0 ? resolveTaste(root, { monorepo: true }) : probe;
  const main = await checkRoot(root, taste.rules, snapshot);

  const issues = [...main.issues];
  const seen = new Set(issues.map(issueKey));
  for (const pkg of snapshot.workspace.packages) {
    const pkgRoot = resolve(root, pkg);
    const pkgTaste = resolveTaste(pkgRoot, { workspacePackage: true, runtime: taste.runtime });
    const pkgCheck = await checkRoot(pkgRoot, pkgTaste.rules, subSnapshot(snapshot, pkg));
    for (const issue of pkgCheck.issues) {
      const key = issueKey(issue);
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push({ ...issue, displayPath: `${pkg}/${issue.displayPath}` });
    }
  }

  const requiredTopLevelNames = Array.from(
    new Set([...main.compiled.requiredTopLevelNames, ...main.matchedGlobFiles]),
  ).sort();

  return {
    root,
    tastes: taste.ids,
    issues,
    requiredTopLevelNames,
    visibleSet: snapshot.visibleAbs,
    listDir: (absDir) =>
      snapshot.listDir(absDir).map((e) => ({ name: e.name, absPath: e.absPath, isDir: e.isDir })),
    ...(snapshot.workspace.packages.length > 0 ? { workspacePackages: snapshot.workspace.packages } : {}),
    fileCount: snapshot.fileCount,
    duration: Math.round(performance.now() - startTime),
  };
}

/** The same finding reached from the root and from a package is reported once. */
function issueKey(issue: Issue): string {
  return `${issue.path}:${issue.message.key}`;
}
