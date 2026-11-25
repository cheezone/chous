import type { Text } from "./i18n/text";

/** Which built-in taste produced a rule (e.g. `base`, `js`, `monorepo`). */
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

export type PackageManagerName = "npm" | "pnpm" | "yarn" | "bun";

export type Rule =
  | NoFilesRule
  | DepsRule
  | StackRule
  | ExclusiveRule
  | LifecycleRule
  | SecretsRule
  | ArtifactsRule
  | ManifestRule
  | WorkspaceRule;

/** Paths (globs) that must not exist. */
export type NoFilesRule = RuleBase & {
  kind: "no";
  names: string[];
};

/** Dependencies that are rotten, or redundant because the platform ships them. */
export type DepsRule = RuleBase & {
  kind: "deps";
  mode: "no";
  /** Package names, or a scope wildcard such as `@scope/*`. */
  names: string[];
  /** What to use instead. */
  use?: string;
  /** The platform ships an equivalent: redundant, not rotten (a warning). */
  native?: boolean;
};

/** A package.json field must equal a value, be present, or not exist. */
export type ManifestRule = RuleBase & {
  kind: "manifest";
  field: string;
  equals?: string | boolean;
  absent?: boolean;
  present?: boolean;
};

/** Runtimes and frameworks past their published end of life (see `taste/eol.ts`). */
export type LifecycleRule = RuleBase & {
  kind: "lifecycle";
};

/** Keys committed in plain text (see `taste/leaks.ts`). */
export type SecretsRule = RuleBase & {
  kind: "secrets";
};

/** Build output that is not gitignored (see `taste/leaks.ts`). */
export type ArtifactsRule = RuleBase & {
  kind: "artifacts";
};

/** At most one of these root-level names may exist: one name per concept. */
export type ExclusiveRule = RuleBase & {
  kind: "exclusive";
  names: string[];
};

/** Monorepo root: one major version per dependency across packages. */
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

export type IssueMessage =
  | { key: "issue.no.because"; params: { reason: Text } }
  | { key: "issue.deps.forbidden"; params: { name: string } }
  | { key: "issue.deps.native"; params: { name: string; use: string } }
  | { key: "issue.deps.obsolete"; params: { name: string; use: string } }
  | { key: "issue.stack.conflict"; params: { role: Text; tools: string } }
  | { key: "issue.exclusive.conflict" }
  | { key: "issue.lifecycle.expired"; params: { name: string; date: string; use: Text } }
  | { key: "issue.lifecycle.rotten"; params: { name: string; date: string; use: Text } }
  | { key: "issue.manifest.expected"; params: { field: string; expected: string } }
  | { key: "issue.manifest.remove"; params: { field: string; reason: Text } }
  | { key: "issue.manifest.missing"; params: { field: string; reason: Text } }
  | { key: "issue.workspace.drift"; params: { name: string; versions: string } }
  | { key: "issue.leak.secret"; params: { name: string } }
  | { key: "issue.leak.artifact" };

export type Issue = {
  ruleKind: Rule["kind"];
  ruleSource: RuleSource;
  reason?: Text;
  /** Absolute; synthetic findings append `#something`. */
  path: string;
  /** Relative to the linted root. */
  displayPath: string;
  message: IssueMessage;
  severity: Severity;
};

export type LintResult = {
  root: string;
  /** Tastes applied to this root, broadest first. */
  tastes: string[];
  issues: Issue[];
  /** Packages discovered via @manypkg/get-packages. */
  workspacePackages?: string[];
  fileCount?: number;
  /** Milliseconds. */
  duration?: number;
};
