import { resolve } from "node:path";
import type { RenameGlobRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { exists, toDisplayPath } from "../../fsutil";
import { BaseRuleValidator } from "./base";

function computeRenameDest(fromAbs: string, root: string, rule: RenameGlobRule): string | null {
  const rel = toDisplayPath(fromAbs, root);

  // Example: tests/**/*.{spec,tests}.ts -> tests/**/*.test.ts
  if (rule.to.endsWith(".test.ts")) {
    if (rel.endsWith(".spec.ts")) return resolve(root, rel.replace(/\.spec\.ts$/, ".test.ts"));
    if (rel.endsWith(".tests.ts")) return resolve(root, rel.replace(/\.tests\.ts$/, ".test.ts"));
  }

  // Simple fallback: if to is a concrete path (no wildcards), use it directly
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
    context: RuleValidatorContext,
    ruleIndex: number,
    config: { rules: any[] }
  ): Promise<{ hitCount: number }> {
    const { root, cachedGlobScan, ig, rawIssues } = context;

    const matches = await cachedGlobScan(rule.from, root, root, { onlyFiles: true, ig });
    let hitCount = 0;
    for (const abs of matches) {
      // Check target-level conditions
      const shouldApply = await this.shouldApplyToTarget(rule, abs, context);
      if (!shouldApply) continue; // Skip this file if conditions not met
      
      hitCount++;
      const dest = computeRenameDest(abs, root, rule);
      const destExists = dest ? exists(dest) : false;
      const safeToFix = Boolean(dest) && !destExists;
      
      rawIssues.push({
        ruleKind: rule.kind,
        path: abs,
        displayPath: toDisplayPath(abs, root),
        message: dest
          ? safeToFix
            ? { key: "issue.renameGlob.shouldRenameTo", params: { to: toDisplayPath(dest, root) } }
            : { key: "issue.renameGlob.targetExistsManual", params: { to: toDisplayPath(dest, root) } }
          : { key: "issue.renameGlob.cannotInferTarget" },
        category: "forbidden",
        severity: safeToFix ? "error" : "warn",
      });
    }

    return { hitCount };
  }
}
