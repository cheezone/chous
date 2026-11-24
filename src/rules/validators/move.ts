import { basename, resolve } from "node:path";
import type { MoveRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { toDisplayPath } from "../../fsutil";
import { BaseRuleValidator } from "./base";

export class MoveRuleValidator extends BaseRuleValidator<MoveRule> {
  canHandle(rule: any): rule is MoveRule {
    return rule.kind === "move";
  }

  protected async validateInternal(
    rule: MoveRule,
    context: RuleValidatorContext
  ): Promise<{ hitCount: number }> {
    const { root, snapshot, rawIssues } = context;

    const destDirAbs = resolve(root, rule.toDir);
    const destDirExists = snapshot.exists(destDirAbs);
    const destDirIsDir = snapshot.isDirectory(destDirAbs);

    if (destDirExists && !destDirIsDir) {
      rawIssues.push(issueFromRule(rule, {
        path: destDirAbs,
        displayPath: toDisplayPath(destDirAbs, root),
        message: { key: "issue.move.destMustBeDir", params: { from: rule.from, toDir: rule.toDir } },
        category: "forbidden",
        severity: "warn",
      }));
    }

    const matches = snapshot.match(rule.from, { onlyFiles: true });
    const safeDestDir = destDirIsDir || !destDirExists;
    let hitCount = 0;

    for (const abs of matches) {

      const base = basename(abs);
      const target = resolve(root, rule.toDir, base);
      if (toDisplayPath(abs, root).startsWith(`${rule.toDir}/`)) continue;
      const targetExists = snapshot.exists(target);
      const safeToFix = safeDestDir && !targetExists;

      hitCount++;
      rawIssues.push(issueFromRule(rule, {
        path: abs,
        displayPath: toDisplayPath(abs, root),
        message: safeToFix
          ? { key: "issue.move.shouldMoveToDir", params: { dir: `${rule.toDir}/` } }
          : { key: "issue.move.unsafeManual", params: { dir: `${rule.toDir}/` } },
        category: "forbidden",
        severity: safeToFix ? "error" : "warn",
        ...(safeToFix ? { fix: { type: "rename" as const, fromPath: abs, toPath: target } } : {}),
      }));
    }

    return { hitCount };
  }
}
