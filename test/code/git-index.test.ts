import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
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
});
