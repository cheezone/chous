import { resolve } from "node:path";
import type { AllowRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { BaseRuleValidator } from "./base";

export class AllowRuleValidator extends BaseRuleValidator<AllowRule> {
  canHandle(rule: any): rule is AllowRule {
    return rule.kind === "allow";
  }

  protected async validateInternal(
    rule: AllowRule,
    context: RuleValidatorContext
  ): Promise<{ hitCount: number }> {
    const { root, snapshot, rawIssues } = context;

    const allowedFiles = new Set<string>();
    for (const name of rule.names) {
      for (const match of snapshot.match(name, { onlyFiles: true })) {
        allowedFiles.add(resolve(root, match));
      }
    }

    let hitCount = 0;
    for (let i = rawIssues.length - 1; i >= 0; i--) {
      const issue = rawIssues[i]!;
      if (issue.ruleKind === "no" && issue.path && allowedFiles.has(resolve(issue.path))) {
        hitCount++;
        rawIssues.splice(i, 1);
      }
    }

    return { hitCount };
  }
}
