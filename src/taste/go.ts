import { taste } from "./define";

/** Go modules — layout follows golang-standards/project-layout. */
export function go() {
  const t = taste("go");

  t.must(["go.mod"]);
  t.allow([
    "go.mod",
    "go.sum",
    "go.work",
    "go.work.sum",
    "go.test.sum",
    "Makefile",
    "makefile",
    "golangci.yml",
    "golangci.yaml",
  ]);
  t.allow([
    "cmd", "pkg", "internal", "vendor", "api", "web", "configs", "init", "scripts", "build",
    "deployments", "test", "docs", "tools", "examples", "third_party", "githooks", "assets", "website",
  ]);
  t.allow(["*.go"]);

  for (const dir of ["cmd", "pkg", "internal", "internal/app", "internal/pkg", "web", "build", "tools", "examples"]) {
    t.naming(`${dir}/*`, ["flatcase", "snake_case"], { dirs: true, reason: "Go package directories" });
  }

  return t.rules;
}
