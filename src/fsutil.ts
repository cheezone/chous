import { stat, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { glob } from "tinyglobby";
import ignore from "ignore";
import { APP_IGNORE_FILE_NAME } from "./constants";

export const DEFAULT_IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
]);

export function toDisplayPath(absPath: string, root: string): string {
  const rel = relative(root, absPath) || ".";
  // Uniformly display as posix style to avoid inconsistent output on Windows/Mac
  return rel.split(sep).join("/");
}

export function pickTopLevelName(rel: string): string {
  const cleaned = rel.replace(/^\.\//, "");
  const seg = cleaned.split("/")[0];
  return seg && seg !== "." ? seg : ".";
}

export function exists(p: string): boolean {
  return existsSync(p);
}

export async function isDirectory(p: string): Promise<boolean> {
  try {
    const s = await stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Load all levels of .gitignore and convert to patterns relative to root
 */
export async function loadGitIgnorePatterns(root: string): Promise<string[]> {
  const allPatterns: string[] = [];
  try {
    // Detect all .gitignore files in the project
    const gitignoreFiles = await glob("**/.gitignore", {
      cwd: root,
      dot: true,
      ignore: ["**/node_modules/**", "**/.git/**"]
    });

    for (const relFile of gitignoreFiles) {
      const absFile = resolve(root, relFile);
      const dir = dirname(relFile);
      const prefix = dir === "." ? "" : dir + "/";

      try {
        const content = await readFile(absFile, "utf-8");
        const lines = content.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));

        for (let line of lines) {
          let isNegation = line.startsWith("!");
          if (isNegation) line = line.slice(1);

          const hasSlash = line.slice(0, -1).includes("/");
          let p = line;
          if (hasSlash || p.startsWith("/")) {
            // Has slash or starts with slash, means relative to the directory where current .gitignore is located
            if (p.startsWith("/")) p = p.slice(1);
            p = prefix + p;
          } else {
            // No slash, means match this name in current directory and any subdirectories
            p = prefix + "**/" + p;
          }

          if (isNegation) p = "!" + p;
          allPatterns.push(p);
        }
      } catch { }
    }
  } catch { }
  return allPatterns;
}

export async function walkFiles(dir: string, opts?: { gitignore?: boolean; root?: string }): Promise<string[]> {
  const root = opts?.root ?? dir;
  const ignorePatterns = Array.from(DEFAULT_IGNORE_DIRS).map((d) => `**/${d}/**`);

  const matches = await glob("**/*", {
    cwd: dir,
    absolute: true,
    dot: true,
    onlyFiles: true,
    ignore: ignorePatterns,
  });

  const absMatches = matches.map((p) => resolve(p));
  if (opts?.gitignore === false) return absMatches;

  const patterns = await loadGitIgnorePatterns(root);
  const ig = ignore().add(patterns);

  return absMatches.filter(abs => {
    const rel = relative(root, abs).split(sep).join("/");
    return !ig.ignores(rel);
  });
}

export async function listTopLevel(root: string, opts?: { gitignore?: boolean }): Promise<{ name: string; abs: string; isDir: boolean }[]> {
  const ignorePatterns = Array.from(DEFAULT_IGNORE_DIRS).map((d) => `**/${d}/**`);
  const matches = await glob("*", {
    cwd: root,
    absolute: true,
    dot: true,
    onlyFiles: false,
    ignore: ignorePatterns,
  });

  let absMatches = matches.map((p) => resolve(p));

  if (opts?.gitignore !== false) {
    const patterns = await loadGitIgnorePatterns(root);
    const ig = ignore().add(patterns);
    absMatches = absMatches.filter(abs => {
      const rel = relative(root, abs).split(sep).join("/");
      return !ig.ignores(rel);
    });
  }

  const out = [];
  for (const abs of absMatches) {
    const s = await stat(abs);
    out.push({ name: basename(abs), abs, isDir: s.isDirectory() });
  }
  return out;
}

/**
 * Load .chousignore patterns from project root
 */
export async function loadChousIgnorePatterns(root: string): Promise<string[]> {
  const patterns: string[] = [];
  try {
    const chousignorePath = resolve(root, APP_IGNORE_FILE_NAME);
    if (!existsSync(chousignorePath)) return patterns;

    const content = await readFile(chousignorePath, "utf-8");
    const lines = content.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        patterns.push(trimmed);
      }
    }
  } catch {
    // Ignore errors (e.g., file doesn't exist, permission issues)
  }
  return patterns;
}

export async function isPathIgnored(absPath: string, root: string): Promise<boolean> {
  const base = basename(absPath);
  if (DEFAULT_IGNORE_DIRS.has(base)) return true;

  const rel = relative(root, absPath).split(sep).join("/");
  const patterns = await loadGitIgnorePatterns(root);
  const ig = ignore().add(patterns);

  return ig.ignores(rel);
}
