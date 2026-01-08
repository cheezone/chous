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
    context: RuleValidatorContext,
    ruleIndex: number,
    config: { rules: any[] }
  ): Promise<{ hitCount: number }> {
    const { root, cachedGlobScan, ig, rawIssues } = context;

    // Remove issues from "no" rules that match the allowed patterns
    // This allows "allow" rules to override "no" rules
    const allowedFiles = new Set<string>();
    for (const name of rule.names) {
      const matches = await cachedGlobScan(name, root, root, { onlyFiles: true, ig });
      for (const match of matches) {
        allowedFiles.add(resolve(root, match));
      }
    }
    
    // Remove "no" rule issues that match allowed patterns
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
