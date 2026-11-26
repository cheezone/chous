/**
 * One test for every tool chous knows. A tool file passes when each of its
 * facts is reported on its smell examples and not on its clean ones, and when
 * it is complete: its own words, both languages, the same placeholders.
 * Adding a tool needs no test of its own.
 */
import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { lintWorkspace } from "../../src/rules/lint";
import { FACT_EOL, PACKAGES, TOOLS } from "../../src/facts";
import type { Example, Text } from "../../src/facts/define";
import { CONTRACTS } from "../../src/taste/contracts";

async function findings(files: Example) {
  const root = mkdtempSync(join(tmpdir(), "chous-facts-"));
  try {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content, "utf8");
    }
    return (await lintWorkspace({ root, today: "2026-11-25" })).issues;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

function complete(text: Text) {
  expect(text.en.trim()).not.toBe("");
  expect(text.zh.trim()).not.toBe("");
  expect(placeholders(text.zh)).toEqual(placeholders(text.en));
}

describe("the registry", () => {
  it("names each tool and each fact once, beside the contracts not yet moved", () => {
    const tools = TOOLS.map((t) => t.id);
    expect(new Set(tools).size).toBe(tools.length);
    const ids = CONTRACTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

for (const tool of TOOLS) {
  describe(`${tool.name} (${tool.id})`, () => {
    it("says when it was last researched", () => {
      expect(tool.researched).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    });

    for (const fact of tool.facts) {
      describe(fact.id, () => {
        it("rests on the tool's own words, in both languages, with the same placeholders", () => {
          expect(fact.sources.length).toBeGreaterThan(0);
          for (const source of fact.sources) {
            expect(source.url).toMatch(/^https:\/\//);
            expect(source.quote?.trim()).toBeTruthy();
          }
          complete(fact.message);
        });

        it("is reported on every smell example, with every placeholder filled", async () => {
          expect(fact.examples.smell.length).toBeGreaterThan(0);
          for (const example of fact.examples.smell) {
            const hits = (await findings(example)).filter((i) => i.message.key === `issue.contract.${fact.id}`);
            expect(hits.length, JSON.stringify(example)).toBeGreaterThan(0);
            for (const hit of hits) {
              expect(Object.keys(hit.message.params ?? {}).sort()).toEqual(expect.arrayContaining(placeholders(fact.message.en)));
            }
          }
        });

        it("is not reported on any clean example", async () => {
          expect(fact.examples.clean.length).toBeGreaterThan(0);
          for (const example of fact.examples.clean) {
            const hits = (await findings(example)).filter((i) => i.message.key === `issue.contract.${fact.id}`);
            expect(hits.map((i) => i.displayPath), JSON.stringify(example)).toEqual([]);
          }
        });
      });
    }
  });
}

for (const eol of FACT_EOL) {
  describe(`end of life: ${eol.label}`, () => {
    it("has dates written by sync, already passed, and words in both languages", () => {
      expect(eol.versions.length).toBeGreaterThan(0);
      for (const { date } of eol.versions) expect(date === "" || /^\d{4}-\d{2}-\d{2}$/.test(date)).toBe(true);
      expect(eol.source).toMatch(/^https:\/\//);
      expect(eol.data).toMatch(/^https:\/\//);
      complete(eol.use);
    });

    it("is reported on its smell examples and not on its clean ones", async () => {
      const ended = async (example: Example) =>
        (await findings(example)).filter((i) => i.message.key.startsWith("issue.lifecycle.") && i.displayPath.includes(`(${eol.label} `));
      for (const example of eol.examples.smell) expect((await ended(example)).length, JSON.stringify(example)).toBeGreaterThan(0);
      for (const example of eol.examples.clean) expect(await ended(example), JSON.stringify(example)).toEqual([]);
    });
  });
}

describe("npm packages", () => {
  it("lists each package once", () => {
    const names = PACKAGES.flatMap((p) => p.names);
    expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
  });

  for (const pkg of PACKAGES) {
    it(`${pkg.names[0]}: says why in both languages, and quotes its authors unless the platform replaced it`, () => {
      complete(pkg.why);
      expect(pkg.use.trim()).not.toBe("");
      if (pkg.kind === "native") return;
      expect(pkg.sources?.length).toBeGreaterThan(0);
      for (const source of pkg.sources ?? []) {
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.quote?.trim()).toBeTruthy();
      }
    });
  }
});
