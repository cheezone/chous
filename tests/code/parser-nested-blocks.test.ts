import { describe, expect, it } from "bun:test";
import { parseFsLintConfig } from "../../src/config/parser";

describe("parser - nested blocks (in xxx:)", () => {
  describe("allow rules in nested blocks", () => {
    it("should prefix allow patterns in nested block", () => {
      const config = parseFsLintConfig(`
in docs:
  allow *.md
`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("inDirOnly");
      if (config.rules[0]?.kind === "inDirOnly") {
        expect(config.rules[0].dir).toBe("docs");
        expect(config.rules[0].only).toEqual(["docs/*.md"]);
        expect(config.rules[0].mode).toBe("permissive");
      }
    });

    it("should handle allow with multiple patterns in nested block", () => {
      const config = parseFsLintConfig(`
in src:
  allow *.ts, *.tsx, *.js
`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("inDirOnly");
      if (config.rules[0]?.kind === "inDirOnly") {
        expect(config.rules[0].dir).toBe("src");
        expect(config.rules[0].only).toEqual(["src/*.ts", "src/*.tsx", "src/*.js"]);
      }
    });

    it("should handle allow with array syntax in nested block", () => {
      const config = parseFsLintConfig(`
in app:
  allow [
    components,
    layouts,
    pages
  ]
`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("inDirOnly");
      if (config.rules[0]?.kind === "inDirOnly") {
        expect(config.rules[0].dir).toBe("app");
        expect(config.rules[0].only).toEqual(["components", "layouts", "pages"]);
      }
    });

    it("should handle allow with glob patterns in nested block", () => {
      const config = parseFsLintConfig(`
in tests:
  allow **/*.test.ts, **/*.spec.ts
`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("inDirOnly");
      if (config.rules[0]?.kind === "inDirOnly") {
        expect(config.rules[0].dir).toBe("tests");
        // Note: patterns starting with ** should not be prefixed
        expect(config.rules[0].only).toEqual(["**/*.test.ts", "**/*.spec.ts"]);
      }
    });

    it("should handle allow with relative path patterns in nested block", () => {
      const config = parseFsLintConfig(`
in src:
  allow subdir/*.ts
`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("inDirOnly");
      if (config.rules[0]?.kind === "inDirOnly") {
        expect(config.rules[0].dir).toBe("src");
        expect(config.rules[0].only).toEqual(["src/subdir/*.ts"]);
      }
    });

    it("should NOT prefix patterns that already contain directory separator", () => {
      const config = parseFsLintConfig(`
in src:
  allow subdir/*.ts, **/*.test.ts
`);
      expect(config.rules).toHaveLength(1);
      if (config.rules[0]?.kind === "inDirOnly") {
        // subdir/*.ts should be prefixed
        // **/*.test.ts should not be prefixed (because it contains **)
        expect(config.rules[0].only).toContain("src/subdir/*.ts");
        expect(config.rules[0].only).toContain("**/*.test.ts");
      }
    });
  });

  describe("strict rules in nested blocks", () => {
    it("should prefix strict in nested block", () => {
      const config = parseFsLintConfig(`
in app:
  strict
`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("inDirOnly");
      if (config.rules[0]?.kind === "inDirOnly") {
        expect(config.rules[0].dir).toBe("app");
        expect(config.rules[0].mode).toBe("strict");
      }
    });

    it("should handle strict files in nested block", () => {
      const config = parseFsLintConfig(`
in src:
  allow *.ts
  strict files
`);
      expect(config.rules.length).toBeGreaterThanOrEqual(1);
      const strictRule = config.rules.find(r => r.kind === "inDirOnly" && r.mode === "strict");
      expect(strictRule).toBeDefined();
      if (strictRule?.kind === "inDirOnly") {
        expect(strictRule.dir).toBe("src");
        expect(strictRule.fileType).toBe("files");
      }
    });
  });

  describe("move rules in nested blocks", () => {
    it("should prefix move patterns in nested block", () => {
      const config = parseFsLintConfig(`
in assets:
  move *.css to css
`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("move");
      if (config.rules[0]?.kind === "move") {
        expect(config.rules[0].from).toBe("assets/*.css");
        expect(config.rules[0].toDir).toBe("assets/css");
      }
    });

    it("should handle nested move rules", () => {
      const config = parseFsLintConfig(`
in app:
  in assets:
    move *.svg to icons
`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("move");
      if (config.rules[0]?.kind === "move") {
        expect(config.rules[0].from).toBe("app/assets/*.svg");
        expect(config.rules[0].toDir).toBe("app/assets/icons");
      }
    });
  });

  describe("use rules in nested blocks", () => {
    it("should prefix use patterns in nested block", () => {
      const config = parseFsLintConfig(`
in components:
  use PascalCase for files *.vue
`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("naming");
      if (config.rules[0]?.kind === "naming") {
        expect(config.rules[0].pattern).toBe("components/*.vue");
        expect(config.rules[0].style).toBe("PascalCase");
        expect(config.rules[0].fileType).toBe("files");
      }
    });
  });

  describe("no rules in nested blocks", () => {
    it("should prefix no patterns in nested block", () => {
      const config = parseFsLintConfig(`
in src:
  no *.log, *.tmp
`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("no");
      if (config.rules[0]?.kind === "no") {
        expect(config.rules[0].names).toEqual(["src/*.log", "src/*.tmp"]);
      }
    });

    it("should NOT prefix no patterns with **", () => {
      const config = parseFsLintConfig(`
in src:
  no **/*.log, *.tmp
`);
      expect(config.rules).toHaveLength(1);
      if (config.rules[0]?.kind === "no") {
        expect(config.rules[0].names).toContain("**/*.log");
        expect(config.rules[0].names).toContain("src/*.tmp");
      }
    });
  });

  describe("deeply nested blocks", () => {
    it("should handle multiple levels of nesting", () => {
      const config = parseFsLintConfig(`
in app:
  in assets:
    in images:
      allow *.png, *.jpg
`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("inDirOnly");
      if (config.rules[0]?.kind === "inDirOnly") {
        expect(config.rules[0].dir).toBe("app/assets/images");
        expect(config.rules[0].only).toEqual(["app/assets/images/*.png", "app/assets/images/*.jpg"]);
      }
    });

    it("should handle mixed rules in nested blocks", () => {
      const config = parseFsLintConfig(`
in app:
  allow components, layouts
  in components:
    use PascalCase for files *.vue
    no *.test.vue
`);
      expect(config.rules.length).toBeGreaterThanOrEqual(3);
      
      const allowRule = config.rules.find(r => r.kind === "inDirOnly" && r.mode === "permissive" && r.dir === "app");
      expect(allowRule).toBeDefined();
      
      const namingRule = config.rules.find(r => r.kind === "naming" && r.pattern === "app/components/*.vue");
      expect(namingRule).toBeDefined();
      
      const noRule = config.rules.find(r => r.kind === "no");
      expect(noRule).toBeDefined();
      if (noRule?.kind === "no") {
        expect(noRule.names).toContain("app/components/*.test.vue");
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty nested block", () => {
      const config = parseFsLintConfig(`
in app:
`);
      expect(config.rules).toHaveLength(0);
    });

    it("should handle nested block with only comments", () => {
      const config = parseFsLintConfig(`
in app:
  # This is a comment
`);
      expect(config.rules).toHaveLength(0);
    });

    it("should handle allow with explicit in dir (should not double prefix)", () => {
      const config = parseFsLintConfig(`
in app:
  allow components in app
`);
      expect(config.rules).toHaveLength(1);
      if (config.rules[0]?.kind === "inDirOnly") {
        // Should handle correctly without duplicating the prefix
        expect(config.rules[0].dir).toBe("app");
        expect(config.rules[0].only).toEqual(["components"]);
      }
    });

    it("should handle patterns that already start with currentDir", () => {
      const config = parseFsLintConfig(`
in app:
  allow app/components
`);
      expect(config.rules).toHaveLength(1);
      if (config.rules[0]?.kind === "inDirOnly") {
        // If the pattern already starts with currentDir, it should not be duplicated
        expect(config.rules[0].only).toEqual(["app/components"]);
      }
    });
  });
});
