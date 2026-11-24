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
  basic: ["forbidden.md"],
  bun: [
    "bun.lockb → not allowed: binary lockfile",
    "dependency bun-types is obsolete → @types/bun",
    "dependency tsx is obsolete → bun",
  ],
  cloudflare: [
    "wrangler.toml → not allowed: use wrangler.jsonc",
    ".dev.vars → not allowed: Worker secrets",
    "dependency @cloudflare/workers-types is obsolete",
  ],
  cnb: [".cnb.yaml → not allowed: CNB pipelines live in .cnb.yml"],
  github: ["Release.yaml → not in allow list", "notes.txt → not in allow list"],
  monorepo: [
    'remove "dependencies": the workspace root holds tooling only',
    "vue has several versions (^3.4.0 in apps/web; ^3.5.0 in packages/ui)",
    "depend on workspace package @demo/ui with workspace:* (found ^1.0.0)",
    "apps/web/pnpm-lock.yaml → not allowed: one lockfile, at the workspace root",
    "apps/web/app/components/header.vue → should be PascalCase",
  ],
  garbage: [
    "dependency moment is obsolete → dayjs",
    "dependency node-sass is obsolete → sass",
    "dependency uuid is obsolete → crypto.randomUUID()",
  ],
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
      const r = runCli(resolve(FIXTURES, "fail", name), true);
      expect(r.code, r.stdout + r.stderr).toBe(1);
      const expected = EXPECTED[name];
      expect(expected, `add an EXPECTED entry for fail/${name}`).toBeDefined();
      // The tree pads columns; compare with single spaces.
      const output = r.stdout.replace(/ +/g, " ");
      for (const text of expected!) expect(output).toContain(text);
    });
  }
});
