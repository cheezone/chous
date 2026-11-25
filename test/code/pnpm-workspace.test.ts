import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { getPackages } from "@manypkg/get-packages";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const CLI_PATH = resolve(PROJECT_ROOT, "src/cli.ts");
const PASS = resolve(PROJECT_ROOT, "test/fixtures/pass/pnpm-workspace");
const FAIL = resolve(PROJECT_ROOT, "test/fixtures/fail/pnpm-workspace");

function runCli(args: string[], cwd: string) {
  const proc = spawnSync(process.execPath, ["--import", "tsx", CLI_PATH, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  return { code: proc.status, stdout: proc.stdout ?? "", stderr: proc.stderr ?? "" };
}

describe("@manypkg/get-packages on fixtures", () => {
  it("lists pnpm packages and respects excludes", async () => {
    const { tool, packages, rootDir } = await getPackages(PASS);
    expect(tool.type).toBe("pnpm");
    expect(resolve(rootDir)).toBe(PASS);
    const rels = packages.map((p) => p.relativeDir.replace(/\\/g, "/")).sort();
    expect(rels).toEqual(["components/ui", "packages/core"]);
  });

  it("only counts directories that have package.json under packages/**", async () => {
    const dir = mkdtempSync(join(PROJECT_ROOT, "test", "tmp-pnpm-pkgjson-"));
    try {
      writeFileSync(join(dir, "pnpm-workspace.yaml"), "packages:\n  - 'packages/**'\n", "utf8");
      writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "tmp", private: true }), "utf8");
      mkdirSync(join(dir, "packages", "core", "src", "comp"), { recursive: true });
      writeFileSync(join(dir, "packages", "core", "package.json"), JSON.stringify({ name: "@demo/core" }), "utf8");
      writeFileSync(join(dir, "packages", "core", "src", "main.ts"), "export {}\n", "utf8");
      writeFileSync(join(dir, "packages", "core", "src", "comp", "rect.ts"), "export {}\n", "utf8");

      const { packages, rootDir } = await getPackages(dir);
      expect(resolve(rootDir)).toBe(dir);
      const rels = packages.map((p) => p.relativeDir.replace(/\\/g, "/"));
      expect(rels).toEqual(["packages/core"]);
      expect(rels).not.toContain("packages/core/src");
      expect(rels).not.toContain("packages/core/src/comp");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("workspace lint", () => {
  it("allows a workspace whose packages follow root allow rules", () => {
    const r = runCli(["--no-color", "-l", "en", "-v"], PASS);
    if (r.code !== 0) console.log(r.stdout, r.stderr);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("workspace packages: 2");
  });


  it("does not treat nested source dirs as packages under packages/**", () => {
    const dir = mkdtempSync(join(PROJECT_ROOT, "test", "tmp-pnpm-nested-"));
    try {
      writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "nested", type: "module", private: true, packageManager: "pnpm@10.0.0" }), "utf8");
      writeFileSync(join(dir, "pnpm-workspace.yaml"), "packages:\n  - 'packages/**'\n", "utf8");
      mkdirSync(join(dir, "packages", "core", "src", "comp"), { recursive: true });
      writeFileSync(join(dir, "packages", "core", "package.json"), JSON.stringify({ name: "@demo/core", type: "module" }), "utf8");
      writeFileSync(join(dir, "packages", "core", "src", "index.ts"), "export {}\n", "utf8");
      writeFileSync(join(dir, "packages", "core", "src", "comp", "rect.ts"), "export {}\n", "utf8");

      const r = runCli(["--no-color", "-l", "en", "-v"], dir);
      if (r.code !== 0) console.log(r.stdout, r.stderr);
      expect(r.code).toBe(0);
      expect(r.stdout).toContain("workspace packages: 1");
      expect(r.stdout).not.toMatch(/rect\.ts/);
      expect(r.stdout).not.toMatch(/main\.ts/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not inherit a parent monorepo when linting a nested non-workspace project", () => {
    // pass/library lives under this repo but has no workspace of its own
    const nested = resolve(PROJECT_ROOT, "test/fixtures/pass/library");
    const r = runCli(["--no-color", "-l", "en", "-v"], nested);
    if (r.code !== 0) console.log(r.stdout, r.stderr);
    expect(r.code).toBe(0);
    expect(r.stdout).not.toContain("workspace packages:");
  });
});
