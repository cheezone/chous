import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { declaredNotOurs } from "../../src/vfs/gitattributes";
import { lintWorkspace } from "../../src/rules/lint";

const JUNK = "\u0000\u0000\u0000\u0001Bud1";

async function findings(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "chous-attrs-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return (await lintWorkspace({ root })).issues.map((i) => i.displayPath).sort();
}

describe(".gitattributes", () => {
  it("reads linguist-vendored and linguist-generated as git matches attributes", () => {
    const declared = declaredNotOurs(new Map([
      [".gitattributes", "测试数据/** linguist-vendored\n*.pb.go linguist-generated=true\nthird_party/** linguist-vendored\nthird_party/ours/** -linguist-vendored\nlib linguist-vendored\n# comment linguist-vendored\n"],
      ["web/.gitattributes", "legacy/** linguist-vendored\n"],
      ["third_party/.gitattributes", "ours/kept/** linguist-vendored\n"],
    ]));
    expect(declared("测试数据/a.json")).toBe(true);
    expect(declared("api/v1/user.pb.go")).toBe(true);
    expect(declared("third_party/zlib/zlib.c")).toBe(true);
    expect(declared("third_party/ours/patch.c")).toBe(false);
    // A deeper file wins over a shallower one.
    expect(declared("third_party/ours/kept/a.c")).toBe(true);
    // Relative to the file that says it.
    expect(declared("web/legacy/a.js")).toBe(true);
    expect(declared("legacy/a.js")).toBeUndefined();
    // A directory pattern does not reach inside it: git's rule for attributes.
    expect(declared("lib/a.js")).toBeUndefined();
    expect(declared("src/index.ts")).toBeUndefined();
  });

  it("skips what the repository declares not its own, in any language, and checks what it takes back", async () => {
    expect(
      await findings({
        ".gitattributes": "测试数据/** linguist-vendored\nvendor/patched/** -linguist-vendored\n",
        "测试数据/.DS_Store": JUNK,
        "vendor/lib/.DS_Store": JUNK,
        "vendor/patched/.DS_Store": JUNK,
        "fixtures/.DS_Store": JUNK,
        "test/fixtures/.DS_Store": JUNK,
        "testdata/.DS_Store": JUNK,
      }),
    ).toEqual(["fixtures/.DS_Store", "vendor/patched/.DS_Store"]);
  });
});
