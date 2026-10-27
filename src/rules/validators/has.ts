import { resolve } from "node:path";
import type { HasFileRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { pickTopLevelName, toDisplayPath } from "../../fsutil";
import { BaseRuleValidator } from "./base";

export class HasFileRuleValidator extends BaseRuleValidator<HasFileRule> {
  canHandle(rule: any): rule is HasFileRule {
    return rule.kind === "has";
  }

  protected async validateInternal(
    rule: HasFileRule,
    context: RuleValidatorContext
  ): Promise<{ hitCount: number }> {
    const { root, snapshot, rawIssues, rootAllowedSet, matchedGlobFiles } = context;

    let hitCount = 0;
    for (const name of rule.names) {
      const isGlobPattern = /[*?{}[\]]/.test(name) || name.includes("**");

      if (isGlobPattern) {
        const matches = snapshot.match(name, { onlyFiles: true });
        if (matches.length > 0) {
          hitCount += matches.length;
          for (const match of matches) {
            const relPath = toDisplayPath(match, root);
            if (matchedGlobFiles) {
              matchedGlobFiles.add(pickTopLevelName(relPath));
            }
            if (rootAllowedSet) rootAllowedSet.add(relPath);
          }
          continue;
        }

        const abs = resolve(root, name);
        rawIssues.push(issueFromRule(rule, {
          path: abs,
          displayPath: toDisplayPath(abs, root),
          message: { key: "issue.has.mustExist", params: { name } },
          category: "missing",
          severity: "error",
        }));
      } else {
        const abs = resolve(root, name);
        if (snapshot.exists(abs)) {
          hitCount++;
          if (rootAllowedSet) rootAllowedSet.add(toDisplayPath(abs, root));
          continue;
        }
        rawIssues.push(issueFromRule(rule, {
          path: abs,
          displayPath: toDisplayPath(abs, root),
          message: { key: "issue.has.mustExist", params: { name } },
          category: "missing",
          severity: "error",
        }));
      }
    }

    return { hitCount };
  }
}
