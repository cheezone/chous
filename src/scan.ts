import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { detectKinds, detectRoleOccupancy, knowledgeToJSON, roleLabel, type RoleId } from "./knowledge";
import { lintWorkspace } from "./rules/lint";
import { formatIssueMessage } from "./rules/report";
import { getT, type TFunction } from "./i18n";
import { buildWorkspaceSnapshot, type WorkspaceSnapshot } from "./vfs/snapshot";
import type { Issue, LintResult } from "./types";

const DEFAULT_MAX_DEPTH = 4;

export type ScanRepoResult = {
  root: string;
  kinds: string[];
  roles: Record<string, string[]>;
  issues: Array<{
    displayPath: string;
    message: string;
    verdict: string;
    reason?: string;
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
      if (!entry) return { size: 0 };
      try {
        return { size: statSync(entry.absPath).size };
      } catch {
        return { size: 0 };
      }
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
    out[role] = list.map((o) => o.toolId);
  }
  return out;
}

async function scanOneRepo(opts: {
  root: string;
  lang: string;
  withSpecfy: boolean;
}): Promise<ScanRepoResult> {
  const { t } = getT(opts.lang);
  const snapshot = await buildWorkspaceSnapshot({ root: opts.root });
  const kinds = detectKinds(snapshot);
  const roles = occupancyRecord(snapshot);

  const result: LintResult = await lintWorkspace({ root: opts.root });
  const issues: ScanRepoResult["issues"] = result.issues.map((i: Issue) => ({
    displayPath: i.displayPath,
    message: formatIssueMessage(t, i.message),
    verdict: i.verdict,
    reason: i.reason && t(i.reason),
  }));

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

export function formatScanText(result: ScanResult, t: TFunction): string {
  const none = t("scan.none");
  const lines: string[] = [];
  for (const repo of result.repos) {
    lines.push(`# ${repo.root}`);
    lines.push(`  ${t("scan.kinds")}: ${repo.kinds.join(", ") || none}`);
    const roleLines = Object.entries(repo.roles)
      .map(([role, tools]) => `${t(roleLabel(role as RoleId))}=${tools.join("|")}`)
      .join(", ");
    lines.push(`  ${t("scan.roles")}: ${roleLines || none}`);
    for (const c of repo.components?.slice(0, 20) ?? []) {
      lines.push(`  ${t("scan.component", { name: c.name })}: ${c.techs.join(", ") || none}`);
    }
    lines.push(`  ${t("scan.issues", { count: repo.issues.length })}${repo.issues.length ? ":" : ""}`);
    for (const i of repo.issues.slice(0, 30)) {
      lines.push(`    - [${i.verdict}] ${i.displayPath}: ${i.message}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

