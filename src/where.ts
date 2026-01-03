import { dirname, resolve, sep } from "node:path";
import type { WhereDirective } from "./types";
import { DEFAULT_IGNORE_DIRS } from "./fsutil";
import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { glob } from "tinyglobby";

function splitOutsideBraces(input: string): string[] {
  const out: string[] = [];
  let cur = "";
  let depth = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (ch === "{") depth++;
    if (ch === "}") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      const t = cur.trim();
      if (t) out.push(t);
      cur = "";
      continue;
    }
    cur += ch;
  }
  const t = cur.trim();
  if (t) out.push(t);
  return out;
}

function normalizeWherePattern(p: string): string {
  let s = p.trim();
  if (!s) return s;
  if (s.startsWith("./")) s = s.slice(2);
  // If user only wrote filename (or brace group), default to searching in entire tree
  const hasSlash = s.includes("/");
  const alreadyRecursive = s.startsWith("**/");
  if (!hasSlash && !alreadyRecursive) s = `**/${s}`;
  return s;
}

function hasGlobChars(s: string): boolean {
  return /[*?{}[\]]/.test(s) || s.includes("**");
}

function isIgnoredPath(p: string): boolean {
  const parts = p.split(sep);
  return parts.some((x) => DEFAULT_IGNORE_DIRS.has(x));
}

async function isDir(abs: string): Promise<boolean> {
  try {
    const s = await stat(abs);
    return s.isDirectory();
  } catch {
    return false;
  }
}

export async function resolveWorkspaceRoots(opts: {
  cwd: string;
  configDir: string;
  where: WhereDirective;
}): Promise<string[]> {
  const { cwd, configDir, where } = opts;
  const baseDir = resolve(configDir);
  if (where.type === "config") return [baseDir];
  if (where.type === "cwd") return [resolve(cwd)];

  if (where.type === "paths") {
    const roots = new Set<string>();
    const tokens = where.paths.flatMap((p) => splitOutsideBraces(p)).map((s) => s.trim()).filter(Boolean);
    for (const tok of tokens) {
      const t = tok.startsWith("./") ? tok.slice(2) : tok;
      if (hasGlobChars(t)) {
        const matches = await glob(t, { cwd: baseDir, absolute: true, dot: true, onlyFiles: false });
        for (const abs0 of matches) {
          const abs = resolve(String(abs0));
          if (isIgnoredPath(abs)) continue;
          roots.add((await isDir(abs)) ? abs : dirname(abs));
        }
      } else {
        const abs = resolve(baseDir, t);
        if (!existsSync(abs)) continue;
        if (isIgnoredPath(abs)) continue;
        roots.add((await isDir(abs)) ? abs : dirname(abs));
      }
    }
    const out = Array.from(roots).sort();
    return out.length > 0 ? out : [baseDir];
  }

  const patterns = where.patterns.flatMap((p) => splitOutsideBraces(p)).map(normalizeWherePattern).filter(Boolean);
  if (patterns.length === 0) return [baseDir];

  const roots = new Set<string>();
  for (const pat of patterns) {
    const matches = await glob(pat, { cwd: baseDir, absolute: true, dot: true, onlyFiles: false });
    for (const abs0 of matches) {
      const abs = resolve(String(abs0));
      if (isIgnoredPath(abs)) continue;
      const root = (await isDir(abs)) ? abs : dirname(abs);
      if (!isIgnoredPath(root)) roots.add(root);
    }
  }

  const out = Array.from(roots).sort();
  return out.length > 0 ? out : [baseDir];
}

