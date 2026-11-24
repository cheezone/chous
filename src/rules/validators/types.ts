import type { Issue, Rule, InDirOnlyRule, Severity, SafeFix, IssueMessage, RuleSource } from "../../types";
import type { Text } from "../../i18n/text";
import type { WorkspaceSnapshot } from "../../vfs/snapshot";
/**
 * Shared context for all rule validators.
 * Validators read the workspace exclusively through `snapshot` — no extra disk I/O.
 */
export interface RuleValidatorContext {
  root: string;
  snapshot: WorkspaceSnapshot;
  rawIssues: Issue[];
  inDirGroups?: Map<string, InDirOnlyRule[]>;
  rootAllowedSet?: Set<string>;
  filesMatchedByMoveRules?: Set<string>;
  config: { rules: Rule[] };
  matchedGlobFiles?: Set<string>;
}

/**
 * Base interface for rule validators
 */
export interface RuleValidator<R extends Rule = Rule> {
  canHandle(rule: Rule): rule is R;
  validate(rule: R, context: RuleValidatorContext): Promise<void>;
}

/** Build an Issue inheriting rule source / optional severity override.
 * Only author-written `reason` (because / @reason / intentional adjacent comment)
 * is attached — never English builtin defaults. Whitelist/blacklist issues should
 * pass `reason: false` so the numbered footer stays the sole explanation.
 */
export function issueFromRule(
  rule: Rule,
  partial: {
    path: string;
    displayPath: string;
    message: IssueMessage;
    category: "missing" | "forbidden";
    severity?: Severity;
    fix?: SafeFix;
    /** `false` = omit reason even if the rule has one (allow-list / deny-list). */
    reason?: Text | false;
  },
): Issue {
  const reason =
    partial.reason === false
      ? undefined
      : partial.reason !== undefined
        ? partial.reason
        : rule.reason;
  return {
    ruleKind: rule.kind,
    ruleSource: rule.source,
    ...(reason ? { reason } : {}),
    path: partial.path,
    displayPath: partial.displayPath,
    message: partial.message,
    category: partial.category,
    severity: rule.severity ?? partial.severity ?? "error",
    ...(partial.fix ? { fix: partial.fix } : {}),
    ...(partial.fix ? { resolution: "auto" as const } : {}),
  };
}

/** Fallback source when a synthetic issue has no originating rule. */
export function syntheticSource(taste: string): RuleSource {
  return { taste };
}
