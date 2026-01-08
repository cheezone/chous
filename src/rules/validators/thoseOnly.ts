import { basename, resolve } from "node:path";
import type { ThoseOnlyRule, Issue } from "../../types";
import type { RuleValidatorContext } from "./types";
import { toDisplayPath } from "../../fsutil";
import { BaseRuleValidator } from "./base";

export class ThoseOnlyRuleValidator extends BaseRuleValidator<ThoseOnlyRule> {
  canHandle(rule: any): rule is ThoseOnlyRule {
    return rule.kind === "thoseOnly";
  }

  protected async validateInternal(
    rule: ThoseOnlyRule,
    context: RuleValidatorContext,
    ruleIndex: number,
    config: { rules: any[] }
  ): Promise<{ hitCount: number }> {
    const { root, cachedGlobScan, ig, rawIssues, debugLogMsg } = context;

    debugLogMsg?.("🔵 [thoseOnly] Start processing rule", { pattern: rule.pattern, onlyCount: rule.only.length });
    
    // Remove issues from previous rules with the same pattern (later rules override earlier ones)
    // Track processed patterns for thoseOnly and no rules to allow later rules to override earlier ones
    if (!context.processedThoseOnlyPatterns) {
      context.processedThoseOnlyPatterns = new Map<string, number>();
    }
    const processedThoseOnlyPatterns = context.processedThoseOnlyPatterns;
    const previousRuleIndex = processedThoseOnlyPatterns.get(rule.pattern);
    
    if (previousRuleIndex !== undefined) {
      // Remove issues from the previous rule with the same pattern
      const allFiles = await cachedGlobScan(rule.pattern, root, root, { onlyFiles: true, ig });
      const allFilesSet = new Set(allFiles.map(p => resolve(root, p)));
      for (let i = rawIssues.length - 1; i >= 0; i--) {
        const issue = rawIssues[i]!;
        if (issue.ruleKind === "thoseOnly" && issue.path && allFilesSet.has(resolve(issue.path))) {
          rawIssues.splice(i, 1);
        }
      }
    }
    processedThoseOnlyPatterns.set(rule.pattern, ruleIndex);
    
    const all = await cachedGlobScan(rule.pattern, root, root, { onlyFiles: true, ig });
    debugLogMsg?.("🔵 [thoseOnly] Scan matching files", { pattern: rule.pattern, matches: all.length, matchesList: all });
    
    const allowed = new Set((await cachedGlobScan(rule.only, root, root, { onlyFiles: true, ig })).map((p) => resolve(root, p)));
    const allowedList = Array.from(allowed);
    const DEBUG_FILE = process.env.DEBUG_FILE;
    const targetInAllowed = DEBUG_FILE ? allowedList.filter(p => basename(p) === DEBUG_FILE || p.includes(DEBUG_FILE)) : [];
    debugLogMsg?.("🔵 [thoseOnly] Scan allowed files", { allowedCount: allowed.size, targetInAllowed, allowedPatterns: rule.only.slice(0, 10) });
    
    let hitCount = 0;
    for (const abs of all) {
      const absPath = resolve(root, abs);
      
      // Check target-level conditions
      const shouldApply = await this.shouldApplyToTarget(rule, absPath, context);
      if (!shouldApply) continue; // Skip this file if conditions not met
      
      const isAllowed = allowed.has(absPath);
      debugLogMsg?.("🔵 [thoseOnly] Check file", { file: absPath, isAllowed });
      
      if (!isAllowed) {
        hitCount++;
        const issue: Issue = {
          ruleKind: rule.kind,
          path: absPath,
          displayPath: toDisplayPath(absPath, root),
          message: { key: "issue.thoseOnly.forbiddenOnlyAllowed", params: { only: rule.only, pattern: rule.pattern } },
          category: "forbidden",
          severity: "error",
        };
        debugLogMsg?.("🔴 [thoseOnly] Create issue", {
          displayPath: issue.displayPath,
          pattern: rule.pattern,
          only: rule.only,
          existingIssuesForSameFile: rawIssues.filter(i => i.displayPath === issue.displayPath).map(i => ({
            ruleKind: i.ruleKind,
            messageKey: i.message.key,
            params: 'params' in i.message ? i.message.params : undefined
          }))
        });
        rawIssues.push(issue);
      }
    }

    return { hitCount };
  }
}
