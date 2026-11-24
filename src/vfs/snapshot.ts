import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { glob } from "tinyglobby";
import ignore from "ignore";
import picomatch from "picomatch";
import { getPackages } from "@manypkg/get-packages";
import { DEFAULT_IGNORE_DIRS, loadGitIgnorePatterns, toDisplayPath } from "../fsutil";
import type { PackageManagerName } from "../types";

/** Always skip VCS / dependency trees even if a project gitignore forgets them. */
const HARD_IGNORE = ["**/.git/**", "**/.svn/**", "**/.hg/**", "**/node_modules/**", "**/dist/**", "**/build/**"];

/**
 * Extract a static directory prefix for pruning the in-memory scan.
 * e.g. app/components/** / *.vue -> app/components/
 * Patterns without a directory prefix (*.md, ** / *.vue) return null.
 */
function staticDirPrefix(pattern: string): string | null {
  const cleaned = pattern.replace(/^\.\//, "");
  const special = cleaned.search(/[*?{[]/);
  if (special <= 0) return null;
  const before = cleaned.slice(0, special);
  const slash = before.lastIndexOf("/");
  if (slash < 0) return null;
  return before.slice(0, slash + 1);
}

/** True when pattern can only match root-level (cwd-level) names, e.g. `*.md`, `README*`. */
function isSingleSegmentGlob(pattern: string): boolean {
  const cleaned = pattern.replace(/^\.\//, "");
  return !cleaned.includes("/") && !cleaned.includes("**");
}

export type VfsEntry = {
  /** Absolute path */
  absPath: string;
  /** Path relative to root, posix separators */
  relPath: string;
  isDir: boolean;
  size: number;
  name: string;
};

export type PackageManifestSnapshot = {
  exists: boolean;
  path: string;
  raw?: string;
  indent?: string;
  manager?: PackageManagerName;
  deps: Set<string>;
  /** dependency name -> section key it was found in */
  depSections: Map<string, "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies">;
  /** package.json scripts (name -> command). */
  scripts?: Record<string, string>;
  /**
   * Selected top-level package.json fields used by stack/kind detection
   * (packageManager, bin, exports, main, private, simple-git-hooks, …).
   */
  fields?: Record<string, unknown>;
};

export type WorkspaceInfo = {
  packages: string[];
  tool: string;
};

export type WorkspaceSnapshot = {
  root: string;
  /** Absolute paths of all visible entries (files + dirs) */
  visibleAbs: Set<string>;
  /** Relative (posix) -> entry */
  byRel: Map<string, VfsEntry>;
  /** Absolute -> entry */
  byAbs: Map<string, VfsEntry>;
  fileCount: number;
  /** Gitignore matcher for paths relative to `root`. */
  ig: { ignores(relPath: string): boolean };
  manifest: PackageManifestSnapshot;
  workspace: WorkspaceInfo;
  exists(relOrAbs: string): boolean;
  isDirectory(relOrAbs: string): boolean;
  listDir(relOrAbs: string): VfsEntry[];
  /** Memory glob match; returns absolute paths */
  match(pattern: string | string[], opts?: { cwd?: string; onlyFiles?: boolean }): string[];
  childrenOf(relOrAbs: string): VfsEntry[];
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

function detectIndent(raw: string): string {
  const match = raw.match(/\n([ \t]+)"/);
  return match?.[1] ?? "  ";
}

function collectDepNames(
  section: unknown,
  into: Set<string>,
  sections: Map<string, "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies">,
  key: "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies",
): void {
  if (!section || typeof section !== "object") return;
  for (const name of Object.keys(section as Record<string, unknown>)) {
    if (!name) continue;
    into.add(name);
    if (!sections.has(name)) sections.set(name, key);
  }
}

const MANIFEST_FIELD_KEYS = [
  "packageManager",
  "bin",
  "exports",
  "main",
  "module",
  "types",
  "private",
  "simple-git-hooks",
  "name",
] as const;

function collectManifestFields(pkg: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const key of MANIFEST_FIELD_KEYS) {
    if (key in pkg) fields[key] = pkg[key];
  }
  return fields;
}

function collectScripts(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export function readPackageManifestSnapshot(root: string): PackageManifestSnapshot {
  const pkgPath = resolve(root, "package.json");
  if (!existsSync(pkgPath)) {
    return { exists: false, path: pkgPath, manager: managerFromLockfile(root), deps: new Set(), depSections: new Map() };
  }
  try {
    const raw = readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const deps = new Set<string>();
    const depSections = new Map<string, "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies">();
    collectDepNames(pkg.dependencies, deps, depSections, "dependencies");
    collectDepNames(pkg.devDependencies, deps, depSections, "devDependencies");
    collectDepNames(pkg.peerDependencies, deps, depSections, "peerDependencies");
    collectDepNames(pkg.optionalDependencies, deps, depSections, "optionalDependencies");
    return {
      exists: true,
      path: pkgPath,
      raw,
      indent: detectIndent(raw),
      manager: managerFromField(pkg.packageManager) ?? managerFromLockfile(root),
      deps,
      depSections,
      scripts: collectScripts(pkg.scripts),
      fields: collectManifestFields(pkg),
    };
  } catch {
    return { exists: true, path: pkgPath, manager: managerFromLockfile(root), deps: new Set(), depSections: new Map() };
  }
}

/** True when the root looks like a monorepo — skip @manypkg otherwise (large repos). */
export function looksLikeMonorepo(root: string): boolean {
  if (existsSync(resolve(root, "pnpm-workspace.yaml"))) return true;
  if (existsSync(resolve(root, "lerna.json"))) return true;
  if (existsSync(resolve(root, "nx.json"))) return true;
  if (existsSync(resolve(root, "turbo.json"))) return true;
  try {
    const raw = readFileSync(resolve(root, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { workspaces?: unknown };
    return pkg.workspaces != null;
  } catch {
    return false;
  }
}

async function listWorkspacePackages(root: string): Promise<WorkspaceInfo> {
  if (!looksLikeMonorepo(root)) return { packages: [], tool: "root" };
  try {
    const result = await getPackages(root);
    if (resolve(result.rootDir) !== resolve(root)) return { packages: [], tool: result.tool.type };
    const packages = result.packages
      .map((p) => p.relativeDir.split(sep).join("/"))
      .filter((rel) => Boolean(rel) && rel !== ".")
      .sort();
    return { packages, tool: result.tool.type };
  } catch {
    return { packages: [], tool: "root" };
  }
}

function normalizeRel(rel: string): string {
  return rel.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "") || ".";
}

function toAbs(root: string, relOrAbs: string): string {
  if (relOrAbs === "." || relOrAbs === "") return root;
  if (resolve(relOrAbs) === relOrAbs || /^[A-Za-z]:[\\/]/.test(relOrAbs)) return resolve(relOrAbs);
  return resolve(root, relOrAbs);
}

function buildMatchers(root: string, byRel: Map<string, VfsEntry>, byAbs: Map<string, VfsEntry>) {
  const exists = (relOrAbs: string): boolean => {
    const abs = toAbs(root, relOrAbs);
    if (byAbs.has(abs)) return true;
    const rel = normalizeRel(toDisplayPath(abs, root));
    return byRel.has(rel) || abs === root;
  };

  const isDirectory = (relOrAbs: string): boolean => {
    const abs = toAbs(root, relOrAbs);
    if (abs === root) return true;
    const entry = byAbs.get(abs);
    if (entry) return entry.isDir;
    const rel = normalizeRel(toDisplayPath(abs, root));
    return byRel.get(rel)?.isDir ?? false;
  };

  // Parent relPath ("." for root) -> direct children
  const childrenIndex = new Map<string, VfsEntry[]>();
  /** First path segment -> all entries under that top-level branch (for prefix prune). */
  const byFirstSeg = new Map<string, VfsEntry[]>();
  for (const entry of byRel.values()) {
    const parentRel = entry.relPath.includes("/")
      ? entry.relPath.slice(0, entry.relPath.lastIndexOf("/"))
      : ".";
    const list = childrenIndex.get(parentRel);
    if (list) list.push(entry);
    else childrenIndex.set(parentRel, [entry]);

    const seg = entry.relPath.split("/")[0]!;
    if (seg && seg !== ".") {
      const branch = byFirstSeg.get(seg);
      if (branch) branch.push(entry);
      else byFirstSeg.set(seg, [entry]);
    }
  }
  for (const list of childrenIndex.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const listDir = (relOrAbs: string): VfsEntry[] => {
    const abs = toAbs(root, relOrAbs);
    const key = abs === root ? "." : normalizeRel(toDisplayPath(abs, root));
    return childrenIndex.get(key) ?? [];
  };

  const childrenOf = listDir;

  /** Memoize glob results — validators often re-query the same patterns. */
  const matchCache = new Map<string, string[]>();

  const match = (pattern: string | string[], opts?: { cwd?: string; onlyFiles?: boolean }): string[] => {
    const patterns = (Array.isArray(pattern) ? pattern : [pattern]).map((p) =>
      p.replace(/\{([^}]+)\}/g, (_m, content: string) => `{${content.replace(/,\s+/g, ",")}}`)
    );
    const cacheKey = `${opts?.cwd ?? ""}|${opts?.onlyFiles ?? true}|${patterns.join("\0")}`;
    const cached = matchCache.get(cacheKey);
    if (cached) return cached;
    const cwdAbs = opts?.cwd ? toAbs(root, opts.cwd) : root;
    const cwdRel = cwdAbs === root ? "" : normalizeRel(toDisplayPath(cwdAbs, root));
    const onlyFiles = opts?.onlyFiles ?? true;
    const results: string[] = [];

    for (const pat of patterns) {
      // Exact path (no glob chars)
      if (!/[*?{}[\]]/.test(pat) && !pat.includes("**")) {
        const targetRel = cwdRel ? normalizeRel(join(cwdRel, pat).split(sep).join("/")) : normalizeRel(pat);
        const entry = byRel.get(targetRel);
        if (entry && (!onlyFiles || !entry.isDir)) {
          results.push(entry.absPath);
        }
        continue;
      }

      // Relative to cwd: strip directory prefix when matching within a subdir
      let matchPat = pat;
      if (cwdRel && matchPat.startsWith(cwdRel + "/")) {
        matchPat = matchPat.slice(cwdRel.length + 1);
      } else if (cwdRel && matchPat.startsWith("./" + cwdRel + "/")) {
        matchPat = matchPat.slice(("./" + cwdRel + "/").length);
      }

      // Do NOT enable bash mode — it makes `*.md` match nested paths like bash globstar.
      // Keep tinyglobby-compatible semantics: `*` does not cross `/`, only `**` does.
      const normalizedPat = matchPat.replace(/^\.\//, "");
      const isMatch = picomatch(normalizedPat, { dot: true });
      const prefix = staticDirPrefix(normalizedPat);
      const singleSeg = isSingleSegmentGlob(normalizedPat);

      // Root-level globs (*.md, package.json, …) only need direct children — O(dir) not O(tree).
      if (singleSeg) {
        const parentKey = cwdRel || ".";
        for (const entry of childrenIndex.get(parentKey) ?? []) {
          if (onlyFiles && entry.isDir) continue;
          if (isMatch(entry.name)) results.push(entry.absPath);
        }
        continue;
      }

      // Prefix-pruned scan: skip unrelated top-level branches via first-segment index.
      const firstSeg = prefix?.split("/")[0];
      const scoped: Iterable<VfsEntry> =
        firstSeg && !cwdRel ? (byFirstSeg.get(firstSeg) ?? []) : byRel.values();

      for (const entry of scoped) {
        const rel = entry.relPath;
        if (onlyFiles && entry.isDir) continue;

        let candidate = rel;
        if (cwdRel) {
          if (rel === cwdRel) continue;
          if (!rel.startsWith(cwdRel + "/")) continue;
          candidate = rel.slice(cwdRel.length + 1);
        }

        if (prefix && !candidate.startsWith(prefix)) continue;

        if (isMatch(candidate)) {
          results.push(entry.absPath);
        }
      }
    }

    const unique = Array.from(new Set(results));
    matchCache.set(cacheKey, unique);
    return unique;
  };

  return { exists, isDirectory, listDir, childrenOf, match };
}

export type BuildSnapshotOptions = {
  root: string;
  /** When true, only scan the root directory (non-recursive). */
  rootOnly?: boolean;
  /** When set, only scan these relative directories (plus root). */
  relevantDirs?: Set<string>;
};

/**
 * Single-pass workspace snapshot: VFS index + package.json + monorepo packages.
 * All subsequent rule evaluation should use this instead of hitting the disk.
 */
export async function buildWorkspaceSnapshot(opts: BuildSnapshotOptions): Promise<WorkspaceSnapshot> {
  const { root, rootOnly, relevantDirs } = opts;

  // Walker ignores must stay tiny — same idea as the old engine (3 hard dirs).
  // Pushing the full gitignore (100+ rules) into tinyglobby makes every path
  // pay micromatch×N during the walk and was a major remaining regression.
  const walkIgnore = [
    ...HARD_IGNORE,
    ...Array.from(DEFAULT_IGNORE_DIRS).map((d) => `**/${d}/**`),
  ];

  let globPattern: string | string[];
  if (relevantDirs && relevantDirs.size > 0) {
    const pats = ["*"];
    for (const dir of relevantDirs) {
      if (dir === "." || dir === "") continue;
      pats.push(`${dir}/**/*`);
      pats.push(dir);
    }
    globPattern = pats;
  } else if (rootOnly) {
    globPattern = "*";
  } else {
    globPattern = "**/*";
  }

  // Shallow scans must include directories (allow/has on `src`, etc.). Deep scans
  // infer dirs as parents of files and skip a second onlyDirectories walk.
  const shallow = Boolean(rootOnly) || Boolean(relevantDirs && relevantDirs.size > 0);

  const [patterns, fileMatches, dirMatches, workspace] = await Promise.all([
    // Shallow/root-only scans only need the root .gitignore — avoid walking
    // every nested .gitignore on 10k-file monorepos (was a multi-second tax).
    loadGitIgnorePatterns(root, { rootOnly: Boolean(rootOnly) && !relevantDirs?.size }),
    glob(globPattern, {
      cwd: root,
      absolute: true,
      dot: true,
      onlyFiles: true,
      ignore: walkIgnore,
    }),
    shallow
      ? glob(rootOnly ? "*" : globPattern, {
          cwd: root,
          absolute: true,
          dot: true,
          onlyDirectories: true,
          ignore: walkIgnore,
        })
      : Promise.resolve([] as string[]),
    // looksLikeMonorepo short-circuits @manypkg on single-package repos
    listWorkspacePackages(root),
  ]);
  const ig = ignore().add(patterns);

  const byRel = new Map<string, VfsEntry>();
  const byAbs = new Map<string, VfsEntry>();
  const visibleAbs = new Set<string>();
  let fileCount = 0;

  const ensureDir = (absPath: string, relPath: string) => {
    const existing = byAbs.get(absPath);
    if (existing) {
      existing.isDir = true;
      return;
    }
    if (relPath !== "." && ig.ignores(relPath)) return;
    const entry: VfsEntry = {
      absPath,
      relPath,
      isDir: true,
      size: 0,
      name: basename(absPath),
    };
    byRel.set(relPath, entry);
    byAbs.set(absPath, entry);
    visibleAbs.add(absPath);
  };

  const addFile = (absPath: string) => {
    const relPath = normalizeRel(toDisplayPath(absPath, root));
    if (relPath !== "." && ig.ignores(relPath)) return;
    if (byAbs.has(absPath)) return;

    const entry: VfsEntry = {
      absPath,
      relPath,
      isDir: false,
      size: 0,
      name: basename(absPath),
    };
    byRel.set(relPath, entry);
    byAbs.set(absPath, entry);
    visibleAbs.add(absPath);
    fileCount++;

    let parent = dirname(absPath);
    while (parent.startsWith(root) && parent !== root) {
      const parentRel = normalizeRel(toDisplayPath(parent, root));
      if (parentRel !== "." && ig.ignores(parentRel)) break;
      if (byRel.has(parentRel)) {
        ensureDir(parent, parentRel);
        break;
      }
      ensureDir(parent, parentRel);
      parent = dirname(parent);
    }
  };

  for (const raw of dirMatches) {
    const abs = resolve(String(raw));
    ensureDir(abs, normalizeRel(toDisplayPath(abs, root)));
  }
  for (const raw of fileMatches) addFile(resolve(String(raw)));

  if (workspace.packages.length > 0) {
    for (const pkg of workspace.packages) {
      const pkgAbs = resolve(root, pkg);
      if (!byAbs.has(pkgAbs) && existsSync(pkgAbs)) {
        ensureDir(pkgAbs, normalizeRel(pkg));
      }
      if (rootOnly || (relevantDirs && relevantDirs.size > 0)) {
        try {
          const pkgFiles = await glob(`${pkg}/*`, {
            cwd: root,
            absolute: true,
            dot: true,
            onlyFiles: true,
            ignore: walkIgnore,
          });
          for (const raw of pkgFiles) addFile(resolve(String(raw)));
          // Also surface empty package-root subdirs (shallow) for allow/has rules
          const pkgDirs = await glob(`${pkg}/*`, {
            cwd: root,
            absolute: true,
            dot: true,
            onlyDirectories: true,
            ignore: walkIgnore,
          });
          for (const raw of pkgDirs) {
            const abs = resolve(String(raw));
            const rel = normalizeRel(toDisplayPath(abs, root));
            if (!ig.ignores(rel)) ensureDir(abs, rel);
          }
        } catch { /* ignore */ }
      }
    }
  }

  const manifest = readPackageManifestSnapshot(root);
  const api = buildMatchers(root, byRel, byAbs);

  return {
    root,
    visibleAbs,
    byRel,
    byAbs,
    fileCount,
    ig,
    manifest,
    workspace,
    ...api,
  };
}

/**
 * View of one workspace package inside an already-built root snapshot.
 * No rescan, and the root's .gitignore keeps applying.
 */
export function subSnapshot(parent: WorkspaceSnapshot, pkgRel: string): WorkspaceSnapshot {
  const prefix = `${normalizeRel(pkgRel)}/`;
  const root = resolve(parent.root, pkgRel);
  const byRel = new Map<string, VfsEntry>();
  const byAbs = new Map<string, VfsEntry>();
  const visibleAbs = new Set<string>();
  let fileCount = 0;
  for (const entry of parent.byRel.values()) {
    if (!entry.relPath.startsWith(prefix)) continue;
    const child = { ...entry, relPath: entry.relPath.slice(prefix.length) };
    byRel.set(child.relPath, child);
    byAbs.set(child.absPath, child);
    visibleAbs.add(child.absPath);
    if (!child.isDir) fileCount++;
  }
  const ig = { ignores: (rel: string) => parent.ig.ignores(prefix + rel) };
  return {
    root,
    visibleAbs,
    byRel,
    byAbs,
    fileCount,
    ig,
    manifest: readPackageManifestSnapshot(root),
    workspace: { packages: [], tool: "root" },
    ...buildMatchers(root, byRel, byAbs),
  };
}

/**
 * In-memory snapshot for unit tests.
 * `tree` maps relative paths to either `"file"` / file content, or nested objects for dirs.
 */
export function createMemorySnapshot(
  root: string,
  tree: Record<string, string | "file" | "dir" | Record<string, unknown>>,
  opts?: { manifest?: Partial<PackageManifestSnapshot>; workspace?: WorkspaceInfo },
): WorkspaceSnapshot {
  const byRel = new Map<string, VfsEntry>();
  const byAbs = new Map<string, VfsEntry>();
  const visibleAbs = new Set<string>();
  let fileCount = 0;

  function walk(prefix: string, node: Record<string, unknown>) {
    for (const [name, value] of Object.entries(node)) {
      const rel = prefix ? `${prefix}/${name}` : name;
      const abs = resolve(root, rel);
      if (value === "dir" || (typeof value === "object" && value !== null && value !== undefined)) {
        const entry: VfsEntry = { absPath: abs, relPath: rel, isDir: true, size: 0, name };
        byRel.set(rel, entry);
        byAbs.set(abs, entry);
        visibleAbs.add(abs);
        if (typeof value === "object" && value !== null) {
          walk(rel, value as Record<string, unknown>);
        }
      } else {
        const content = typeof value === "string" && value !== "file" ? value : "";
        const entry: VfsEntry = { absPath: abs, relPath: rel, isDir: false, size: content.length, name };
        byRel.set(rel, entry);
        byAbs.set(abs, entry);
        visibleAbs.add(abs);
        fileCount++;
      }
    }
  }

  walk("", tree as Record<string, unknown>);

  const ig = ignore();
  const api = buildMatchers(root, byRel, byAbs);
  const baseManifest = readPackageManifestSnapshot(root);
  const manifest: PackageManifestSnapshot = {
    ...baseManifest,
    ...opts?.manifest,
    deps: opts?.manifest?.deps ?? baseManifest.deps,
    depSections: opts?.manifest?.depSections ?? baseManifest.depSections,
    path: opts?.manifest?.path ?? resolve(root, "package.json"),
  };

  return {
    root,
    visibleAbs,
    byRel,
    byAbs,
    fileCount,
    ig,
    manifest,
    workspace: opts?.workspace ?? { packages: [], tool: "root" },
    ...api,
  };
}
