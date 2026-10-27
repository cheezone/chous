import { relative, sep } from "node:path";
import type { FsLintConfig, Issue, LintResult, MoveRule, Rule } from "../types";
import { toDisplayPath } from "../fsutil";
import { buildWorkspaceSnapshot } from "../vfs/snapshot";
import { compileConfig } from "../config/compiler";
import {
  findValidator,
  processInDirOnlyGroup,
  RuleStatisticsCollector,
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
    if (rule.kind === "packageManager" || rule.kind === "deps" || rule.kind === "replaceDep") {
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

/**
 * Lint a workspace: snapshot → compile → validate → dedup.
 */
export async function lintWorkspace(opts: {
  root: string;
  config: FsLintConfig;
  configPath: string;
  strict?: boolean;
  relevantDirs?: Set<string>;
}): Promise<LintResult> {
  const startTime = performance.now();
  const { root, config, configPath, strict: forceStrict, relevantDirs } = opts;
  const rawIssues: Issue[] = [];

  const rootOnly = !relevantDirs && hasRootLevelOnlyRules(config.rules);
  const snapshot = await buildWorkspaceSnapshot({
    root,
    rootOnly,
    relevantDirs,
  });

  const compiled = compileConfig(config, snapshot.workspace, { forceStrict, root });

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

  const rootAllowedSet = new Set<string>();
  const matchedGlobFiles = new Set<string>();
  const statisticsCollector = new RuleStatisticsCollector();
  const processedThoseOnlyPatterns = new Map<string, number>();

  const cachedGlobScan = async (
    pattern: string | string[],
    cwd: string,
    _root: string,
    opts?: { onlyFiles?: boolean },
  ): Promise<string[]> => {
    return snapshot.match(pattern, { cwd, onlyFiles: opts?.onlyFiles ?? true });
  };

  const validatorContext: RuleValidatorContext = {
    root,
    snapshot,
    cachedGlobScan,
    ig: snapshot.ig,
    rawIssues,
    statisticsCollector,
    inDirGroups: compiled.inDirGroups,
    rootAllowedSet,
    filesMatchedByMoveRules,
    forceStrict,
    config: { rules: compiled.rules },
    processedThoseOnlyPatterns,
    matchedGlobFiles,
  };

  // 1. Directory whitelist groups (single path — no duplicated loop)
  for (const [dir, group] of compiled.inDirGroups.entries()) {
    const firstRuleIndex = compiled.rules.findIndex((r) => r.kind === "inDirOnly" && r.dir === dir);
    const start = performance.now();
    const result = await processInDirOnlyGroup(dir, group, validatorContext, filesMatchedByMoveRules);
    const duration = Math.round(performance.now() - start);
    if (firstRuleIndex >= 0) {
      for (let i = 0; i < compiled.rules.length; i++) {
        const r = compiled.rules[i]!;
        if (r.kind === "inDirOnly" && r.dir === dir) {
          statisticsCollector.record(i, { duration, hitCount: result.hitCount });
        }
      }
    }
  }

  // 2. All other rules via validators
  for (let ruleIndex = 0; ruleIndex < compiled.rules.length; ruleIndex++) {
    const rule = compiled.rules[ruleIndex]!;
    if (rule.kind === "inDirOnly") continue;
    const validator = findValidator(rule);
    if (validator) {
      await validator.validate(rule, validatorContext, ruleIndex);
    }
  }

  // 3. Dedup + gitignore filter
  const finalIssues: Issue[] = [];
  const seen = new Set<string>();
  for (const i of rawIssues) {
    const rel = relative(root, i.path.split("#")[0]!).split(sep).join("/");
    if (rel && !rel.startsWith("..") && snapshot.ig.ignores(rel)) continue;
    const key = `${i.ruleKind}:${i.path}:${i.message.key}`;
    if (seen.has(key)) continue;
    seen.add(key);
    finalIssues.push(i);
  }

  const requiredTopLevelNames = Array.from(
    new Set([...compiled.requiredTopLevelNames, ...matchedGlobFiles]),
  ).sort();

  return {
    root,
    configPath,
    issues: finalIssues,
    requiredTopLevelNames,
    visibleSet: snapshot.visibleAbs,
    listDir: (absDir) =>
      snapshot.listDir(absDir).map((e) => ({ name: e.name, absPath: e.absPath, isDir: e.isDir })),
    imports: config.imports,
    persona: config.persona,
    ...(compiled.workspacePackages.length > 0 ? { workspacePackages: compiled.workspacePackages } : {}),
    fileCount: snapshot.fileCount,
    duration: Math.round(performance.now() - startTime),
    ruleMetrics: statisticsCollector.getAllMetrics(),
    rules: compiled.rules,
  };
}
