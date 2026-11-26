/**
 * What git tracks, read from `.git/index` without the git binary: the files
 * that are committed, whatever .gitignore says and whatever folder they sit
 * in. A force-added `.DS_Store` is committed; a `build/` in the index is too.
 *
 * Supports index versions 2, 3 and 4 (path prefix compression), SHA-1 and
 * SHA-256 repositories, and worktrees whose `.git` is a file.
 */
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

/** The git directory of `root` when `root` is a repository's top level. */
function gitDir(root: string): string | undefined {
  const dotGit = resolve(root, ".git");
  try {
    if (statSync(dotGit).isDirectory()) return dotGit;
    const pointer = /^gitdir:\s*(.+)$/m.exec(readFileSync(dotGit, "utf8"))?.[1]?.trim();
    return pointer ? resolve(root, pointer) : undefined;
  } catch {
    return undefined;
  }
}

/** `extensions.objectFormat = sha256` makes object names 32 bytes, not 20. */
function hashSize(dir: string): number {
  try {
    return /objectformat\s*=\s*sha256/i.test(readFileSync(resolve(dir, "config"), "utf8")) ? 32 : 20;
  } catch {
    return 20;
  }
}

/** Paths git tracks under `root`, relative and posix; undefined when there is no readable index. */
export function trackedPaths(root: string): Set<string> | undefined {
  const dir = gitDir(root);
  if (!dir) return undefined;
  let buf: Buffer;
  try {
    buf = readFileSync(resolve(dir, "index"));
  } catch {
    return undefined;
  }
  if (buf.length < 12 || buf.toString("latin1", 0, 4) !== "DIRC") return undefined;
  const version = buf.readUInt32BE(4);
  const count = buf.readUInt32BE(8);
  if (version < 2 || version > 4) return undefined;
  const hash = hashSize(dir);
  const fixed = 40 + hash; // ctime, mtime, dev, ino, mode, uid, gid, size, object name
  const paths = new Set<string>();
  let offset = 12;
  let previous = "";
  for (let i = 0; i < count; i++) {
    const start = offset;
    if (offset + fixed + 2 > buf.length) return undefined;
    const mode = buf.readUInt32BE(offset + 24);
    const flags = buf.readUInt16BE(offset + fixed);
    offset += fixed + 2;
    if (version >= 3 && flags & 0x4000) offset += 2; // extended flags
    let path: string;
    if (version === 4) {
      // Strip N bytes from the previous path, then append the NUL-terminated rest.
      let byte = buf[offset++]!;
      let strip = byte & 0x7f;
      while (byte & 0x80) {
        byte = buf[offset++]!;
        strip = ((strip + 1) << 7) | (byte & 0x7f);
      }
      const end = buf.indexOf(0, offset);
      if (end < 0) return undefined;
      path = previous.slice(0, previous.length - strip) + buf.toString("utf8", offset, end);
      offset = end + 1;
    } else {
      const end = buf.indexOf(0, offset);
      if (end < 0) return undefined;
      path = buf.toString("utf8", offset, end);
      // Entries are padded with NULs to a multiple of 8 bytes.
      offset = start + ((end - start + 8) & ~7);
    }
    previous = path;
    const type = mode >>> 12;
    // Regular files and symlinks; not submodules (0o16) or sparse directory entries (0o04).
    if (type === 0o10 || type === 0o12) paths.add(path);
  }
  return paths;
}
