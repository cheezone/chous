import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { RenameDirRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { exists, isDirectory, toDisplayPath } from "../../fsutil";
import { BaseRuleValidator } from "./base";

export class RenameDirRuleValidator extends BaseRuleValidator<RenameDirRule> {
  canHandle(rule: any): rule is RenameDirRule {
    return rule.kind === "renameDir";
  }

  protected async validateInternal(
    rule: RenameDirRule,
    context: RuleValidatorContext,
    ruleIndex: number,
    config: { rules: any[] }
  ): Promise<{ hitCount: number }> {
    const { root, rawIssues } = context;

    let hitCount = 0;
    for (const name of rule.fromNames) {
      const abs = resolve(root, name);
      if (!exists(abs)) continue;
      
      // Check target-level conditions
      const shouldApply = await this.shouldApplyToTarget(rule, abs, context);
      if (!shouldApply) continue; // Skip this directory if conditions not met
      
      hitCount++;
      const dest = resolve(root, rule.toName);
      const destExists = exists(dest);
      const safeToRename = !destExists;
      const srcIsDir = await isDirectory(abs);
      const srcIsEmptyDir = srcIsDir ? (await readdir(abs)).length === 0 : false;
      
      rawIssues.push({
        ruleKind: rule.kind,
        path: abs,
        displayPath: toDisplayPath(abs, root),
        message: safeToRename
          ? { key: "issue.renameDir.shouldRenameTo", params: { to: `${rule.toName}/` } }
          : srcIsEmptyDir
            ? { key: "issue.renameDir.removeEmptyDir", params: { dir: `${name.replace(/\/$/, "")}/`, to: `${rule.toName}/` } }
            : { key: "issue.renameDir.shouldMigrateTo", params: { to: `${rule.toName}/` } },
        category: "forbidden",
        severity: safeToRename ? "error" : "warn",
      });
    }

    return { hitCount };
  }
}
