import type { DepsRule, Rule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { BaseRuleValidator } from "./base";

/** `name` or a scope wildcard such as `@scope/*`. */
export function depMatches(pattern: string, name: string): boolean {
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -1);
    return name.startsWith(prefix) && name.length > prefix.length;
  }
  return name === pattern;
}

function safeLabel(label: string): string {
  return label.replaceAll("/", "∕");
}

/** Dependencies their authors ended, or the platform replaced, with what to use instead. */
export class DepsRuleValidator extends BaseRuleValidator<DepsRule> {
  canHandle(rule: Rule): rule is DepsRule {
    return rule.kind === "deps";
  }

  protected async validateInternal(rule: DepsRule, context: RuleValidatorContext) {
    const manifest = context.snapshot.manifest;
    let hitCount = 0;
    for (const pattern of rule.names) {
      for (const name of [...manifest.deps].filter((dep) => depMatches(pattern, dep)).sort()) {
        hitCount++;
        context.rawIssues.push(issueFromRule(rule, {
          path: `${manifest.path}#forbidden:${name}`,
          displayPath: `package.json (${safeLabel(name)})`,
          message: rule.native
            ? { key: "issue.deps.native", params: { name, use: rule.use } }
            : { key: "issue.deps.obsolete", params: { name, why: { t: rule.reason! }, use: rule.use } },
          verdict: rule.native ? "review" : "smell",
          // The authors' own words are in the message already.
          ...(rule.native ? {} : { reason: false as const }),
        }));
      }
    }
    return { hitCount };
  }
}
