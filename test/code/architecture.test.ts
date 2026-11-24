import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { compileRules } from "../../src/rules/compile";
import { resolveTaste } from "../../src/taste";
import { execFileSync } from "node:child_process";
import { DEAD, NATIVE } from "../../src/taste/deps";
import { createMemorySnapshot } from "../../src/vfs/snapshot";
import { lintWorkspace } from "../../src/rules/lint";
import { applySafeFixes } from "../../src/rules/autofix";

describe("taste resolution", () => {
  function project(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), "chous-taste-"));
    for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content, "utf8");
    return dir;
  }

  it("applies only the base taste to a bare repo", () => {
    expect(resolveTaste(project({ "README.md": "" })).ids).toEqual(["base"]);
  });

  it("stacks language and framework tastes", () => {
    const root = project({
      "package.json": JSON.stringify({ dependencies: { nuxt: "^3.12.0" } }),
      "nuxt.config.ts": "",
    });
    expect(resolveTaste(root).ids).toEqual(["base", "js", "nuxt3"]);
  });

  it("defaults Nuxt to the latest major", () => {
    const root = project({ "package.json": "{}", "nuxt.config.ts": "" });
    expect(resolveTaste(root).ids).toEqual(["base", "js", "nuxt4"]);
  });

  it("tags every rule with the taste that produced it", () => {
    const { rules } = resolveTaste(project({ "go.mod": "module x\n" }));
    expect(new Set(rules.map((r) => r.source.taste))).toEqual(new Set(["base", "go"]));
  });
});

describe("VFS snapshot", () => {
  it("matches globs in memory", () => {
    const snap = createMemorySnapshot("/proj", {
      "src": { "index.ts": "file", "util.ts": "file" },
      "README.md": "file",
      "docs": { "guide.md": "file" },
    });
    expect(snap.match("**/*.ts", { onlyFiles: true }).map((p) => p.replace(/\\/g, "/"))).toEqual(
      expect.arrayContaining([
        expect.stringContaining("src/index.ts"),
        expect.stringContaining("src/util.ts"),
      ]),
    );
    expect(snap.exists("README.md")).toBe(true);
    expect(snap.isDirectory("docs")).toBe(true);
    expect(snap.listDir("docs").map((e) => e.name)).toEqual(["guide.md"]);
  });
});

describe("git", () => {
  function repo(files: Record<string, string> = {}): string {
    const dir = mkdtempSync(join(tmpdir(), "chous-git-"));
    execFileSync("git", ["init", "-q"], { cwd: dir });
    for (const [name, content] of Object.entries(files)) {
      mkdirSync(join(dir, name, ".."), { recursive: true });
      writeFileSync(join(dir, name), content, "utf8");
    }
    return dir;
  }

  it("applies the git taste to a repository root", () => {
    expect(resolveTaste(repo()).ids).toEqual(["base", "git"]);
  });

  it("applies the GitHub taste when there are workflows", () => {
    expect(resolveTaste(repo({ ".github/workflows/ci.yml": "" })).ids).toEqual(["base", "git", "github"]);
  });

  it("requires a .gitignore", async () => {
    const result = await lintWorkspace({ root: repo({ "README.md": "" }) });
    expect(result.issues.map((i) => `${i.displayPath} ${i.message.key}`)).toContain(".gitignore issue.has.mustExist");
  });
});

describe("obsolete dependency list", () => {
  it("names each package once", () => {
    const names = [...NATIVE, ...DEAD].flatMap((d) => d.names);
    expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
  });

});

describe("rule compiler", () => {
  it("folds allow into a strict root whitelist", () => {
    const source = { taste: "test" };
    const compiled = compileRules(
      [
        { kind: "inDirOnly", dir: ".", only: [], mode: "strict", source },
        { kind: "allow", names: ["LICENSE*", "README.md"], source },
      ],
      { packages: [], tool: "root" },
    );
    const rootGroup = compiled.inDirGroups.get(".")!;
    expect(rootGroup.some((r) => r.mode === "permissive" && r.only.includes("README.md"))).toBe(true);
    expect(rootGroup.some((r) => r.mode === "strict")).toBe(true);
  });

  it("lets renamed directories through the whitelist", () => {
    const source = { taste: "test" };
    const compiled = compileRules(
      [{ kind: "renameDir", fromNames: ["tests"], toName: "test", source }],
      { packages: [], tool: "root" },
    );
    expect(compiled.inDirGroups.get(".")!.some((r) => r.only.includes("tests"))).toBe(true);
  });
});

describe("safe autofix", () => {
  it("renames files when destination is free", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chous-fix-"));
    writeFileSync(join(dir, "a.spec.ts"), "export {}", "utf8");
    const from = join(dir, "a.spec.ts");
    const to = join(dir, "a.test.ts");
    const result = await applySafeFixes([
      {
        ruleKind: "renameGlob",
        ruleSource: { taste: "test" },
        path: from,
        displayPath: "a.spec.ts",
        message: { key: "issue.renameGlob.shouldRenameTo", params: { to: "a.test.ts" } },
        category: "forbidden",
        severity: "error",
        fix: { type: "rename", fromPath: from, toPath: to },
      },
    ]);
    expect(result.applied).toBe(1);
    expect(existsSync(to)).toBe(true);
    expect(existsSync(from)).toBe(false);
  });

});

describe("lint pipeline integration", () => {
  it("emits a rename fix with its taste for tests/", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chous-lint-"));
    mkdirSync(join(dir, "tests"));
    writeFileSync(join(dir, "tests", "a.test.ts"), "", "utf8");
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "t", packageManager: "pnpm@10.0.0" }), "utf8");
    const result = await lintWorkspace({ root: dir });
    const rename = result.issues.find((i) => i.ruleKind === "renameDir");
    expect(rename?.ruleSource.taste).toBe("js");
    expect(rename?.fix).toEqual({ type: "rename", fromPath: join(dir, "tests"), toPath: join(dir, "test") });
    expect(result.tastes).toEqual(["base", "js"]);
  });
});
