import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { readdirSync } from "node:fs";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const CLI_PATH = resolve(PROJECT_ROOT, "src/cli.ts");
const FIXTURES = resolve(PROJECT_ROOT, "test/fixtures");

function runCli(cwd: string) {
  const proc = spawnSync(process.execPath, ["--import", "tsx", CLI_PATH, "--no-color", "-l", "en"], {
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
  basic: ["forbidden.md"],
  garbage: ["dependency moment is replaceable", "dependency node-sass is not allowed"],
  go: ["MyApp/ → should be snake_case"],
  js: ["tests/ → should be renamed to test/"],
  library: ["package manager should be pnpm (found npm)", "linter should be oxlint (found eslint)"],
  nextjs: ["Button.tsx → not in allow list"],
  nuxt3: ["button.vue → should be PascalCase"],
  nuxt4: ["button.vue → should be PascalCase"],
  "pnpm-workspace": ["stray.xyz → not in allow list"],
  python: ["forbidden.md"],
  "root-clutter": ["notes.txt → not in allow list"],
  yarn: ["yarn.lock"],
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
      const r = runCli(resolve(FIXTURES, "fail", name));
      expect(r.code, r.stdout + r.stderr).toBe(1);
      const expected = EXPECTED[name];
      expect(expected, `add an EXPECTED entry for fail/${name}`).toBeDefined();
      // The tree pads columns; compare with single spaces.
      const output = r.stdout.replace(/ +/g, " ");
      for (const text of expected!) expect(output).toContain(text);
    });
  }
});
