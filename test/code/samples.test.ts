import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { lintWorkspace } from "../../src/rules/lint";

const SAMPLES = resolve(import.meta.dirname, "../fixtures/samples");

/**
 * Real projects, and every statement chous makes about them. A change here is
 * a change in what chous claims about real code: read the diff before
 * accepting it (`vitest -u`). A wrong fact is a false positive; a taste the
 * project does not share is not.
 */
describe("real-world samples", () => {
  for (const name of ["project-layout", "nuxt.com", "pythondotorg", "ai-chatbot"]) {
    it(name, async () => {
      const result = await lintWorkspace({ root: resolve(SAMPLES, name), today: "2026-11-25" });
      const claims = result.issues.map((i) => `${i.verdict} ${i.value} ${i.displayPath} ${i.message.key} ${JSON.stringify(i.message.params ?? {})}`).sort();
      expect(claims).toMatchSnapshot();
    });
  }
});
