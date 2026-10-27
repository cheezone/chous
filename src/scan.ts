import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parseFsLintConfig } from "./config/parser";
import { APP_CONFIG_FILE_NAME } from "./constants";
import { detectKinds, detectRoleOccupancy, knowledgeToJSON, roleDslName, type RoleId } from "./knowledge";
import { lintWorkspace } from "./rules/lint";
import { formatIssueMessage } from "./rules/report";
import { getLL } from "./i18n/runtime";
import { buildWorkspaceSnapshot, type WorkspaceSnapshot } from "./vfs/snapshot";
import type { Issue, LintResult, Resolution } from "./types";

const DEFAULT_MAX_DEPTH = 4;

export type ScanRepoResult = {
  root: string;
  kinds: string[];
  roles: Record<string, string[]>;
  issues: Array<{
    displayPath: string;
    message: string;
    severity: string;
    resolution?: Resolution;
    reason?: string;
    see?: string;
  }>;
  components?: Array<{ name: string; path: string[]; techs: string[] }>;
};

export type ScanResult = {
  repos: ScanRepoResult[];
  knowledge?: unknown;
};

/** Find directories that look like git repos (contain `.git`), up to maxDepth. */
export function findGitRepos(dir: string, maxDepth = DEFAULT_MAX_DEPTH): string[] {
  const abs = resolve(dir);
  const found: string[] = [];

  function walk(current: string, depth: number): void {
    if (depth > maxDepth) return;
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    if (entries.includes(".git")) {
      found.push(current);
      // Still peek one level for nested worktrees? Usually stop — a repo is a unit.
      return;
    }
    for (const name of entries) {
      if (name === "node_modules" || name === "dist" || name === "build" || name.startsWith(".")) continue;
      const child = join(current, name);
      try {
        if (statSync(child).isDirectory()) walk(child, depth + 1);
      } catch {
        // skip
      }
    }
  }

  walk(abs, 0);
  if (found.length === 0 && existsSync(abs)) found.push(abs);
  return found;
}

type SpecfyComponent = {
  name?: string;
  path?: string[] | Set<string>;
  techs?: string[] | Set<string>;
  childs?: SpecfyComponent[];
};

/** Adapt our VFS snapshot to @specfy/stack-analyser Provider. */
export function createVfsProvider(snapshot: WorkspaceSnapshot) {
  return {
    basePath: snapshot.root,
    async listDir(pathRelative: string) {
      const rel = pathRelative === "" || pathRelative === "/" ? "." : pathRelative.replace(/^\.\//, "");
      return snapshot.listDir(rel).map((e) => ({
        name: e.name,
        type: e.isDir ? ("dir" as const) : ("file" as const),
        fp: e.relPath,
      }));
    },
    async open(pathRelative: string) {
      const rel = pathRelative.replace(/^\.\//, "");
      if (rel === "package.json" || rel.endsWith("/package.json")) {
        return snapshot.manifest.raw ?? "";
      }
      const abs = resolve(snapshot.root, rel);
      try {
        return readFileSync(abs, "utf8");
      } catch {
        throw new Error(`not found "${pathRelative}"`);
      }
    },
    async stat(pathRelative: string) {
      const rel = pathRelative.replace(/^\.\//, "");
      const entry = snapshot.byRel.get(rel === "" ? "." : rel);
      if (entry) return { size: entry.size };
      return { size: 0 };
    },
  };
}

async function detectSpecfyComponents(snapshot: WorkspaceSnapshot): Promise<ScanRepoResult["components"]> {
  try {
    const sa = await import("@specfy/stack-analyser");
    // Load default rules
    await import("@specfy/stack-analyser/dist/autoload.js");
    const provider = createVfsProvider(snapshot);
    const result = await sa.analyser({ provider });
    const flat = sa.flatten(result) as SpecfyComponent;
    const components: NonNullable<ScanRepoResult["components"]> = [];
    const walk = (node: SpecfyComponent) => {
      const techs = node.techs
        ? Array.from(node.techs as Iterable<string>)
        : [];
      const path = node.path
        ? Array.from(node.path as Iterable<string>)
        : [];
      if (techs.length > 0 || (node.name && node.name !== "flatten")) {
        components.push({
          name: node.name ?? "(unnamed)",
          path,
          techs,
        });
      }
      for (const child of node.childs ?? []) walk(child);
    };
    walk(flat);
    return components;
  } catch {
    return undefined;
  }
}

function occupancyRecord(snapshot: WorkspaceSnapshot): Record<string, string[]> {
  const occ = detectRoleOccupancy(snapshot);
  const out: Record<string, string[]> = {};
  for (const [role, list] of occ) {
    out[roleDslName(role as RoleId)] = list.map((o) => o.toolId);
  }
  return out;
}

async function scanOneRepo(opts: {
  root: string;
  lang: string;
  withSpecfy: boolean;
}): Promise<ScanRepoResult> {
  const { LL } = getLL(opts.lang);
  const snapshot = await buildWorkspaceSnapshot({ root: opts.root });
  const kinds = detectKinds(snapshot);
  const roles = occupancyRecord(snapshot);

  let issues: ScanRepoResult["issues"] = [];
  const configPath = resolve(opts.root, APP_CONFIG_FILE_NAME);
  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, "utf8");
    const config = parseFsLintConfig(raw, configPath);
    const result: LintResult = await lintWorkspace({
      root: opts.root,
      config,
      configPath,
    });
    issues = result.issues.map((i: Issue) => ({
      displayPath: i.displayPath,
      message: formatIssueMessage(LL, i.message),
      severity: i.severity,
      resolution: i.resolution,
      reason: i.reason,
      see: i.see,
    }));
  }

  const components = opts.withSpecfy ? await detectSpecfyComponents(snapshot) : undefined;

  return {
    root: opts.root,
    kinds,
    roles,
    issues,
    ...(components ? { components } : {}),
  };
}

export async function scanDirectory(opts: {
  dir: string;
  lang?: string;
  maxDepth?: number;
  json?: boolean;
  withKnowledge?: boolean;
  withSpecfy?: boolean;
}): Promise<ScanResult> {
  const lang = opts.lang ?? "en";
  const repos = findGitRepos(opts.dir, opts.maxDepth ?? DEFAULT_MAX_DEPTH);
  const results: ScanRepoResult[] = [];
  for (const root of repos) {
    results.push(
      await scanOneRepo({
        root,
        lang,
        withSpecfy: opts.withSpecfy !== false,
      }),
    );
  }
  return {
    repos: results.map((r) => ({
      ...r,
      root: relative(resolve(opts.dir), r.root) || ".",
    })),
    ...(opts.withKnowledge ? { knowledge: knowledgeToJSON() } : {}),
  };
}

export function formatScanText(result: ScanResult): string {
  const lines: string[] = [];
  for (const repo of result.repos) {
    lines.push(`# ${repo.root}`);
    lines.push(`  kinds: ${repo.kinds.join(", ") || "(none)"}`);
    const roleLines = Object.entries(repo.roles)
      .map(([role, tools]) => `${role}=${tools.join("|")}`)
      .join(", ");
    lines.push(`  roles: ${roleLines || "(none)"}`);
    if (repo.components?.length) {
      for (const c of repo.components.slice(0, 20)) {
        lines.push(`  component ${c.name}: ${c.techs.join(", ") || "—"}`);
      }
    }
    if (repo.issues.length) {
      lines.push(`  issues (${repo.issues.length}):`);
      for (const i of repo.issues.slice(0, 30)) {
        const res = i.resolution ? `[${i.resolution}] ` : "";
        lines.push(`    - ${res}${i.displayPath}: ${i.message}`);
      }
    } else {
      lines.push("  issues: none");
    }
    lines.push("");
  }
  return lines.join("\n");
}

// silence unused dirname import warning for some bundlers
void dirname;
