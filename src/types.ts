import type { MessageKey } from "./i18n";

/** Which built-in taste produced a rule (e.g. `base`, `js`, `monorepo`). */
export type RuleSource = {
  taste: string;
};

/**
 * What chous knows, not how bad it is.
 * - smell: a fact chous is sure of, against a stated taste. Nothing to decide.
 * - review: a fact worth a look, whose meaning needs context chous does not
 *   have (what a file is for). A person or an agent decides.
 */
export type Verdict = "smell" | "review";

/** The taste a rule stands for (see docs/manifesto.md). */
export type Value = "modernity" | "order" | "convention" | "cleanliness";

/** Shared metadata on every rule. */
export type RuleBase = {
  source: RuleSource;
  value: Value;
  /** Overrides the validator's default verdict. */
  verdict?: Verdict;
  /** Why this rule exists: a message in `src/locales`. */
  reason?: MessageKey;
};

export type PackageManagerName = "npm" | "pnpm" | "yarn" | "bun";

export type Rule =
  | NoFilesRule
  | DepsRule
  | DeprecatedRule
  | LifecycleRule
  | ArtifactsRule
  | LeftoverRule
  | TwinsRule
  | ContractsRule
  | ManifestRule
  | WorkspaceRule;

/** Paths (globs) that must not exist. */
export type NoFilesRule = RuleBase & {
  kind: "no";
  names: string[];
};

/** Dependencies that are rotten, or redundant because the platform ships them. */
/** Direct dependencies their authors deprecated on the npm registry, as the lockfile recorded it. */
export type DeprecatedRule = RuleBase & {
  kind: "deprecated";
};

export type DepsRule = RuleBase & {
  kind: "deps";
  /** Package names, or a scope wildcard such as `@scope/*`. */
  names: string[];
  /** What to use instead. */
  use: string;
  /** The platform ships something similar: whether it fully replaces the package is for review. */
};

/** A package.json field that must not exist. */
export type ManifestRule = RuleBase & {
  kind: "manifest";
  field: string;
};

/** Runtimes and frameworks past their published end of life (each tool's `eol` in src/facts/). */
export type LifecycleRule = RuleBase & {
  kind: "lifecycle";
  /** At the repository's root: GitHub runs only the root's `.github/workflows`. */
  workflows?: boolean;
};

/** Build output that is not gitignored (see `taste/hygiene.ts`). */
export type ArtifactsRule = RuleBase & {
  kind: "artifacts";
};

/** What tools state about the files they read (src/facts/). */
export type ContractsRule = RuleBase & {
  kind: "contracts";
};

/** One thing twice: two names for it, or two identical copies. */
export type TwinsRule = RuleBase & {
  kind: "twins";
};

/** OS junk, installers, binaries and a crowded root, known by content (see `taste/hygiene.ts`). */
export type LeftoverRule = RuleBase & {
  kind: "leftover";
  /** Count docs at the root (repository root only). */
  rootDocs: boolean;
};

/** Monorepo root: one major version per dependency across packages. */
export type WorkspaceRule = RuleBase & {
  kind: "workspace";
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
  verdict: Verdict;
  value: Value;
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
