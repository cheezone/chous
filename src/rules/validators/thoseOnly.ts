import { resolve } from "node:path";
import type { Rule, ThoseOnlyRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { toDisplayPath } from "../../fsutil";
import { BaseRuleValidator } from "./base";

/** Everything matching `pattern` must also match one of `only`. */
export class ThoseOnlyRuleValidator extends BaseRuleValidator<ThoseOnlyRule> {
  canHandle(rule: Rule): rule is ThoseOnlyRule {
    return rule.kind === "thoseOnly";
  }

  protected async validateInternal(rule: ThoseOnlyRule, context: RuleValidatorContext) {
    const { root, snapshot, rawIssues } = context;
    const allowed = new Set(snapshot.match(rule.only, { onlyFiles: true }).map((p) => resolve(root, p)));
    let hitCount = 0;
    for (const match of snapshot.match(rule.pattern, { onlyFiles: true })) {
      const abs = resolve(root, match);
      if (allowed.has(abs)) continue;
      hitCount++;
      rawIssues.push(issueFromRule(rule, {
        path: abs,
        displayPath: toDisplayPath(abs, root),
        message: { key: "issue.thoseOnly.forbiddenOnlyAllowed", params: { only: rule.only, pattern: rule.pattern } },
        category: "forbidden",
        severity: "error",
        reason: false,
      }));
    }
    return { hitCount };
  }
}
