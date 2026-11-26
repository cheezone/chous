import { stat } from "node:fs/promises";
import { closeSync, constants, existsSync, fstatSync, openSync, readSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { glob } from "tinyglobby";

export const DEFAULT_IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
]);

/** What chous reads of any one file. The checks need a file's start, or a manifest; nothing needs more. */
export const READ_LIMIT = 16 * 1024 * 1024;

/**
 * The first `limit` bytes of a regular file, or nothing. A device, FIFO or
 * socket is never read: a committed symlink to /dev/zero would never end, and
 * /dev/tty would wait for a keypress. Opened non-blocking, checked after open.
 */
export function readBytes(path: string, limit = READ_LIMIT, fromEnd = false): Buffer {
  let fd: number | undefined;
  try {
    fd = openSync(path, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
    const stat = fstatSync(fd);
    if (!stat.isFile()) return Buffer.alloc(0);
    const size = Math.min(stat.size, limit);
    const start = fromEnd ? stat.size - size : 0;
    const buf = Buffer.alloc(size);
    let read = 0;
    while (read < size) {
      const n = readSync(fd, buf, read, size - read, start + read);
      if (n === 0) break;
      read += n;
    }
    return buf.subarray(0, read);
  } catch {
    return Buffer.alloc(0);
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/** The last `bytes` bytes of a regular file: where a disk image keeps its signature. */
export const readTail = (path: string, bytes: number) => readBytes(path, bytes, true);

/** A regular file's text (UTF-8), up to `limit` bytes; "" when it cannot be read as one. */
export const readText = (path: string, limit = READ_LIMIT) => readBytes(path, limit).toString("utf8");

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
      // Has slash or starts with slash → relative to this .gitignore's directory.
      // At the root the leading slash stays: `/*.js` is the root's files only, `*.js` would be every directory's.
      if (p.startsWith("/") && prefix) p = p.slice(1);
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
          appendGitIgnoreFile(allPatterns, readText(abs), "");
        } catch { /* ignore */ }
      }
      return allPatterns;
    }

    const gitignoreFiles = await glob("**/.gitignore", {
      cwd: root,
      dot: true,
      ignore: ["**/node_modules/**", "**/.git/**"],
      followSymbolicLinks: false,
    });

    for (const relFile of gitignoreFiles) {
      const absFile = resolve(root, relFile);
      const dir = dirname(relFile);
      const prefix = dir === "." ? "" : dir + "/";
      try {
        appendGitIgnoreFile(allPatterns, readText(absFile), prefix);
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return allPatterns;
}

