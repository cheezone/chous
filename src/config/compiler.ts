import { resolve } from "node:path";
import type {
  AllowRule,
  FsLintConfig,
  HasFileRule,
  InDirOnlyRule,
  NoFilesRule,
  Rule,
  RuleSource,
} from "../types";
import { pickTopLevelName } from "../fsutil";
import type { WorkspaceInfo } from "../vfs/snapshot";

export type DirectoryWhitelistGroup = {
  dir: string;
  rules: InDirOnlyRule[];
};

export type CompiledConfig = {
  /** Original + derived rules ready for validators (includes expanded monorepo `no` rules). */
  rules: Rule[];
  /** inDirOnly groups keyed by directory (relative posix path, "." for root). */
  inDirGroups: Map<string, InDirOnlyRule[]>;
  /** Top-level names required by non-glob `has` rules (minus `optional`). */
  requiredTopLevelNames: string[];
  /** Root-level allow patterns (for report / naming exceptions). */
  rootAllowOnly: string[];
  workspacePackages: string[];
  workspaceTool: string;
};

function topLevelWorkspaceDirs(packages: string[]): string[] {
  const tops = new Set<string>();
  for (const pkg of packages) {
    const top = pkg.split("/")[0];
    if (top && top !== "." && top !== "..") tops.add(top);
  }
  return Array.from(tops).sort();
}

function isGlobPattern(name: string): boolean {
  return /[*?{}[\]]/.test(name) || name.includes("**");
}

/**
 * Normalize a parsed config into a compiled plan:
 * - fold root `allow` / static `has` into inDirOnly groups
 * - expand monorepo package whitelists and package-scoped `no` rules
 * - compute required top-level names
 */
export function compileConfig(
  config: FsLintConfig,
  workspace: WorkspaceInfo,
  opts?: { forceStrict?: boolean; root?: string },
): CompiledConfig {
  const forceStrict = opts?.forceStrict ?? false;
  const root = opts?.root ?? process.cwd();
  const workspaceSource: RuleSource = {
    file: resolve(root, workspace.tool === "pnpm" ? "pnpm-workspace.yaml" : "package.json"),
    line: 0,
  };

  const inDirGroups = new Map<string, InDirOnlyRule[]>();
  const inDirRules = config.rules.filter((r): r is InDirOnlyRule => r.kind === "inDirOnly");
  for (const r of inDirRules) {
    const list = inDirGroups.get(r.dir) ?? [];
    list.push(r);
    inDirGroups.set(r.dir, list);
  }

  const rootAllowRules = config.rules.filter((r): r is AllowRule => r.kind === "allow");
  const rootAllowOnly = rootAllowRules.flatMap((r) => r.names);

  if (rootAllowRules.length > 0) {
    const rootGroup = inDirGroups.get(".") ?? [];
    for (const allowRule of rootAllowRules) {
      rootGroup.push({
        kind: "inDirOnly",
        dir: ".",
        only: [...allowRule.names],
        mode: "permissive",
        source: allowRule.source,
        severity: allowRule.severity,
        reason: allowRule.reason,
        when: allowRule.when,
      });
    }
    inDirGroups.set(".", rootGroup);
  }

  const hasRules = config.rules.filter((r): r is HasFileRule => r.kind === "has");
  if (hasRules.length > 0) {
    const rootGroup = inDirGroups.get(".") ?? [];
    const requiredNames: string[] = [];
    for (const hasRule of hasRules) {
      for (const name of hasRule.names) {
        if (!isGlobPattern(name)) requiredNames.push(name);
      }
    }
    if (requiredNames.length > 0) {
      const existingPermissive = rootGroup.find((r) => r.mode === "permissive");
      if (existingPermissive) {
        existingPermissive.only.push(...requiredNames);
      } else {
        const first = hasRules[0]!;
        rootGroup.push({
          kind: "inDirOnly",
          dir: ".",
          only: requiredNames,
          mode: "permissive",
          source: first.source,
          severity: first.severity,
          reason: first.reason,
        });
      }
      inDirGroups.set(".", rootGroup);
    }
  }

  const rootStrictRules = inDirRules.filter(
    (r) => (r.dir === "." || r.dir === "") && (r.mode === "strict" || r.mode === undefined),
  );

  const workspacePackages = workspace.packages;
  const expandedRules: Rule[] = [...config.rules];
  const expandedAllowOnly = [...rootAllowOnly];

  if (workspacePackages.length > 0) {
    const topDirs = topLevelWorkspaceDirs(workspacePackages);
    if (topDirs.length > 0) {
      const rootGroup = inDirGroups.get(".") ?? [];
      rootGroup.push({
        kind: "inDirOnly",
        dir: ".",
        only: topDirs,
        mode: "permissive",
        source: workspaceSource,
      });
      inDirGroups.set(".", rootGroup);
      expandedAllowOnly.push(...topDirs);
    }

    for (const pkg of workspacePackages) {
      if (inDirGroups.has(pkg)) continue;
      const pkgGroup: InDirOnlyRule[] = [];
      if (expandedAllowOnly.length > 0) {
        pkgGroup.push({
          kind: "inDirOnly",
          dir: pkg,
          only: [...expandedAllowOnly],
          mode: "permissive",
          source: workspaceSource,
        });
      }
      for (const strictRule of rootStrictRules) {
        pkgGroup.push({
          ...strictRule,
          dir: pkg,
          only: [...strictRule.only],
          source: workspaceSource,
        });
      }
      if (forceStrict && !pkgGroup.some((r) => r.mode === "strict" || r.mode === undefined)) {
        pkgGroup.push({
          kind: "inDirOnly",
          dir: pkg,
          only: [],
          mode: "strict",
          source: workspaceSource,
        });
      }
      if (pkgGroup.length > 0) inDirGroups.set(pkg, pkgGroup);
    }

    for (const rule of config.rules) {
      if (rule.kind !== "no") continue;
      const packageScoped = (rule as NoFilesRule).names
        .filter((name) => !name.includes("/") && !name.includes("**"))
        .flatMap((name) => workspacePackages.map((pkg) => `${pkg}/${name}`));
      if (packageScoped.length > 0) {
        expandedRules.push({ ...rule, names: packageScoped });
      }
    }
  }

  const required = new Set<string>();
  const optional = new Set<string>();
  for (const r of config.rules) {
    if (r.kind === "has") {
      for (const name of r.names) {
        if (!isGlobPattern(name)) required.add(pickTopLevelName(name));
      }
    }
    if (r.kind === "optional") {
      for (const name of r.names) optional.add(pickTopLevelName(name));
    }
  }
  for (const opt of optional) required.delete(opt);
  required.delete(".");

  return {
    rules: expandedRules,
    inDirGroups,
    requiredTopLevelNames: Array.from(required).sort(),
    rootAllowOnly: expandedAllowOnly,
    workspacePackages,
    workspaceTool: workspace.tool,
  };
}
