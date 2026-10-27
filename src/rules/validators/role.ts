import type { RoleRule, Rule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { BaseRuleValidator } from "./base";
import {
  defaultResolution,
  detectRoleOccupancy,
  lookupMigration,
  roleDslName,
  type RoleId,
} from "../../knowledge";
import { getKnowledge } from "../../knowledge/registry";

function safeLabel(label: string): string {
  return label.replaceAll("/", "∕");
}

/**
 * Validates stack-layer role declarations against detected occupancy.
 * `package-manager` is skipped here — still handled by StackRuleValidator / packageManager rule.
 */
export class RoleRuleValidator extends BaseRuleValidator<RoleRule> {
  canHandle(rule: Rule): rule is RoleRule {
    return rule.kind === "role";
  }

  protected async validateInternal(
    rule: RoleRule,
    context: RuleValidatorContext,
  ): Promise<{ hitCount: number }> {
    if (rule.role === "package-manager") {
      // Existing PackageManagerRule + StackRuleValidator own this role.
      return { hitCount: 0 };
    }

    const role = rule.role as RoleId;
    const preferred = rule.tools[0]!;
    const accepted = new Set(rule.tools);
    const occupancy = detectRoleOccupancy(context.snapshot);
    const current = occupancy.get(role) ?? [];
    // Prefer strong signals; fall back to any
    const strong = current.filter((o) => o.strong);
    const occupants = strong.length > 0 ? strong : current;

    let hitCount = 0;
    const manifest = context.snapshot.manifest;
    const knowledge = getKnowledge();

    // Deprecated tools always warn when present
    for (const occ of current) {
      const tool = knowledge.tools.find((t) => t.id === occ.toolId);
      if (tool?.status !== "deprecated") continue;
      hitCount++;
      context.rawIssues.push({
        ...issueFromRule(rule, {
          path: `${manifest.path}#role:${role}:deprecated:${occ.toolId}`,
          displayPath: `stack (${roleDslName(role)})`,
          message: { key: "issue.role.deprecated", params: { tool: occ.toolId } },
          category: "forbidden",
          severity: "warn",
        }),
        resolution: "info",
      });
    }

    const acceptedPresent = occupants.some((o) => accepted.has(o.toolId));
    if (acceptedPresent) {
      // Declared tool is present — co-installed siblings (e.g. eslint next to @antfu/eslint-config) are fine.
      return { hitCount };
    }

    if (occupants.length === 0) {
      // Role declared but nothing detected — soft missing (warn)
      hitCount++;
      context.rawIssues.push({
        ...issueFromRule(rule, {
          path: `${manifest.path}#role:${role}:missing:${preferred}`,
          displayPath: `stack (${roleDslName(role)})`,
          message: { key: "issue.role.missing", params: { role: roleDslName(role), expected: preferred } },
          category: "missing",
          severity: rule.severity ?? "warn",
        }),
        resolution: "agent",
      });
      return { hitCount };
    }

    // Accepted tool absent; foreign tools occupy the role → mismatch / migrate.
    for (const occ of occupants) {
      hitCount++;
      const migration = lookupMigration(role, occ.toolId, preferred);
      const resolution = defaultResolution(migration);
      const reasonParts = [rule.reason, migration?.notes].filter(Boolean);
      context.rawIssues.push({
        ...issueFromRule(rule, {
          path: `${manifest.path}#role:${role}:mismatch:${occ.toolId}`,
          displayPath: `stack (${safeLabel(roleDslName(role))}: ${safeLabel(occ.toolId)}→${safeLabel(preferred)})`,
          message: {
            key: "issue.role.mismatch",
            params: { role: roleDslName(role), expected: preferred, actual: occ.toolId },
          },
          category: "forbidden",
          severity: rule.severity ?? (resolution === "info" ? "warn" : "error"),
          ...(reasonParts.length ? { reason: reasonParts.join("\n") } : {}),
        }),
        resolution,
        ...(migration?.see ? { see: migration.see } : {}),
      });
    }

    return { hitCount };
  }
}
