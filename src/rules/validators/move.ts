import { basename, resolve } from "node:path";
import type { MoveRule, Issue } from "../../types";
import type { RuleValidatorContext } from "./types";
import { exists, isDirectory, toDisplayPath } from "../../fsutil";
import { BaseRuleValidator } from "./base";

export class MoveRuleValidator extends BaseRuleValidator<MoveRule> {
  canHandle(rule: any): rule is MoveRule {
    return rule.kind === "move";
  }

  protected async validateInternal(
    rule: MoveRule,
    context: RuleValidatorContext,
    ruleIndex: number,
    config: { rules: any[] }
  ): Promise<{ hitCount: number }> {
    const { root, cachedGlobScan, ig, rawIssues } = context;

    const destDirAbs = resolve(root, rule.toDir);
    const destDirExists = exists(destDirAbs);
    const destDirIsDir = await isDirectory(destDirAbs);
    
    // Only check if destination exists and is not a directory (target directory doesn't need to exist)
    if (destDirExists && !destDirIsDir) {
      rawIssues.push({
        ruleKind: rule.kind,
        path: destDirAbs,
        displayPath: toDisplayPath(destDirAbs, root),
        message: { key: "issue.move.destMustBeDir", params: { from: rule.from, toDir: rule.toDir } },
        category: "forbidden",
        severity: "warn",
      });
    }

    const matches = await cachedGlobScan(rule.from, root, root, { onlyFiles: true, ig });
    const safeDestDir = destDirIsDir || !destDirExists;
    let hitCount = 0;
    
    for (const abs of matches) {
      // Check target-level conditions
      const shouldApply = await this.shouldApplyToTarget(rule, abs, context);
      if (!shouldApply) continue; // Skip this file if conditions not met
      
      const base = basename(abs);
      const target = resolve(root, rule.toDir, base);
      if (toDisplayPath(abs, root).startsWith(`${rule.toDir}/`)) continue;
      const targetExists = exists(target);
      const safeToFix = safeDestDir && !targetExists;
      
      hitCount++;
      rawIssues.push({
        ruleKind: rule.kind,
        path: abs,
        displayPath: toDisplayPath(abs, root),
        message: safeToFix
          ? { key: "issue.move.shouldMoveToDir", params: { dir: `${rule.toDir}/` } }
          : { key: "issue.move.unsafeManual", params: { dir: `${rule.toDir}/` } },
        category: "forbidden",
        severity: safeToFix ? "error" : "warn",
      });
    }

    return { hitCount };
  }
}
