import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { APP_CONFIG_FILE_NAME } from "../constants";
import { ensureGithubCached, listImportSpecifiers, readTextIfExists } from "./github";
import { resolveNpmPreset } from "./npm";
import { findPresetPath } from "./parser";

const MAX_DEPTH = 8;

export type PrefetchResult = {
  updated: string[];
  failed: string[];
};

/**
 * Download `import github:` targets before the synchronous parser reads them.
 * Relative files, built-in presets and npm packages are walked so a nested
 * `import github:` is fetched too. An existing cache is reused when offline.
 */
export async function prefetchImports(entryPath: string, opts?: { force?: boolean }): Promise<PrefetchResult> {
  const updated: string[] = [];
  const failed: string[] = [];
  const seen = new Set<string>();

  async function walk(filePath: string, depth: number): Promise<void> {
    if (depth > MAX_DEPTH || seen.has(filePath)) return;
    seen.add(filePath);
    const raw = readTextIfExists(filePath);
    if (raw == null) return;

    for (const spec of listImportSpecifiers(raw)) {
      if (spec.startsWith("github:")) {
        const cached = await ensureGithubCached(spec, opts?.force ?? false);
        if (!cached.file) {
          failed.push(spec);
          continue;
        }
        if (cached.downloaded) updated.push(spec);
        await walk(cached.file, depth + 1);
        continue;
      }

      const local = resolveLocalImport(spec, filePath);
      if (local) await walk(local, depth + 1);
    }
  }

  if (existsSync(entryPath)) await walk(resolve(entryPath), 0);
  return { updated, failed };
}

function resolveLocalImport(spec: string, fromFile: string): string | null {
  if (spec.startsWith("npm:")) return resolveNpmPreset(spec.slice(4), fromFile);
  if (spec.startsWith("github:")) return null;

  const direct = resolve(dirname(fromFile), spec);
  if (existsSync(direct)) return direct;
  const withExt = direct.endsWith(APP_CONFIG_FILE_NAME) ? direct : direct + APP_CONFIG_FILE_NAME;
  if (existsSync(withExt)) return withExt;
  return findPresetPath(spec);
}
