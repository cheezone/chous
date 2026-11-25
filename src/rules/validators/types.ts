import type { Issue, IssueMessage, Rule, Severity } from "../../types";
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

/** Build an issue that inherits the rule's source, reason and severity override. */
export function issueFromRule(
  rule: Rule,
  partial: {
    path: string;
    displayPath: string;
    message: IssueMessage;
    severity?: Severity;
    /** `false` keeps the rule's reason out (when the message already says it). */
    reason?: MessageKey | false;
  },
): Issue {
  const reason = partial.reason === false ? undefined : (partial.reason ?? rule.reason);
  return {
    ruleKind: rule.kind,
    ruleSource: rule.source,
    ...(reason ? { reason } : {}),
    path: partial.path,
    displayPath: partial.displayPath,
    message: partial.message,
    severity: rule.severity ?? partial.severity ?? "error",
  };
}
