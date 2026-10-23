import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { platform } from "node:os";
import { join, resolve } from "node:path";
import { depMatches } from "../../src/rules/validators/deps";
import { parseGithubImport } from "../../src/config/github";
import { resolveEditedFile } from "../../src/agents/core";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const CLI_PATH = resolve(PROJECT_ROOT, "src/cli.ts");
const FAIL_ANTFU = resolve(PROJECT_ROOT, "tests/fixtures/fail/preset-antfu");
const PASS_ANTFU = resolve(PROJECT_ROOT, "tests/fixtures/pass/preset-antfu");

function runCli(args: string[], cwd: string) {
  const proc = spawnSync(process.execPath, ["--import", "tsx", CLI_PATH, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  return { code: proc.status, stdout: proc.stdout ?? "", stderr: proc.stderr ?? "" };
}

describe("persona presets", () => {
  it("names the person and the replacement when the stack drifts", () => {
    const r = runCli(["--no-color", "-l", "en", "-v"], FAIL_ANTFU);
    expect(r.code).not.toBe(0);
    expect(r.stdout).toContain("Following @antfu");
    expect(r.stdout).toContain("replace dependency prettier with @antfu/eslint-config");
    expect(r.stdout).toContain("package manager should be pnpm");
    expect(r.stdout).not.toContain("Thanks Cheez");
  });

  it("accepts an antfu-shaped project", () => {
    const r = runCli(["--no-color", "-l", "en", "-v"], PASS_ANTFU);
    if (r.code !== 0) console.log(r.stdout, r.stderr);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("preset curated by cheez.tech");
  });
});

describe("dependency patterns", () => {
  it("matches a package and a scope wildcard", () => {
    expect(depMatches("prettier", "prettier")).toBe(true);
    expect(depMatches("prettier", "prettier-plugin")).toBe(false);
    expect(depMatches("@antfu/*", "@antfu/eslint-config")).toBe(true);
    expect(depMatches("@antfu/*", "eslint")).toBe(false);
  });
});

describe("github persona imports", () => {
  it("parses owner, repo, ref and path", () => {
    expect(parseGithubImport("github:antfu/starter-ts")).toEqual({
      owner: "antfu",
      repo: "starter-ts",
      ref: "main",
      path: ".chous",
    });
    expect(parseGithubImport("github:antfu/starter-ts@v1/presets/antfu.chous")).toMatchObject({
      ref: "v1",
      path: "presets/antfu.chous",
    });
    expect(parseGithubImport("github:antfu/starter-ts/presets/antfu.chous@v1")?.ref).toBe("v1");
    expect(parseGithubImport("github:antfu/starter-ts/../secret")).toBeNull();
  });

  it("tells you to run chous update when the remote preset is not cached", () => {
    const dir = mkdtempSync(join(PROJECT_ROOT, "tests", "tmp-remote-"));
    try {
      writeFileSync(join(dir, ".chous"), "import github:chous-test/definitely-missing-repo-xyz\n", "utf8");
      const r = runCli(["--no-color", "-l", "en"], dir);
      expect(r.code).not.toBe(0);
      expect(`${r.stdout}\n${r.stderr}`).toContain("chous update");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("npm persona imports", () => {
  it("loads the rules file named by the package chous field", () => {
    const dir = mkdtempSync(join(PROJECT_ROOT, "tests", "tmp-npm-"));
    try {
      const pkgDir = join(dir, "node_modules", "persona-example");
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(join(pkgDir, "package.json"), JSON.stringify({ name: "persona-example", chous: "rules.chous" }), "utf8");
      writeFileSync(join(pkgDir, "rules.chous"), "no [stray.txt]\n", "utf8");
      writeFileSync(join(dir, ".chous"), "import npm:persona-example\n", "utf8");
      writeFileSync(join(dir, "stray.txt"), "x", "utf8");
      const r = runCli(["--no-color", "-l", "en", "-v"], dir);
      expect(r.code).not.toBe(0);
      expect(r.stdout).toContain("stray.txt");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("edited file paths", () => {
  it("keeps an absolute path, including a Windows drive path", () => {
    expect(resolveEditedFile("/repo/src/a.ts", "/repo")).toBe("/repo/src/a.ts");
    if (platform() === "win32") {
      expect(resolveEditedFile("C:\\repo\\src\\a.ts", "C:\\repo")).toBe("C:\\repo\\src\\a.ts");
    }
  });
});
