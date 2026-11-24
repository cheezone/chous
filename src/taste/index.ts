import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Rule } from "../types";
import { base } from "./base";
import { git, github, isGitRoot } from "./git";
import { go } from "./go";
import { bun, cloudflare, js, monorepo, type Runtime } from "./js";
import { nextjs } from "./nextjs";
import { nuxt3, nuxt4 } from "./nuxt";
import { python } from "./python";

export type Taste = {
  /** Applied tastes, broadest first, e.g. `["base", "git", "js", "nuxt4"]`. */
  ids: string[];
  rules: Rule[];
  runtime: Runtime;
};

export type TasteOptions = {
  /** The root of a monorepo (pnpm-workspace.yaml, workspaces, …). */
  monorepo?: boolean;
  /** A package inside a monorepo. */
  workspacePackage?: boolean;
  /** Runtime inherited from the workspace root. */
  runtime?: Runtime;
};

function readJson(path: string): Record<string, any> | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

function majorOf(range: unknown): number | undefined {
  if (typeof range !== "string") return undefined;
  const m = range.match(/(\d+)/);
  return m ? Number(m[1]) : undefined;
}

/** Installed version wins; otherwise the declared range; otherwise the latest major. */
function nuxtMajor(root: string): number {
  const installed = readJson(resolve(root, "node_modules/nuxt/package.json"));
  const fromInstalled = majorOf(installed?.version);
  if (fromInstalled) return fromInstalled;

  const pkg = readJson(resolve(root, "package.json"));
  const declared = pkg?.dependencies?.nuxt ?? pkg?.devDependencies?.nuxt;
  return majorOf(declared) ?? 4;
}

function anyExists(root: string, names: string[]): boolean {
  return names.some((n) => existsSync(resolve(root, n)));
}

function detectFramework(root: string): "nuxt3" | "nuxt4" | "nextjs" | undefined {
  if (anyExists(root, ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs", "nuxt.config.cjs"])) {
    return nuxtMajor(root) >= 4 ? "nuxt4" : "nuxt3";
  }
  if (anyExists(root, ["next.config.ts", "next.config.js", "next.config.mjs", "next.config.mts", "next.config.cjs"])) {
    return "nextjs";
  }
  return undefined;
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
 * shape decides which opinions apply.
 */
export function resolveTaste(root: string, opts: TasteOptions = {}): Taste {
  const framework = detectFramework(root);
  const runtime = opts.runtime ?? detectRuntime(root);
  const tastes: Array<[string, Rule[]]> = [["base", base()]];

  if (isGitRoot(root)) tastes.push(["git", git()]);
  if (anyExists(root, [".github/workflows"])) tastes.push(["github", github()]);

  if (framework || anyExists(root, ["package.json", "tsconfig.json", "jsconfig.json"])) {
    tastes.push(["js", js({ workspacePackage: opts.workspacePackage })]);
    if (opts.monorepo) tastes.push(["monorepo", monorepo(anyExists(root, ["pnpm-workspace.yaml", "pnpm-lock.yaml"]))]);
    if (runtime === "bun") tastes.push(["bun", bun()]);
  }
  if (anyExists(root, ["wrangler.jsonc", "wrangler.json", "wrangler.toml"])) tastes.push(["cloudflare", cloudflare()]);
  if (anyExists(root, ["go.mod"])) tastes.push(["go", go()]);
  if (anyExists(root, ["pyproject.toml", "setup.py", "requirements.txt", "Pipfile", "poetry.lock"])) {
    tastes.push(["python", python()]);
  }
  if (framework) tastes.push([framework, { nuxt3, nuxt4, nextjs }[framework]()]);

  return { ids: tastes.map(([id]) => id), rules: tastes.flatMap(([, rules]) => rules), runtime };
}
