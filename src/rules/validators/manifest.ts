import { readFileSync } from "node:fs";
import { NOT_OURS } from "../../taste/hygiene";
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
      severity: "error" as const,
      reason: false as const,
    };

    if (rule.absent) {
      if (value === undefined) return { hitCount: 1 };
      context.rawIssues.push(issueFromRule(rule, {
        ...base,
        message: { key: "issue.manifest.remove", params: { field: rule.field, reason: { t: rule.reason! } } },
      }));
      return { hitCount: 1 };
    }

    if (rule.present) {
      if (value !== undefined) return { hitCount: 1 };
      context.rawIssues.push(issueFromRule(rule, {
        ...base,
        message: { key: "issue.manifest.missing", params: { field: rule.field, reason: { t: rule.reason! } } },
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

/** `^3.4.0`, `=19.2.3`, `3.x`, `v2` → the major; ranges, tags, `link:`, `catalog:`… → undefined. */
function majorOf(spec: string): string | undefined {
  const m = spec.trim().match(/^[\^~=v]*\s*(\d+)(?:\.[\dx*]+){0,2}(?:-[\w.]+)?$/i);
  return m?.[1];
}

/** Monorepo root: one major version per dependency across packages. */
export class WorkspaceRuleValidator extends BaseRuleValidator<WorkspaceRule> {
  canHandle(rule: Rule): rule is WorkspaceRule {
    return rule.kind === "workspace";
  }

  protected async validateInternal(rule: WorkspaceRule, context: RuleValidatorContext) {
    const { root, snapshot } = context;
    const manifests: Array<{ dir: string; pkg: Manifest }> = [];
    for (const dir of [".", ...snapshot.workspace.packages.filter((p) => !NOT_OURS.test(`${p}/`))]) {
      const pkg = readManifest(resolve(root, dir, "package.json"));
      if (pkg) manifests.push({ dir, pkg });
    }

    const internal = new Set(manifests.map((m) => m.pkg.name).filter((n): n is string => Boolean(n)));
    // name → major → [spec in dir]
    const majors = new Map<string, Map<string, string[]>>();

    for (const { dir, pkg } of manifests) {
      for (const field of DEP_FIELDS) {
        // Peer ranges are meant to be wide; they do not pin a version.
        if (field === "peerDependencies") continue;
        const deps = pkg[field];
        if (!deps || typeof deps !== "object") continue;
        for (const [name, raw] of Object.entries(deps as Record<string, unknown>)) {
          if (internal.has(name)) continue;
          const spec = String(raw);
          const major = majorOf(spec);
          if (major === undefined) continue;
          const byMajor = majors.get(name) ?? new Map<string, string[]>();
          byMajor.set(major, [...(byMajor.get(major) ?? []), `${dir}: ${spec}`]);
          majors.set(name, byMajor);
        }
      }
    }

    let hitCount = 0;
    for (const [name, byMajor] of majors) {
      hitCount++;
      // Different majors can never resolve to one copy; same-major ranges usually do.
      if (byMajor.size < 2) continue;
      const versions = Array.from(byMajor.values()).flat().join("; ");
      context.rawIssues.push(issueFromRule(rule, {
        path: `${snapshot.manifest.path}#drift:${name}`,
        displayPath: `package.json (${name})`,
        message: { key: "issue.workspace.drift", params: { name, versions } },
        severity: "error",
      }));
    }
    return { hitCount };
  }
}
