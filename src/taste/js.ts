import { taste } from "./define";
import { DEAD, NATIVE } from "./deps";

export type Runtime = "node" | "bun";

export type JsProject = {
  /** A package inside a monorepo: the root owns the lockfile. */
  workspacePackage?: boolean;
};

const LOCKFILES = ["pnpm-lock.yaml", "pnpm-workspace.yaml", "package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "bun.lock", "bun.lockb"];

/**
 * Roles where a second tool is always a bug: they fight over the same files.
 * Linters, test runners and bundlers are left alone — running two of them is
 * often a deliberate migration, not a mistake.
 */
const FIGHTING_ROLES = ["package-manager", "formatter", "git-hooks", "release"];

/**
 * JavaScript / TypeScript projects (package.json, tsconfig.json or jsconfig.json).
 *
 * Picks no tools. It flags what has rotten (dead packages, things the platform
 * now ships) and tools that fight each other — both stay true for years.
 */
export function js(project: JsProject = {}) {
  const t = taste("js");

  t.must(["package.json"]);
  t.allow(["src", "test", "scripts", "public", "patches"]);
  t.allow(["packages", "apps", "libs", "tools"]);
  t.allow(["*.d.ts"], { reason: { en: "Root-level ambient type declarations", zh: "根目录的全局类型声明" } });

  // ESM only.
  t.field("type", "module");

  // One name per concept.
  t.rename(["tests", "__tests__", "spec", "specs"], "test");
  t.rename(["script"], "scripts");

  t.oneToolPer(FIGHTING_ROLES);

  if (project.workspacePackage) {
    t.no(LOCKFILES, { reason: { en: "one lockfile, at the workspace root", zh: "只能有一个 lockfile，放在工作区根目录" } });
    t.noField("packageManager", { en: "set it once, in the workspace root", zh: "只在工作区根目录设置一次" });
  }

  for (const dep of [...NATIVE, ...DEAD]) t.obsolete(dep.names, dep.use, dep.why);
  t.no([".bowerrc", "bower.json", ".jshintrc", ".jscsrc", "tslint.json"], {
    reason: { en: "leftover config of a dead tool", zh: "已死工具的残留配置" },
  });

  return t.rules;
}

/** Monorepo root: tooling only, one version of everything. */
export function monorepo(pnpm: boolean) {
  const t = taste("monorepo");
  t.field("private", true, { reason: { en: "a workspace root is never published", zh: "工作区根目录永远不发布" } });
  t.noField("dependencies", { en: "the workspace root holds tooling only, move runtime dependencies into a package", zh: "工作区根目录只放工具，运行时依赖移到具体的包里" });
  if (pnpm) {
    t.noField("workspaces", { en: "pnpm never reads it, packages are listed in pnpm-workspace.yaml", zh: "pnpm 不读这个字段，包列表写在 pnpm-workspace.yaml" });
  }
  t.workspace();
  return t.rules;
}

/** Bun as runtime. */
export function bun() {
  const t = taste("bun");
  t.no(["bun.lockb"], { reason: { en: "binary lockfile, run `bun install --save-text-lockfile` and commit bun.lock", zh: "二进制 lockfile，运行 `bun install --save-text-lockfile`，改为提交 bun.lock" } });
  t.obsolete(["bun-types"], "@types/bun", { en: "bun-types was renamed.", zh: "bun-types 已改名。" });
  t.obsolete(["tsx", "ts-node"], "bun", { en: "Bun runs TypeScript directly.", zh: "Bun 直接运行 TypeScript。" });
  return t.rules;
}

/** Cloudflare Workers / Pages projects (a wrangler config at the root). */
export function cloudflare() {
  const t = taste("cloudflare");
  t.no(["**/.dev.vars", "**/.dev.vars.!(example)"], { reason: { en: "Worker secrets, gitignore it and commit .dev.vars.example instead", zh: "Worker 密钥，加进 .gitignore，改为提交 .dev.vars.example" } });
  t.no([".wrangler"], { reason: { en: "local Wrangler state, gitignore it", zh: "Wrangler 本地状态，加进 .gitignore" } });
  return t.rules;
}
