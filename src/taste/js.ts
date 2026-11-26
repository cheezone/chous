import { taste } from "./define";
import { DEPRECATED, SABOTAGED, depReason } from "./deps";

export type JsProject = {
  /** A package inside a monorepo: the root owns the lockfile. */
  workspacePackage?: boolean;
};

/** Lockfiles: a directory with its own is a project of its own (`frontend/`, `backend/`). */
export const LOCKFILES = ["package-lock.json", "npm-shrinkwrap.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"];

/**
 * A project inside a test directory is a test's input (bun keeps other tools'
 * repos to migrate), not a project of the repository. The directories the test
 * runners themselves read: Node's `**\/test/**`, Jest's `**\/__tests__/**`.
 */
export const IN_TESTS = /(^|\/)(test|__tests__)\//;

/**
 * JavaScript / TypeScript projects (package.json, tsconfig.json or jsconfig.json).
 *
 * Picks no tools. It flags what has rotten: packages their authors ended.
 */
export function js(project: JsProject = {}) {
  const t = taste("js");

  if (project.workspacePackage) {
    t.no([...LOCKFILES, "pnpm-workspace.yaml"], { reason: "reason.nestedLockfile", value: "order" });
    t.noField("packageManager", "reason.nestedPackageManager");
  }

  t.deprecations();
  for (const dep of [...DEPRECATED, ...SABOTAGED]) t.obsolete(dep.names, dep.use, depReason(dep));

  return t.rules;
}

/** Monorepo root: one major version of everything. */
export function monorepo() {
  const t = taste("monorepo");
  t.workspace();
  return t.rules;
}
