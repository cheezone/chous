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

/** `smell <path>` / `review <path>`: what chous knows, per finding. */
async function claims(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "chous-claims-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content, "latin1");
  }
  const result = await lintWorkspace({ root });
  return result.issues.map((i) => `${i.verdict} ${i.displayPath}`).sort();
}

describe("committed build output", () => {
  it("flags output that is not gitignored", async () => {
    expect(
      await findings({
        "package.json": "{\"type\":\"module\",\"private\":true,\"scripts\":{\"build\":\"tsdown\"}}",
        "fixture-pkg/package.json": "{\"main\":\"dist/index.js\"}",
        "fixture-pkg/dist/index.js": "",
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
        "package.json": "{\"type\":\"module\",\"private\":true}",
        "dist/index.js": "",
        "action/action.yml": "",
        "action/package.json": "{\"type\":\"module\",\"private\":true}",
        "action/dist/index.js": "",
        "test/fixtures/node_modules/foo/index.js": "",
        "tasks/coverage/Cargo.toml": "",
      }),
    ).toEqual([]);
  });
});

describe("leftovers", () => {
  it("puts docs named like work logs up for review, and never ADRs or book tables of contents", async () => {
    expect(
      await claims({
        "README.md": "",
        "IMPLEMENTATION_COMPLETE.md": "",
        "docs/BUGFIX_LOGIN.md": "",
        "docs/report-format.md": "",
        "docs/adr/ADR-001-IMPLEMENTATION.md": "",
        "book/src/SUMMARY.md": "",
      }),
    ).toEqual(["review IMPLEMENTATION_COMPLETE.md", "review docs/BUGFIX_LOGIN.md"]);
  });

  it("smells a crowded root, whatever the docs are, counting only what has no claim to the root", async () => {
    const root = { "README.md": "", "LICENSE": "", "CHANGELOG.md": "", "CONTRIBUTING.md": "", "SECURITY.md": "", "AGENTS.md": "", "CLAUDE.md": "x" };
    const docs = { "ARCHITECTURE.md": "", "DESIGN.md": "", "API.md": "" };
    expect(await claims({ ...root, ...docs })).toEqual([]);
    expect(await claims({ ...root, ...docs, "ROADMAP.md": "" })).toEqual(["smell ./"]);
  });

  it("merges root work logs into one review", async () => {
    expect(await claims({ "FIXES_SUMMARY.md": "", "IMPLEMENTATION_COMPLETE.md": "" })).toEqual(["review ./"]);
  });

  it("puts unreferenced one-off scripts up for review", async () => {
    expect(
      await claims({
        "package.json": JSON.stringify({ type: "module", private: true, files: ["test-utils.js"] }),
        "README.md": "Run `./check-env.sh` first.",
        "check-env.sh": "",
        "test-utils.js": "",
        "fix_login.sh": "",
        "scripts/fix_login.sh": "",
      }),
    ).toEqual(["review fix_login.sh"]);
  });

  it("smells a copy next to its original; a lone backup is for review", async () => {
    expect(
      await claims({
        "package.json": "{}",
        "package.json.bak": "",
        "public/logo.png": "",
        "public/logo (1).png": "",
        "old-config.js.orig": "",
        "vendor/serde/Cargo.toml.orig": "",
        "test/fixtures/x.bak": "",
      }),
    ).toEqual(["review old-config.js.orig", "smell package.json.bak", "smell public/logo (1).png"]);
  });

  it("smells built binaries anywhere but test data and vendored code", async () => {
    expect(
      await claims({ "app-release.apk": "", "tools/helper.exe": "", "test/fixtures/setup.exe": "", "vendor/lib.dll": "" }),
    ).toEqual(["smell app-release.apk", "smell tools/helper.exe"]);
  });

  it("knows OS junk by what the OS writes into it", async () => {
    const dsStore = `\0\0\0\u0001Bud1${"\0".repeat(16)}`;
    expect(
      await claims({ ".DS_Store": dsStore, "test/cases/desktop.ini": ".{ .name = .desktop }", "assets/desktop.ini": "[.ShellClassInfo]\nIconResource=x" }),
    ).toEqual(["smell .DS_Store", "smell assets/desktop.ini"]);
  });

  it("flags personal files their tools say to keep out of git", async () => {
    expect(await findings({ "CLAUDE.local.md": "", ".claude/settings.local.json": "{}", ".claude/settings.json": "{}", "android/local.properties": "" }))
      .toEqual([".claude/settings.local.json", "CLAUDE.local.md", "android/local.properties"]);
  });
});

describe("twins", () => {
  it("warns when one directory names files two ways, not for PascalCase or tool-chosen names", async () => {
    expect(
      await findings({
        "src/composables/asyncData.ts": "",
        "src/composables/lazy-hydration.ts": "",
        "src/composables/index.ts": "",
        "src/components/UserCard.vue": "",
        "src/components/user-list.vue": "",
        "src/vite-env.d.ts": "",
        "src/routeTree.gen.ts": "",
        "src/main-entry.ts": "",
        "test/fixtures/fooBar.ts": "",
        "test/fixtures/foo-baz.ts": "",
      }),
    ).toEqual(["src/composables/"]);
  });

  it("flags editor files their makers call personal or legacy", async () => {
    expect(await findings({ ".idea/workspace.xml": "", ".idea/vcs.xml": "", ".cursorrules": "" })).toEqual([".cursorrules", ".idea/workspace.xml"]);
  });

  it("flags a plural next to its singular", async () => {
    expect(await findings({ "plugin/a.ts": "", "plugins/b.ts": "", "src/a.ts": "" })).toEqual(["plugin/"]);
  });
});
