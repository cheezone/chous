import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Rule } from "../types";
import { base } from "./base";
import { js, monorepo } from "./js";

export type Taste = {
  /** Applied tastes, broadest first, e.g. `["base", "js", "monorepo"]`. */
  ids: string[];
  rules: Rule[];
};

export type TasteOptions = {
  /** The root of a monorepo with workspace packages. */
  monorepo?: boolean;
  /** A package inside a monorepo. */
  workspacePackage?: boolean;
  /** A project of its own inside the repository, outside any workspace: its own package.json and lockfile. */
  nestedProject?: boolean;
};

function anyExists(root: string, names: string[]): boolean {
  return names.some((n) => existsSync(resolve(root, n)));
}

/**
 * Pick the tastes for a project root. There is no config: the project's
 * shape decides which checks apply.
 */
export function resolveTaste(root: string, opts: TasteOptions = {}): Taste {
  const inner = opts.workspacePackage || opts.nestedProject;
  const tastes: Array<[string, Rule[]]> = [["base", base({ workspacePackage: inner })]];

  if (anyExists(root, ["package.json"])) {
    tastes.push(["js", js({ workspacePackage: opts.workspacePackage })]);
    if (opts.monorepo) tastes.push(["monorepo", monorepo()]);
  }

  return { ids: tastes.map(([id]) => id), rules: tastes.flatMap(([, rules]) => rules) };
}
