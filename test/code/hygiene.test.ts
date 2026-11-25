import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { lintWorkspace } from "../../src/rules/lint";

async function findings(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "chous-leaks-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content, "utf8");
  }
  const result = await lintWorkspace({ root });
  return result.issues.map((i) => i.displayPath).sort();
}

describe("committed build output", () => {
  it("flags output that is not gitignored", async () => {
    expect(
      await findings({
        "package.json": "{\"type\":\"module\"}",
        "dist/index.js": "",
        "node_modules/.package-lock.json": "{}",
        "api/Cargo.toml": "",
        "api/target/debug/app": "",
      }),
    ).toEqual(["api/target/", "dist/", "node_modules/"]);
  });

  it("trusts .gitignore, GitHub Actions and hand-written fixtures", async () => {
    expect(
      await findings({
        ".gitignore": "dist\n",
        "package.json": "{\"type\":\"module\"}",
        "dist/index.js": "",
        "action/action.yml": "",
        "action/package.json": "{\"type\":\"module\"}",
        "action/dist/index.js": "",
        "test/fixtures/node_modules/foo/index.js": "",
        "tasks/coverage/Cargo.toml": "",
      }),
    ).toEqual([]);
  });
});

describe("agent work logs", () => {
  it("flags root docs named after an event, and nothing else", async () => {
    expect(
      await findings({
        "README.md": "",
        "CHANGELOG.md": "",
        "ROADMAP.md": "",
        "ARCHITECTURE.md": "",
        "IMPLEMENTATION_COMPLETE.md": "",
        "FIXES_SUMMARY.md": "",
        "docs/BUGFIX_LOGIN.md": "",
      }),
    ).toEqual(["FIXES_SUMMARY.md", "IMPLEMENTATION_COMPLETE.md"]);
  });
});
