import { describe, expect, it } from "vitest";
import ignore from "ignore";
import { gitignoreMatcher } from "../../src/vfs/gitignore";

/** A small deterministic generator, so a failure can be replayed. */
function random(seed: number) {
  return () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
}

describe("gitignore matcher", () => {
  it("answers exactly as the ignore library does", () => {
    const next = random(7);
    const pick = <T>(xs: T[]) => xs[Math.floor(next() * xs.length)]!;
    const words = ["src", "dist", "Build", "foo", "foo-bar", "a1", "log", "tmp", "node_modules", "café"];
    const part = () => pick([pick(words), `*${pick(words)}`, `${pick(words)}*`, "*", "**", "?oo", `[ab]${pick(words)}`, `\\#${pick(words)}`]);
    const pattern = () => {
      const segs = Array.from({ length: 1 + Math.floor(next() * 3) }, part).join("/");
      return `${pick(["", "", "!", "/"])}${segs}${pick(["", "", "/", ".log", ".tmp"])}`;
    };
    const path = () => Array.from({ length: 1 + Math.floor(next() * 4) }, () => `${pick(words)}${pick(["", "", ".log", ".tmp", "1", "x"])}`).join("/");
    let matched = 0;
    for (let round = 0; round < 40; round++) {
      const patterns = Array.from({ length: 1 + Math.floor(next() * 30) }, pattern);
      const reference = ignore().add(patterns);
      const indexed = gitignoreMatcher(patterns);
      for (let i = 0; i < 200; i++) {
        const rel = path();
        expect(indexed.ignores(rel), `${rel} against ${JSON.stringify(patterns)}`).toBe(reference.ignores(rel));
        if (reference.ignores(rel)) matched++;
      }
    }
    // Enough paths are ignored for the comparison to mean something.
    expect(matched).toBeGreaterThan(1000);
  });

  it("stays fast with a .gitignore of 20 000 lines", () => {
    const matcher = gitignoreMatcher(Array.from({ length: 20_000 }, (_, i) => `ignored-${i}/**/*.tmp`));
    const start = performance.now();
    for (let i = 0; i < 20_000; i++) matcher.ignores(`src/m${i % 200}/f${i}.ts`);
    expect(matcher.ignores("ignored-7/x/y.tmp")).toBe(true);
    expect(performance.now() - start).toBeLessThan(5_000);
  });
});
