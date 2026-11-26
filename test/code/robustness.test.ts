/**
 * What a hostile repository can throw at chous: devices behind symlinks, links
 * out of the root, names and manifests built to crash a parser, inputs built to
 * make a regex backtrack. Each must end quickly, without a crash, and say only
 * what is true. Found by a red-team pass; kept here so they stay fixed.
 */
import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { lintWorkspace } from "../../src/rules/lint";
import { renderReport } from "../../src/rules/report";
import { parseJsonc } from "../../src/facts/kit";
import { getT } from "../../src/i18n";
import { createColorizer } from "../../src/color";

const posix = process.platform !== "win32";

function project(files: Record<string, string>, links: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), "chous-hostile-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  for (const [path, target] of Object.entries(links)) symlinkSync(target, join(root, path));
  return root;
}

async function timed(root: string) {
  const start = performance.now();
  const result = await lintWorkspace({ root });
  return { result, ms: performance.now() - start };
}

describe.runIf(posix)("devices and links", () => {
  it("never reads a device behind a symlink (/dev/zero, /dev/urandom)", async () => {
    const { ms } = await timed(project({}, { "README.md": "/dev/zero", "main.go": "/dev/urandom", "tsconfig.json": "/dev/zero" }));
    expect(ms).toBeLessThan(5000);
  });

  it("never walks a symlink out of the root, and reports nothing found through one", async () => {
    const outside = project({ ".DS_Store": "\u0000\u0000\u0000\u0001Bud1" });
    const { result, ms } = await timed(project({ "README.md": "# a" }, { root: "/", "docs-link": outside }));
    expect(ms).toBeLessThan(5000);
    expect(result.issues.map((i) => i.displayPath)).toEqual([]);
  });

  it("takes a backslash in a name as part of the name, not a way up", async () => {
    const { result } = await timed(project({ "..\\evil": "x" }));
    expect(result.root).toBeTruthy();
  });
});

describe("manifests built to crash a parser", () => {
  it("lints past a workspace that lists packages outside the root", async () => {
    const root = project({ "proj/package.json": JSON.stringify({ name: "r", private: true }), "proj/pnpm-workspace.yaml": "packages:\n  - '../*'\n", "sib/package.json": JSON.stringify({ name: "sib" }) });
    await expect(lintWorkspace({ root: join(root, "proj") })).resolves.toBeTruthy();
  });

  it("reads a package.json of null, [] or a string as holding nothing", async () => {
    for (const body of ["null", "[]", '"x"', "1"]) await expect(lintWorkspace({ root: project({ "package.json": body }) })).resolves.toBeTruthy();
  });

  it("does not recurse into a deeply nested tsconfig value or dependency", async () => {
    const deep = (n: number) => `${"[".repeat(n)}${"]".repeat(n)}`;
    const root = project({
      "tsconfig.json": `{"compilerOptions":{"baseUrl":${deep(5000)}}}`,
      "package.json": `{"name":"r","private":true,"dependencies":{"x":${deep(20000)}}}`,
      "pnpm-workspace.yaml": "packages:\n  - a\n",
      "a/package.json": JSON.stringify({ name: "a", dependencies: { x: "^1.0.0" } }),
    });
    const { result } = await timed(root);
    expect(result.issues.find((i) => i.message.key === "issue.contract.tsconfigDeprecated")?.message.params).toEqual({ options: "baseUrl: […]" });
  });

  it("expands Dockerfile ARGs only where an image is named, and only short ones", async () => {
    const { ms } = await timed(project({ Dockerfile: `ARG V=${"a".repeat(1_000_000)}\nFROM node:${"$V".repeat(600)}\n` }));
    expect(ms).toBeLessThan(5000);
  });

  it("does not count every major in an absurd engines range", async () => {
    const { ms } = await timed(project({ "package.json": JSON.stringify({ name: "r", private: true, engines: { node: "0 - 99999999999" } }) }));
    expect(ms).toBeLessThan(5000);
  });
});

describe("inputs built to make a regex backtrack", () => {
  const blank = "\n".repeat(200_000);
  it("stays linear on long runs of blank lines and spaces", async () => {
    const root = project({
      "a.kt": blank,
      "Cargo.toml": blank,
      Dockerfile: blank,
      "requirements.txt": `django${" ".repeat(200_000)}x`,
      "composer.json": JSON.stringify({ autoload: { "psr-4": { "App\\": "app/" } } }),
      "app/A.php": blank,
      "tsconfig.json": '"\\'.repeat(100_000),
    });
    const { ms } = await timed(root);
    expect(ms).toBeLessThan(5000);
  });

  it("parses JSON with comments and trailing commas, and gives up on broken text quickly", () => {
    expect(parseJsonc('{\n  // a comment\n  "url": "http://x", /* block */ "a": [1, 2,],\n}')).toEqual({ url: "http://x", a: [1, 2] });
    const start = performance.now();
    expect(parseJsonc('"\\'.repeat(100_000))).toBeUndefined();
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it("keeps a .gitignore pattern that stacks ** from making every path slow", async () => {
    const deep = "a/".repeat(40);
    const { ms } = await timed(project({ ".gitignore": `${"**/a/".repeat(10)}b\n`, [`${deep}c`]: "x" }));
    expect(ms).toBeLessThan(5000);
  });
});

describe("names", () => {
  it("does not mistake a # in a directory name for a finding's marker", async () => {
    const { result } = await timed(project({ ".gitignore": "foo\n", "foo#bar/.DS_Store": "\u0000\u0000\u0000\u0001Bud1" }));
    expect(result.issues.map((i) => i.displayPath)).toEqual(["foo#bar/.DS_Store"]);
  });

  it("prints control characters in names escaped, so a name cannot erase or fake a line", async () => {
    const name = "x\u001b[2K\u001b[1Aall good";
    const { result } = await timed(project({ [name]: "a", [`${name}.bak`]: "a" }));
    const text = renderReport(result, { verbose: true, color: createColorizer({ enabled: false }), t: getT("en").t });
    expect(text).not.toContain("\u001b");
    expect(text).toContain("\\x1b[2K");
  });
});
