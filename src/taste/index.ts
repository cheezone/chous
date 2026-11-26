import { existsSync } from "node:fs";
import { readText } from "../fsutil";
import { resolve } from "node:path";
import type { Rule } from "../types";
import { base } from "./base";
import { bun, cloudflare, js, monorepo, type Runtime } from "./js";
import { majorOf, next, nuxt } from "./frameworks";

export type Taste = {
  /** Applied tastes, broadest first, e.g. `["base", "js", "monorepo"]`. */
  ids: string[];
  rules: Rule[];
  runtime: Runtime;
};

export type TasteOptions = {
  /** The root of a monorepo with workspace packages. */
  monorepo?: boolean;
  /** A package inside a monorepo. */
  workspacePackage?: boolean;
  /** A project of its own inside the repository, outside any workspace: its own package.json and lockfile. */
  nestedProject?: boolean;
  /** Runtime inherited from the workspace root. */
  runtime?: Runtime;
};

function readJson(path: string): Record<string, any> | undefined {
  try {
    return JSON.parse(readText(path));
  } catch {
    return undefined;
  }
}

function anyExists(root: string, names: string[]): boolean {
  return names.some((n) => existsSync(resolve(root, n)));
}

/** Bun when the project says so; Node otherwise. */
function detectRuntime(root: string): Runtime {
  if (anyExists(root, ["bunfig.toml", "bun.lock", "bun.lockb"])) return "bun";
  const pkg = readJson(resolve(root, "package.json"));
  if (typeof pkg?.packageManager === "string" && pkg.packageManager.startsWith("bun@")) return "bun";
  const dev = { ...pkg?.dependencies, ...pkg?.devDependencies };
  return "@types/bun" in dev || "bun-types" in dev ? "bun" : "node";
}

/**
 * Pick the tastes for a project root. There is no config: the project's
 * shape decides which checks apply.
 */
export function resolveTaste(root: string, opts: TasteOptions = {}): Taste {
  const runtime = opts.runtime ?? detectRuntime(root);
  const inner = opts.workspacePackage || opts.nestedProject;
  const tastes: Array<[string, Rule[]]> = [["base", base({ workspacePackage: inner })]];

  if (anyExists(root, ["package.json"])) {
    tastes.push(["js", js({ workspacePackage: opts.workspacePackage })]);
    if (opts.monorepo) tastes.push(["monorepo", monorepo()]);
    if (runtime === "bun") tastes.push(["bun", bun()]);
    const pkg = readJson(resolve(root, "package.json"));
    const deps = { ...pkg?.devDependencies, ...pkg?.dependencies };
    if ("next" in deps) tastes.push(["next", next(root, majorOf(deps.next))]);
    if ("nuxt" in deps) tastes.push(["nuxt", nuxt(root, majorOf(deps.nuxt))]);
  }
  if (anyExists(root, ["wrangler.jsonc", "wrangler.json", "wrangler.toml"])) tastes.push(["cloudflare", cloudflare()]);

  return { ids: tastes.map(([id]) => id), rules: tastes.flatMap(([, rules]) => rules), runtime };
}
