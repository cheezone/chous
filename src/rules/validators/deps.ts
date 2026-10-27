import type { DepsRule, PackageManagerRule, ReplaceDepRule, Rule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { BaseRuleValidator } from "./base";
import { readPackageManifestSnapshot } from "../../vfs/snapshot";

type StackRule = PackageManagerRule | DepsRule | ReplaceDepRule;

/** Re-export for tests that import the old helper. */
export function readPackageManifest(root: string) {
  const snap = readPackageManifestSnapshot(root);
  return { exists: snap.exists, manager: snap.manager, deps: snap.deps };
}

/** `name` or a scope wildcard such as `@scope/*`. */
export function depMatches(pattern: string, name: string): boolean {
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -1);
    return name.startsWith(prefix) && name.length > prefix.length;
  }
  return name === pattern;
}

function namesMatching(pattern: string, deps: Set<string>): string[] {
  const matched: string[] = [];
  for (const name of deps) {
    if (depMatches(pattern, name)) matched.push(name);
  }
  return matched.sort();
}

function safeLabel(label: string): string {
  return label.replaceAll("/", "∕");
}

export class StackRuleValidator extends BaseRuleValidator<StackRule> {
  canHandle(rule: Rule): rule is StackRule {
    return rule.kind === "packageManager" || rule.kind === "deps" || rule.kind === "replaceDep";
  }

  protected async validateInternal(
    rule: StackRule,
    context: RuleValidatorContext,
  ): Promise<{ hitCount: number }> {
    const manifest = context.snapshot.manifest;
    let hitCount = 0;

    if (rule.kind === "packageManager") {
      if (manifest.manager === rule.manager) return { hitCount: 0 };
      hitCount = 1;
      context.rawIssues.push(issueFromRule(rule, {
        path: `${manifest.path}#manager:${rule.manager}`,
        displayPath: `package.json (${safeLabel(rule.manager)})`,
        message: manifest.manager
          ? { key: "issue.packageManager.wrong", params: { expected: rule.manager, actual: manifest.manager } }
          : { key: "issue.packageManager.missing", params: { expected: rule.manager } },
        category: manifest.manager ? "forbidden" : "missing",
        severity: "error",
        fix: { type: "pkgSetManager", pkgJsonPath: manifest.path, manager: rule.manager },
      }));
      return { hitCount };
    }

    if (rule.kind === "deps" && rule.mode === "must") {
      for (const pattern of rule.names) {
        if (namesMatching(pattern, manifest.deps).length > 0) {
          hitCount++;
          continue;
        }
        hitCount++;
        context.rawIssues.push(issueFromRule(rule, {
          path: `${manifest.path}#missing:${pattern}`,
          displayPath: `package.json (${safeLabel(pattern)})`,
          message: { key: "issue.deps.missing", params: { name: pattern } },
          category: "missing",
          severity: "error",
        }));
      }
      return { hitCount };
    }

    if (rule.kind === "deps" && rule.mode === "no") {
      const replaceFrom = context.config.rules
        .filter((r): r is ReplaceDepRule => r.kind === "replaceDep")
        .map((r) => r.from);

      for (const pattern of rule.names) {
        for (const name of namesMatching(pattern, manifest.deps)) {
          if (replaceFrom.some((from) => depMatches(from, name))) continue;
          hitCount++;
          context.rawIssues.push(issueFromRule(rule, {
            path: `${manifest.path}#forbidden:${name}`,
            displayPath: `package.json (${safeLabel(name)})`,
            message: { key: "issue.deps.forbidden", params: { name } },
            category: "forbidden",
            severity: "error",
          }));
        }
      }
      return { hitCount };
    }

    if (rule.kind !== "replaceDep") return { hitCount };
    for (const name of namesMatching(rule.from, manifest.deps)) {
      hitCount++;
      const canFix = !rule.from.endsWith("/*");
      context.rawIssues.push(issueFromRule(rule, {
        path: `${manifest.path}#replace:${name}`,
        displayPath: `package.json (replace ${safeLabel(name)})`,
        message: { key: "issue.replaceDep.replace", params: { from: name, to: rule.to } },
        category: "forbidden",
        severity: "error",
        ...(canFix
          ? { fix: { type: "pkgReplaceDep" as const, pkgJsonPath: manifest.path, from: name, to: rule.to } }
          : {}),
      }));
    }
    return { hitCount };
  }
}
