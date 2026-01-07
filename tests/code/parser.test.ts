import { describe, expect, it } from "bun:test";
import { parseFsLintConfig } from "../../src/config/parser";
import { FsLintError } from "../../src/errors";

describe("parser", () => {
  describe("import", () => {
    it("should parse import statements", () => {
      const config = parseFsLintConfig("import basic\nimport js");
      // Import statements are parsed and rules from imported files are included
      expect(config.rules.length).toBeGreaterThan(0);
      // Verify that imported rules are present (from presets)
    });
  });

  describe("move", () => {
    it("should parse move rules", () => {
      const config = parseFsLintConfig("move *.log to logs");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("move");
      if (config.rules[0]?.kind === "move") {
        expect(config.rules[0].from).toBe("*.log");
        expect(config.rules[0].toDir).toBe("logs");
      }
    });
  });

  describe("rename", () => {
    it("should parse rename directory rules", () => {
      const config = parseFsLintConfig("rename test, specs, spec to tests");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("renameDir");
      if (config.rules[0]?.kind === "renameDir") {
        expect(config.rules[0].fromNames).toEqual(["test", "specs", "spec"]);
        expect(config.rules[0].toName).toBe("tests");
      }
    });

    it("should parse rename glob rules", () => {
      const config = parseFsLintConfig("rename tests/**/*.spec.ts to tests/**/*.test.ts");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("renameGlob");
      if (config.rules[0]?.kind === "renameGlob") {
        expect(config.rules[0].from).toBe("tests/**/*.spec.ts");
        expect(config.rules[0].to).toBe("tests/**/*.test.ts");
      }
    });

    it("should support relative path targets in rename glob", () => {
      const config = parseFsLintConfig("rename tests/**/*.{spec,tests}.ts to *.test.ts");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("renameGlob");
      if (config.rules[0]?.kind === "renameGlob") {
        expect(config.rules[0].from).toBe("tests/**/*.{spec,tests}.ts");
        expect(config.rules[0].to).toBe("tests/**/*.test.ts");
      }
    });
  });

  describe("use naming syntax", () => {
    it("should parse use syntax for dirs with glob pattern", () => {
      const config = parseFsLintConfig("use PascalCase for dirs tests/** except e2e");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("naming");
      if (config.rules[0]?.kind === "naming") {
        expect(config.rules[0].target).toBe("in");
        expect(config.rules[0].pattern).toBe("tests/**");
        expect(config.rules[0].style).toBe("PascalCase");
        expect(config.rules[0].fileType).toBe("dirs");
        expect(config.rules[0].except).toEqual(["e2e"]);
      }
    });

    it("should parse use syntax for files with glob pattern", () => {
      const config = parseFsLintConfig("use PascalCase for files tests/**/*.test.ts");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("naming");
      if (config.rules[0]?.kind === "naming") {
        expect(config.rules[0].target).toBe("those");
        expect(config.rules[0].pattern).toBe("tests/**/*.test.ts");
        expect(config.rules[0].style).toBe("PascalCase");
        expect(config.rules[0].fileType).toBe("files");
      }
    });

    it("should parse use syntax for dirs without fileType", () => {
      const config = parseFsLintConfig("use kebab-case for src");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("naming");
      if (config.rules[0]?.kind === "naming") {
        expect(config.rules[0].target).toBe("in");
        expect(config.rules[0].pattern).toBe("src");
        expect(config.rules[0].style).toBe("kebab-case");
        expect(config.rules[0].fileType).toBeUndefined();
      }
    });

    it("should parse use syntax with multiple styles", () => {
      const config = parseFsLintConfig("use kebab-case, PascalCase for files components/**/*.vue");
      expect(config.rules).toHaveLength(2);
      expect(config.rules[0]?.kind).toBe("naming");
      expect(config.rules[1]?.kind).toBe("naming");
      if (config.rules[0]?.kind === "naming" && config.rules[1]?.kind === "naming") {
        expect(config.rules[0].pattern).toBe("components/**/*.vue");
        expect(config.rules[0].style).toBe("kebab-case");
        expect(config.rules[1].pattern).toBe("components/**/*.vue");
        expect(config.rules[1].style).toBe("PascalCase");
        expect(config.rules[0].fileType).toBe("files");
        expect(config.rules[1].fileType).toBe("files");
      }
    });

    it("should parse use syntax with multiple styles for dirs", () => {
      const config = parseFsLintConfig("use kebab-case, PascalCase for dirs components prefix: /^_/");
      expect(config.rules).toHaveLength(2);
      expect(config.rules[0]?.kind).toBe("naming");
      expect(config.rules[1]?.kind).toBe("naming");
      if (config.rules[0]?.kind === "naming" && config.rules[1]?.kind === "naming") {
        expect(config.rules[0].pattern).toBe("components");
        expect(config.rules[0].style).toBe("kebab-case");
        expect(config.rules[1].pattern).toBe("components");
        expect(config.rules[1].style).toBe("PascalCase");
        expect(config.rules[0].fileType).toBe("dirs");
        expect(config.rules[1].fileType).toBe("dirs");
        expect(config.rules[0].prefix).toBe("/^_/");
        expect(config.rules[1].prefix).toBe("/^_/");
      }
    });
  });

  describe("in naming", () => {
    it("should parse in naming rules", () => {
      const config = parseFsLintConfig("in tests dirs naming kebab-case");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("naming");
      if (config.rules[0]?.kind === "naming") {
        expect(config.rules[0].target).toBe("in");
        expect(config.rules[0].pattern).toBe("tests");
        expect(config.rules[0].style).toBe("kebab-case");
        expect(config.rules[0].fileType).toBe("dirs");
      }
    });

    it("should parse in naming with except", () => {
      const config = parseFsLintConfig("in tests dirs naming kebab-case except e2e, __snapshots__");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("naming");
      if (config.rules[0]?.kind === "naming") {
        expect(config.rules[0].except).toEqual(["e2e", "__snapshots__"]);
      }
    });
  });

  describe("those naming", () => {
    it("should parse those naming rules", () => {
      const config = parseFsLintConfig("those tests/**/*.test.ts files naming PascalCase");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("naming");
      if (config.rules[0]?.kind === "naming") {
        expect(config.rules[0].target).toBe("those");
        expect(config.rules[0].pattern).toBe("tests/**/*.test.ts");
        expect(config.rules[0].style).toBe("PascalCase");
        expect(config.rules[0].fileType).toBe("files");
      }
    });
  });

  describe("strict for", () => {
    it("should parse strict files for pattern", () => {
      const config = parseFsLintConfig("allow README.md, CHANGELOG.md\nstrict files for *.md");
      expect(config.rules).toHaveLength(2);
      expect(config.rules[1]?.kind).toBe("thoseOnly");
      if (config.rules[1]?.kind === "thoseOnly") {
        expect(config.rules[1].pattern).toBe("*.md");
        expect(config.rules[1].only).toEqual(["README.md", "CHANGELOG.md"]);
      }
    });

    it("should parse strict dirs for pattern", () => {
      const config = parseFsLintConfig("allow src, lib\nstrict dirs for **/");
      expect(config.rules).toHaveLength(2);
      expect(config.rules[1]?.kind).toBe("thoseOnly");
      if (config.rules[1]?.kind === "thoseOnly") {
        expect(config.rules[1].pattern).toBe("**/");
        expect(config.rules[1].only).toEqual(["src", "lib"]);
      }
    });
  });

  describe("strict in", () => {
    it("should parse strict in dir", () => {
      const config = parseFsLintConfig("allow **/*.ts\nstrict in src");
      expect(config.rules).toHaveLength(2);
      expect(config.rules[1]?.kind).toBe("inDirOnly");
      if (config.rules[1]?.kind === "inDirOnly") {
        expect(config.rules[1].dir).toBe("src");
        expect(config.rules[1].only).toEqual(["**/*.ts"]);
        expect(config.rules[1].mode).toBe("strict");
        expect(config.rules[1].fileType).toBeUndefined();
      }
    });

    it("should parse strict files in dir", () => {
      const config = parseFsLintConfig("allow **/*.ts\nstrict files in src");
      expect(config.rules).toHaveLength(2);
      expect(config.rules[1]?.kind).toBe("inDirOnly");
      if (config.rules[1]?.kind === "inDirOnly") {
        expect(config.rules[1].dir).toBe("src");
        expect(config.rules[1].only).toEqual(["**/*.ts"]);
        expect(config.rules[1].mode).toBe("strict");
        expect(config.rules[1].fileType).toBe("files");
      }
    });

    it("should parse strict dirs in dir", () => {
      const config = parseFsLintConfig("allow components, lib\nstrict dirs in app");
      expect(config.rules).toHaveLength(2);
      expect(config.rules[1]?.kind).toBe("inDirOnly");
      if (config.rules[1]?.kind === "inDirOnly") {
        expect(config.rules[1].dir).toBe("app");
        expect(config.rules[1].only).toEqual(["components", "lib"]);
        expect(config.rules[1].mode).toBe("strict");
        expect(config.rules[1].fileType).toBe("dirs");
      }
    });
  });

  describe("in allow", () => {
    it("should parse in allow rules (legacy)", () => {
      const config = parseFsLintConfig("in app allow assets, components");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("inDirOnly");
      if (config.rules[0]?.kind === "inDirOnly") {
        expect(config.rules[0].dir).toBe("app");
        expect(config.rules[0].only).toEqual(["assets", "components"]);
        expect(config.rules[0].mode).toBe("permissive");
      }
    });

    it("should parse allow in syntax (simplified)", () => {
      const config = parseFsLintConfig("allow assets, components in app");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("inDirOnly");
      if (config.rules[0]?.kind === "inDirOnly") {
        expect(config.rules[0].dir).toBe("app");
        expect(config.rules[0].only).toEqual(["assets", "components"]);
        expect(config.rules[0].mode).toBe("permissive");
      }
    });

    it("should parse in allow with array syntax", () => {
      const config = parseFsLintConfig(`in app allow [
        assets, components, composables,
        layouts, middleware, pages
      ]`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("inDirOnly");
      if (config.rules[0]?.kind === "inDirOnly") {
        expect(config.rules[0].dir).toBe("app");
        expect(config.rules[0].only).toEqual(["assets", "components", "composables", "layouts", "middleware", "pages"]);
        expect(config.rules[0].mode).toBe("permissive");
      }
    });

    it("should parse allow [...] in dir syntax (simplified with array)", () => {
      const config = parseFsLintConfig(`allow [
        assets, components, composables, layouts,
        middleware, pages, plugins, utils,
        app.config.ts, app.vue, error.vue
      ] in app`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("inDirOnly");
      if (config.rules[0]?.kind === "inDirOnly") {
        expect(config.rules[0].dir).toBe("app");
        expect(config.rules[0].only).toEqual([
          "assets", "components", "composables", "layouts",
          "middleware", "pages", "plugins", "utils",
          "app.config.ts", "app.vue", "error.vue"
        ]);
        expect(config.rules[0].mode).toBe("permissive");
      }
    });
  });

  describe("no", () => {
    it("should parse no rules", () => {
      const config = parseFsLintConfig("no *.sh, *.py");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("no");
      if (config.rules[0]?.kind === "no") {
        expect(config.rules[0].names).toEqual(["*.sh", "*.py"]);
      }
    });
  });

  describe("has", () => {
    it("should parse has rules", () => {
      const config = parseFsLintConfig("has package.json, tsconfig.json");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("has");
      if (config.rules[0]?.kind === "has") {
        expect(config.rules[0].names).toEqual(["package.json", "tsconfig.json"]);
      }
    });

    it("should parse must have rules", () => {
      const config = parseFsLintConfig("must have package.json");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("has");
      if (config.rules[0]?.kind === "has") {
        expect(config.rules[0].names).toEqual(["package.json"]);
      }
    });

    it("should parse must have rules with multiple items", () => {
      const config = parseFsLintConfig("must have package.json, tsconfig.json");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("has");
      if (config.rules[0]?.kind === "has") {
        expect(config.rules[0].names).toEqual(["package.json", "tsconfig.json"]);
      }
    });

    it("should parse must have rules with glob patterns", () => {
      const config = parseFsLintConfig("must have next.config.*");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("has");
      if (config.rules[0]?.kind === "has") {
        expect(config.rules[0].names).toEqual(["next.config.*"]);
      }
    });

    it("should parse has rules with glob patterns", () => {
      const config = parseFsLintConfig("has *.config.{js,ts,mjs}");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("has");
      if (config.rules[0]?.kind === "has") {
        expect(config.rules[0].names).toEqual(["*.config.{js,ts,mjs}"]);
      }
    });
  });

  describe("where directive", () => {
    it("should parse where:cwd directive", () => {
      const config = parseFsLintConfig("[where:cwd]\nno *.log");
      expect(config.where.type).toBe("cwd");
      expect(config.rules).toHaveLength(1);
    });

    it("should parse where:glob directive", () => {
      const config = parseFsLintConfig("[where:package.json]\nno *.log");
      expect(config.where.type).toBe("glob");
      if (config.where.type === "glob") {
        expect(config.where.patterns).toEqual(["package.json"]);
      }
    });
  });

  describe("error handling", () => {
    it("should throw error for invalid naming style", () => {
      expect(() => {
        parseFsLintConfig("in src naming invalidStyle");
      }).toThrow();
    });

    it("should throw error for malformed rename rule", () => {
      expect(() => {
        parseFsLintConfig("rename test to");
      }).toThrow();
    });
  });

  describe("comments", () => {
    it("should ignore comments", () => {
      const config = parseFsLintConfig("# This is a comment\nno *.log\n# Another comment");
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("no");
    });
  });

  describe("line continuation", () => {
    it("should handle backslash line continuation", () => {
      const config = parseFsLintConfig("no *.sh, \\\n*.py, *.bat");
      expect(config.rules).toHaveLength(1);
      if (config.rules[0]?.kind === "no") {
        expect(config.rules[0].names).toEqual(["*.sh", "*.py", "*.bat"]);
      }
    });
  });
});
