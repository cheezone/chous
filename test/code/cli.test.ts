import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const CLI_PATH = resolve(PROJECT_ROOT, "src/cli.ts");
const PASS_JS = resolve(PROJECT_ROOT, "test/fixtures/pass/js");
// By URL: a folder outside the project cannot resolve the package by name.
const TSX = import.meta.resolve("tsx");

function runCli(args: string[], cwd = PASS_JS) {
  const proc = spawnSync(process.execPath, ["--import", TSX, CLI_PATH, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", COLUMNS: "200" },
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
    // Headline, then the reason, then the places, then what to do.
    expect(zh).toMatch(/× moment\n {4}维护者称它为处于维护模式的遗留项目。\n[\s\S]*?\n {2}help: dayjs \/ date-fns \/ Temporal\n/);
    expect(en).toMatch(/× moment\n {4}Its maintainers call it a legacy project in maintenance mode\.\n[\s\S]*?\n {2}help: dayjs \/ date-fns \/ Temporal\n/);
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

describe("plurals", () => {
  it("says one file, two files", async () => {
    const { getT } = await import("../../src/i18n");
    const { t } = getT("en");
    expect(t("issue.measure.copies", { count: 1 })).toMatch(/^1 set of identical files/);
    expect(t("issue.measure.copies", { count: 2 })).toMatch(/^2 sets of identical files/);
    expect(t("issue.measure.flatDirs", { count: 1, limit: 50 })).toMatch(/^1 directory holds/);
    expect(t("issue.measure.flatDirs", { count: 3, limit: 50 })).toMatch(/^3 directories hold/);
  });
});

describe("colors", () => {
  it("uses 24-bit color where the terminal says so, and the nearest of 256 elsewhere", async () => {
    const { createColorizer, supportsTruecolor } = await import("../../src/color");
    expect(createColorizer({ enabled: true, truecolor: true }).smell("x")).toBe("\u001b[38;2;225;80;80;1mx\u001b[0m");
    expect(createColorizer({ enabled: true, truecolor: false }).smell("x")).toBe("\u001b[38;5;167;1mx\u001b[0m");
    expect(createColorizer({ enabled: false }).smell("x")).toBe("x");
    expect(supportsTruecolor({ COLORTERM: "truecolor" })).toBe(true);
    expect(supportsTruecolor({ TERM: "xterm-256color" })).toBe(false);
  });
});

describe("a folder of repositories", () => {
  it("checks each repository as git sees it, in one report", async () => {
    const { mkdtempSync, mkdirSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "chous-repos-"));
    for (const repo of ["web", "api"]) {
      const root = join(dir, repo);
      mkdirSync(join(root, "build"), { recursive: true });
      spawnSync("git", ["init", "-q"], { cwd: root });
      writeFileSync(join(root, ".nvmrc"), "16\n");
      writeFileSync(join(root, ".gitignore"), "build/\n");
      writeFileSync(join(root, "build/out.js"), "x\n");
      spawnSync("git", ["add", "-f", ".gitignore", ".nvmrc", "build/out.js"], { cwd: root });
    }
    const r = runCli(["-l", "en", "--json"], dir);
    const paths = (JSON.parse(r.stdout).findings as Array<{ path: string }>).map((f) => f.path).sort();
    // Only a repository's own index knows build/out.js is committed.
    expect(paths).toEqual(["api/.nvmrc (Node 16)", "api/build/", "web/.nvmrc (Node 16)", "web/build/"]);
    const text = runCli(["-l", "en", "--no-color"], dir).stdout;
    expect(text.match(/× Node 16/g)).toHaveLength(1);
    expect(text).toContain("├─[web/.nvmrc]");
  });

  it("scan gives the same full JSON, every list in its details", async () => {
    const { mkdtempSync, mkdirSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "chous-scan-"));
    const root = join(dir, "app");
    mkdirSync(root);
    spawnSync("git", ["init", "-q"], { cwd: root });
    writeFileSync(join(root, "a.woff"), "x".repeat(5000));
    writeFileSync(join(root, "b.woff"), "x".repeat(5000));
    const report = JSON.parse(runCli(["scan", dir, "-l", "en", "--json"]).stdout);
    const copies = report.findings.find((f: { key: string }) => f.key === "issue.measure.copies");
    expect(copies.details).toEqual({ groups: [{ files: ["app/a.woff", "app/b.woff"], bytes: 5000 }] });
  });
});

