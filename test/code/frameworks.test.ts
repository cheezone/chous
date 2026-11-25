import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { lintWorkspace } from "../../src/rules/lint";
import { majorOf } from "../../src/taste/frameworks";

async function findings(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "chous-fw-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content, "utf8");
  }
  const result = await lintWorkspace({ root });
  return result.issues.map((i) => i.displayPath).sort();
}

const pkg = (deps: Record<string, string>) => JSON.stringify({ type: "module", dependencies: deps });

describe("majorOf", () => {
  it("reads the major of a range, nothing else", () => {
    expect([majorOf("^16.1.0"), majorOf("~4.0"), majorOf(">=15"), majorOf("latest"), majorOf("catalog:")]).toEqual([16, 4, 15, undefined, undefined]);
  });
});

describe("Next.js", () => {
  it("flags src/app shadowed by a root app/", async () => {
    expect(await findings({ "package.json": pkg({ next: "^15.0.0" }), "app/page.tsx": "", "src/app/page.tsx": "" })).toEqual(["src/app"]);
  });

  it("flags middleware from Next.js 16 on", async () => {
    expect(await findings({ "package.json": pkg({ next: "^16.0.0" }), "app/page.tsx": "", "middleware.ts": "" })).toEqual(["middleware.ts"]);
    expect(await findings({ "package.json": pkg({ next: "^15.0.0" }), "app/page.tsx": "", "middleware.ts": "" })).toEqual([]);
  });

  it("flags a capitalised router only when there is no lowercase one", async () => {
    expect(await findings({ "package.json": pkg({ next: "^15.0.0" }), "App/page.tsx": "" })).toEqual(["App"]);
    expect(await findings({ "package.json": pkg({ next: "^15.0.0" }), "app/page.tsx": "", "Pages/Home.tsx": "" })).toEqual([]);
  });
});

describe("Nuxt", () => {
  it("flags convention-only directories outside app/ in Nuxt 4", async () => {
    expect(
      await findings({
        "package.json": pkg({ nuxt: "^4.1.0" }),
        "app/app.vue": "",
        "pages/index.vue": "",
        "utils/factory.ts": "",
      }),
    ).toEqual(["pages"]);
  });

  it("leaves the old layout alone: no app/, a custom srcDir, or Nuxt 3", async () => {
    expect(await findings({ "package.json": pkg({ nuxt: "^4.1.0" }), "app.vue": "", "pages/index.vue": "" })).toEqual([]);
    expect(await findings({ "package.json": pkg({ nuxt: "^4.1.0" }), "nuxt.config.ts": "export default { srcDir: '.' }", "app/x.ts": "", "pages/index.vue": "" })).toEqual([]);
    expect(await findings({ "package.json": pkg({ nuxt: "^3.15.0" }), "app/x.ts": "", "pages/index.vue": "" })).toEqual(["package.json (Nuxt 3)"]); // past end of life, but not shadowed
  });

  it("flags capitalised convention directories", async () => {
    expect(await findings({ "package.json": pkg({ nuxt: "^4.1.0" }), "app/Pages/index.vue": "" })).toEqual(["app/Pages"]);
  });
});

describe.skipIf(process.platform !== "linux")("case collisions", () => {
  it("flags names that differ only in case, once per directory", async () => {
    expect(await findings({ "README.md": "", "Readme.md": "", "Docs/a.md": "", "docs/a.md": "" })).toEqual(["Readme.md", "docs"]);
  });
});
