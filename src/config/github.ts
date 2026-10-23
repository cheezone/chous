import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { APP_CONFIG_FILE_NAME } from "../constants";

export type GithubImport = {
  owner: string;
  repo: string;
  ref: string;
  path: string;
};

const SPEC_RE = /^github:([^/\s]+)\/([^/\s@]+)(?:@([^/\s]+))?(?:\/(\S+))?$/;

/**
 * `github:owner/repo[/path][@ref]`
 * The ref may sit after the repo (`@v1/path`) or at the end (`/path@v1`).
 * A missing path means the repository's root rules file.
 */
export function parseGithubImport(spec: string): GithubImport | null {
  const match = spec.trim().match(SPEC_RE);
  if (!match) return null;
  const owner = match[1]!;
  const repo = match[2]!;
  let ref = match[3] ?? "main";
  let path = match[4] ?? APP_CONFIG_FILE_NAME;

  const trailingRef = path.match(/^(.*)@([^/@]+)$/);
  if (trailingRef && !match[3]) {
    path = trailingRef[1] || APP_CONFIG_FILE_NAME;
    ref = trailingRef[2]!;
  }
  path = path.replace(/^\/+/, "");
  if (!path) path = APP_CONFIG_FILE_NAME;
  if (path.split("/").includes("..") || path.split("/").includes(".")) return null;
  if (!owner || !repo || !ref) return null;
  return { owner, repo, ref, path };
}

export function githubCacheFile(spec: GithubImport): string {
  return resolve(homedir(), ".cache", "chous", "github", spec.owner, spec.repo, spec.ref, ...spec.path.split("/"));
}

function rawUrl(spec: GithubImport, ref: string): string {
  const encodedPath = spec.path.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${encodeURIComponent(spec.owner)}/${encodeURIComponent(spec.repo)}/${encodeURIComponent(ref)}/${encodedPath}`;
}

async function download(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Download a GitHub persona into the local cache.
 * A failed download keeps the previous file so an offline run can continue.
 */
export async function ensureGithubCached(
  specText: string,
  force: boolean,
): Promise<{ file: string | null; downloaded: boolean }> {
  const spec = parseGithubImport(specText);
  if (!spec) return { file: null, downloaded: false };
  const dest = githubCacheFile(spec);
  if (!force && existsSync(dest)) return { file: dest, downloaded: false };

  const refs = spec.ref === "main" ? ["main", "master"] : [spec.ref];
  for (const ref of refs) {
    const text = await download(rawUrl(spec, ref));
    if (text == null) continue;
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, text, "utf8");
    return { file: dest, downloaded: true };
  }
  return { file: existsSync(dest) ? dest : null, downloaded: false };
}

export function readCachedGithub(specText: string): string | null {
  const spec = parseGithubImport(specText);
  if (!spec) return null;
  const dest = githubCacheFile(spec);
  return existsSync(dest) ? dest : null;
}

export function listImportSpecifiers(raw: string): string[] {
  const specs: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^import\s+(\S+)/);
    if (match?.[1]) specs.push(match[1]);
  }
  return specs;
}

export function readTextIfExists(file: string): string | null {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
}
