import { existsSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { glob } from "tinyglobby";
import { DEFAULT_IGNORE_DIRS, isDirectory } from "../fsutil";

const WORKSPACE_FILE = "pnpm-workspace.yaml";

/**
 * Extract `packages:` list entries from pnpm-workspace.yaml without a YAML parser.
 * Stops at the next top-level key (catalog, catalogs, overrides, …).
 */
export function parsePnpmWorkspacePackagesField(raw: string): string[] {
  const lines = raw.split(/\r?\n/);
  let inPackages = false;
  const patterns: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (!inPackages) {
      if (/^packages\s*:\s*$/.test(trimmed)) {
        inPackages = true;
        continue;
      }
      // Inline empty / flow form we do not support; treat as no patterns.
      if (/^packages\s*:\s*\[/.test(trimmed)) return [];
      continue;
    }

    // Next top-level mapping key ends the packages block.
    if (!/^\s/.test(line) && !trimmed.startsWith("-") && /:\s*/.test(trimmed)) {
      break;
    }

    const item = trimmed.match(/^-\s+(.+)$/);
    if (!item?.[1]) continue;
    let value = item[1].trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    if (value) patterns.push(value);
  }

  return patterns;
}

function normalizePattern(p: string): string {
  let s = p.trim();
  if (s.startsWith("./")) s = s.slice(2);
  return s;
}

/**
 * Top-level directory names that contain workspace packages (e.g. packages, apps).
 */
export function topLevelWorkspaceDirs(packages: string[]): string[] {
  const tops = new Set<string>();
  for (const pkg of packages) {
    const top = pkg.split("/")[0];
    if (top && top !== "." && top !== "..") tops.add(top);
  }
  return Array.from(tops).sort();
}

/**
 * Resolve package directories from `pnpm-workspace.yaml` under `root`.
 * Returns posix-relative paths; excludes the workspace root itself.
 * Missing file or missing `packages:` → [].
 */
export async function listPnpmWorkspacePackages(root: string): Promise<string[]> {
  const file = resolve(root, WORKSPACE_FILE);
  if (!existsSync(file)) return [];

  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return [];
  }

  const patterns = parsePnpmWorkspacePackagesField(raw);
  if (patterns.length === 0) return [];

  const includes: string[] = [];
  const excludes: string[] = [];
  for (const p of patterns) {
    const n = normalizePattern(p);
    if (!n) continue;
    if (n.startsWith("!")) excludes.push(n.slice(1));
    else includes.push(n);
  }
  if (includes.length === 0) return [];

  const ignorePatterns = [
    ...Array.from(DEFAULT_IGNORE_DIRS).map((d) => `**/${d}/**`),
    ...excludes,
  ];

  const found = new Set<string>();
  for (const pat of includes) {
    const matches = await glob(pat, {
      cwd: root,
      absolute: true,
      // Match pnpm: `*` does not match dot-directories
      dot: false,
      onlyFiles: false,
      ignore: ignorePatterns,
    });
    for (const abs0 of matches) {
      const abs = resolve(String(abs0));
      if (!(await isDirectory(abs))) continue;
      const rel = relative(root, abs).split(sep).join("/");
      if (!rel || rel === ".") continue;
      if (rel.startsWith("..")) continue;
      found.add(rel);
    }
  }

  // Apply excludes that are path prefixes / globs against resolved set
  if (excludes.length > 0) {
    const excluded = await glob(excludes, {
      cwd: root,
      absolute: true,
      dot: false,
      onlyFiles: false,
      ignore: Array.from(DEFAULT_IGNORE_DIRS).map((d) => `**/${d}/**`),
    });
    const excludedRels = new Set<string>();
    for (const abs0 of excluded) {
      const abs = resolve(String(abs0));
      if (!(await isDirectory(abs))) continue;
      excludedRels.add(relative(root, abs).split(sep).join("/"));
    }
    for (const rel of Array.from(found)) {
      if (excludedRels.has(rel)) found.delete(rel);
      for (const ex of excludes) {
        const plain = normalizePattern(ex);
        if (!plain.includes("*") && !plain.includes("?") && (rel === plain || rel.startsWith(plain + "/"))) {
          found.delete(rel);
        }
      }
    }
  }

  return Array.from(found).sort();
}
