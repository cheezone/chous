export type WhereDirective =
  | { type: "config"; implicit?: boolean } // Default: use rule file's directory as root; implicit when no [where:] was written
  | { type: "cwd" } // Explicit: use process cwd as root
  | { type: "glob"; patterns: string[] } // Scan multiple workspaces: match marker files/directories
  | { type: "paths"; paths: string[] }; // Explicitly specify root directories (can write relative paths/multiple)

export type RuleSource = {
  file: string; // .chous 文件的绝对路径
  line: number; // 定义所在的行号
};

export type Severity = "error" | "warn";

/** Shared metadata on every rule produced by the DSL parser. */
export type RuleBase = {
  source: RuleSource;
  /** Explicit severity from `warn` / `error` prefix; undefined means engine default. */
  severity?: Severity;
  /** Why this rule exists — from `because "..."` or adjacent comments. */
  reason?: string;
  when?: Condition[];
};

export type Condition =
  | { type: "isEmpty" } // 是否为空目录
  | { type: "fileSize"; op: ">" | "<"; value: string } // 大小 (如 "1MB")
  | { type: "contains"; pattern: string } // 包含
  | { type: "parentMatches"; style: NamingStyle } // 父目录匹配
  | { type: "exists"; pattern: string }; // 模式存在

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
  | RenameDirRule
  | RenameGlobRule
  | InDirOnlyRule
  | NamingRule
  | NoFilesRule
  | HasFileRule
  | AllowRule
  | OptionalRule
  | PackageManagerRule
  | DepsRule
  | ReplaceDepRule;

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

export type RenameDirRule = RuleBase & {
  kind: "renameDir";
  fromNames: string[]; // directory names (root-level)
  toName: string; // directory name (root-level)
};

export type RenameGlobRule = RuleBase & {
  kind: "renameGlob";
  from: string; // glob (root-relative, may include **)
  to: string; // glob-like target pattern (best-effort support)
};

export type InDirOnlyRule = RuleBase & {
  kind: "inDirOnly";
  dir: string; // directory (root-level)
  only: string[]; // globs relative to that dir (usually **/*.ts)
  mode?: "strict" | "permissive"; // strict = enforce whitelist, permissive = suggest only
  fileType?: "files" | "dirs"; // Optional filter for files or directories
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

export type OptionalRule = RuleBase & {
  kind: "optional";
  names: string[]; // file names (root-level) - makes has rules optional
};

export type PackageManagerRule = RuleBase & {
  kind: "packageManager";
  manager: PackageManagerName;
};

export type DepsRule = RuleBase & {
  kind: "deps";
  mode: "must" | "no";
  names: string[]; // package names, or a scope wildcard such as @scope/*
};

export type ReplaceDepRule = RuleBase & {
  kind: "replaceDep";
  from: string;
  to: string;
};

export type Persona = {
  name: string;
  url?: string;
};

export type FsLintConfig = {
  where: WhereDirective;
  rules: Rule[];
  imports?: string[]; // Resolved paths of imported presets
  persona?: Persona;
};

/** Machine-executable, zero-data-loss fixes for `--fix`. */
export type SafeFix =
  | { type: "rename"; fromPath: string; toPath: string }
  | { type: "deleteEmptyDir"; path: string }
  | { type: "pkgSetManager"; pkgJsonPath: string; manager: string }
  | { type: "pkgReplaceDep"; pkgJsonPath: string; from: string; to: string };

export type IssueMessage =
  | { key: "issue.move.shouldMoveToDir"; params: { dir: string } }
  | { key: "issue.move.destDirMustExist"; params: { from: string; toDir: string } }
  | { key: "issue.move.destMustBeDir"; params: { from: string; toDir: string } }
  | { key: "issue.move.unsafeManual"; params: { dir: string } }
  | { key: "issue.thoseOnly.forbiddenOnlyAllowed"; params: { only: string | string[]; pattern?: string } }
  | { key: "issue.renameDir.shouldRenameTo"; params: { to: string } }
  | { key: "issue.renameDir.shouldMigrateTo"; params: { to: string } }
  | { key: "issue.renameDir.removeEmptyDir"; params: { dir: string; to: string } }
  | { key: "issue.renameGlob.shouldRenameTo"; params: { to: string } }
  | { key: "issue.renameGlob.targetExistsManual"; params: { to: string } }
  | { key: "issue.renameGlob.cannotInferTarget" }
  | { key: "issue.inDirOnly.dirMustExist"; params: { only: string | string[] } }
  | { key: "issue.inDirOnly.forbiddenOnlyAllowed"; params: { dir: string; only: string | string[] } }
  | { key: "issue.no.forbidden"; params: { name: string } }
  | { key: "issue.has.mustExist"; params: { name: string } }
  | { key: "issue.packageManager.wrong"; params: { expected: string; actual: string } }
  | { key: "issue.packageManager.missing"; params: { expected: string } }
  | { key: "issue.deps.missing"; params: { name: string } }
  | { key: "issue.deps.forbidden"; params: { name: string } }
  | { key: "issue.replaceDep.replace"; params: { from: string; to: string } }
  | { key: "issue.naming.invalid"; params: { style: string } }
  | { key: "issue.naming.invalidPrefix"; params: { pattern: string } }
  | { key: "issue.naming.invalidSuffix"; params: { pattern: string } }
  | { key: "issue.merged.forbiddenOnlyAllowed"; params: { whitelists: Array<{ label: string; only: string[] }> } }
  | { key: "issue.merged.forbiddenBlacklist"; params: { blacklists: Array<{ label: string; patterns: string[] }> } };

export type Issue = {
  ruleKind: Rule["kind"];
  ruleSource: RuleSource;
  reason?: string;
  path: string; // absolute
  displayPath: string; // relative to root (posix-ish for display)
  message: IssueMessage;
  category: "missing" | "forbidden"; // Missing vs violation/forbidden
  severity: Severity;
  /** Present only when the fix is 100% safe (no overwrite / no data loss). */
  fix?: SafeFix;
};

export type RuleMetrics = {
  duration: number; // Duration in milliseconds
  hitCount: number; // Number of files/directories matched by this rule
};

export type LintResult = {
  root: string;
  configPath: string;
  issues: Issue[];
  requiredTopLevelNames: string[];
  visibleSet?: Set<string>;
  /** Prefer over readdir/stat when rendering the report tree (avoids Windows stat tax). */
  listDir?: (absDir: string) => Array<{ name: string; absPath: string; isDir: boolean }>;
  imports?: string[]; // Propagated from config
  persona?: Persona;
  workspacePackages?: string[]; // Packages discovered via @manypkg/get-packages
  fileCount?: number; // Number of files scanned
  duration?: number; // Duration in milliseconds
  ruleMetrics?: Map<number, RuleMetrics>; // Metrics for each rule by rule index
  rules?: Rule[]; // Rules from config for statistics display
  fixedCount?: number; // Number of issues auto-fixed when --fix was used
};
