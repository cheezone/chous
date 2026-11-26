import { existsSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { DeprecatedRule, DepsRule, Rule } from "../../types";
import { readText } from "../../fsutil";
import { npmLocked, pnpmLocked, type Locked } from "../../vfs/lockfile";
import { DEPRECATED, SABOTAGED } from "../../taste/deps";
import { FACT_EOL } from "../../facts";
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
          message: { key: "issue.deps.obsolete", params: { name, why: { t: rule.reason! }, use: rule.use } },
          // The authors' own words are in the message already.
          reason: false,
        }));
      }
    }
    return { hitCount };
  }
}

/** What the project's lockfile recorded, read once per lockfile per process. */
const LOCKFILES = ["pnpm-lock.yaml", "package-lock.json", "npm-shrinkwrap.json"];
const lockCache = new Map<string, string>();

/**
 * The project's direct dependencies as its lockfile has them: the lockfile in
 * the project's directory or above it (a workspace root's), up to the
 * repository's root, and only one that lists this project.
 */
function lockedDependencies(root: string): Map<string, Locked> | undefined {
  let dir = resolve(root);
  for (let depth = 0; depth < 16; depth++) {
    for (const name of LOCKFILES) {
      const path = join(dir, name);
      if (!existsSync(path)) continue;
      const stamp = statSync(path);
      const key = `${path}\u0000${stamp.size}\u0000${stamp.mtimeMs}`;
      const text = lockCache.get(key) ?? readText(path, 128 * 1024 * 1024);
      lockCache.set(key, text);
      const importer = relative(dir, root).split(sep).join("/") || ".";
      return name === "pnpm-lock.yaml" ? pnpmLocked(text, importer) : npmLocked(text, importer);
    }
    if (existsSync(join(dir, ".git"))) return undefined;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
  return undefined;
}

/** Packages chous already knows with a replacement (src/facts/packages/npm.ts) or by their end-of-life schedule. */
const KNOWN = new Set([...DEPRECATED, ...SABOTAGED].flatMap((d) => d.names));
const SCHEDULED = new Set(FACT_EOL.flatMap((e) => (e.dep ? [e.dep] : [])));

/** Direct dependencies whose authors set a deprecation on the npm registry, in their own words. */
export class LockedDeprecationsValidator extends BaseRuleValidator<DeprecatedRule> {
  canHandle(rule: Rule): rule is DeprecatedRule {
    return rule.kind === "deprecated";
  }

  protected async validateInternal(rule: DeprecatedRule, context: RuleValidatorContext) {
    const manifest = context.snapshot.manifest;
    if (!manifest.exists) return { hitCount: 0 };
    const locked = lockedDependencies(context.root);
    let hitCount = 0;
    for (const [name, { version, deprecated }] of [...(locked ?? [])].sort(([a], [b]) => a.localeCompare(b))) {
      if (!deprecated || !manifest.deps.has(name) || KNOWN.has(name) || SCHEDULED.has(name)) continue;
      hitCount++;
      context.rawIssues.push(issueFromRule(rule, {
        path: `${manifest.path}#deprecated:${name}`,
        displayPath: `package.json (${safeLabel(name)})`,
        message: { key: "issue.deps.deprecated", params: { name, version, message: deprecated.slice(0, 300) } },
      }));
    }
    return { hitCount };
  }
}
