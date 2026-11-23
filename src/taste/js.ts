import { taste } from "./define";

export type JsProject = {
  /** Publishes something (`bin` / `exports` / `main`) rather than being an app. */
  library: boolean;
};

/**
 * Dead or superseded packages that e18e module-replacements does not cover.
 * (`collectRottenDepIssues` handles the rest.)
 */
const GARBAGE: Array<[names: string[], reason: string]> = [
  [["node-sass"], "Deprecated. Use sass."],
  [["request-promise", "request-promise-native"], "request is dead. Use fetch."],
  [["tslint"], "Deprecated since 2019. Use oxlint."],
  [["babel-polyfill", "@babel/polyfill"], "Deprecated. Target a modern runtime instead."],
  [["bower"], "Dead package manager. Use pnpm."],
  [["gulp", "grunt"], "Task runners are obsolete. Use package.json scripts."],
  [["karma"], "Deprecated. Use Vitest browser mode."],
  [["istanbul", "nyc"], "Use vitest --coverage."],
  [["ts-node"], "Node runs TypeScript natively now. Use node or tsx."],
  [["nodemon"], "Use node --watch."],
  [["enzyme"], "Unmaintained. Use @testing-library."],
  [["react-scripts"], "Create React App is dead. Use Vite."],
];

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

  for (const [names, reason] of GARBAGE) t.banDeps(names, { reason });
  t.no([".travis.yml", ".bowerrc", "bower.json", ".jshintrc", ".jscsrc", "tslint.json", "Gruntfile.js", "gulpfile.js"], {
    reason: "Leftovers from dead tools",
  });

  return t.rules;
}
