import { resolve } from "node:path";
import type { ThoseOnlyRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { toDisplayPath } from "../../fsutil";
import { BaseRuleValidator } from "./base";

export class ThoseOnlyRuleValidator extends BaseRuleValidator<ThoseOnlyRule> {
  canHandle(rule: any): rule is ThoseOnlyRule {
    return rule.kind === "thoseOnly";
  }

  protected async validateInternal(
    rule: ThoseOnlyRule,
    context: RuleValidatorContext,
    ruleIndex: number
  ): Promise<{ hitCount: number }> {
    const { root, snapshot, rawIssues, debugLogMsg } = context;

    debugLogMsg?.("🔵 [thoseOnly] Start processing rule", { pattern: rule.pattern, onlyCount: rule.only.length });

    if (!context.processedThoseOnlyPatterns) {
      context.processedThoseOnlyPatterns = new Map<string, number>();
    }
    const processedThoseOnlyPatterns = context.processedThoseOnlyPatterns;
    const previousRuleIndex = processedThoseOnlyPatterns.get(rule.pattern);

    if (previousRuleIndex !== undefined) {
      const allFiles = snapshot.match(rule.pattern, { onlyFiles: true });
      const allFilesSet = new Set(allFiles.map((p) => resolve(root, p)));
      for (let i = rawIssues.length - 1; i >= 0; i--) {
        const issue = rawIssues[i]!;
        if (issue.ruleKind === "thoseOnly" && issue.path && allFilesSet.has(resolve(issue.path))) {
          rawIssues.splice(i, 1);
        }
      }
    }
    processedThoseOnlyPatterns.set(rule.pattern, ruleIndex);

    const all = snapshot.match(rule.pattern, { onlyFiles: true });
    const allowed = new Set(snapshot.match(rule.only, { onlyFiles: true }).map((p) => resolve(root, p)));

    let hitCount = 0;
    for (const abs of all) {
      const absPath = resolve(root, abs);
      const shouldApply = await this.shouldApplyToTarget(rule, absPath, context);
      if (!shouldApply) continue;

      if (!allowed.has(absPath)) {
        hitCount++;
        rawIssues.push(issueFromRule(rule, {
          path: absPath,
          displayPath: toDisplayPath(absPath, root),
          message: { key: "issue.thoseOnly.forbiddenOnlyAllowed", params: { only: rule.only, pattern: rule.pattern } },
          category: "forbidden",
          severity: "error",
          reason: false,
        }));
      }
    }

    return { hitCount };
  }
}
