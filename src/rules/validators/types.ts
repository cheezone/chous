import type { Issue, IssueMessage, Rule, Value, Verdict } from "../../types";
import type { MessageKey } from "../../i18n";
import type { WorkspaceSnapshot } from "../../vfs/snapshot";

/** What every validator gets. The workspace is read through `snapshot`. */
export interface RuleValidatorContext {
  root: string;
  snapshot: WorkspaceSnapshot;
  rawIssues: Issue[];
  /** YYYY-MM-DD; defaults to the real date. Lets tests pin "now". */
  today?: string;
}

export interface RuleValidator<R extends Rule = Rule> {
  canHandle(rule: Rule): rule is R;
  validate(rule: R, context: RuleValidatorContext): Promise<void>;
}

/** Build an issue that inherits the rule's source, reason, value and verdict. */
export function issueFromRule(
  rule: Rule,
  partial: {
    path: string;
    displayPath: string;
    /** Appended to the path as ` (label)`: say so, so the report can tell it from a name with brackets. */
    label?: string;
    message: IssueMessage;
    verdict?: Verdict;
    /** When one rule reports for another value (a crowded root is disorder, not dirt). */
    value?: Value;
    /** `false` keeps the rule's reason out (when the message already says it). */
    reason?: MessageKey | false;
    /** Every fact behind the finding, untruncated, for `--json`. */
    details?: Record<string, unknown>;
  },
): Issue {
  const reason = partial.reason === false ? undefined : (partial.reason ?? rule.reason);
  return {
    ruleKind: rule.kind,
    ruleSource: rule.source,
    ...(reason ? { reason } : {}),
    path: partial.path,
    displayPath: partial.label === undefined ? partial.displayPath : `${partial.displayPath} (${partial.label})`,
    ...(partial.label === undefined ? {} : { label: partial.label }),
    message: partial.message,
    verdict: rule.verdict ?? partial.verdict ?? "smell",
    value: partial.value ?? rule.value,
    ...(partial.details ? { details: partial.details } : {}),
  };
}
