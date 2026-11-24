import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import type { LifecycleRule, Rule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { BaseRuleValidator } from "./base";
import { EOL, eolDate, lifecycleStatus, lineOf, type Product } from "../../taste/eol";

type Found = { product: Product; version: string; file: string };

function read(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

/** `18`, `v18.1.0`, `^18`, `~18.2`, `18.x`, `3.8` → the pinned version; ranges like `>=18` say nothing. */
export function pinnedVersion(spec: string): string | undefined {
  const m = spec.trim().match(/^(?:[\^~=]|v)?\s*(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?(?:-[\w.]+)?$/i);
  if (!m) return undefined;
  const minor = m[2] && /^\d+$/.test(m[2]) ? `.${m[2]}` : "";
  return `${m[1]}${minor}`;
}

/** Versions the project actually runs on: version files, Dockerfiles, pinned engines and framework deps. */
function findVersions(context: RuleValidatorContext): Found[] {
  const { root, snapshot } = context;
  const found: Found[] = [];
  const at = (name: string) => resolve(root, name);
  const add = (product: Product, raw: string | undefined, file: string) => {
    const version = raw ? pinnedVersion(raw) : undefined;
    if (version) found.push({ product, version, file });
  };

  for (const name of [".nvmrc", ".node-version"]) {
    if (snapshot.exists(name)) add("node", read(at(name)).split(/\r?\n/)[0], name);
  }
  if (snapshot.exists(".python-version")) add("python", read(at(".python-version")).split(/\r?\n/)[0], ".python-version");
  if (snapshot.exists(".tool-versions")) {
    for (const line of read(at(".tool-versions")).split(/\r?\n/)) {
      const [tool, version] = line.trim().split(/\s+/);
      if (tool === "nodejs" || tool === "node") add("node", version, ".tool-versions");
      if (tool === "python") add("python", version, ".tool-versions");
    }
  }
  for (const entry of snapshot.listDir(".")) {
    if (entry.isDir || !/^(Docker|Container)file/.test(entry.name)) continue;
    for (const m of read(entry.absPath).matchAll(/^FROM\s+(?:--\S+\s+)*(?:docker\.io\/)?(?:library\/)?(node|python):(\d+(?:\.\d+)?)/gim)) {
      add(m[1] as Product, m[2], basename(entry.absPath));
    }
  }

  const manifest = snapshot.manifest;
  if (manifest.exists) {
    let pkg: Record<string, any> = {};
    try {
      pkg = JSON.parse(read(manifest.path));
    } catch {
      // ignore
    }
    if (typeof pkg.engines?.node === "string") add("node", pkg.engines.node, "package.json");
    const deps = { ...pkg.devDependencies, ...pkg.dependencies };
    for (const product of ["vue", "nuxt"] as const) {
      if (typeof deps[product] === "string") add(product, deps[product].split(".")[0], "package.json");
    }
  }
  return found;
}

/** Runtimes and frameworks past their published end of life. */
export class LifecycleRuleValidator extends BaseRuleValidator<LifecycleRule> {
  canHandle(rule: Rule): rule is LifecycleRule {
    return rule.kind === "lifecycle";
  }

  protected async validateInternal(rule: LifecycleRule, context: RuleValidatorContext) {
    const today = context.today ?? new Date().toISOString().slice(0, 10);
    const found = findVersions(context);
    for (const { product, version, file } of found) {
      const date = eolDate(product, version);
      const status = lifecycleStatus(date, today);
      if (status === "supported") continue;
      const { label, use } = EOL[product];
      const name = `${label} ${lineOf(product, version)}`;
      context.rawIssues.push(issueFromRule(rule, {
        path: `${resolve(context.root, file)}#eol:${product}`,
        displayPath: `${file} (${name})`,
        message: { key: status === "rotten" ? "issue.lifecycle.rotten" : "issue.lifecycle.expired", params: { name, date: date!, use } },
        category: "forbidden",
        severity: status === "rotten" ? "error" : "warn",
      }));
    }
    return { hitCount: found.length };
  }
}
