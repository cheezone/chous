import { describe, expect, it } from "bun:test";
import { parseFsLintConfig } from "../../src/parser";

describe("parser - nested blocks with must have", () => {
  describe("must have rules in nested blocks", () => {
    it("should prefix must have patterns in nested block", () => {
      const config = parseFsLintConfig(`
in app:
  must have index.html
`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("has");
      if (config.rules[0]?.kind === "has") {
        expect(config.rules[0].names).toEqual(["app/index.html"]);
      }
    });

    it("should handle must have with multiple items in nested block", () => {
      const config = parseFsLintConfig(`
in src:
  must have index.ts, main.ts
`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("has");
      if (config.rules[0]?.kind === "has") {
        expect(config.rules[0].names).toEqual(["src/index.ts", "src/main.ts"]);
      }
    });

    it("should handle has rules in nested block", () => {
      const config = parseFsLintConfig(`
in app:
  has package.json
`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("has");
      if (config.rules[0]?.kind === "has") {
        expect(config.rules[0].names).toEqual(["app/package.json"]);
      }
    });

    it("should NOT prefix must have patterns with **", () => {
      const config = parseFsLintConfig(`
in src:
  must have **/*.config.ts, index.ts
`);
      expect(config.rules).toHaveLength(1);
      if (config.rules[0]?.kind === "has") {
        expect(config.rules[0].names).toContain("**/*.config.ts");
        expect(config.rules[0].names).toContain("src/index.ts");
      }
    });

    it("should handle deeply nested must have rules", () => {
      const config = parseFsLintConfig(`
in app:
  in public:
    must have index.html, favicon.ico
`);
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0]?.kind).toBe("has");
      if (config.rules[0]?.kind === "has") {
        expect(config.rules[0].names).toEqual(["app/public/index.html", "app/public/favicon.ico"]);
      }
    });

    it("should handle must have with glob patterns in nested block", () => {
      const config = parseFsLintConfig(`
in app:
  must have *.config.{ts,js}
`);
      expect(config.rules).toHaveLength(1);
      if (config.rules[0]?.kind === "has") {
        // 注意：大括号扩展的模式应该被正确处理
        expect(config.rules[0].names.length).toBeGreaterThan(0);
      }
    });
  });
});
