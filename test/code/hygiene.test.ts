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
        "api/target/CACHEDIR.TAG": "",
        "api/target/debug/app": "",
        "web/Cargo.toml": "",
        "web/target/notes.md": "",
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

  it("puts files named like logs up for review: a name cannot tell a program's log from a test's input", async () => {
    expect(await claims({ ".kotlin/errors/errors-1777453046994.log": "e: oops", "tests/resources/access-logs/fake_logs.log": "1.2.3.4 - -" })).toEqual([
      "review .kotlin/errors/errors-1777453046994.log",
      "review tests/resources/access-logs/fake_logs.log",
    ]);
  });

  it("does not let a contract name's prefix carry any doc to the root", async () => {
    const docs = ["README.md", "README.zh-CN.md", "README_EN.md", "LICENSE-MIT", "LICENSE_NOTICE", "CHANGELOG.en-US.md"];
    const prefixed = ["README_IMPLEMENTATION_COMPLETE.md", "AGENTS-handoff.md", "CLAUDE_SESSION_NOTES.md", "SECURITY_AUDIT_REPORT.md"];
    const found = await claims(Object.fromEntries([...docs, ...prefixed].map((n) => [n, "# x"])));
    expect(found).toContain("smell ./");
    expect(found.filter((c) => /README\.zh|README_EN|LICENSE|CHANGELOG/.test(c))).toEqual([]);
  });

  it("knows a copy beside its original in the ways systems name them, docs and folders too", async () => {
    expect(
      await claims({
        "src/index.ts": "x",
        "src/index - Copy.ts": "x",
        "src/Copy of index.ts": "x",
        "src/index.old.ts": "x",
        "src/index_backup.ts": "x",
        "icons/cloud.svg": "<svg>cloud</svg>",
        "icons/cloud-backup.svg": "<svg>cloud with an arrow</svg>",
        "src/index.ts.bak2": "x",
        "src/index copy 2.ts": "x",
        "docs/guide.md": "# g",
        "docs/guide copy.md": "# g",
        "lib/a.ts": "x",
        "lib copy/a.ts": "x",
      }),
    ).toEqual([
      "smell docs/guide copy.md",
      "smell lib copy/",
      "smell src/Copy of index.ts",
      "smell src/index - Copy.ts",
      "smell src/index copy 2.ts",
      "smell src/index.old.ts",
      "smell src/index.ts.bak2",
      "smell src/index_backup.ts",
    ]);
  });

  it("knows OS junk by content whatever the case of its name, and macOS AppleDouble files", async () => {
    expect(
      await claims({
        "Desktop.ini": "[.ShellClassInfo]\r\nIconResource=x\r\n",
        "._README.md": "\u0000\u0005\u0016\u0007\u0000\u0002\u0000\u0000Mac OS X",
        "._config.ts": "export const notAppleDouble = 1;\n",
      }),
    ).toEqual(["smell ._README.md", "smell Desktop.ini"]);
  });

  it("sees a deprecated package behind an npm alias, and a style behind a leading underscore", async () => {
    const found = await claims({
      "package.json": JSON.stringify({ name: "a", private: true, dependencies: { http: "npm:request@2", dates: "npm:moment@2.30.1" } }),
      "src/_fooBar.ts": "",
      "src/_foo-bar.ts": "",
    });
    expect(found).toEqual(expect.arrayContaining(["smell package.json (request)", "smell package.json (moment)", "smell src/"]));
  });

  it("knows a built executable without an extension, and more installers, by their headers", async () => {
    expect(
      await claims({
        "server": "\u007fELF\u0002\u0001\u0001\u0000",
        "core": "\u007fELF\u0002\u0001\u0001\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0004\u0000",
        "deploy": "#!/bin/sh\necho deploy\n",
        "Installer.pkg": "xar!\u0000\u001c",
        "notes.pkg": "not an installer",
        "ext.vsix": "PK\u0003\u0004rest",
      }),
    ).toEqual(["review server", "smell Installer.pkg", "smell core", "smell ext.vsix"].sort());
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

  it("reads a binary's format from its bytes: installers smell, executables are for review", async () => {
    expect(
      await claims({
        "app-release.apk": "PK\u0003\u0004rest",
        "renamed.apk": "just text",
        "tools/helper.exe": "MZ\u0090\u0000",
        "app/src/main/jniLibs/arm64-v8a/libcore.so": "\u007fELF\u0002",
        "test/fixtures/setup.exe": "MZ",
        "vendor/lib.dll": "MZ",
      }),
    ).toEqual(["review app/src/main/jniLibs/arm64-v8a/libcore.so", "review tools/helper.exe", "smell app-release.apk"]);
  });

  it("knows OS junk by what the OS writes into it", async () => {
    const dsStore = `\0\0\0\u0001Bud1${"\0".repeat(16)}`;
    expect(
      await claims({ ".DS_Store": dsStore, "test/cases/desktop.ini": ".{ .name = .desktop }", "assets/desktop.ini": "[.ShellClassInfo]\nIconResource=x" }),
    ).toEqual(["smell .DS_Store", "smell assets/desktop.ini"]);
  });

  it("flags personal files their tools say to keep out of git", async () => {
    const header = "## This file must *NOT* be checked into Version Control Systems,\nsdk.dir=/x\n";
    expect(await findings({ "CLAUDE.local.md": "", ".claude/settings.local.json": "{}", ".claude/settings.json": "{}", "android/local.properties": header, "config/local.properties": "port=1" }))
      .toEqual([".claude/settings.local.json", "CLAUDE.local.md", "android/local.properties"]);
  });

  it("smells a CLAUDE.md past the 200 lines Claude Code's docs target", async () => {
    expect(await claims({ "CLAUDE.md": "x\n".repeat(200), "packages/a/CLAUDE.md": "x\n".repeat(201) })).toEqual(["smell packages/a/CLAUDE.md"]);
  });

  it("puts a series of per-version notes and a pile of work records up for review", async () => {
    const notes = Object.fromEntries(["v2.0.1", "v2.0.2", "v2.0.3", "v2.0.4", "v2.1.0"].map((v) => [`.github/release-notes/${v}.md`, ""]));
    const reports = Object.fromEntries(["a", "b", "c", "d", "e"].map((n) => [`docs/reports/${n}.md`, ""]));
    expect(await claims({ ...notes, ...reports, "docs/guide/1.0.md": "" })).toEqual(["review .github/release-notes/", "review docs/reports/"]);
  });
});

describe("twins", () => {
  it("warns when one directory names files two ways, not for PascalCase or tool-chosen names; Vue's own rule takes .vue files", async () => {
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
    ).toEqual(["src/components/UserCard.vue", "src/composables/"]);
  });

  it("compares names within one language, and reads Go's _test and _GOOS_GOARCH as the go command's, not a style", async () => {
    expect(
      await findings({
        "contribution_stats.py": "",
        "i18next-parser.config.ts": "",
        "relay/minimax/relay-minimax.go": "",
        "relay/minimax/adaptor_test.go": "",
        "relay/minimax/poll_linux_amd64.go": "",
        "relay/aws/relay-aws.go": "",
        "relay/aws/relay_aws_test.go": "",
      }),
    ).toEqual(["relay/aws/"]);
  });

  it("flags editor files their makers call personal or legacy", async () => {
    expect(await findings({ ".idea/workspace.xml": "", ".idea/vcs.xml": "", ".cursorrules": "" })).toEqual([".cursorrules", ".idea/workspace.xml"]);
  });

  it("finds one concept under two names in any directory, whatever the case, and the two Unicode forms of one name", async () => {
    expect(
      await findings({
        "src/test/a.ts": "",
        "src/Tests/b.ts": "",
        "lib/category/a.ts": "",
        "lib/categories/b.ts": "",
        "lib/box/a.ts": "",
        "lib/boxes/b.ts": "",
        "docs/caf\u00e9.md": "# a",
        "docs/cafe\u0301.md": "# b",
      }),
    ).toEqual(expect.arrayContaining(["src/test/ + Tests/", "lib/category/", "lib/box/", "docs/caf\u00e9.md"]));
  });

  it("flags a plural next to its singular", async () => {
    expect(await findings({ "plugin/a.ts": "", "plugins/b.ts": "", "src/a.ts": "" })).toEqual(["plugin/"]);
  });
});

describe("workspace lists", () => {
  it("lets package.json and pnpm-workspace.yaml both list packages, as long as they agree", async () => {
    const files = (json: string[]) => ({
      "package.json": JSON.stringify({ private: true, workspaces: json }),
      "pnpm-workspace.yaml": "packages:\n  - 'packages/*'\n",
      "packages/a/package.json": JSON.stringify({ name: "a" }),
    });
    expect(await claims(files(["packages/*"]))).toEqual([]);
    expect(await claims(files(["packages/*", "apps/*"]))).toEqual(["smell package.json (workspaces)"]);
  });
});
