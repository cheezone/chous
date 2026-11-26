import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { catalog } from "../../scripts/catalog";

describe("the catalogue of what chous knows", () => {
  for (const [lang, file] of [["en", "facts.md"], ["zh", "facts.zh.md"]] as const) {
    it(`docs/${file} matches the registry (pnpm run docs rewrites it)`, () => {
      expect(readFileSync(resolve(import.meta.dirname, "../../docs", file), "utf8")).toBe(catalog(lang));
    });
  }
});
