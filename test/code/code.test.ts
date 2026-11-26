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
    env: { ...process.env, NO_COLOR: "1", COLUMNS: "200" },
  });
  return { code: proc.status, stdout: proc.stdout ?? "", stderr: proc.stderr ?? "" };
}

function fixtures(kind: "pass" | "fail"): string[] {
  return readdirSync(resolve(FIXTURES, kind), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/** What each failing fixture must report, as [what, where] — failing for the wrong reason is a bug. */
const EXPECTED: Record<string, Array<[string, string]>> = {
  eol: [
    ["Node 16 reached end of life on 2023-09-11", ".nvmrc"],
    ["Python 2.7 reached end of life on 2020-01-01", "Dockerfile"],
    ["Vue 2 reached end of life on 2023-12-31", "package.json"],
  ],
  garbage: [
    ["moment", "package.json"],
    ["node-sass 9.0.0, deprecated by its authors on npm", "package.json"],
  ],
  js: [["mixes camelCase ×1 + kebab-case ×1 names", "src/"]],
  monorepo: [
    ["zod is on several major versions (.: ^3.0.0; apps/web: ^3.0.0; packages/ui: ^4.0.0)", "package.json"],
    ["a lockfile inside a workspace package", "apps/web/pnpm-lock.yaml"],
  ],
};

/** The report's smells as [what, where]: the subject line (wrapped lines joined), then the paths listed under it. */
function smells(stdout: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  let what: string | undefined;
  let inSmell = false;
  let wrapped = false;
  for (const line of stdout.split("\n")) {
    if (/^  [✗?] /.test(line)) {
      inSmell = line.startsWith("  ✗");
      what = line.slice(4).trim();
      wrapped = true;
    } else if (inSmell && what !== undefined && wrapped && /^ {4}\S/.test(line) && !line.startsWith("    →")) {
      // A subject wraps with the same indent as its detail; the detail is checked by the tests that read words.
      continue;
    } else if (inSmell && what !== undefined && /^ {6}\S/.test(line)) {
      wrapped = false;
      out.push([what, line.trim()]);
    } else if (inSmell && what !== undefined && /^ {6}\S/.test(line)) out.push([what, line.trim()]);
    else if (!line.startsWith(" ")) inSmell = false;
  }
  return out;
}

describe("fixtures that match the taste", () => {
  for (const name of fixtures("pass")) {
    it(name, () => {
      const r = runCli(resolve(FIXTURES, "pass", name));
      if (r.code !== 0) console.log(r.stdout, r.stderr);
      expect(r.code).toBe(0);
      expect(r.stdout).toContain("Nothing smells");
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
      // Every smell, as what and where, must be expected — nothing more.
      const found = smells(r.stdout);
      for (const [what, where] of expected!) expect(found.some(([w, p]) => w.includes(what) && p === where), `${what} @ ${where}`).toBe(true);
      expect(found, "unexpected findings").toHaveLength(expected!.length);
    });
  }
});
