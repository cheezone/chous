import { resolve } from "node:path";
import type { NoFilesRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { toDisplayPath } from "../../fsutil";
import { BaseRuleValidator } from "./base";

export class NoFilesRuleValidator extends BaseRuleValidator<NoFilesRule> {
  canHandle(rule: any): rule is NoFilesRule {
    return rule.kind === "no";
  }

  protected async validateInternal(
    rule: NoFilesRule,
    context: RuleValidatorContext
  ): Promise<{ hitCount: number }> {
    const { root, snapshot, rawIssues } = context;

    const currentRuleFiles = new Set<string>();
    for (const name of rule.names) {
      for (const match of snapshot.match(name, { onlyFiles: false })) {
        currentRuleFiles.add(resolve(root, match));
      }
    }

    for (let i = rawIssues.length - 1; i >= 0; i--) {
      const issue = rawIssues[i]!;
      if (issue.ruleKind === "no" && issue.path && currentRuleFiles.has(resolve(issue.path))) {
        rawIssues.splice(i, 1);
      }
    }

    let hitCount = 0;
    for (const name of rule.names) {
      const matches = snapshot.match(name, { onlyFiles: false });
      for (const match of matches) {
        const abs = resolve(root, match);
        if (!snapshot.exists(abs)) continue;


        hitCount++;
        rawIssues.push(issueFromRule(rule, {
          path: abs,
          displayPath: toDisplayPath(abs, root),
          // A ban with a reason says why; a bare ban joins the numbered blacklist.
          message: rule.reason
            ? { key: "issue.no.because", params: { reason: rule.reason } }
            : { key: "issue.no.forbidden", params: { name } },
          category: "forbidden",
          severity: "error",
          reason: false,
        }));
      }
    }

    return { hitCount };
  }
}
