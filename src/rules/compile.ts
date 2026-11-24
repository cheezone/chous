import type {
  AllowRule,
  HasFileRule,
  InDirOnlyRule,
  Rule,
  RuleSource,
} from "../types";
import { pickTopLevelName } from "../fsutil";
import type { WorkspaceInfo } from "../vfs/snapshot";

export type DirectoryWhitelistGroup = {
  dir: string;
  rules: InDirOnlyRule[];
};

export type CompiledRules = {
  /** Taste + derived rules ready for validators. */
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
 * Normalize taste rules into a validation plan:
 * - fold root `allow` / static `has` into inDirOnly groups
 * - allow workspace package directories at the root
 * - compute required top-level names
 */
export function compileRules(
  input: Rule[],
  workspace: WorkspaceInfo,
): CompiledRules {
  const workspaceSource: RuleSource = { taste: `${workspace.tool}-workspace` };

  const inDirGroups = new Map<string, InDirOnlyRule[]>();
  const inDirRules = input.filter((r): r is InDirOnlyRule => r.kind === "inDirOnly");
  for (const r of inDirRules) {
    const list = inDirGroups.get(r.dir) ?? [];
    list.push(r);
    inDirGroups.set(r.dir, list);
  }

  const syntheticRules: Rule[] = [];
  // Directories a rename rule targets get the rename message, not a whitelist error.
  const renamed = input.flatMap((r) => (r.kind === "renameDir" ? r.fromNames : []));
  if (renamed.length > 0) {
    syntheticRules.push({ kind: "allow", names: renamed, source: { taste: "rename" } });
  }

  const rulesWithToolFiles: Rule[] = [...input, ...syntheticRules];

  const rootAllowRules = rulesWithToolFiles.filter((r): r is AllowRule => r.kind === "allow");
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

  const hasRules = rulesWithToolFiles.filter((r): r is HasFileRule => r.kind === "has");
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

  // Workspace packages are linted on their own; the root only has to allow their top-level dirs.
  const workspacePackages = workspace.packages;
  const expandedAllowOnly = [...rootAllowOnly];
  const topDirs = topLevelWorkspaceDirs(workspacePackages);
  if (topDirs.length > 0) {
    const rootGroup = inDirGroups.get(".") ?? [];
    rootGroup.push({ kind: "inDirOnly", dir: ".", only: topDirs, mode: "permissive", source: workspaceSource });
    inDirGroups.set(".", rootGroup);
    expandedAllowOnly.push(...topDirs);
  }

  const required = new Set<string>();
  const optional = new Set<string>();
  for (const r of rulesWithToolFiles) {
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
    rules: rulesWithToolFiles,
    inDirGroups,
    requiredTopLevelNames: Array.from(required).sort(),
    rootAllowOnly: expandedAllowOnly,
    workspacePackages,
    workspaceTool: workspace.tool,
  };
}
