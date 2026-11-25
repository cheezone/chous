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

  it("dates every version it knows, and bounds older ones", () => {
    expect(eolDate("node", "18")).toBe("2025-04-30");
    expect(eolDate("node", "8")).toBe("2021-04-30");
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

  it("lets one test directory be, whatever its name, but not two", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chous-lint-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "t", type: "module", private: true }), "utf8");
    mkdirSync(join(dir, "tests"));
    writeFileSync(join(dir, "tests", "a.test.ts"), "", "utf8");
    expect((await lintWorkspace({ root: dir })).issues).toEqual([]);

    mkdirSync(join(dir, "test"));
    writeFileSync(join(dir, "test", "b.test.ts"), "", "utf8");
    const result = await lintWorkspace({ root: dir });
    expect(result.issues.map((i) => i.message)).toEqual([
      { key: "issue.twins.synonyms" },
    ]);
    expect(result.issues[0]?.ruleSource.taste).toBe("base");
  });
});
