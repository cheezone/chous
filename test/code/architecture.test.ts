import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveTaste } from "../../src/taste";
import { DEPRECATED, NATIVE, SABOTAGED } from "../../src/taste/deps";
import { EOL, eolDate, hasEnded } from "../../src/taste/eol";
import { pinnedVersion } from "../../src/rules/validators/lifecycle";
import { createMemorySnapshot } from "../../src/vfs/snapshot";
import { lintWorkspace } from "../../src/rules/lint";

describe("taste resolution", () => {
  function project(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), "chous-taste-"));
    for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content, "utf8");
    return dir;
  }

  it("applies only the base taste to a bare repo", () => {
    expect(resolveTaste(project({ "README.md": "" })).ids).toEqual(["base"]);
  });

  it("stacks the JavaScript tastes", () => {
    expect(resolveTaste(project({ "package.json": "{}" })).ids).toEqual(["base", "js"]);
    expect(resolveTaste(project({ "package.json": "{}", "bun.lock": "" })).ids).toEqual(["base", "js", "bun"]);
    expect(resolveTaste(project({ "package.json": "{}", "wrangler.jsonc": "{}" })).ids).toEqual(["base", "js", "cloudflare"]);
  });

  it("tags every rule with the taste that produced it", () => {
    const { rules } = resolveTaste(project({ "package.json": "{}" }));
    expect(new Set(rules.map((r) => r.source.taste))).toEqual(new Set(["base", "js"]));
  });
});

describe("VFS snapshot", () => {
  it("matches globs in memory", () => {
    const snap = createMemorySnapshot("/proj", {
      "src": { "index.ts": "file", "util.ts": "file" },
      "README.md": "file",
      "docs": { "guide.md": "file" },
    });
    expect(snap.match("**/*.ts", { onlyFiles: true }).map((p) => p.replace(/\\/g, "/"))).toEqual(
      expect.arrayContaining([
        expect.stringContaining("src/index.ts"),
        expect.stringContaining("src/util.ts"),
      ]),
    );
    expect(snap.exists("README.md")).toBe(true);
    expect(snap.isDirectory("docs")).toBe(true);
    expect(snap.listDir("docs").map((e) => e.name)).toEqual(["guide.md"]);
  });
});

describe("end of life", () => {
  it("reads the version a project actually runs on", () => {
    expect(pinnedVersion("v16.20.0")).toBe("16.20");
    expect(pinnedVersion("^20")).toBe("20");
    expect(pinnedVersion("18.x")).toBe("18");
    expect(pinnedVersion("3.8.18")).toBe("3.8");
    expect(pinnedVersion(">=18")).toBeUndefined();
    expect(pinnedVersion("lts/*")).toBeUndefined();
  });

  it("dates exactly the versions it lists, and infers nothing", () => {
    expect(eolDate("node", "18")).toBe("2025-04-30");
    expect(eolDate("node", "8")).toBe("2019-12-31");
    expect(eolDate("node", "0.12")).toBeUndefined();
    expect(eolDate("python", "2.5")).toBeUndefined();
    expect(eolDate("node", "22")).toBeUndefined();
    expect(eolDate("python", "3.6")).toBe("2021-12-23");
    expect(eolDate("python", "3.10")).toBe("2026-10-01");
    expect(eolDate("python", "3.11")).toBeUndefined();
    expect(eolDate("nuxt", "3")).toBe("2026-07-31");
  });

  it("smells the day end of life comes, with no grace period and no change to chous", () => {
    expect(hasEnded("2026-07-31", "2026-07-30")).toBe(false);
    expect(hasEnded("2026-07-31", "2026-07-31")).toBe(true);
    expect(hasEnded(undefined, "2026-07-31")).toBe(false);
  });

  it("only lists dates that have already passed", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const product of Object.values(EOL)) {
      for (const { date } of product.versions) expect(date <= today).toBe(true);
    }
  });

  it("reads engines.node as a promise of compatibility, not a runtime", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chous-engines-"));
    const lint = async (node: string) => {
      writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "t", private: true, engines: { node } }), "utf8");
      return (await lintWorkspace({ root: dir, today: "2026-11-25" })).issues.map((i) => i.message.key);
    };
    expect(await lint("^16")).toEqual(["issue.lifecycle.declared"]);
    expect(await lint(">=14 <17")).toEqual(["issue.lifecycle.declared"]);
    expect(await lint(">=16")).toEqual([]);
    expect(await lint("^18 || ^22")).toEqual([]);
  });

  it("knows ESLint's end-of-life dates from its dependency", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chous-eslint-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "t", private: true, devDependencies: { eslint: "^8.57.0" } }), "utf8");
    const issues = (await lintWorkspace({ root: dir, today: "2026-11-25" })).issues.filter((i) => i.ruleKind === "lifecycle");
    expect(issues.map((i) => [i.displayPath, i.message.params?.date])).toEqual([["package.json (ESLint 8)", "2024-10-05"]]);
  });

  it("knows Electron and Angular from dependencies, and a Django pinned in requirements", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chous-eol-more-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "t", private: true, dependencies: { "@angular/core": "^17.3.0" }, devDependencies: { electron: "^28.1.0" } }), "utf8");
    writeFileSync(join(dir, "requirements.txt"), "Django==4.1.13\ndjangorestframework==3.14.0\n", "utf8");
    const issues = (await lintWorkspace({ root: dir, today: "2026-11-25" })).issues.filter((i) => i.ruleKind === "lifecycle");
    expect(issues.map((i) => [i.displayPath, i.message.key, i.message.params?.date]).sort()).toEqual([
      ["package.json (Angular 17)", "issue.lifecycle.unsupported", undefined],
      ["package.json (Electron 28)", "issue.lifecycle.ended", "2024-06-10"],
      ["requirements.txt (Django 4.1)", "issue.lifecycle.ended", "2023-12-01"],
    ]);
  });

  it("reads what CI jobs and dev containers run on, but not a matrix", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chous-ci-"));
    const write = (path: string, content: string) => {
      mkdirSync(join(dir, path, ".."), { recursive: true });
      writeFileSync(join(dir, path), content, "utf8");
    };
    write(".github/workflows/ci.yml", [
      "jobs:",
      "  test:",
      "    strategy:",
      "      matrix:",
      "        node: [14, 22]",
      "    steps:",
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: ${{ matrix.node }}",
      "  lint:",
      "    container: node:16-alpine",
      "    steps:",
      "      - uses: actions/setup-python@v5",
      "        with:",
      "          python-version: '3.8'",
      "      - name: unrelated",
      "        with:",
      "          node-version: 12",
      "",
    ].join("\n"));
    write(".devcontainer/devcontainer.json", JSON.stringify({
      image: "mcr.microsoft.com/devcontainers/typescript-node:1-18-bullseye",
      features: { "ghcr.io/devcontainers/features/python:1": { version: "3.7" } },
    }));
    const issues = (await lintWorkspace({ root: dir, today: "2026-11-25" })).issues.filter((i) => i.ruleKind === "lifecycle");
    expect(issues.map((i) => i.displayPath).sort()).toEqual([
      ".devcontainer/devcontainer.json (Node 18)",
      ".devcontainer/devcontainer.json (Python 3.7)",
      ".github/workflows/ci.yml (Node 16)",
      ".github/workflows/ci.yml (Python 3.8)",
    ]);
  });

  it("leaves a Django range alone", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chous-django-"));
    writeFileSync(join(dir, "requirements.txt"), "Django>=4.1,<6\n", "utf8");
    expect((await lintWorkspace({ root: dir, today: "2026-11-25" })).issues.filter((i) => i.ruleKind === "lifecycle")).toEqual([]);
  });

  it("smells a framework the day after it ends", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chous-eol-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "t", type: "module", dependencies: { nuxt: "^3.12.0" } }), "utf8");
    const before = (await lintWorkspace({ root: dir, today: "2026-07-30" })).issues.filter((i) => i.ruleKind === "lifecycle");
    expect(before).toEqual([]);
    const after = (await lintWorkspace({ root: dir, today: "2026-08-01" })).issues.filter((i) => i.ruleKind === "lifecycle");
    expect(after.map((i) => [i.message.key, i.verdict, i.value])).toEqual([["issue.lifecycle.ended", "smell", "modernity"]]);
  });
});

describe("obsolete dependency list", () => {
  it("names each package once", () => {
    const names = [...NATIVE, ...DEPRECATED, ...SABOTAGED].flatMap((d) => d.names);
    expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
  });

});

describe("lint pipeline integration", () => {
  it("lets a committed .env be, as Vite and Next.js document, but not .env.local", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chous-env-"));
    writeFileSync(join(dir, ".env"), "PUBLIC_URL=/\n", "utf8");
    expect((await lintWorkspace({ root: dir })).issues).toEqual([]);
    writeFileSync(join(dir, ".env.production.local"), "SECRET=1\n", "utf8");
    expect((await lintWorkspace({ root: dir })).issues.map((i) => i.displayPath)).toEqual([".env.production.local"]);
  });

  it("does not read the words in names: test/ beside tests/ is the project's business", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chous-lint-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "t", type: "module", private: true }), "utf8");
    mkdirSync(join(dir, "tests"));
    writeFileSync(join(dir, "tests", "a.test.ts"), "", "utf8");
    expect((await lintWorkspace({ root: dir })).issues).toEqual([]);

    mkdirSync(join(dir, "test"));
    writeFileSync(join(dir, "test", "b.test.ts"), "", "utf8");
    expect((await lintWorkspace({ root: dir })).issues).toEqual([]);
  });
});
