import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { readdirSync } from "node:fs";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const CLI_PATH = resolve(PROJECT_ROOT, "src/cli.ts");
const FIXTURES = resolve(PROJECT_ROOT, "test/fixtures");

function runCli(cwd: string, verbose = false) {
  const args = ["--import", "tsx", CLI_PATH, "--no-color", "-l", "en", ...(verbose ? ["-v"] : [])];
  const proc = spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  return { code: proc.status, stdout: proc.stdout ?? "", stderr: proc.stderr ?? "" };
}

function fixtures(kind: "pass" | "fail"): string[] {
  return readdirSync(resolve(FIXTURES, kind), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/** What each failing fixture must report — failing for the wrong reason is a bug. */
const EXPECTED: Record<string, string[]> = {
  bun: [
    "bun.lockb → not allowed: binary lockfile",
  ],
  cloudflare: [".dev.vars → not allowed: Worker secrets"],
  eol: [
    ".nvmrc (Node 16) → Node 16 reached end of life on 2023-09-11",
    "Dockerfile (Python 2.7) → Python 2.7 reached end of life on 2020-01-01",
    "package.json (Vue 2) → Vue 2 reached end of life on 2023-12-31",
  ],
  garbage: [
    "dependency moment is obsolete → dayjs",
    "dependency node-sass is obsolete → sass",
  ],
  js: ["test/ + tests/ → one thing under two names"],
  monorepo: [
    "zod is on several major versions (.: ^3.0.0; apps/web: ^3.0.0; packages/ui: ^4.0.0)",
    "apps/web/pnpm-lock.yaml → not allowed: one lockfile, at the workspace root",
  ],
  stack: [
    "package manager: npm + pnpm at once",
    "formatter: oxfmt + prettier at once",
    "git hooks: husky + simple-git-hooks at once",
  ],
  yarn: ["package manager: pnpm + yarn at once"],
};

describe("fixtures that match the taste", () => {
  for (const name of fixtures("pass")) {
    it(name, () => {
      const r = runCli(resolve(FIXTURES, "pass", name));
      if (r.code !== 0) console.log(r.stdout, r.stderr);
      expect(r.code).toBe(0);
      expect(r.stdout).toContain("No issues found");
    });
  }
});

describe("fixtures that break the taste", () => {
  for (const name of fixtures("fail")) {
    it(name, () => {
      const r = runCli(resolve(FIXTURES, "fail", name), true);
      expect(r.code, r.stdout + r.stderr).toBe(1);
      const expected = EXPECTED[name];
      expect(expected, `add an EXPECTED entry for fail/${name}`).toBeDefined();
      // Verbose mode lists every finding once, flat. Each must be expected — nothing more.
      const errors = r.stdout.split("\n").filter((line) => line.startsWith("✖ ")).map((line) => line.replace(/ +/g, " "));
      for (const text of expected!) expect(errors.some((line) => line.includes(text)), text).toBe(true);
      expect(errors, "unexpected findings").toHaveLength(expected!.length);
    });
  }
});
