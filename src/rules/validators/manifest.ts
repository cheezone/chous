import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ManifestRule, Rule, WorkspaceRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { BaseRuleValidator } from "./base";

type Manifest = Record<string, unknown> & { name?: string };

const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const;

function readManifest(path: string): Manifest | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Manifest;
  } catch {
    return undefined;
  }
}

/** A package.json field must equal a value, or must not exist. */
export class ManifestRuleValidator extends BaseRuleValidator<ManifestRule> {
  canHandle(rule: Rule): rule is ManifestRule {
    return rule.kind === "manifest";
  }

  protected async validateInternal(rule: ManifestRule, context: RuleValidatorContext) {
    const { manifest } = context.snapshot;
    const pkg = manifest.exists ? readManifest(manifest.path) : undefined;
    if (!pkg) return { hitCount: 0 };

    const value = pkg[rule.field];
    const base = {
      path: `${manifest.path}#field:${rule.field}`,
      displayPath: `package.json (${rule.field})`,
      category: "forbidden" as const,
      severity: "error" as const,
      reason: false as const,
    };

    if (rule.absent) {
      if (value === undefined) return { hitCount: 1 };
      context.rawIssues.push(issueFromRule(rule, {
        ...base,
        message: { key: "issue.manifest.remove", params: { field: rule.field, reason: rule.reason ?? "" } },
      }));
      return { hitCount: 1 };
    }

    if (value === rule.equals) return { hitCount: 1 };
    context.rawIssues.push(issueFromRule(rule, {
      ...base,
      message: { key: "issue.manifest.expected", params: { field: rule.field, expected: JSON.stringify(rule.equals) } },
    }));
    return { hitCount: 1 };
  }
}

/** Monorepo root: one version per dependency, `workspace:` for internal packages. */
export class WorkspaceRuleValidator extends BaseRuleValidator<WorkspaceRule> {
  canHandle(rule: Rule): rule is WorkspaceRule {
    return rule.kind === "workspace";
  }

  protected async validateInternal(rule: WorkspaceRule, context: RuleValidatorContext) {
    const { root, snapshot } = context;
    const manifests: Array<{ dir: string; pkg: Manifest }> = [];
    for (const dir of [".", ...snapshot.workspace.packages]) {
      const pkg = readManifest(resolve(root, dir, "package.json"));
      if (pkg) manifests.push({ dir, pkg });
    }

    const internal = new Set(manifests.map((m) => m.pkg.name).filter((n): n is string => Boolean(n)));
    const specs = new Map<string, Map<string, string[]>>();

    for (const { dir, pkg } of manifests) {
      for (const field of DEP_FIELDS) {
        // Peer ranges are meant to be wide; they do not pin a version.
        if (field === "peerDependencies") continue;
        const deps = pkg[field];
        if (!deps || typeof deps !== "object") continue;
        for (const [name, raw] of Object.entries(deps as Record<string, unknown>)) {
          const spec = String(raw);
          if (internal.has(name)) {
            if (!spec.startsWith("workspace:")) {
              context.rawIssues.push(issueFromRule(rule, {
                path: `${resolve(root, dir, "package.json")}#workspace:${name}`,
                displayPath: `${dir === "." ? "" : `${dir}/`}package.json (${name})`,
                message: { key: "issue.workspace.protocol", params: { name, spec } },
                category: "forbidden",
                severity: "error",
              }));
            }
            continue;
          }
          // A catalog reference is the fix, not drift.
          if (spec.startsWith("catalog:") || spec.startsWith("workspace:")) continue;
          const byVersion = specs.get(name) ?? new Map<string, string[]>();
          byVersion.set(spec, [...(byVersion.get(spec) ?? []), dir]);
          specs.set(name, byVersion);
        }
      }
    }

    let hitCount = 0;
    for (const [name, byVersion] of specs) {
      hitCount++;
      if (byVersion.size < 2) continue;
      const versions = Array.from(byVersion, ([spec, dirs]) => `${spec} in ${dirs.join(", ")}`).join("; ");
      context.rawIssues.push(issueFromRule(rule, {
        path: `${snapshot.manifest.path}#drift:${name}`,
        displayPath: `package.json (${name})`,
        message: { key: "issue.workspace.drift", params: { name, versions } },
        category: "forbidden",
        severity: "error",
      }));
    }
    return { hitCount };
  }
}
