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

describe("leftovers", () => {
  it("flags docs named after an event: any name at the root, SCREAMING_CASE deeper", async () => {
    expect(
      await findings({
        "README.md": "",
        "CHANGELOG.md": "",
        "ROADMAP.md": "",
        "ARCHITECTURE.md": "",
        "IMPLEMENTATION_COMPLETE.md": "",
        "FIXES_SUMMARY.md": "",
        "docs/BUGFIX_LOGIN.md": "",
        "docs/report-format.md": "",
        "docs/adr/ADR-001-IMPLEMENTATION.md": "",
      }),
    ).toEqual(["FIXES_SUMMARY.md", "IMPLEMENTATION_COMPLETE.md", "docs/BUGFIX_LOGIN.md"]);
  });

  it("flags one-off scripts at the root, unless something names them", async () => {
    expect(
      await findings({
        "package.json": JSON.stringify({ type: "module", files: ["test-utils.js"] }),
        "test-utils.js": "",
        "fix_login.sh": "",
        "scripts/fix_login.sh": "",
      }),
    ).toEqual(["fix_login.sh"]);
  });

  it("flags hand-made backups and release binaries, but not fixtures or vendored code", async () => {
    expect(
      await findings({
        "package.json.bak": "",
        "public/logo (1).png": "",
        "app-release.apk": "",
        "vendor/serde/Cargo.toml.orig": "",
        "test/fixtures/setup.exe": "",
      }),
    ).toEqual(["app-release.apk", "package.json.bak", "public/logo (1).png"]);
  });

  it("warns once when the root fills up with hand-written docs", async () => {
    const docs = Object.fromEntries(["A", "B", "C", "D", "E", "F"].map((n) => [`GUIDE_${n}.md`, ""]));
    expect(await findings(docs)).toEqual(["*.md"]);
    delete docs["GUIDE_F.md"];
    expect(await findings(docs)).toEqual([]);
  });

  it("flags personal files their tools say to keep out of git", async () => {
    expect(await findings({ "CLAUDE.local.md": "", ".claude/settings.local.json": "{}", ".claude/settings.json": "{}", "android/local.properties": "" }))
      .toEqual([".claude/settings.local.json", "CLAUDE.local.md", "android/local.properties"]);
  });
});

describe("twins", () => {
  it("flags a plural next to its singular", async () => {
    expect(await findings({ "plugin/a.ts": "", "plugins/b.ts": "", "src/a.ts": "" })).toEqual(["plugin/"]);
  });
});
