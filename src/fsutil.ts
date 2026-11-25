import { stat, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { glob } from "tinyglobby";

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

function appendGitIgnoreFile(
  allPatterns: string[],
  content: string,
  prefix: string,
): void {
  const lines = content.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));
  for (let line of lines) {
    let isNegation = line.startsWith("!");
    if (isNegation) line = line.slice(1);

    const hasSlash = line.slice(0, -1).includes("/");
    let p = line;
    if (hasSlash || p.startsWith("/")) {
      // Has slash or starts with slash → relative to this .gitignore's directory
      if (p.startsWith("/")) p = p.slice(1);
      p = prefix + p;
    } else {
      // No slash → match this name in current directory and any subdirectories
      p = prefix + "**/" + p;
    }

    if (isNegation) p = "!" + p;
    allPatterns.push(p);
  }
}

/**
 * Load .gitignore patterns relative to root.
 * `rootOnly` skips the expensive nested-gitignore walk — enough for shallow scans.
 */
export async function loadGitIgnorePatterns(
  root: string,
  opts?: { rootOnly?: boolean },
): Promise<string[]> {
  const allPatterns: string[] = [];
  try {
    if (opts?.rootOnly) {
      const abs = resolve(root, ".gitignore");
      if (existsSync(abs)) {
        try {
          appendGitIgnoreFile(allPatterns, await readFile(abs, "utf-8"), "");
        } catch { /* ignore */ }
      }
      return allPatterns;
    }

    const gitignoreFiles = await glob("**/.gitignore", {
      cwd: root,
      dot: true,
      ignore: ["**/node_modules/**", "**/.git/**"],
    });

    for (const relFile of gitignoreFiles) {
      const absFile = resolve(root, relFile);
      const dir = dirname(relFile);
      const prefix = dir === "." ? "" : dir + "/";
      try {
        appendGitIgnoreFile(allPatterns, await readFile(absFile, "utf-8"), prefix);
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return allPatterns;
}

