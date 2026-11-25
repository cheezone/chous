import type { MessageKey } from "./i18n";

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
  /** Why this rule exists: a message in `src/locales`. */
  reason?: MessageKey;
};

export type PackageManagerName = "npm" | "pnpm" | "yarn" | "bun";

export type Rule =
  | NoFilesRule
  | DepsRule
  | StackRule
  | ExclusiveRule
  | LifecycleRule
  | ArtifactsRule
  | WorklogRule
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

/** Build output that is not gitignored (see `taste/hygiene.ts`). */
export type ArtifactsRule = RuleBase & {
  kind: "artifacts";
};

/** Agent work logs left at the root (see `taste/hygiene.ts`). */
export type WorklogRule = RuleBase & {
  kind: "worklog";
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

/** A param that is itself a message: translated, then interpolated. */
export type MessageRef = { t: MessageKey };

/** A message in `src/locales` and its params. */
export type IssueMessage = {
  key: MessageKey;
  params?: Record<string, string | number | MessageRef>;
};

export type Issue = {
  ruleKind: Rule["kind"];
  ruleSource: RuleSource;
  reason?: MessageKey;
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
