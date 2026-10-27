import { resolve } from "node:path";
import type { OptionalRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { BaseRuleValidator } from "./base";

export class OptionalRuleValidator extends BaseRuleValidator<OptionalRule> {
  canHandle(rule: any): rule is OptionalRule {
    return rule.kind === "optional";
  }

  protected async validateInternal(
    rule: OptionalRule,
    context: RuleValidatorContext
  ): Promise<{ hitCount: number }> {
    const { root, snapshot, rawIssues } = context;

    const optionalPaths = new Set<string>();
    for (const name of rule.names) {
      optionalPaths.add(resolve(root, name));
      for (const match of snapshot.match(name, { onlyFiles: true })) {
        optionalPaths.add(resolve(root, match));
      }
    }

    let hitCount = 0;
    for (let i = rawIssues.length - 1; i >= 0; i--) {
      const issue = rawIssues[i]!;
      if (issue.ruleKind === "has" && issue.path && optionalPaths.has(resolve(issue.path))) {
        hitCount++;
        rawIssues.splice(i, 1);
      }
    }

    return { hitCount };
  }
}
