import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const CLI_PATH = resolve(PROJECT_ROOT, "src/cli.ts");
const PASS_JS = resolve(PROJECT_ROOT, "test/fixtures/pass/js");

function runCli(args: string[], cwd = PASS_JS) {
  const proc = spawnSync(process.execPath, ["--import", "tsx", CLI_PATH, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  return { code: proc.status, stdout: proc.stdout ?? "", stderr: proc.stderr ?? "" };
}

describe("cli", () => {
  it("lints the current directory with no config", () => {
    const r = runCli(["-l", "en"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Taste: base · js");
  });

  it("speaks Chinese", () => {
    const r = runCli(["-l", "zh"]);
    expect(r.stdout).toContain("品味：base · js");
  });

  it("only ships English and Chinese", () => {
    const r = runCli(["-l", "ja"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("supported: en / zh / auto");
  });

  it.each([["--config", "x"], ["--preset", "antfu"], ["--strict"]])("has no %s option", (...args) => {
    const r = runCli(["-l", "en", ...args]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain(`Unknown argument: ${args[0]}`);
  });

  it("rejects conflicting warning flags", () => {
    const r = runCli(["-l", "en", "--ignore-warnings", "--fail-on-warnings"]);
    expect(r.code).toBe(2);
  });
});
