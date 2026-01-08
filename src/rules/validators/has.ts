import { resolve } from "node:path";
import type { HasFileRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { exists, pickTopLevelName, toDisplayPath } from "../../fsutil";
import { BaseRuleValidator } from "./base";

export class HasFileRuleValidator extends BaseRuleValidator<HasFileRule> {
  canHandle(rule: any): rule is HasFileRule {
    return rule.kind === "has";
  }

  protected async validateInternal(
    rule: HasFileRule,
    context: RuleValidatorContext,
    ruleIndex: number,
    config: { rules: any[] }
  ): Promise<{ hitCount: number }> {
    const { root, cachedGlobScan, ig, rawIssues, rootAllowedSet, matchedGlobFiles } = context;

    let hitCount = 0;
    for (const name of rule.names) {
      // Check if the pattern is a glob pattern
      const isGlobPattern = /[*?{}[\]]/.test(name) || name.includes("**");
      
      if (isGlobPattern) {
        // Use glob scan to find matching files
        const matches = await cachedGlobScan(name, root, root, { onlyFiles: true, ig });
        if (matches.length > 0) {
          // At least one file matches, rule is satisfied
          hitCount += matches.length;
          // Add actual matched file paths to requiredTopLevelNames for display
          for (const match of matches) {
            const relPath = toDisplayPath(match, root);
            if (matchedGlobFiles) {
              const topLevelName = pickTopLevelName(relPath);
              matchedGlobFiles.add(topLevelName);
            }
            // Add to root allowed set if it exists
            if (rootAllowedSet) {
              rootAllowedSet.add(relPath);
            }
          }
          continue;
        }
        
        // No files match the glob pattern, report error
        // Use the pattern itself as the path for error reporting
        const abs = resolve(root, name);
        rawIssues.push({
          ruleKind: rule.kind,
          path: abs,
          displayPath: toDisplayPath(abs, root),
          message: { key: "issue.has.mustExist", params: { name } },
          category: "missing",
          severity: "error",
        });
      } else {
        // Exact file path, use original logic
        const abs = resolve(root, name);
        if (exists(abs)) {
          hitCount++;
          // File exists, add to root allowed set if it exists
          if (rootAllowedSet) {
            const relPath = toDisplayPath(abs, root);
            rootAllowedSet.add(relPath);
          }
          continue;
        }
        rawIssues.push({
          ruleKind: rule.kind,
          path: abs,
          displayPath: toDisplayPath(abs, root),
          message: { key: "issue.has.mustExist", params: { name } },
          category: "missing",
          severity: "error",
        });
      }
    }

    return { hitCount };
  }
}
