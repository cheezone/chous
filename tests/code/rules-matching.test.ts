import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { lintWorkspace } from "../../src/lint";
import { parseFsLintConfig } from "../../src/parser";

describe("rules matching against file lists", () => {
  describe("allow rules in nested blocks - file matching", () => {
    it("should match *.md files in docs directory", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // 创建文件结构
        await mkdir(join(testDir, "docs"), { recursive: true });
        await writeFile(join(testDir, "docs", "README.md"), "# README");
        await writeFile(join(testDir, "docs", "CHANGELOG.md"), "# CHANGELOG");
        await writeFile(join(testDir, "docs", "other.txt"), "content");

        // 配置：in docs: allow *.md
        const config = parseFsLintConfig(`
in docs:
  allow *.md
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // 应该没有错误，因为 *.md 文件被允许
        const mdFileIssues = result.issues.filter(
          (issue) => issue.displayPath.includes("README.md") || issue.displayPath.includes("CHANGELOG.md")
        );
        expect(mdFileIssues.length).toBe(0);

        // other.txt 应该被报告（如果启用了 strict 模式）
        // 但 permissive 模式下，只允许列出的文件，其他文件不检查
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });

    it("should match patterns with directory prefix correctly", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // 创建文件结构
        await mkdir(join(testDir, "src", "components"), { recursive: true });
        await writeFile(join(testDir, "src", "components", "Button.tsx"), "export");
        await writeFile(join(testDir, "src", "components", "Button.test.tsx"), "test");
        await writeFile(join(testDir, "src", "components", "Button.spec.tsx"), "test");

        // 配置：in src: allow **/*.tsx
        const config = parseFsLintConfig(`
in src:
  allow **/*.tsx
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // 所有 .tsx 文件应该被允许
        const tsxFileIssues = result.issues.filter((issue) => issue.displayPath.endsWith(".tsx"));
        expect(tsxFileIssues.length).toBe(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });

    it("should handle strict mode with allow patterns", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // 创建文件结构
        await mkdir(join(testDir, "app"), { recursive: true });
        await writeFile(join(testDir, "app", "index.ts"), "export");
        await writeFile(join(testDir, "app", "index.js"), "export"); // 不应该存在
        await writeFile(join(testDir, "app", "config.json"), "{}");

        // 配置：in app: allow *.ts, strict files
        const config = parseFsLintConfig(`
in app:
  allow *.ts
  strict files
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
          strict: true,
        });

        // index.ts 应该被允许
        const tsFileIssues = result.issues.filter((issue) => issue.displayPath.endsWith("index.ts"));
        expect(tsFileIssues.length).toBe(0);

        // index.js 和 config.json 应该被报告为不允许
        const jsFileIssues = result.issues.filter((issue) => issue.displayPath.endsWith("index.js"));
        const jsonFileIssues = result.issues.filter((issue) => issue.displayPath.endsWith("config.json"));
        expect(jsFileIssues.length + jsonFileIssues.length).toBeGreaterThan(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });
  });

  describe("nested allow rules - complex scenarios", () => {
    it("should match files in deeply nested directories", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // 创建文件结构
        await mkdir(join(testDir, "app", "assets", "images"), { recursive: true });
        await writeFile(join(testDir, "app", "assets", "images", "logo.png"), "data");
        await writeFile(join(testDir, "app", "assets", "images", "icon.jpg"), "data");
        await writeFile(join(testDir, "app", "assets", "images", "readme.txt"), "text");

        // 配置：in app/assets/images: allow *.png, *.jpg
        const config = parseFsLintConfig(`
in app:
  in assets:
    in images:
      allow *.png, *.jpg
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // PNG 和 JPG 文件应该被允许
        const pngIssues = result.issues.filter((issue) => issue.displayPath.endsWith("logo.png"));
        const jpgIssues = result.issues.filter((issue) => issue.displayPath.endsWith("icon.jpg"));
        expect(pngIssues.length).toBe(0);
        expect(jpgIssues.length).toBe(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });

    it("should handle multiple allow rules in same directory", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // 创建文件结构
        await mkdir(join(testDir, "src"), { recursive: true });
        await writeFile(join(testDir, "src", "index.ts"), "export");
        await writeFile(join(testDir, "src", "index.tsx"), "export");
        await writeFile(join(testDir, "src", "index.js"), "export");
        await writeFile(join(testDir, "src", "config.json"), "{}");

        // 配置：多个 allow 规则
        const config = parseFsLintConfig(`
in src:
  allow *.ts
  allow *.tsx
  allow *.json
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // .ts, .tsx, .json 应该都被允许
        const allowedIssues = result.issues.filter(
          (issue) =>
            issue.displayPath.endsWith("index.ts") ||
            issue.displayPath.endsWith("index.tsx") ||
            issue.displayPath.endsWith("config.json")
        );
        expect(allowedIssues.length).toBe(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });
  });

  describe("move rules in nested blocks - file matching", () => {
    it("should match files for move rules in nested blocks", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // 创建文件结构
        await mkdir(join(testDir, "assets"), { recursive: true });
        await writeFile(join(testDir, "assets", "style.css"), "css");
        await writeFile(join(testDir, "assets", "other.css"), "css");

        // 配置：in assets: move *.css to css
        const config = parseFsLintConfig(`
in assets:
  move *.css to css
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // 应该报告文件需要移动到 css 目录
        const moveIssues = result.issues.filter(
          (issue) => issue.ruleKind === "move" && issue.displayPath.includes("style.css")
        );
        expect(moveIssues.length).toBeGreaterThan(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });
  });

  describe("naming rules in nested blocks - file matching", () => {
    it("should match files for naming rules in nested blocks", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // 创建文件结构
        // 注意：在 macOS 上，文件系统默认大小写不敏感，所以使用完全不同的文件名
        await mkdir(join(testDir, "components"), { recursive: true });
        await writeFile(join(testDir, "components", "UserProfile.vue"), "component"); // 符合 PascalCase
        await writeFile(join(testDir, "components", "user-profile.vue"), "component"); // 不符合命名规范（应该是 PascalCase，不是 kebab-case）

        // 配置：in components: use PascalCase for files *.vue
        const config = parseFsLintConfig(`
in components:
  use PascalCase for files *.vue
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // UserProfile.vue 应该通过（PascalCase）
        const userProfilePascalIssues = result.issues.filter(
          (issue) => issue.displayPath.endsWith("UserProfile.vue") && issue.ruleKind === "naming"
        );
        expect(userProfilePascalIssues.length).toBe(0);

        // user-profile.vue 应该被报告为不符合命名规范（应该是 PascalCase，不是 kebab-case）
        const userProfileKebabIssues = result.issues.filter(
          (issue) => issue.displayPath.endsWith("user-profile.vue") && issue.ruleKind === "naming"
        );
        expect(userProfileKebabIssues.length).toBeGreaterThan(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });
  });

  describe("no rules in nested blocks - file matching", () => {
    it("should match files for no rules in nested blocks", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // 创建文件结构
        await mkdir(join(testDir, "src"), { recursive: true });
        await writeFile(join(testDir, "src", "temp.log"), "log");
        await writeFile(join(testDir, "src", "cache.tmp"), "tmp");

        // 配置：in src: no *.log, *.tmp
        const config = parseFsLintConfig(`
in src:
  no *.log, *.tmp
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // 应该报告 .log 和 .tmp 文件不应该存在
        const logIssues = result.issues.filter(
          (issue) => issue.ruleKind === "no" && issue.displayPath.endsWith("temp.log")
        );
        const tmpIssues = result.issues.filter(
          (issue) => issue.ruleKind === "no" && issue.displayPath.endsWith("cache.tmp")
        );
        expect(logIssues.length + tmpIssues.length).toBeGreaterThan(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });
  });

  describe("complex nested scenarios", () => {
    it("should handle mixed rules with correct path matching", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // 创建文件结构
        await mkdir(join(testDir, "app", "components"), { recursive: true });
        await mkdir(join(testDir, "app", "assets"), { recursive: true });
        await writeFile(join(testDir, "app", "components", "Button.vue"), "component");
        await writeFile(join(testDir, "app", "assets", "style.css"), "css");
        await writeFile(join(testDir, "app", "assets", "icon.svg"), "svg");

        // 配置：混合规则
        const config = parseFsLintConfig(`
in app:
  allow components, assets
  
  in components:
    use PascalCase for files *.vue
  
  in assets:
    move *.css to css
    move *.svg to icons
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // Button.vue 应该通过命名检查
        const buttonNamingIssues = result.issues.filter(
          (issue) => issue.displayPath.endsWith("Button.vue") && issue.ruleKind === "naming"
        );
        expect(buttonNamingIssues.length).toBe(0);

        // style.css 应该被报告需要移动到 css
        const cssMoveIssues = result.issues.filter(
          (issue) => issue.ruleKind === "move" && issue.displayPath.includes("style.css")
        );
        expect(cssMoveIssues.length).toBeGreaterThan(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });

    it("should handle patterns with ** correctly", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // 创建文件结构
        await mkdir(join(testDir, "tests", "unit"), { recursive: true });
        await mkdir(join(testDir, "tests", "integration"), { recursive: true });
        await writeFile(join(testDir, "tests", "unit", "test1.test.ts"), "test");
        await writeFile(join(testDir, "tests", "integration", "test2.spec.ts"), "test");

        // 配置：in tests: allow **/*.test.ts, **/*.spec.ts
        const config = parseFsLintConfig(`
in tests:
  allow **/*.test.ts, **/*.spec.ts
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // 所有测试文件应该被允许
        const testFileIssues = result.issues.filter(
          (issue) => issue.displayPath.includes("test1.test.ts") || issue.displayPath.includes("test2.spec.ts")
        );
        expect(testFileIssues.length).toBe(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });
  });

  describe("edge cases - path matching", () => {
    it("should handle patterns that already contain directory separators", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // 创建文件结构
        await mkdir(join(testDir, "src", "utils"), { recursive: true });
        await writeFile(join(testDir, "src", "utils", "helper.ts"), "export");

        // 配置：in src: allow utils/*.ts
        const config = parseFsLintConfig(`
in src:
  allow utils/*.ts
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // helper.ts 应该被允许
        const helperIssues = result.issues.filter((issue) => issue.displayPath.endsWith("helper.ts"));
        expect(helperIssues.length).toBe(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });

    it("should handle empty directories correctly", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // 创建空目录
        await mkdir(join(testDir, "empty"), { recursive: true });

        // 配置：in empty: allow *.md
        const config = parseFsLintConfig(`
in empty:
  allow *.md
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // 空目录不应该产生错误（permissive 模式）
        expect(result.issues.length).toBe(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });

    it("should handle strict mode with empty directory", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // 创建空目录
        await mkdir(join(testDir, "empty"), { recursive: true });

        // 配置：in empty: allow *.md, strict
        const config = parseFsLintConfig(`
in empty:
  allow *.md
  strict
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
          strict: true,
        });

        // 在 strict 模式下，空目录应该被允许（因为没有文件违反规则）
        expect(result.issues.length).toBe(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });
  });
});
