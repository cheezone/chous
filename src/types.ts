export type WhereDirective =
  | { type: "config" } // Default: use rule file's directory as root
  | { type: "cwd" } // Explicit: use process cwd as root
  | { type: "glob"; patterns: string[] } // Scan multiple workspaces: match marker files/directories
  | { type: "paths"; paths: string[] }; // Explicitly specify root directories (can write relative paths/multiple)

export type NamingStyle =
  | "PascalCase"
  | "camelCase"
  | "kebab-case"
  | "snake_case"
  | "SCREAMING_SNAKE_CASE"
  | "flatcase";

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
  | OptionalRule;

export type MoveRule = {
  kind: "move";
  from: string; // glob (root-level)
  toDir: string; // directory name relative to root
};

export type ThoseOnlyRule = {
  kind: "thoseOnly";
  pattern: string; // glob (root-level)
  only: string[]; // globs (root-level)
};

export type RenameDirRule = {
  kind: "renameDir";
  fromNames: string[]; // directory names (root-level)
  toName: string; // directory name (root-level)
};

export type RenameGlobRule = {
  kind: "renameGlob";
  from: string; // glob (root-relative, may include **)
  to: string; // glob-like target pattern (best-effort support)
};

export type InDirOnlyRule = {
  kind: "inDirOnly";
  dir: string; // directory (root-level)
  only: string[]; // globs relative to that dir (usually **/*.ts)
  mode?: "strict" | "permissive"; // strict = enforce whitelist, permissive = suggest only
  fileType?: "files" | "dirs"; // Optional filter for files or directories
};

export type AllowRule = {
  kind: "allow";
  names: string[]; // file/directory names (root-level) - permissive suggestions
};

export type NamingRule = {
  kind: "naming";
  target: "in" | "those";
  pattern: string; // dir (for "in") or glob (for "those")
  style: NamingStyle;
  fileType?: "files" | "dirs"; // Optional filter for files or directories only
  prefix?: string; // Optional regex pattern to remove from the start (e.g., "/^\\d+\\./")
  suffix?: string; // Optional regex pattern to remove from the end (e.g., "/\\.(get|post)$/i")
  except?: string[]; // Optional list of names to exclude from naming checks (only for naming, not directory whitelist)
  // Conditional rules
  ifContains?: string; // For dirs: only apply this rule if the directory contains this file (e.g., "index.vue")
  ifParentStyle?: NamingStyle; // For files: only apply this rule if the parent directory matches this naming style
};

export type NoFilesRule = {
  kind: "no";
  names: string[]; // file names (root-level)
};

export type HasFileRule = {
  kind: "has";
  names: string[]; // file names (root-level)
};

export type OptionalRule = {
  kind: "optional";
  names: string[]; // file names (root-level) - makes has rules optional
};

export type FsLintConfig = {
  where: WhereDirective;
  rules: Rule[];
  imports?: string[]; // Resolved paths of imported presets
};

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
  | { key: "issue.naming.invalid"; params: { style: string } }
  | { key: "issue.naming.invalidPrefix"; params: { pattern: string } }
  | { key: "issue.naming.invalidSuffix"; params: { pattern: string } }
  | { key: "issue.merged.forbiddenOnlyAllowed"; params: { whitelists: Array<{ label: string; only: string[] }> } }
  | { key: "issue.merged.forbiddenBlacklist"; params: { blacklists: Array<{ label: string; patterns: string[] }> } };

export type Issue = {
  ruleKind: Rule["kind"];
  path: string; // absolute
  displayPath: string; // relative to root (posix-ish for display)
  message: IssueMessage;
  category: "missing" | "forbidden"; // Missing vs violation/forbidden
  severity: "error" | "warn";
};

export type LintResult = {
  root: string;
  configPath: string;
  issues: Issue[];
  requiredTopLevelNames: string[];
  visibleSet?: Set<string>;
  imports?: string[]; // Propagated from config
  fileCount?: number; // Number of files scanned
  duration?: number; // Duration in milliseconds
};

