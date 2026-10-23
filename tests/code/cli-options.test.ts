import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const SRC_CLI = resolve(PROJECT_ROOT, "src/cli.ts");
const DIST_CLI = resolve(PROJECT_ROOT, "dist/cli.mjs");
const PASS_FIXTURES_ROOT = resolve(PROJECT_ROOT, "tests/fixtures/pass");

function run(nodeArgs: string[], cwd: string) {
  const proc = spawnSync(process.execPath, nodeArgs, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  return { code: proc.status, stdout: proc.stdout ?? "", stderr: proc.stderr ?? "" };
}

describe("-c / --config", () => {
  it("lints the current directory, not the rules file's directory", () => {
    const rulesDir = mkdtempSync(join(tmpdir(), "chous-rules-"));
    try {
      const rulesFile = join(rulesDir, "shared.chous");
      writeFileSync(rulesFile, "import js\n\nstrict in .\n", "utf8");
      const cwd = resolve(PASS_FIXTURES_ROOT, "preset-js-monorepo");
      const r = run(["--import", "tsx", SRC_CLI, "--no-color", "-l", "en", "-c", rulesFile], cwd);
      if (r.code !== 0) console.log(r.stdout, r.stderr);
      expect(r.code).toBe(0);
    } finally {
      rmSync(rulesDir, { recursive: true, force: true });
    }
  });
});

// The fixture suites run src/ through tsx, where presets/ sits two levels above the
// parser. The published bundle flattens the parser into dist/, so check it there too.
describe.skipIf(!existsSync(DIST_CLI))("built CLI", () => {
  it("resolves `import <preset>`", () => {
    const r = run([DIST_CLI, "--no-color", "-l", "en"], resolve(PASS_FIXTURES_ROOT, "import-basic"));
    if (r.code !== 0) console.log(r.stdout, r.stderr);
    expect(r.code).toBe(0);
  });

  it("passes a strict monorepo layout with the js preset", () => {
    const r = run([DIST_CLI, "--no-color", "-l", "en"], resolve(PASS_FIXTURES_ROOT, "preset-js-monorepo"));
    if (r.code !== 0) console.log(r.stdout, r.stderr);
    expect(r.code).toBe(0);
  });
});
