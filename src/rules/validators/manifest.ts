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

/** A package.json field that must not exist. */
export class ManifestRuleValidator extends BaseRuleValidator<ManifestRule> {
  canHandle(rule: Rule): rule is ManifestRule {
    return rule.kind === "manifest";
  }

  protected async validateInternal(rule: ManifestRule, context: RuleValidatorContext) {
    const { manifest } = context.snapshot;
    const pkg = manifest.exists ? readManifest(manifest.path) : undefined;
    if (pkg?.[rule.field] === undefined) return { hitCount: 0 };
    context.rawIssues.push(issueFromRule(rule, {
      path: `${manifest.path}#field:${rule.field}`,
      displayPath: `package.json (${rule.field})`,
      message: { key: "issue.manifest.remove", params: { field: rule.field, reason: { t: rule.reason! } } },
      reason: false,
    }));
    return { hitCount: 1 };
  }
}

/** The `packages` list of a pnpm-workspace.yaml, or undefined if there is none. */
function pnpmWorkspaceList(path: string): string[] | undefined {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^packages\s*:/.test(l));
  if (start < 0) return undefined;
  const list: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break;
    const m = /^\s*-\s*['"]?([^'"#]+?)['"]?\s*(#.*)?$/.exec(line);
    if (m) list.push(m[1]!.trim());
  }
  return list;
}

/** package.json `workspaces`: an array, or Yarn's `{ packages: [...] }`. */
function workspacesField(value: unknown): string[] | undefined {
  const list = Array.isArray(value) ? value : (value as { packages?: unknown } | undefined)?.packages;
  return Array.isArray(list) ? list.map(String) : undefined;
}

function sameList(a: string[], b: string[]): boolean {
  const norm = (l: string[]) => [...new Set(l.map((p) => p.replace(/^\.\//, "").replace(/\/$/, "")))].sort().join("\n");
  return norm(a) === norm(b);
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

    // Two workspace lists that disagree. Both may exist on purpose (npm, Yarn and
    // Bun read package.json); pnpm reads only its own and warns when they differ.
    const yamlList = pnpmWorkspaceList(resolve(root, "pnpm-workspace.yaml"));
    const rootPkg = manifests.find((m) => m.dir === ".")?.pkg;
    const jsonList = workspacesField(rootPkg?.workspaces);
    if (yamlList && jsonList && !sameList(yamlList, jsonList)) {
      hitCount++;
      context.rawIssues.push(issueFromRule(rule, {
        path: `${snapshot.manifest.path}#workspaces`,
        displayPath: "package.json (workspaces)",
        message: { key: "issue.workspace.listsDiffer", params: { json: jsonList.join(", "), yaml: yamlList.join(", ") } },
      }));
    }

    for (const [name, byMajor] of majors) {
      hitCount++;
      // Different majors can never resolve to one copy; same-major ranges usually do.
      if (byMajor.size < 2) continue;
      const versions = Array.from(byMajor.values()).flat().join("; ");
      context.rawIssues.push(issueFromRule(rule, {
        path: `${snapshot.manifest.path}#drift:${name}`,
        displayPath: `package.json (${name})`,
        message: { key: "issue.workspace.drift", params: { name, versions } },
      }));
    }
    return { hitCount };
  }
}
