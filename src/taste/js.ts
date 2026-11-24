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
  t.allow(["*.d.ts"], { reason: { en: "Root-level ambient type declarations", zh: "根目录的全局类型声明" } });
  t.allow(["components.json"]);
  t.allow(["src", "test", "scripts", "public"]);
  t.allow(["packages", "apps", "libs", "tools"]);
  t.allow(["turbo.json", "nx.json", "project.json"]);
  t.allow(["typedoc.json"]);
  t.allow(["patches"], { reason: { en: "Dependency patches", zh: "依赖补丁" } });
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
    t.no(LOCKFILES, { reason: { en: "one lockfile, at the workspace root", zh: "只能有一个 lockfile，放在工作区根目录" } });
    t.noField("packageManager", { en: "set it once, in the workspace root", zh: "只在工作区根目录设置一次" });
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
    reason: { en: "leftover config of a dead tool", zh: "已死工具的残留配置" },
  });

  return t.rules;
}

/** Monorepo root: tooling only, one version of everything. */
export function monorepo(runtime: Runtime) {
  const t = taste("monorepo");
  t.field("private", true, { reason: { en: "a workspace root is never published", zh: "工作区根目录永远不发布" } });
  t.noField("dependencies", { en: "the workspace root holds tooling only, move runtime dependencies into a package", zh: "工作区根目录只放工具，运行时依赖移到具体的包里" });
  if (runtime === "node") {
    t.must(["pnpm-workspace.yaml"]);
    t.noField("workspaces", { en: "pnpm reads pnpm-workspace.yaml", zh: "pnpm 读取的是 pnpm-workspace.yaml" });
  }
  t.no(["lerna.json", "rush.json"], { reason: { en: "pnpm workspaces already do this", zh: "pnpm 工作区已经能做到" } });
  t.workspace();
  return t.rules;
}

/** Bun as runtime, package manager and (optionally) test runner. */
export function bun() {
  const t = taste("bun");
  t.allow(["bunfig.toml", "bun.lock"]);
  t.no(["bun.lockb"], { reason: { en: "binary lockfile, run `bun install --save-text-lockfile` and commit bun.lock", zh: "二进制 lockfile，运行 `bun install --save-text-lockfile`，改为提交 bun.lock" } });
  t.obsolete(["bun-types"], "@types/bun", { en: "bun-types was renamed.", zh: "bun-types 已改名。" });
  t.obsolete(["tsx", "ts-node"], "bun", { en: "Bun runs TypeScript directly.", zh: "Bun 直接运行 TypeScript。" });
  t.obsolete(["better-sqlite3", "sqlite3"], "bun:sqlite", { en: "Bun ships SQLite.", zh: "Bun 自带 SQLite。" });
  return t.rules;
}

/** Cloudflare Workers / Pages projects (a wrangler config at the root). */
export function cloudflare() {
  const t = taste("cloudflare");
  t.no(["wrangler.toml", "wrangler.json"], { reason: { en: "use wrangler.jsonc, Cloudflare's recommended format", zh: "改用 Cloudflare 推荐的 wrangler.jsonc" } });
  t.allow([".dev.vars.example"]);
  t.no(["**/.dev.vars", "**/.dev.vars.!(example)"], { reason: { en: "Worker secrets, gitignore it and commit .dev.vars.example instead", zh: "Worker 密钥，加进 .gitignore，改为提交 .dev.vars.example" } });
  t.no([".wrangler"], { reason: { en: "local Wrangler state, gitignore it", zh: "Wrangler 本地状态，加进 .gitignore" } });
  t.obsolete(["@cloudflare/workers-types"], "`wrangler types`", { en: "Wrangler generates types that match your bindings and compatibility date.", zh: "Wrangler 会按你的绑定和兼容日期生成类型。" });
  return t.rules;
}
