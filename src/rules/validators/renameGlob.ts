import { resolve } from "node:path";
import type { RenameGlobRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { toDisplayPath } from "../../fsutil";
import { BaseRuleValidator } from "./base";

function computeRenameDest(fromAbs: string, root: string, rule: RenameGlobRule): string | null {
  const rel = toDisplayPath(fromAbs, root);

  if (rule.to.endsWith(".test.ts")) {
    if (rel.endsWith(".spec.ts")) return resolve(root, rel.replace(/\.spec\.ts$/, ".test.ts"));
    if (rel.endsWith(".tests.ts")) return resolve(root, rel.replace(/\.tests\.ts$/, ".test.ts"));
  }

  if (!/[*?{}[\]]/.test(rule.to) && !rule.to.includes("**")) {
    return resolve(root, rule.to);
  }

  return null;
}

export class RenameGlobRuleValidator extends BaseRuleValidator<RenameGlobRule> {
  canHandle(rule: any): rule is RenameGlobRule {
    return rule.kind === "renameGlob";
  }

  protected async validateInternal(
    rule: RenameGlobRule,
    context: RuleValidatorContext
  ): Promise<{ hitCount: number }> {
    const { root, snapshot, rawIssues } = context;

    const matches = snapshot.match(rule.from, { onlyFiles: true });
    let hitCount = 0;
    for (const abs of matches) {
      const shouldApply = await this.shouldApplyToTarget(rule, abs, context);
      if (!shouldApply) continue;

      hitCount++;
      const dest = computeRenameDest(abs, root, rule);
      const destExists = dest ? snapshot.exists(dest) : false;
      const safeToFix = Boolean(dest) && !destExists;

      rawIssues.push(issueFromRule(rule, {
        path: abs,
        displayPath: toDisplayPath(abs, root),
        message: dest
          ? safeToFix
            ? { key: "issue.renameGlob.shouldRenameTo", params: { to: toDisplayPath(dest, root) } }
            : { key: "issue.renameGlob.targetExistsManual", params: { to: toDisplayPath(dest, root) } }
          : { key: "issue.renameGlob.cannotInferTarget" },
        category: "forbidden",
        severity: safeToFix ? "error" : "warn",
        ...(safeToFix && dest ? { fix: { type: "rename" as const, fromPath: abs, toPath: dest } } : {}),
      }));
    }

    return { hitCount };
  }
}
