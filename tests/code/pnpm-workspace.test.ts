import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  listPnpmWorkspacePackages,
  parsePnpmWorkspacePackagesField,
  topLevelWorkspaceDirs,
} from "../../src/config/pnpm-workspace";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const CLI_PATH = resolve(PROJECT_ROOT, "src/cli.ts");
const PASS = resolve(PROJECT_ROOT, "tests/fixtures/pass/pnpm-workspace");
const FAIL = resolve(PROJECT_ROOT, "tests/fixtures/fail/pnpm-workspace");

function runCli(args: string[], cwd: string) {
  const proc = spawnSync(process.execPath, ["--import", "tsx", CLI_PATH, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  return { code: proc.status, stdout: proc.stdout ?? "", stderr: proc.stderr ?? "" };
}

describe("parsePnpmWorkspacePackagesField", () => {
  it("reads include and exclude patterns and ignores catalog", () => {
    const patterns = parsePnpmWorkspacePackagesField(`
packages:
  - 'packages/*'
  - "apps/**"
  - '!packages/ignore'
  - components/ui

catalog:
  chalk: ^4.1.2
`);
    expect(patterns).toEqual(["packages/*", "apps/**", "!packages/ignore", "components/ui"]);
  });

  it("returns an empty list when packages is missing", () => {
    expect(parsePnpmWorkspacePackagesField("catalog:\n  x: 1\n")).toEqual([]);
  });
});

describe("listPnpmWorkspacePackages", () => {
  it("resolves packages and respects excludes", async () => {
    const dir = mkdtempSync(join(PROJECT_ROOT, "tests", "tmp-pnpm-ws-"));
    try {
      writeFileSync(
        join(dir, "pnpm-workspace.yaml"),
        "packages:\n  - 'packages/*'\n  - '!packages/ignore'\n\ncatalog:\n  x: 1\n",
        "utf8",
      );
      mkdirSync(join(dir, "packages", "core"), { recursive: true });
      mkdirSync(join(dir, "packages", "ignore"), { recursive: true });
      writeFileSync(join(dir, "packages", "core", "package.json"), "{}", "utf8");
      writeFileSync(join(dir, "packages", "ignore", "package.json"), "{}", "utf8");

      const pkgs = await listPnpmWorkspacePackages(dir);
      expect(pkgs).toEqual(["packages/core"]);
      expect(topLevelWorkspaceDirs(pkgs)).toEqual(["packages"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns [] when the workspace file is absent", async () => {
    const dir = mkdtempSync(join(PROJECT_ROOT, "tests", "tmp-pnpm-none-"));
    try {
      expect(await listPnpmWorkspacePackages(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("pnpm workspace lint", () => {
  it("allows a workspace whose packages follow root allow rules", () => {
    const r = runCli(["--no-color", "-l", "en", "-v"], PASS);
    if (r.code !== 0) console.log(r.stdout, r.stderr);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("workspace packages: 2");
  });

  it("flags stray files inside a package without requiring root tooling there", () => {
    const r = runCli(["--no-color", "-l", "en", "-v"], FAIL);
    expect(r.code).not.toBe(0);
    expect(r.stdout).toMatch(/packages\/core\/stray\.xyz/);
    expect(r.stdout).not.toMatch(/packages\/core\/.*eslint\.config/);
    expect(r.stdout).toContain("workspace packages: 1");
  });
});
