import { describe, expect, it } from "bun:test";
import { checkNamingStyle } from "../../src/utils/naming";
import type { NamingStyle } from "../../src/types";

describe("naming style validation", () => {
  describe("basic naming styles", () => {
    it("should validate PascalCase", () => {
      expect(checkNamingStyle("MyComponent.ts", "PascalCase").valid).toBe(true);
      expect(checkNamingStyle("myComponent.ts", "PascalCase").valid).toBe(false);
      expect(checkNamingStyle("my-component.ts", "PascalCase").valid).toBe(false);
    });

    it("should validate camelCase", () => {
      expect(checkNamingStyle("myComponent.ts", "camelCase").valid).toBe(true);
      expect(checkNamingStyle("MyComponent.ts", "camelCase").valid).toBe(false);
      expect(checkNamingStyle("my-component.ts", "camelCase").valid).toBe(false);
    });

    it("should validate kebab-case", () => {
      expect(checkNamingStyle("my-component.ts", "kebab-case").valid).toBe(true);
      expect(checkNamingStyle("myComponent.ts", "kebab-case").valid).toBe(false);
      expect(checkNamingStyle("MyComponent.ts", "kebab-case").valid).toBe(false);
    });

    it("should validate snake_case", () => {
      expect(checkNamingStyle("my_component.ts", "snake_case").valid).toBe(true);
      expect(checkNamingStyle("myComponent.ts", "snake_case").valid).toBe(false);
      expect(checkNamingStyle("my-component.ts", "snake_case").valid).toBe(false);
    });

    it("should validate SCREAMING_SNAKE_CASE", () => {
      expect(checkNamingStyle("MY_COMPONENT.ts", "SCREAMING_SNAKE_CASE").valid).toBe(true);
      expect(checkNamingStyle("my_component.ts", "SCREAMING_SNAKE_CASE").valid).toBe(false);
      expect(checkNamingStyle("MyComponent.ts", "SCREAMING_SNAKE_CASE").valid).toBe(false);
    });

    it("should validate flatcase", () => {
      expect(checkNamingStyle("mycomponent.ts", "flatcase").valid).toBe(true);
      expect(checkNamingStyle("myComponent.ts", "flatcase").valid).toBe(false);
      expect(checkNamingStyle("my-component.ts", "flatcase").valid).toBe(false);
      expect(checkNamingStyle("my_component.ts", "flatcase").valid).toBe(false);
    });
  });

  describe("prefix validation", () => {
    it("should require prefix when not optional", () => {
      // Required prefix: /^\d+\./
      expect(checkNamingStyle("0.setup.ts", "camelCase", "/^\\d+\\./").valid).toBe(true);
      expect(checkNamingStyle("setup.ts", "camelCase", "/^\\d+\\./").valid).toBe(false);
      expect(checkNamingStyle("1.setup.ts", "camelCase", "/^\\d+\\./").valid).toBe(true);
    });

    it("should allow optional prefix", () => {
      // Optional prefix: /(\d+\.)?/ (note: includes the dot)
      expect(checkNamingStyle("0.setup.ts", "camelCase", "/(\\d+\\.)?/").valid).toBe(true);
      expect(checkNamingStyle("setup.ts", "camelCase", "/(\\d+\\.)?/").valid).toBe(true);
    });

    it("should remove prefix before validation", () => {
      // Prefix /^\d+\./ should remove "0." and validate "camelCase"
      expect(checkNamingStyle("0.camelCase.ts", "camelCase", "/^\\d+\\./").valid).toBe(true);
      expect(checkNamingStyle("0.PascalCase.ts", "camelCase", "/^\\d+\\./").valid).toBe(false);
    });

    it("should handle prefix with use prefix", () => {
      // Prefix /^use/ should require "use" prefix
      // After removing "use", "MyFunction" should be PascalCase, not camelCase
      // So we test with PascalCase instead
      expect(checkNamingStyle("useMyFunction.ts", "PascalCase", "/^use/").valid).toBe(true);
      expect(checkNamingStyle("myFunction.ts", "PascalCase", "/^use/").valid).toBe(false);
      // Or test with camelCase where the remaining part is camelCase
      expect(checkNamingStyle("usemyFunction.ts", "camelCase", "/^use/").valid).toBe(true);
    });
  });

  describe("suffix validation", () => {
    it("should require suffix when not optional", () => {
      // Required suffix: /\.(client|server)$/i
      expect(checkNamingStyle("component.client.ts", "camelCase", undefined, "/\\.(client|server)$/i").valid).toBe(true);
      expect(checkNamingStyle("component.server.ts", "camelCase", undefined, "/\\.(client|server)$/i").valid).toBe(true);
      expect(checkNamingStyle("component.ts", "camelCase", undefined, "/\\.(client|server)$/i").valid).toBe(false);
    });

    it("should allow optional suffix", () => {
      // Optional suffix: /(\.(client|server))?$/i
      expect(checkNamingStyle("component.client.ts", "camelCase", undefined, "/(\\.(client|server))?$/i").valid).toBe(true);
      expect(checkNamingStyle("component.server.ts", "camelCase", undefined, "/(\\.(client|server))?$/i").valid).toBe(true);
      expect(checkNamingStyle("component.ts", "camelCase", undefined, "/(\\.(client|server))?$/i").valid).toBe(true);
    });

    it("should remove suffix before validation", () => {
      // Suffix /\.(client|server)$/i should remove ".client" and validate "component"
      expect(checkNamingStyle("component.client.ts", "camelCase", undefined, "/\\.(client|server)$/i").valid).toBe(true);
      expect(checkNamingStyle("Component.client.ts", "camelCase", undefined, "/\\.(client|server)$/i").valid).toBe(false);
    });

    it("should handle HTTP method suffixes", () => {
      // Suffix /\.(get|post)$/i for router.json.get.ts
      expect(checkNamingStyle("router.json.get.ts", "kebab-case", undefined, "/\\.(get|post)$/i").valid).toBe(true);
      expect(checkNamingStyle("router.json.post.ts", "kebab-case", undefined, "/\\.(get|post)$/i").valid).toBe(true);
      expect(checkNamingStyle("router.json.ts", "kebab-case", undefined, "/\\.(get|post)$/i").valid).toBe(false);
    });
  });

  describe("prefix and suffix combination", () => {
    it("should handle both prefix and suffix", () => {
      // 0.camelCase.server.ts with prefix /^\d+\./ and suffix /\.(client|server)$/i
      expect(checkNamingStyle("0.camelCase.server.ts", "camelCase", "/^\\d+\\./", "/\\.(client|server)$/i").valid).toBe(true);
      expect(checkNamingStyle("0.camelCase.client.ts", "camelCase", "/^\\d+\\./", "/\\.(client|server)$/i").valid).toBe(true);
      expect(checkNamingStyle("0.camelCase.ts", "camelCase", "/^\\d+\\./", "/\\.(client|server)$/i").valid).toBe(false);
      expect(checkNamingStyle("camelCase.server.ts", "camelCase", "/^\\d+\\./", "/\\.(client|server)$/i").valid).toBe(false);
    });

    it("should handle optional prefix with required suffix", () => {
      // Optional prefix /(\d+\.)?/ with required suffix /\.(client|server)$/i
      expect(checkNamingStyle("0.component.server.ts", "camelCase", "/(\\d+\\.)?/", "/\\.(client|server)$/i").valid).toBe(true);
      expect(checkNamingStyle("component.server.ts", "camelCase", "/(\\d+\\.)?/", "/\\.(client|server)$/i").valid).toBe(true);
      expect(checkNamingStyle("0.component.ts", "camelCase", "/(\\d+\\.)?/", "/\\.(client|server)$/i").valid).toBe(false);
    });

    it("should handle required prefix with optional suffix", () => {
      // Required prefix /^\d+\./ with optional suffix /(\.(client|server))?$/i
      expect(checkNamingStyle("0.component.server.ts", "camelCase", "/^\\d+\\./", "/(\\.(client|server))?$/i").valid).toBe(true);
      expect(checkNamingStyle("0.component.ts", "camelCase", "/^\\d+\\./", "/(\\.(client|server))?$/i").valid).toBe(true);
      expect(checkNamingStyle("component.server.ts", "camelCase", "/^\\d+\\./", "/(\\.(client|server))?$/i").valid).toBe(false);
    });

    it("should handle both optional prefix and suffix", () => {
      // Optional prefix /(\d+\.)?/ with optional suffix /(\.(client|server))?$/i
      expect(checkNamingStyle("0.component.server.ts", "camelCase", "/(\\d+\\.)?/", "/(\\.(client|server))?$/i").valid).toBe(true);
      expect(checkNamingStyle("component.server.ts", "camelCase", "/(\\d+\\.)?/", "/(\\.(client|server))?$/i").valid).toBe(true);
      expect(checkNamingStyle("0.component.ts", "camelCase", "/(\\d+\\.)?/", "/(\\.(client|server))?$/i").valid).toBe(true);
      expect(checkNamingStyle("component.ts", "camelCase", "/(\\d+\\.)?/", "/(\\.(client|server))?$/i").valid).toBe(true);
    });
  });

  describe("complex file names", () => {
    it("should handle router.json.get.ts pattern", () => {
      // router.json.get.ts with suffix /\.(get|post)$/i
      // After removing .ts: router.json.get
      // After removing .get: router.json
      // Should validate router.json as kebab-case (each part separately)
      expect(checkNamingStyle("router.json.get.ts", "kebab-case", undefined, "/\\.(get|post)$/i").valid).toBe(true);
      expect(checkNamingStyle("Router.json.get.ts", "kebab-case", undefined, "/\\.(get|post)$/i").valid).toBe(false);
    });

    it("should handle compound extensions", () => {
      // .d.ts should be treated as a single extension
      expect(checkNamingStyle("myComponent.d.ts", "camelCase").valid).toBe(true);
      expect(checkNamingStyle("MyComponent.d.ts", "camelCase").valid).toBe(false);
    });

    it("should handle test files", () => {
      // .test.ts should be treated as a single extension
      expect(checkNamingStyle("myComponent.test.ts", "camelCase").valid).toBe(true);
      expect(checkNamingStyle("MyComponent.test.ts", "camelCase").valid).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should allow pure numeric names", () => {
      // Pure numeric names should pass all naming style checks
      expect(checkNamingStyle("403.ts", "PascalCase").valid).toBe(true);
      expect(checkNamingStyle("404.ts", "camelCase").valid).toBe(true);
      expect(checkNamingStyle("500.ts", "kebab-case").valid).toBe(true);
    });

    it("should skip validation for special characters", () => {
      // Files with special characters like [slug] should skip validation
      expect(checkNamingStyle("[slug].ts", "camelCase").valid).toBe(true);
      expect(checkNamingStyle("中文.ts", "camelCase").valid).toBe(true);
    });

    it("should handle empty strings after prefix/suffix removal", () => {
      // Edge case: if prefix and suffix remove everything
      // This should be handled gracefully
      const result = checkNamingStyle("0..ts", "camelCase", "/^\\d+\\./", "/\\.$/");
      // Should fail, either because prefix doesn't match or style validation fails
      expect(result.valid).toBe(false);
    });
  });
});
