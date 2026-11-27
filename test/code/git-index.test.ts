import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { trackedPaths } from "../../src/vfs/git-index";
import { lintWorkspace } from "../../src/rules/lint";

function repo(files: Record<string, string>, forceAdd: string[], indexVersion?: number) {
  const root = mkdtempSync(join(tmpdir(), "chous-git-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
  git("init", "-q");
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  git("add", "-A");
  if (forceAdd.length) git("add", "-f", ...forceAdd);
  if (indexVersion) git("update-index", "--index-version", String(indexVersion));
  return root;
}

const FILES = {
  ".gitignore": "*.bak\nbuild/\nnode_modules/\n",
  "package.json": JSON.stringify({ name: "a", private: true }),
  "package.json.bak": JSON.stringify({ name: "a", private: true }),
  "src/deeply/nested/really/long-file-name.ts": "",
  "build/.DS_Store": "\u0000\u0000\u0000\u0001Bud1",
  "node_modules/left-pad/index.js": "",
};

describe("what git tracks", () => {
  for (const version of [2, 3, 4]) {
    it(`reads index version ${version}`, () => {
      const root = repo(FILES, ["package.json.bak", "build/.DS_Store"], version);
      expect([...(trackedPaths(root) ?? [])].sort()).toEqual([".gitignore", "build/.DS_Store", "package.json", "package.json.bak", "src/deeply/nested/really/long-file-name.ts"]);
    });
  }

  it("reports what is committed although .gitignore ignores it: an ignored directory once, honouring ! exceptions, not empty placeholders", async () => {
    const root = repo(
      { ".gitignore": "dist/\n*.log\n!keep.log\n/*.js\n", "package.json": JSON.stringify({ name: "a", private: true }), "dist/a.js": "a", "dist/b.js": "b", "x.log": "x", "keep.log": "", "fixtures/y.log": "", "src/app.js": "", "models/.gitignore": "*\n", "models/checkpoints/put_here": "" },
      ["dist/a.js", "dist/b.js", "x.log", "fixtures/y.log", "models/.gitignore", "models/checkpoints/put_here"],
    );
    const found = (await lintWorkspace({ root })).issues.filter((i) => i.message.key === "issue.leftover.ignoredTracked");
    expect(found.map((i) => [i.displayPath, (i.details?.files as string[]).length])).toEqual([["dist/", 2], ["x.log", 1]]);
  });

  it("checks what is committed, however .gitignore or a folder name would hide it; leaves untracked node_modules alone", async () => {
    const root = repo(FILES, ["package.json.bak", "build/.DS_Store"]);
    const paths = (await lintWorkspace({ root })).issues.map((i) => i.displayPath).sort();
    expect(paths).toContain("package.json.bak");
    expect(paths).toContain("build/.DS_Store");
    expect(paths.some((p) => p.startsWith("node_modules/"))).toBe(false);
  });

  it("has nothing to say outside a repository", () => {
    expect(trackedPaths(mkdtempSync(join(tmpdir(), "chous-nogit-")))).toBeUndefined();
  });

  it.runIf(process.platform !== "win32")("follows a tracked symlink that points inside the repository, never one that points out", async () => {
    const outside = mkdtempSync(join(tmpdir(), "chous-outside-"));
    writeFileSync(join(outside, ".DS_Store"), "\u0000\u0000\u0000\u0001Bud1");
    const root = mkdtempSync(join(tmpdir(), "chous-links-"));
    mkdirSync(join(root, "agents/rules"), { recursive: true });
    writeFileSync(join(root, "agents/rules/.DS_Store"), "\u0000\u0000\u0000\u0001Bud1");
    mkdirSync(join(root, ".cursor"));
    symlinkSync("../agents/rules", join(root, ".cursor/rules"));
    symlinkSync(outside, join(root, "elsewhere"));
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["add", "-A"], { cwd: root });
    const paths = (await lintWorkspace({ root })).issues.map((i) => i.displayPath);
    expect(paths).toContain(".cursor/rules/.DS_Store");
    expect(paths.some((p) => p.includes("elsewhere"))).toBe(false);
  });
});
