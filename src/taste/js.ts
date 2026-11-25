import { taste } from "./define";
import { DEPRECATED, NATIVE, SABOTAGED, depReason } from "./deps";

export type Runtime = "node" | "bun";

export type JsProject = {
  /** A package inside a monorepo: the root owns the lockfile. */
  workspacePackage?: boolean;
};

const LOCKFILES = ["pnpm-lock.yaml", "pnpm-workspace.yaml", "package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "bun.lock", "bun.lockb"];

/**
 * Roles where one job takes one tool. chous does not claim the two break each
 * other — only that two tools hold one job.
 * Linters, test runners and bundlers are left alone — running two of them is
 * often a deliberate migration, not a mistake.
 */
const ONE_JOB_ROLES = ["package-manager", "formatter", "git-hooks", "release"];

/**
 * JavaScript / TypeScript projects (package.json, tsconfig.json or jsconfig.json).
 *
 * Picks no tools. It flags what has rotten (dead packages, things the platform
 * now ships) and two tools holding one job — both stay true for years.
 */
export function js(project: JsProject = {}) {
  const t = taste("js");

  t.oneToolPer(ONE_JOB_ROLES);

  if (project.workspacePackage) {
    t.no(LOCKFILES, { reason: "reason.nestedLockfile", value: "order" });
    t.noField("packageManager", "reason.nestedPackageManager");
  }

  for (const dep of NATIVE) t.obsolete(dep.names, dep.use, depReason(dep), { native: true });
  for (const dep of [...DEPRECATED, ...SABOTAGED]) t.obsolete(dep.names, dep.use, depReason(dep));
  // Tools their authors ended: TSLint (deprecated), JSCS (merged into ESLint).
  // JSHint and Bower are not here: neither was ever declared dead.
  t.no([".jscsrc", "tslint.json"], { reason: "reason.deadToolConfig", value: "modernity" });

  return t.rules;
}

/** Monorepo root: one major version of everything. */
export function monorepo() {
  const t = taste("monorepo");
  t.workspace();
  return t.rules;
}

/** Bun as runtime. */
export function bun() {
  const t = taste("bun");
  t.no(["bun.lockb"], { reason: "reason.bunLockb", value: "modernity" });
  t.obsolete(["tsx", "ts-node"], "bun", "reason.bunRunsTs", { native: true });
  return t.rules;
}

/** Cloudflare Workers / Pages projects (a wrangler config at the root). */
export function cloudflare() {
  const t = taste("cloudflare");
  t.no(["**/.dev.vars", "**/.dev.vars.!(example)"], { reason: "reason.devVars", value: "cleanliness" });
  t.no([".wrangler"], { reason: "reason.wranglerState", value: "cleanliness" });
  return t.rules;
}
