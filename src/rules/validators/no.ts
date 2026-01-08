import { resolve } from "node:path";
import type { NoFilesRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { exists, toDisplayPath } from "../../fsutil";
import { BaseRuleValidator } from "./base";

export class NoFilesRuleValidator extends BaseRuleValidator<NoFilesRule> {
  canHandle(rule: any): rule is NoFilesRule {
    return rule.kind === "no";
  }

  protected async validateInternal(
    rule: NoFilesRule,
    context: RuleValidatorContext,
    ruleIndex: number,
    config: { rules: any[] }
  ): Promise<{ hitCount: number }> {
    const { root, cachedGlobScan, ig, rawIssues } = context;

    // Remove issues from previous "no" rules with matching patterns (later rules override earlier ones)
    // First, collect all files that match current rule's patterns
    const currentRuleFiles = new Set<string>();
    for (const name of rule.names) {
      const matches = await cachedGlobScan(name, root, root, { onlyFiles: true, ig });
      for (const match of matches) {
        currentRuleFiles.add(resolve(root, match));
      }
    }
    
    // Remove previous issues that match current rule's patterns
    for (let i = rawIssues.length - 1; i >= 0; i--) {
      const issue = rawIssues[i]!;
      if (issue.ruleKind === "no" && issue.path && currentRuleFiles.has(resolve(issue.path))) {
        rawIssues.splice(i, 1);
      }
    }
    
    // Add new issues for current rule
    let hitCount = 0;
    for (const name of rule.names) {
      const matches = await cachedGlobScan(name, root, root, { onlyFiles: true, ig });
      for (const match of matches) {
        const abs = resolve(root, match);
        if (!exists(abs)) continue;
        
        // Check target-level conditions
        const shouldApply = await this.shouldApplyToTarget(rule, abs, context);
        if (!shouldApply) continue; // Skip this file if conditions not met
        
        hitCount++;
        rawIssues.push({
          ruleKind: rule.kind,
          path: abs,
          displayPath: toDisplayPath(abs, root),
          message: { key: "issue.no.forbidden", params: { name } },
          category: "forbidden",
          severity: "error",
        });
      }
    }

    return { hitCount };
  }
}
