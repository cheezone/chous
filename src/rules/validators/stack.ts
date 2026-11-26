import type { Rule, StackRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { BaseRuleValidator } from "./base";
import { detectRoleOccupancy, roleLabel, type RoleId } from "../../knowledge";
import { IN_TESTS, LOCKFILE_MANAGER } from "../../taste/js";
import { NOT_OURS } from "../../taste/hygiene";

/**
 * Two tools holding one job, whichever two they are. chous does not claim they
 * break each other.
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
      let tools = (occupancy.get(role) ?? []).filter((o) => o.strong).map((o) => o.toolId).sort();
      // One repository, one package manager: `frontend/` on npm beside a root on pnpm is two tools for one job.
      if (role === "package-manager" && rule.acrossProjects && tools.length < 2) {
        const nested = nestedManagers(context);
        const all = new Set([...tools, ...nested.keys()]);
        if (all.size > 1) tools = [...all].sort().map((pm) => (nested.has(pm) && !tools.includes(pm) ? `${pm} (${nested.get(pm)!.join(", ")})` : pm));
      }
      hitCount++;
      if (tools.length < 2) continue;
      context.rawIssues.push(issueFromRule(rule, {
        path: `${manifest.path}#stack:${role}`,
        displayPath: `package.json (${role})`,
        message: { key: "issue.stack.conflict", params: { role: { t: roleLabel(role) }, tools: tools.join(" + ") } },
      }));
    }
    return { hitCount };
  }
}

/**
 * Package managers of the projects nested in the repository, outside its
 * workspace, by their lockfiles: `npm → [frontend/]`. A workspace package's
 * own lockfile is a finding of its own (a nested lockfile).
 */
function nestedManagers(context: RuleValidatorContext): Map<string, string[]> {
  const { snapshot } = context;
  const packages = snapshot.workspace.packages;
  const found = new Map<string, string[]>();
  for (const [rel, entry] of snapshot.byRel) {
    const pm = LOCKFILE_MANAGER.get(entry.name);
    if (!pm || !rel.includes("/") || NOT_OURS.test(rel) || IN_TESTS.test(rel)) continue;
    const dir = rel.slice(0, rel.lastIndexOf("/"));
    if (packages.some((p) => dir === p || dir.startsWith(`${p}/`))) continue;
    found.set(pm, [...(found.get(pm) ?? []), `${dir}/`]);
  }
  return found;
}

/** One name per concept: at most one of `names` may exist at the root. */
