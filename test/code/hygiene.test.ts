import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
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

  it("knows output by what its tool writes into it, whatever the directory is called", async () => {
    const tag = "Signature: 8a477f597d28d172789f06886806bc55\n# This file is a cache directory tag created by pytest.\n";
    expect(
      await findings({
        ".pytest_cache/CACHEDIR.TAG": tag,
        ".pytest_cache/v/cache/nodeids": "[]",
        "env/pyvenv.cfg": "home = /usr/bin\ninclude-system-site-packages = false\n",
        "env/bin/activate": "",
        "env/lib/.ruff_cache/CACHEDIR.TAG": tag,
        "cmake-build-debug/CMakeCache.txt": "# This is the CMakeCache file.\n# For build in directory: /x\n",
        "cmake-build-debug/Makefile": "",
        "tsconfig.tsbuildinfo": "{\"root\":[\"./src/index.ts\"],\"version\":\"5.9.3\"}",
        "packages/a/tsconfig.tsbuildinfo": "{\"program\":{\"fileNames\":[]},\"version\":\"4.9.5\"}",
        "api/Cargo.toml": "",
        "api/target/CACHEDIR.TAG": tag,
      }),
    ).toEqual([".pytest_cache/", "api/target/", "cmake-build-debug/", "env/", "packages/a/tsconfig.tsbuildinfo", "tsconfig.tsbuildinfo"]);
  });

  it("does not take a file named like a marker for one, nor a tag that only marks an empty directory", async () => {
    expect(
      await findings({
        "docs/CACHEDIR.TAG": "an example tag for the docs\n",
        "examples/pyvenv.cfg": "# how a venv config looks\n",
        "cmake/CMakeCache.txt": "notes\n",
        "test/fixtures/venv/pyvenv.cfg": "home = /usr/bin\n",
        "tmp/.gitkeep": "",
        "tmp/CACHEDIR.TAG": "Signature: 8a477f597d28d172789f06886806bc55\n# This file is a cache directory tag created by Matomo.\n",
      }),
    ).toEqual([]);
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
  it("never reads the words in a name, in any language", async () => {
    expect(
      await claims({
        "IMPLEMENTATION_COMPLETE.md": "",
        "docs/BUGFIX_LOGIN.md": "",
        "src/index.ts": "x",
        "src/index.ts.bak": "x",
        "src/index - Copy.ts": "x",
        "src/index.备份.ts": "x",
        "src/index_백업.ts": "x",
        "src copy/a.ts": "",
        "fix_login.sh": "",
        "debug.log": "",
        "reports/1.md": "", "reports/2.md": "", "reports/3.md": "", "reports/4.md": "", "reports/5.md": "",
        "notes/v1.0.md": "", "notes/v1.1.md": "", "notes/v1.2.md": "", "notes/v1.3.md": "", "notes/v1.4.md": "",
      }),
    ).toEqual([]);
  });

  it("smells a crowded root, whatever the docs are, counting only what has no claim to the root", async () => {
    const root = { "README.md": "", "LICENSE": "", "CHANGELOG.md": "", "CONTRIBUTING.md": "", "SECURITY.md": "", "AGENTS.md": "", "CLAUDE.md": "x" };
    const docs = { "ARCHITECTURE.md": "", "DESIGN.md": "", "API.md": "" };
    expect(await claims({ ...root, ...docs })).toEqual([]);
    expect(await claims({ ...root, ...docs, "ROADMAP.md": "" })).toEqual(["smell ./"]);
  });

  it("does not let a contract name's prefix carry any doc to the root", async () => {
    const docs = ["README.md", "README.zh-CN.md", "README_EN.md", "LICENSE-MIT", "LICENSE_NOTICE", "CHANGELOG.en-US.md"];
    const prefixed = ["README_IMPLEMENTATION_COMPLETE.md", "AGENTS-handoff.md", "CLAUDE_SESSION_NOTES.md", "SECURITY_AUDIT_REPORT.md"];
    const found = await claims(Object.fromEntries([...docs, ...prefixed].map((n) => [n, "# x"])));
    expect(found).toContain("smell ./");
    expect(found.filter((c) => /README\.zh|README_EN|LICENSE|CHANGELOG/.test(c))).toEqual([]);
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
      "package.json": JSON.stringify({ name: "a", private: true, dependencies: { dates: "npm:moment@2.30.1" } }),
      "src/_fooBar.ts": "",
      "src/_foo-bar.ts": "",
    });
    expect(found).toEqual(expect.arrayContaining(["smell package.json (moment)", "smell src/"]));
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
        "App.dmg": "compressed blocks".padEnd(4096, "\u0000") + "koly".padEnd(512, "\u0000"),
        "screenshot.dmg": "koly at the start is not a trailer".padEnd(2048, " "),
      }),
    ).toEqual(["review server", "smell App.dmg", "smell Installer.pkg", "smell core", "smell ext.vsix"].sort());
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
    expect(await findings({ ".env.local": "A=1", ".env": "A=1", "android/local.properties": header, "config/local.properties": "port=1" }))
      .toEqual([".env.local", "android/local.properties"]);
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
        "src/views/userProfile.vue": "",
        "src/views/order-list.vue": "",
        "src/vite-env.d.ts": "",
        "src/routeTree.gen.ts": "",
        "src/main-entry.ts": "",
        "test/fixtures/fooBar.ts": "",
        "test/fixtures/foo-baz.ts": "",
      }),
    ).toEqual(["src/composables/", "src/views/"]);
  });

  it("compares within a language, not an extension: a kebab component beside a camelCase module is a mix", async () => {
    expect(
      await findings({
        "src/picker/date-picker.vue": "",
        "src/picker/datePicker.ts": "",
        "src/legacy/fooBar.js": "",
        "src/legacy/baz-qux.ts": "",
        "src/same/date-picker.vue": "",
        "src/same/date-picker.ts": "",
        "src/same/AppButton.vue": "",
      }),
    ).toEqual(["src/legacy/", "src/picker/"]);
  });

  it("compares subdirectories that hold only JavaScript or TypeScript, not those a language names", async () => {
    const { lintWorkspace } = await import("../../src/rules/lint");
    const root = mkdtempSync(join(tmpdir(), "chous-dirs-"));
    const files = {
      "src/components/date-picker/index.ts": "",
      "src/components/color-input/index.ts": "",
      "src/components/buttonGroup/index.ts": "",
      "src/components/assets/logo.svg": "",
      "tools/web-ui/main.ts": "",
      "tools/data_loader/__init__.py": "",
      "tools/data_loader/web.ts": "",
      ".hidden/fooBar/a.ts": "",
      ".hidden/baz-qux/a.ts": "",
    };
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(join(root, path, ".."), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    const found = (await lintWorkspace({ root })).issues.filter((i) => i.message.key === "issue.twins.dirStyles");
    expect(found.map((i) => [i.displayPath, i.message.params?.styles])).toEqual([["src/components/", "kebab-case ×2 + camelCase ×1"]]);
  });

  it("knows the names Windows cannot create, as Microsoft lists them", async () => {
    const { windowsProblem } = await import("../../src/rules/validators/hygiene");
    expect(windowsProblem("NUL.tar.gz")?.key).toBe("issue.twins.winReserved");
    expect(windowsProblem("aux.ts")?.key).toBe("issue.twins.winReserved");
    expect(windowsProblem("COM\u00b9")?.key).toBe("issue.twins.winReserved");
    expect(windowsProblem("a:b.md")).toEqual({ key: "issue.twins.winChars", chars: ":" });
    expect(windowsProblem("what?|.png")).toEqual({ key: "issue.twins.winChars", chars: "? |" });
    expect(windowsProblem("notes.")?.key).toBe("issue.twins.winTrailing");
    expect(windowsProblem("draft ")?.key).toBe("issue.twins.winTrailing");
    for (const ok of [".temp", "console.ts", "auxiliary.md", "com10.txt", "nullish.ts", "Microsoft Yahei.woff", "L形.png", "a.b.c"]) {
      expect(windowsProblem(ok), ok).toBeUndefined();
    }
  });

  it.skipIf(process.platform === "win32")("reports a committed name Windows cannot check out, once per directory", async () => {
    const root = mkdtempSync(join(tmpdir(), "chous-win-"));
    mkdirSync(join(root, "docs/aux"), { recursive: true });
    writeFileSync(join(root, "docs/aux/index.md"), "");
    writeFileSync(join(root, "docs/a:b.md"), "");
    writeFileSync(join(root, "notes."), "");
    const found = (await lintWorkspace({ root })).issues.filter((i) => i.message.key.startsWith("issue.twins.win"));
    expect(found.map((i) => [i.displayPath, i.message.key]).sort()).toEqual([
      ["docs/a:b.md", "issue.twins.winChars"],
      ["docs/aux/", "issue.twins.winReserved"],
      ["notes.", "issue.twins.winTrailing"],
    ]);
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

  it("flags editor files their makers call personal", async () => {
    expect(await findings({ ".idea/workspace.xml": "", ".idea/vcs.xml": "" })).toEqual([".idea/workspace.xml"]);
  });

  it("finds names that differ only by case, never names that differ by meaning", async () => {
    const root = mkdtempSync(join(tmpdir(), "chous-case-"));
    for (const path of ["src/Test/a.ts", "src/test/b.ts", "src/tests/c.ts", "lib/category/a.ts", "lib/categories/b.ts"]) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), "");
    }
    // macOS and Windows fold case themselves and keep one directory: then there is nothing to find.
    const kept = readdirSync(join(root, "src")).length;
    const found = (await lintWorkspace({ root })).issues.map((i) => i.displayPath);
    expect(found).toEqual(kept === 3 ? ["src/test"] : []);
  });

  it("finds the two Unicode forms of one name, where the file system keeps both", async () => {
    const files = { "docs/caf\u00e9.md": "# a", "docs/cafe\u0301.md": "# b" };
    const root = mkdtempSync(join(tmpdir(), "chous-unicode-"));
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content, "utf8");
    }
    // macOS folds the two forms itself and keeps one file: then there is nothing to find.
    const kept = readdirSync(join(root, "docs")).length;
    const found = (await lintWorkspace({ root })).issues.map((i) => i.displayPath);
    expect(found).toEqual(kept === 2 ? ["docs/caf\u00e9.md"] : []);
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
