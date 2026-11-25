import { resolve } from "node:path";
import type { NoFilesRule, Rule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { toDisplayPath } from "../../fsutil";
import { BaseRuleValidator } from "./base";

/** Paths that must not exist. The message is the rule's reason. */
export class NoFilesRuleValidator extends BaseRuleValidator<NoFilesRule> {
  canHandle(rule: Rule): rule is NoFilesRule {
    return rule.kind === "no";
  }

  protected async validateInternal(rule: NoFilesRule, context: RuleValidatorContext) {
    const { root, snapshot, rawIssues } = context;
    let hitCount = 0;
    for (const match of snapshot.match(rule.names, { onlyFiles: false })) {
      const abs = resolve(root, match);
      hitCount++;
      rawIssues.push(issueFromRule(rule, {
        path: abs,
        displayPath: toDisplayPath(abs, root),
        message: { key: "issue.no.because", params: { reason: rule.reason! } },
        reason: false,
      }));
    }
    return { hitCount };
  }
}
