import type { ExclusiveRule, Rule, StackRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { BaseRuleValidator } from "./base";
import { detectRoleOccupancy, roleLabel, type RoleId } from "../../knowledge";

/**
 * Two tools doing the same job is a bug, whichever two they are.
 * Only strong signals count (config files, lockfiles, package.json fields, scripts),
 * so a stray dependency alone never triggers it.
 */
export class OneToolPerRoleValidator extends BaseRuleValidator<StackRule> {
  canHandle(rule: Rule): rule is StackRule {
    return rule.kind === "stack";
  }

  protected async validateInternal(rule: StackRule, context: RuleValidatorContext) {
    const occupancy = detectRoleOccupancy(context.snapshot);
    const manifest = context.snapshot.manifest;
    let hitCount = 0;

    for (const role of rule.roles as RoleId[]) {
      const tools = (occupancy.get(role) ?? []).filter((o) => o.strong).map((o) => o.toolId).sort();
      hitCount++;
      if (tools.length < 2) continue;
      context.rawIssues.push(issueFromRule(rule, {
        path: `${manifest.path}#stack:${role}`,
        displayPath: `package.json (${role})`,
        message: { key: "issue.stack.conflict", params: { role: roleLabel(role), tools: tools.join(" + ") } },
        severity: "error",
      }));
    }
    return { hitCount };
  }
}

/** One name per concept: at most one of `names` may exist at the root. */
export class ExclusiveRuleValidator extends BaseRuleValidator<ExclusiveRule> {
  canHandle(rule: Rule): rule is ExclusiveRule {
    return rule.kind === "exclusive";
  }

  protected async validateInternal(rule: ExclusiveRule, context: RuleValidatorContext) {
    const present = rule.names.filter((name) => context.snapshot.exists(name));
    if (present.length > 1) {
      const names = present.map((name) => (context.snapshot.isDirectory(name) ? `${name}/` : name)).join(" + ");
      context.rawIssues.push(issueFromRule(rule, {
        path: `${context.root}#exclusive:${present.join("+")}`,
        displayPath: names,
        message: { key: "issue.exclusive.conflict" },
        severity: "error",
      }));
    }
    return { hitCount: present.length };
  }
}
