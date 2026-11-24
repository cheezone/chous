import { taste } from "./define";
import { DEAD, NATIVE } from "./deps";

export type JsProject = {
  /** Publishes something (`bin` / `exports` / `main`) rather than being an app. */
  library: boolean;
};

/** JavaScript / TypeScript projects (package.json, tsconfig.json or jsconfig.json). */
export function js(project: JsProject) {
  const t = taste("js");

  t.must(["package.json"]);
  t.allow(["package.json", "{ts,js}config.json", "{ts,js}config.*.json"]);
  t.allow(["*.d.ts"], { reason: "Root-level ambient type declarations" });
  t.allow(["components.json"]);
  t.allow(["src", "test", "scripts", "public"]);
  t.allow(["packages", "apps", "libs", "tools"]);
  t.allow(["turbo.json", "nx.json", "project.json"]);
  t.allow(["typedoc.json"]);
  t.allow(["patches"], { reason: "Dependency patches" });

  // One name per concept.
  t.rename(["tests", "__tests__", "spec", "specs"], "test");
  t.rename(["script"], "scripts");

  // The stack. Siblings in the same role are errors, with a migration note when one exists.
  t.packageManager("pnpm");
  t.role("package-manager", ["pnpm"]);
  t.role("typechecker", ["typescript"]);
  t.role("linter", ["oxlint"]);
  t.role("test-runner", ["vitest"]);
  t.role("git-hooks", ["simple-git-hooks"]);
  if (project.library) {
    t.role("bundler", ["tsdown"]);
    t.role("release", ["changelogen"]);
  }

  for (const dep of [...NATIVE, ...DEAD]) t.obsolete(dep.names, dep.use, dep.why);
  t.no([".travis.yml", ".bowerrc", "bower.json", ".jshintrc", ".jscsrc", "tslint.json", "Gruntfile.js", "gulpfile.js"], {
    reason: "Leftovers from dead tools",
  });

  return t.rules;
}
