import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Rule } from "../types";
import { base } from "./base";
import { go } from "./go";
import { js } from "./js";
import { nextjs } from "./nextjs";
import { nuxt3, nuxt4 } from "./nuxt";
import { python } from "./python";

export type Taste = {
  /** Applied tastes, broadest first, e.g. `["base", "js", "nuxt4"]`. */
  ids: string[];
  rules: Rule[];
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

function isLibrary(root: string): boolean {
  const pkg = readJson(resolve(root, "package.json"));
  return Boolean(pkg && !pkg.private && (pkg.bin || pkg.exports || pkg.main));
}

/**
 * Pick the tastes for a project root. There is no config: the project's
 * shape decides which opinions apply.
 */
export function resolveTaste(root: string): Taste {
  const framework = detectFramework(root);
  const tastes: Array<[string, Rule[]]> = [["base", base()]];

  if (framework || anyExists(root, ["package.json", "tsconfig.json", "jsconfig.json"])) {
    tastes.push(["js", js({ library: !framework && isLibrary(root) })]);
  }
  if (anyExists(root, ["go.mod"])) tastes.push(["go", go()]);
  if (anyExists(root, ["pyproject.toml", "setup.py", "requirements.txt", "Pipfile", "poetry.lock"])) {
    tastes.push(["python", python()]);
  }
  if (framework) tastes.push([framework, { nuxt3, nuxt4, nextjs }[framework]()]);

  return { ids: tastes.map(([id]) => id), rules: tastes.flatMap(([, rules]) => rules) };
}
