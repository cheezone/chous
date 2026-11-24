import type { Text } from "./i18n/text";

/** Which built-in taste produced a rule (e.g. `base`, `js`, `nuxt4`). */
export type RuleSource = {
  taste: string;
};

export type Severity = "error" | "warn";

/** Shared metadata on every rule. */
export type RuleBase = {
  source: RuleSource;
  /** Overrides the validator's default severity. */
  severity?: Severity;
  /** Why this rule exists, in every language. */
  reason?: Text;
};

export type NamingStyle =
  | "PascalCase"
  | "camelCase"
  | "kebab-case"
  | "snake_case"
  | "SCREAMING_SNAKE_CASE"
  | "flatcase";

export type PackageManagerName = "npm" | "pnpm" | "yarn" | "bun";

export type Rule =
  | MoveRule
  | ThoseOnlyRule
  | InDirOnlyRule
  | NamingRule
  | NoFilesRule
  | HasFileRule
  | AllowRule
  | DepsRule
  | StackRule
  | ExclusiveRule
  | LifecycleRule
  | ManifestRule
  | WorkspaceRule;

export type MoveRule = RuleBase & {
  kind: "move";
  from: string; // glob (root-level)
  toDir: string; // directory name relative to root
};

export type ThoseOnlyRule = RuleBase & {
  kind: "thoseOnly";
  pattern: string; // glob (root-level)
  only: string[]; // globs (root-level)
};

export type InDirOnlyRule = RuleBase & {
  kind: "inDirOnly";
  dir: string; // directory (root-level)
  only: string[]; // globs relative to that dir (usually **/*.ts)
  mode?: "strict" | "permissive"; // strict = enforce whitelist, permissive = suggest only
  fileType?: "files" | "dirs"; // Optional filter for files or directories
  /** Strict mode also checks names starting with "." (skipped by default). */
  dotfiles?: boolean;
};

export type AllowRule = RuleBase & {
  kind: "allow";
  names: string[]; // file/directory names (root-level) - permissive suggestions
};

export type NamingRule = RuleBase & {
  kind: "naming";
  target: "in" | "those";
  pattern: string; // dir (for "in") or glob (for "those")
  style: NamingStyle;
  fileType?: "files" | "dirs"; // Optional filter for files or directories only
  prefix?: string; // Optional regex pattern to remove from the start (e.g., "/^\\d+\\./")
  suffix?: string; // Optional regex pattern to remove from the end (e.g., "/\\.(get|post)$/i")
  except?: string[]; // Optional list of names to exclude from naming checks (only for naming, not directory whitelist)
  // Conditional rules (deprecated, use when instead)
  ifContains?: string; // For dirs: only apply this rule if the directory contains this file (e.g., "index.vue")
  ifParentStyle?: NamingStyle; // For files: only apply this rule if the parent directory matches this naming style
};

export type NoFilesRule = RuleBase & {
  kind: "no";
  names: string[]; // file names (root-level)
};

export type HasFileRule = RuleBase & {
  kind: "has";
  names: string[]; // file names (root-level)
};

export type DepsRule = RuleBase & {
  kind: "deps";
  mode: "no";
  names: string[]; // package names, or a scope wildcard such as @scope/*
  /** For banned deps: what to use instead. */
  use?: string;
  /** The platform ships an equivalent: redundant, not rotten (a warning). */
  native?: boolean;
};

/** A package.json field must equal a value, or must not exist. */
export type ManifestRule = RuleBase & {
  kind: "manifest";
  field: string;
  equals?: string | boolean;
  absent?: boolean;
  /** The field must be present, whatever its value. */
  present?: boolean;
};

/** Runtimes and frameworks past their published end of life (see `taste/eol.ts`). */
export type LifecycleRule = RuleBase & {
  kind: "lifecycle";
};

/** At most one of these root-level names may exist: one name per concept. */
export type ExclusiveRule = RuleBase & {
  kind: "exclusive";
  names: string[];
};

/** Monorepo root: one version per dependency, `workspace:` for internal packages. */
export type WorkspaceRule = RuleBase & {
  kind: "workspace";
};

/**
 * Tools that fight over the same job must not coexist: two package managers
 * resolve different trees, two formatters rewrite each other, two git-hook
 * managers overwrite the same hooks.
 */
export type StackRule = RuleBase & {
  kind: "stack";
  /** Roles where a second tool is always a bug, e.g. `package-manager`. */
  roles: string[];
};

/** How to act on a finding — derived from knowledge. */
export type Resolution = "auto" | "agent" | "info";

/** Machine-executable, zero-data-loss fixes for `--fix`. */
export type SafeFix =
  | { type: "rename"; fromPath: string; toPath: string };

export type IssueMessage =
  | { key: "issue.move.shouldMoveToDir"; params: { dir: string } }
  | { key: "issue.move.destDirMustExist"; params: { from: string; toDir: string } }
  | { key: "issue.move.destMustBeDir"; params: { from: string; toDir: string } }
  | { key: "issue.move.unsafeManual"; params: { dir: string } }
  | { key: "issue.thoseOnly.forbiddenOnlyAllowed"; params: { only: string | string[]; pattern?: string } }
  | { key: "issue.inDirOnly.dirMustExist"; params: { only: string | string[] } }
  | { key: "issue.inDirOnly.forbiddenOnlyAllowed"; params: { dir: string; only: string | string[] } }
  | { key: "issue.no.forbidden"; params: { name: string } }
  | { key: "issue.no.because"; params: { reason: Text } }
  | { key: "issue.has.mustExist"; params: { name: string } }
  | { key: "issue.deps.forbidden"; params: { name: string } }
  | { key: "issue.stack.conflict"; params: { role: Text; tools: string } }
  | { key: "issue.exclusive.conflict"; params: { names: string } }
  | { key: "issue.lifecycle.expired"; params: { name: string; date: string; use: Text } }
  | { key: "issue.lifecycle.rotten"; params: { name: string; date: string; use: Text } }
  | { key: "issue.deps.native"; params: { name: string; use: string } }
  | { key: "issue.deps.obsolete"; params: { name: string; use: string } }
  | { key: "issue.manifest.expected"; params: { field: string; expected: string } }
  | { key: "issue.manifest.remove"; params: { field: string; reason: Text } }
  | { key: "issue.manifest.missing"; params: { field: string; reason: Text } }
  | { key: "issue.workspace.drift"; params: { name: string; versions: string } }
  | { key: "issue.workspace.protocol"; params: { name: string; spec: string } }
  | { key: "issue.naming.invalid"; params: { style: string } }
  | { key: "issue.naming.invalidPrefix"; params: { pattern: string } }
  | { key: "issue.naming.invalidSuffix"; params: { pattern: string } }
  | { key: "issue.merged.forbiddenOnlyAllowed"; params: { whitelists: Array<{ label: string; only: string[] }> } }
  | { key: "issue.merged.forbiddenBlacklist"; params: { blacklists: Array<{ label: string; patterns: string[] }> } };

export type Issue = {
  ruleKind: Rule["kind"];
  ruleSource: RuleSource;
  reason?: Text;
  path: string; // absolute
  displayPath: string; // relative to root (posix-ish for display)
  message: IssueMessage;
  category: "missing" | "forbidden"; // Missing vs violation/forbidden
  severity: Severity;
  /** Present only when the fix is 100% safe (no overwrite / no data loss). */
  fix?: SafeFix;
  /** How an agent / CI consumer should treat this finding. */
  resolution?: Resolution;
  /** Optional doc link from the migration knowledge base. */
  see?: string;
};

export type LintResult = {
  root: string;
  /** Tastes applied to this root, broadest first. */
  tastes: string[];
  issues: Issue[];
  requiredTopLevelNames: string[];
  visibleSet?: Set<string>;
  /** Prefer over readdir/stat when rendering the report tree (avoids Windows stat tax). */
  listDir?: (absDir: string) => Array<{ name: string; absPath: string; isDir: boolean }>;
  workspacePackages?: string[]; // Packages discovered via @manypkg/get-packages
  fileCount?: number; // Number of files scanned
  duration?: number; // Duration in milliseconds
  fixedCount?: number; // Number of issues auto-fixed when --fix was used
};
