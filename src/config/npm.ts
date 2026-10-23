import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { APP_CONFIG_FILE_NAME } from "../constants";

function findPackageJson(spec: string, fromFile: string): string | null {
  try {
    const req = createRequire(fromFile);
    return req.resolve(`${spec}/package.json`);
  } catch {
    // Fall through to a manual node_modules walk.
  }

  let dir = dirname(fromFile);
  const parts = spec.split("/").filter(Boolean);
  for (let i = 0; i < 32; i++) {
    const candidate = resolve(dir, "node_modules", ...parts, "package.json");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * `import npm:<pkg>` reads the package's `chous` field, or `.chous` at the package root.
 */
export function resolveNpmPreset(spec: string, fromFile: string): string | null {
  const name = spec.trim();
  if (!name) return null;
  const pkgJsonPath = findPackageJson(name, fromFile);
  if (!pkgJsonPath) return null;

  let entryName = APP_CONFIG_FILE_NAME;
  try {
    const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as { chous?: unknown };
    if (typeof pkg.chous === "string" && pkg.chous.trim()) entryName = pkg.chous.trim();
  } catch {
    return null;
  }

  const file = resolve(dirname(pkgJsonPath), entryName);
  return existsSync(file) ? file : null;
}
