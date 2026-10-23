import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { DepsRule, Issue, PackageManagerName, PackageManagerRule, ReplaceDepRule, Rule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { BaseRuleValidator } from "./base";

type StackRule = PackageManagerRule | DepsRule | ReplaceDepRule;

type PackageManifest = {
  exists: boolean;
  manager?: PackageManagerName;
  deps: Set<string>;
};

const MANAGERS: PackageManagerName[] = ["npm", "pnpm", "yarn", "bun"];

function isManager(value: string): value is PackageManagerName {
  return (MANAGERS as string[]).includes(value);
}

function managerFromField(value: unknown): PackageManagerName | undefined {
  if (typeof value !== "string") return undefined;
  const name = value.split("@")[0]?.trim() ?? "";
  return isManager(name) ? name : undefined;
}

function managerFromLockfile(root: string): PackageManagerName | undefined {
  if (existsSync(resolve(root, "bun.lock")) || existsSync(resolve(root, "bun.lockb"))) return "bun";
  if (existsSync(resolve(root, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(resolve(root, "yarn.lock"))) return "yarn";
  if (existsSync(resolve(root, "package-lock.json")) || existsSync(resolve(root, "npm-shrinkwrap.json"))) return "npm";
  return undefined;
}

function collectDepNames(section: unknown, into: Set<string>): void {
  if (!section || typeof section !== "object") return;
  for (const name of Object.keys(section as Record<string, unknown>)) {
    if (name) into.add(name);
  }
}

export function readPackageManifest(root: string): PackageManifest {
  const pkgPath = resolve(root, "package.json");
  if (!existsSync(pkgPath)) {
    return { exists: false, manager: managerFromLockfile(root), deps: new Set() };
  }
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Record<string, unknown>;
    const deps = new Set<string>();
    collectDepNames(pkg.dependencies, deps);
    collectDepNames(pkg.devDependencies, deps);
    collectDepNames(pkg.peerDependencies, deps);
    collectDepNames(pkg.optionalDependencies, deps);
    return {
      exists: true,
      manager: managerFromField(pkg.packageManager) ?? managerFromLockfile(root),
      deps,
    };
  } catch {
    return { exists: true, manager: managerFromLockfile(root), deps: new Set() };
  }
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

function pkgIssue(root: string, id: string, issue: Omit<Issue, "path" | "displayPath"> & { label: string }): Issue {
  const { label, ...rest } = issue;
  return {
    ...rest,
    path: `${resolve(root, "package.json")}#${id}`,
    displayPath: `package.json (${label})`,
  };
}

export class StackRuleValidator extends BaseRuleValidator<StackRule> {
  canHandle(rule: Rule): rule is StackRule {
    return rule.kind === "packageManager" || rule.kind === "deps" || rule.kind === "replaceDep";
  }

  protected async validateInternal(
    rule: StackRule,
    context: RuleValidatorContext,
  ): Promise<{ hitCount: number }> {
    const manifest = readPackageManifest(context.root);
    let hitCount = 0;

    if (rule.kind === "packageManager") {
      if (manifest.manager === rule.manager) return { hitCount: 0 };
      hitCount = 1;
      context.rawIssues.push(pkgIssue(context.root, `manager:${rule.manager}`, {
        label: rule.manager,
        ruleKind: rule.kind,
        message: manifest.manager
          ? { key: "issue.packageManager.wrong", params: { expected: rule.manager, actual: manifest.manager } }
          : { key: "issue.packageManager.missing", params: { expected: rule.manager } },
        category: manifest.manager ? "forbidden" : "missing",
        severity: "error",
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
        context.rawIssues.push(pkgIssue(context.root, `missing:${pattern}`, {
          label: pattern,
          ruleKind: rule.kind,
          message: { key: "issue.deps.missing", params: { name: pattern } },
          category: "missing",
          severity: "error",
        }));
      }
      return { hitCount };
    }

    if (rule.kind === "deps" && rule.mode === "no") {
      for (const pattern of rule.names) {
        for (const name of namesMatching(pattern, manifest.deps)) {
          hitCount++;
          context.rawIssues.push(pkgIssue(context.root, `forbidden:${name}`, {
            label: name,
            ruleKind: rule.kind,
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
        context.rawIssues.push(pkgIssue(context.root, `replace:${name}`, {
          label: `replace ${name}`,
        ruleKind: rule.kind,
        message: { key: "issue.replaceDep.replace", params: { from: name, to: rule.to } },
        category: "forbidden",
        severity: "error",
      }));
    }
    return { hitCount };
  }
}
