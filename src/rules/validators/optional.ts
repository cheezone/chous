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
    context: RuleValidatorContext,
    ruleIndex: number,
    config: { rules: any[] }
  ): Promise<{ hitCount: number }> {
    const { root, cachedGlobScan, ig, rawIssues } = context;

    // Remove issues from "has" rules that match the optional patterns
    // This allows "optional" rules to override "has" rules, making files optional instead of required
    // We need to match both by exact path and by pattern, similar to how "has" rules work
    const optionalPaths = new Set<string>();
    for (const name of rule.names) {
      // First, try to resolve as direct path (like "has" does)
      const abs = resolve(root, name);
      optionalPaths.add(abs);
      
      // Also try glob matching for patterns (e.g., "*.lock.yaml")
      const matches = await cachedGlobScan(name, root, root, { onlyFiles: true, ig });
      for (const match of matches) {
        optionalPaths.add(resolve(root, match));
      }
    }
    
    // Remove "has" rule issues that match optional patterns
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
