import { taste } from "./define";
import { DEAD, NATIVE } from "./deps";

export type Runtime = "node" | "bun";

export type JsProject = {
  /** Publishes something (`bin` / `exports` / `main`) rather than being an app. */
  library: boolean;
  runtime: Runtime;
  /** A package inside a monorepo: the root owns the package manager and the lockfile. */
  workspacePackage?: boolean;
};

const LOCKFILES = ["pnpm-lock.yaml", "pnpm-workspace.yaml", "package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "bun.lock", "bun.lockb"];

/** JavaScript / TypeScript projects (package.json, tsconfig.json or jsconfig.json). */
export function js(project: JsProject) {
  const t = taste("js");
  const bun = project.runtime === "bun";
  const inWorkspace = Boolean(project.workspacePackage);

  t.must(["package.json"]);
  t.allow(["package.json", "{ts,js}config.json", "{ts,js}config.*.json"]);
  t.allow(["*.d.ts"], { reason: "Root-level ambient type declarations" });
  t.allow(["components.json"]);
  t.allow(["src", "test", "scripts", "public"]);
  t.allow(["packages", "apps", "libs", "tools"]);
  t.allow(["turbo.json", "nx.json", "project.json"]);
  t.allow(["typedoc.json"]);
  t.allow(["patches"], { reason: "Dependency patches" });
  t.allow([".nvmrc", ".node-version"]);

  // ESM only.
  t.field("type", "module");

  // One name per concept.
  t.rename(["tests", "__tests__", "spec", "specs"], "test");
  t.rename(["script"], "scripts");

  // The stack. Siblings in the same role are errors, with a migration note when one exists.
  // Inside a workspace the root owns the package manager, and tools may be hoisted there.
  const optional = inWorkspace;
  if (inWorkspace) {
    t.no(LOCKFILES, { reason: "one lockfile, at the workspace root" });
    t.noField("packageManager", "set it once, in the workspace root");
  } else {
    t.packageManager(bun ? "bun" : "pnpm");
    t.role("package-manager", [bun ? "bun" : "pnpm"]);
  }
  t.role("typechecker", ["typescript"], { optional });
  t.role("linter", ["oxlint"], { optional });
  t.role("test-runner", bun ? ["vitest", "bun"] : ["vitest"], { optional });
  t.role("git-hooks", ["simple-git-hooks"], { optional });
  if (project.library) {
    t.role("bundler", ["tsdown"], { optional });
    t.role("release", ["changelogen"], { optional });
  }

  for (const dep of [...NATIVE, ...DEAD]) t.obsolete(dep.names, dep.use, dep.why);
  t.no([".bowerrc", "bower.json", ".jshintrc", ".jscsrc", "tslint.json", "Gruntfile.js", "gulpfile.js"], {
    reason: "leftover config of a dead tool",
  });

  return t.rules;
}

/** Monorepo root: tooling only, one version of everything. */
export function monorepo(runtime: Runtime) {
  const t = taste("monorepo");
  t.field("private", true, { reason: "a workspace root is never published" });
  t.noField("dependencies", "the workspace root holds tooling only, move runtime dependencies into a package");
  if (runtime === "node") {
    t.must(["pnpm-workspace.yaml"]);
    t.noField("workspaces", "pnpm reads pnpm-workspace.yaml");
  }
  t.no(["lerna.json", "rush.json"], { reason: "pnpm workspaces already do this" });
  t.workspace();
  return t.rules;
}

/** Bun as runtime, package manager and (optionally) test runner. */
export function bun() {
  const t = taste("bun");
  t.allow(["bunfig.toml", "bun.lock"]);
  t.no(["bun.lockb"], { reason: "binary lockfile, run `bun install --save-text-lockfile` and commit bun.lock" });
  t.obsolete(["bun-types"], "@types/bun", "bun-types was renamed.");
  t.obsolete(["tsx", "ts-node"], "bun", "Bun runs TypeScript directly.");
  t.obsolete(["better-sqlite3", "sqlite3"], "bun:sqlite", "Bun ships SQLite.");
  return t.rules;
}

/** Cloudflare Workers / Pages projects (a wrangler config at the root). */
export function cloudflare() {
  const t = taste("cloudflare");
  t.no(["wrangler.toml", "wrangler.json"], { reason: "use wrangler.jsonc, Cloudflare's recommended format" });
  t.allow([".dev.vars.example"]);
  t.no(["**/.dev.vars", "**/.dev.vars.!(example)"], { reason: "Worker secrets, gitignore it and commit .dev.vars.example instead" });
  t.no([".wrangler"], { reason: "local Wrangler state, gitignore it" });
  t.obsolete(["@cloudflare/workers-types"], "`wrangler types`", "Wrangler generates types that match your bindings and compatibility date.");
  return t.rules;
}
