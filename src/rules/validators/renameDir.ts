import { resolve } from "node:path";
import type { RenameDirRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { toDisplayPath } from "../../fsutil";
import { BaseRuleValidator } from "./base";

export class RenameDirRuleValidator extends BaseRuleValidator<RenameDirRule> {
  canHandle(rule: any): rule is RenameDirRule {
    return rule.kind === "renameDir";
  }

  protected async validateInternal(
    rule: RenameDirRule,
    context: RuleValidatorContext
  ): Promise<{ hitCount: number }> {
    const { root, snapshot, rawIssues } = context;

    let hitCount = 0;
    for (const name of rule.fromNames) {
      const abs = resolve(root, name);
      if (!snapshot.exists(abs)) continue;

      const shouldApply = await this.shouldApplyToTarget(rule, abs, context);
      if (!shouldApply) continue;

      hitCount++;
      const dest = resolve(root, rule.toName);
      const destExists = snapshot.exists(dest);
      const safeToRename = !destExists;
      const srcIsDir = snapshot.isDirectory(abs);
      const srcIsEmptyDir = srcIsDir ? snapshot.listDir(abs).length === 0 : false;

      if (safeToRename) {
        rawIssues.push(issueFromRule(rule, {
          path: abs,
          displayPath: toDisplayPath(abs, root),
          message: { key: "issue.renameDir.shouldRenameTo", params: { to: `${rule.toName}/` } },
          category: "forbidden",
          severity: "error",
          fix: { type: "rename", fromPath: abs, toPath: dest },
        }));
      } else if (srcIsEmptyDir) {
        rawIssues.push(issueFromRule(rule, {
          path: abs,
          displayPath: toDisplayPath(abs, root),
          message: { key: "issue.renameDir.removeEmptyDir", params: { dir: `${name.replace(/\/$/, "")}/`, to: `${rule.toName}/` } },
          category: "forbidden",
          severity: "warn",
          fix: { type: "deleteEmptyDir", path: abs },
        }));
      } else {
        rawIssues.push(issueFromRule(rule, {
          path: abs,
          displayPath: toDisplayPath(abs, root),
          message: { key: "issue.renameDir.shouldMigrateTo", params: { to: `${rule.toName}/` } },
          category: "forbidden",
          severity: "warn",
        }));
      }
    }

    return { hitCount };
  }
}
