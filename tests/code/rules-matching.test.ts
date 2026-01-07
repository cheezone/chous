import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { lintWorkspace } from "../../src/rules/lint";
import { parseFsLintConfig } from "../../src/config/parser";

describe("rules matching against file lists", () => {
  describe("allow rules in nested blocks - file matching", () => {
    it("should match *.md files in docs directory", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // Create file structure
        await mkdir(join(testDir, "docs"), { recursive: true });
        await writeFile(join(testDir, "docs", "README.md"), "# README");
        await writeFile(join(testDir, "docs", "CHANGELOG.md"), "# CHANGELOG");
        await writeFile(join(testDir, "docs", "other.txt"), "content");

        // Config: in docs: allow *.md
        const config = parseFsLintConfig(`
in docs:
  allow *.md
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // Should have no errors because *.md files are allowed
        const mdFileIssues = result.issues.filter(
          (issue) => issue.displayPath.includes("README.md") || issue.displayPath.includes("CHANGELOG.md")
        );
        expect(mdFileIssues.length).toBe(0);

        // other.txt should be reported (if strict mode is enabled)
        // But in permissive mode, only listed files are allowed, other files are not checked
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });

    it("should match patterns with directory prefix correctly", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // Create file structure
        await mkdir(join(testDir, "src", "components"), { recursive: true });
        await writeFile(join(testDir, "src", "components", "Button.tsx"), "export");
        await writeFile(join(testDir, "src", "components", "Button.test.tsx"), "test");
        await writeFile(join(testDir, "src", "components", "Button.spec.tsx"), "test");

        // Config: in src: allow **/*.tsx
        const config = parseFsLintConfig(`
in src:
  allow **/*.tsx
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // All .tsx files should be allowed
        const tsxFileIssues = result.issues.filter((issue) => issue.displayPath.endsWith(".tsx"));
        expect(tsxFileIssues.length).toBe(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });

    it("should handle strict mode with allow patterns", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // Create file structure
        await mkdir(join(testDir, "app"), { recursive: true });
        await writeFile(join(testDir, "app", "index.ts"), "export");
        await writeFile(join(testDir, "app", "index.js"), "export"); // Should not exist
        await writeFile(join(testDir, "app", "config.json"), "{}");

        // Config: in app: allow *.ts, strict files
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

        // index.ts should be allowed
        const tsFileIssues = result.issues.filter((issue) => issue.displayPath.endsWith("index.ts"));
        expect(tsFileIssues.length).toBe(0);

        // index.js and config.json should be reported as not allowed
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
        // Create file structure
        await mkdir(join(testDir, "app", "assets", "images"), { recursive: true });
        await writeFile(join(testDir, "app", "assets", "images", "logo.png"), "data");
        await writeFile(join(testDir, "app", "assets", "images", "icon.jpg"), "data");
        await writeFile(join(testDir, "app", "assets", "images", "readme.txt"), "text");

        // Config: in app/assets/images: allow *.png, *.jpg
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

        // PNG and JPG files should be allowed
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
        // Create file structure
        await mkdir(join(testDir, "src"), { recursive: true });
        await writeFile(join(testDir, "src", "index.ts"), "export");
        await writeFile(join(testDir, "src", "index.tsx"), "export");
        await writeFile(join(testDir, "src", "index.js"), "export");
        await writeFile(join(testDir, "src", "config.json"), "{}");

        // Config: multiple allow rules
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

        // .ts, .tsx, .json should all be allowed
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
        // Create file structure
        await mkdir(join(testDir, "assets"), { recursive: true });
        await writeFile(join(testDir, "assets", "style.css"), "css");
        await writeFile(join(testDir, "assets", "other.css"), "css");

        // Config: in assets: move *.css to css
        const config = parseFsLintConfig(`
in assets:
  move *.css to css
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // Should report that files need to be moved to css directory
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
        // Create file structure
        // Note: On macOS, the file system is case-insensitive by default, so use completely different file names
        await mkdir(join(testDir, "components"), { recursive: true });
        await writeFile(join(testDir, "components", "UserProfile.vue"), "component"); // Matches PascalCase
        await writeFile(join(testDir, "components", "user-profile.vue"), "component"); // Does not match naming convention (should be PascalCase, not kebab-case)

        // Config: in components: use PascalCase for files *.vue
        const config = parseFsLintConfig(`
in components:
  use PascalCase for files *.vue
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // UserProfile.vue should pass (PascalCase)
        const userProfilePascalIssues = result.issues.filter(
          (issue) => issue.displayPath.endsWith("UserProfile.vue") && issue.ruleKind === "naming"
        );
        expect(userProfilePascalIssues.length).toBe(0);

        // user-profile.vue should be reported as not matching naming convention (should be PascalCase, not kebab-case)
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
        // Create file structure
        await mkdir(join(testDir, "src"), { recursive: true });
        await writeFile(join(testDir, "src", "temp.log"), "log");
        await writeFile(join(testDir, "src", "cache.tmp"), "tmp");

        // Config: in src: no *.log, *.tmp
        const config = parseFsLintConfig(`
in src:
  no *.log, *.tmp
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // Should report that .log and .tmp files should not exist
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
        // Create file structure
        await mkdir(join(testDir, "app", "components"), { recursive: true });
        await mkdir(join(testDir, "app", "assets"), { recursive: true });
        await writeFile(join(testDir, "app", "components", "Button.vue"), "component");
        await writeFile(join(testDir, "app", "assets", "style.css"), "css");
        await writeFile(join(testDir, "app", "assets", "icon.svg"), "svg");

        // Config: mixed rules
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

        // Button.vue should pass naming check
        const buttonNamingIssues = result.issues.filter(
          (issue) => issue.displayPath.endsWith("Button.vue") && issue.ruleKind === "naming"
        );
        expect(buttonNamingIssues.length).toBe(0);

        // style.css should be reported as needing to be moved to css
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
        // Create file structure
        await mkdir(join(testDir, "tests", "unit"), { recursive: true });
        await mkdir(join(testDir, "tests", "integration"), { recursive: true });
        await writeFile(join(testDir, "tests", "unit", "test1.test.ts"), "test");
        await writeFile(join(testDir, "tests", "integration", "test2.spec.ts"), "test");

        // Config: in tests: allow **/*.test.ts, **/*.spec.ts
        const config = parseFsLintConfig(`
in tests:
  allow **/*.test.ts, **/*.spec.ts
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // All test files should be allowed
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
        // Create file structure
        await mkdir(join(testDir, "src", "utils"), { recursive: true });
        await writeFile(join(testDir, "src", "utils", "helper.ts"), "export");

        // Config: in src: allow utils/*.ts
        const config = parseFsLintConfig(`
in src:
  allow utils/*.ts
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // helper.ts should be allowed
        const helperIssues = result.issues.filter((issue) => issue.displayPath.endsWith("helper.ts"));
        expect(helperIssues.length).toBe(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });

    it("should handle empty directories correctly", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // Create empty directory
        await mkdir(join(testDir, "empty"), { recursive: true });

        // Config: in empty: allow *.md
        const config = parseFsLintConfig(`
in empty:
  allow *.md
`);

        const result = await lintWorkspace({
          root: testDir,
          config,
          configPath: join(testDir, ".chous"),
        });

        // Empty directory should not produce errors (permissive mode)
        expect(result.issues.length).toBe(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });

    it("should handle strict mode with empty directory", async () => {
      const testDir = await mkdtemp(join(tmpdir(), "fslint-rules-matching-"));
      try {
        // Create empty directory
        await mkdir(join(testDir, "empty"), { recursive: true });

        // Config: in empty: allow *.md, strict
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

        // In strict mode, empty directory should be allowed (because no files violate rules)
        expect(result.issues.length).toBe(0);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });
  });
});
