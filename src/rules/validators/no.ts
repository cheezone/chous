import { resolve } from "node:path";
import type { NoFilesRule, Rule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { toDisplayPath } from "../../fsutil";
import { BaseRuleValidator } from "./base";
import { NOT_OURS } from "../../taste/hygiene";

/** Paths that must not exist. The message is the rule's reason. */
export class NoFilesRuleValidator extends BaseRuleValidator<NoFilesRule> {
  canHandle(rule: Rule): rule is NoFilesRule {
    return rule.kind === "no";
  }

  protected async validateInternal(rule: NoFilesRule, context: RuleValidatorContext) {
    const { root, snapshot, rawIssues } = context;
    let hitCount = 0;
    const anywhere = rule.names.every((n) => n.startsWith("**/"));
    for (const match of snapshot.match(rule.names, { onlyFiles: false })) {
      const abs = resolve(root, match);
      // Test inputs may hold anything, even a `desktop.ini` (Zig tests one).
      if (anywhere && NOT_OURS.test(toDisplayPath(abs, root))) continue;
      hitCount++;
      rawIssues.push(issueFromRule(rule, {
        path: abs,
        displayPath: toDisplayPath(abs, root),
        message: { key: "issue.no.because", params: { reason: { t: rule.reason! } } },
        reason: false,
      }));
    }
    return { hitCount };
  }
}
