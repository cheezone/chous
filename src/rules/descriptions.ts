import type { Rule } from "../types";

/** Built-in fallback explanations when a rule has no `reason` / adjacent comment. */
const DEFAULT_REASONS: Partial<Record<Rule["kind"], string>> = {
  move: "Files matching this pattern belong in a specific directory.",
  thoseOnly: "Only the listed patterns are allowed for this glob.",
  renameDir: "This directory name should follow the project's naming convention.",
  renameGlob: "Matched files should be renamed to the target pattern.",
  inDirOnly: "Only the listed entries are allowed in this directory.",
  naming: "Names in this scope must follow the declared naming style.",
  no: "These files or patterns are forbidden in this project.",
  has: "These files or patterns must exist.",
  allow: "These entries are explicitly allowed (whitelist).",
  optional: "These required entries are optional.",
  packageManager: "The project must use the declared package manager.",
  deps: "Dependency allow/deny list for this persona or preset.",
  replaceDep: "Replace a banned dependency with the preferred alternative.",
};

export function defaultReasonFor(kind: Rule["kind"]): string | undefined {
  return DEFAULT_REASONS[kind];
}

export function resolveRuleReason(rule: { kind: Rule["kind"]; reason?: string }): string | undefined {
  return rule.reason ?? defaultReasonFor(rule.kind);
}
