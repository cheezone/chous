import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseFsLintConfig } from "../../src/config/parser";
import { compileConfig } from "../../src/config/compiler";
import { createMemorySnapshot, buildWorkspaceSnapshot } from "../../src/vfs/snapshot";
import { lintWorkspace } from "../../src/rules/lint";
import { applySafeFixes } from "../../src/rules/autofix";

describe("DSL severity and reason", () => {
  it("parses warn/error prefix and because clause", () => {
    const config = parseFsLintConfig(
      `warn move *.md to docs because "Keep docs together"\nerror no [.prettierrc*]`,
      "/tmp/test.chous",
    );
    const move = config.rules.find((r) => r.kind === "move")!;
    const no = config.rules.find((r) => r.kind === "no")!;
    expect(move.severity).toBe("warn");
    expect(move.reason).toBe("Keep docs together");
    expect(no.severity).toBe("error");
  });

  it("attaches adjacent comment as reason", () => {
    const config = parseFsLintConfig(
      `# Both keep unit tests under test/\nrename tests to test`,
      "/tmp/test.chous",
    );
    const rename = config.rules.find((r) => r.kind === "renameDir")!;
    expect(rename.reason).toContain("unit tests under test");
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

describe("config compiler", () => {
  it("folds allow into inDirGroups", () => {
    const config = parseFsLintConfig(
      `allow [LICENSE*, README.md]\nstrict in .`,
      "/tmp/test.chous",
    );
    const compiled = compileConfig(config, { packages: [], tool: "root" }, { root: "/tmp" });
    const rootGroup = compiled.inDirGroups.get(".")!;
    expect(rootGroup.some((r) => r.mode === "permissive" && r.only.includes("README.md"))).toBe(true);
    expect(rootGroup.some((r) => r.mode === "strict" || r.mode === undefined)).toBe(true);
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
        ruleSource: { file: join(dir, ".chous"), line: 1 },
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

  it("replaces a dependency in package.json", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chous-pkg-"));
    const pkgPath = join(dir, "package.json");
    writeFileSync(pkgPath, JSON.stringify({ devDependencies: { prettier: "^3.0.0", eslint: "^9.0.0" } }, null, 2) + "\n", "utf8");
    const result = await applySafeFixes([
      {
        ruleKind: "replaceDep",
        ruleSource: { file: join(dir, ".chous"), line: 1 },
        path: `${pkgPath}#replace:prettier`,
        displayPath: "package.json (replace prettier)",
        message: { key: "issue.replaceDep.replace", params: { from: "prettier", to: "@antfu/eslint-config" } },
        category: "forbidden",
        severity: "error",
        fix: { type: "pkgReplaceDep", pkgJsonPath: pkgPath, from: "prettier", to: "@antfu/eslint-config" },
      },
    ]);
    expect(result.applied).toBe(1);
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { devDependencies: Record<string, string> };
    expect(pkg.devDependencies.prettier).toBeUndefined();
    expect(pkg.devDependencies["@antfu/eslint-config"]).toBe("^3.0.0");
  });
});

describe("lint pipeline integration", () => {
  it("emits ruleSource, reason and fix on move issues", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chous-lint-"));
    writeFileSync(join(dir, "note.md"), "# hi", "utf8");
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "t" }), "utf8");
    const configPath = join(dir, ".chous");
    writeFileSync(configPath, `# Keep markdown in docs\nmove *.md to docs\n`, "utf8");
    const config = parseFsLintConfig(readFileSync(configPath, "utf8"), configPath);
    const result = await lintWorkspace({ root: dir, config, configPath });
    const moveIssue = result.issues.find((i) => i.ruleKind === "move");
    expect(moveIssue).toBeTruthy();
    expect(moveIssue!.ruleSource.file).toContain(".chous");
    expect(moveIssue!.reason).toContain("markdown");
    expect(moveIssue!.fix?.type).toBe("rename");
  });
});
