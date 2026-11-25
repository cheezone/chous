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

  it("explains why in the output language", () => {
    const garbage = resolve(PROJECT_ROOT, "test/fixtures/fail/garbage");
    const zh = runCli(["-l", "zh", "-v"], garbage).stdout;
    const en = runCli(["-l", "en", "-v"], garbage).stdout;
    expect(zh).toContain("平台已经自带 fetch：能否完全替代 node-fetch，取决于你怎么用它 （fetch 在 Node 18+ 和所有浏览器里都是全局的。）");
    expect(en).toContain("the platform ships fetch: whether it fully replaces node-fetch depends on how you use it (fetch is global in Node 18+ and every browser.)");
  });

  it("speaks JSON to agents: every finding with its verdict, taste and sources", () => {
    const eol = resolve(PROJECT_ROOT, "test/fixtures/fail/eol");
    const r = runCli(["-l", "en", "--json"], eol);
    expect(r.code).toBe(1);
    const report = JSON.parse(r.stdout);
    expect(report.counts.smells).toBeGreaterThan(0);
    const node = report.findings.find((f: { path: string }) => f.path === ".nvmrc (Node 16)");
    expect(node).toMatchObject({ verdict: "smell", value: "modernity", key: "issue.lifecycle.ended", sources: ["https://github.com/nodejs/Release/blob/main/schedule.json"] });
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
