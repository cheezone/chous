import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const SRC_CLI = resolve(PROJECT_ROOT, "src/cli.ts");

function run(args: string[], cwd: string) {
  const proc = spawnSync(process.execPath, ["--import", "tsx", SRC_CLI, "--no-color", ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  return { code: proc.status, stdout: proc.stdout ?? "", stderr: proc.stderr ?? "" };
}

function makeRepo(files: Record<string, string>): string {
  const dir = mkdtempSync(join(PROJECT_ROOT, "tests", "tmp-preset-"));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content, "utf8");
  }
  return dir;
}

describe("--preset", () => {
  it("lints with a persona and leaves the repository untouched", () => {
    const rules = "import basic\n";
    const dir = makeRepo({
      ".chous": rules,
      "package.json": JSON.stringify({
        name: "trial",
        packageManager: "npm@10.0.0",
        dependencies: { prettier: "3.0.0" },
      }),
    });
    try {
      const plain = run(["-l", "en"], dir);
      if (plain.code !== 0) console.log(plain.stdout, plain.stderr);
      expect(plain.code).toBe(0);

      const trial = run(["-l", "en", "-v", "--preset", "antfu"], dir);
      expect(trial.code).not.toBe(0);
      expect(trial.stdout).toContain("Trying preset: antfu");
      expect(trial.stdout.toLowerCase()).toContain("prettier");
      expect(readFileSync(join(dir, ".chous"), "utf8")).toBe(rules);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not create a .chous file when the repository has none", () => {
    const dir = makeRepo({
      "package.json": JSON.stringify({ name: "bare" }),
    });
    try {
      const r = run(["-l", "en", "--preset", "basic"], dir);
      expect(r.code).not.toBe(2);
      expect(existsSync(join(dir, ".chous"))).toBe(false);
      expect(r.stdout).toContain("Trying preset: basic");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses to combine --preset with --config", () => {
    const dir = makeRepo({ "package.json": "{}" });
    try {
      const r = run(["-l", "en", "--preset", "antfu", "-c", "rules.chous"], dir);
      expect(r.code).toBe(2);
      expect(r.stderr).toContain("--preset and --config cannot be used together");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports an unknown preset", () => {
    const dir = makeRepo({ "package.json": "{}" });
    try {
      const r = run(["-l", "en", "--preset", "not-a-real-preset"], dir);
      expect(r.code).toBe(2);
      expect(r.stderr).toContain("unknown preset: not-a-real-preset");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("runs every preset when several are given", () => {
    const dir = makeRepo({
      "package.json": JSON.stringify({
        name: "trial",
        packageManager: "npm@10.0.0",
        dependencies: { prettier: "3.0.0" },
      }),
    });
    try {
      const r = run(["-l", "en", "-p", "basic", "-p", "antfu"], dir);
      expect(r.stdout).toContain("Trying preset: basic");
      expect(r.stdout).toContain("Trying preset: antfu");
      expect(r.code).not.toBe(0);
      expect(existsSync(join(dir, ".chous"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
