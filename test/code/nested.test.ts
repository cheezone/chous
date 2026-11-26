import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { lintWorkspace } from "../../src/rules/lint";

describe("nested projects", () => {
  it("lints a project with its own lockfile as a project, without calling its lockfile misplaced", async () => {
    const root = mkdtempSync(join(tmpdir(), "chous-nested-"));
    try {
      const write = (path: string, content: string) => {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), content);
      };
      write("package.json", JSON.stringify({ name: "root", private: true, packageManager: "pnpm@11.0.0" }));
      write("pnpm-lock.yaml", "lockfileVersion: '9.0'\n");
      write("frontend/package.json", JSON.stringify({ name: "frontend", private: true, dependencies: { moment: "^2.30.0" } }));
      write("frontend/package-lock.json", "{}");
      write("backend/package.json", JSON.stringify({ name: "backend", private: true }));
      write("backend/yarn.lock", "");
      const issues = (await lintWorkspace({ root })).issues;
      expect(issues.map((i) => i.displayPath)).toContain("frontend/package.json (moment)");
      expect(JSON.stringify(issues)).not.toContain("nestedLockfile");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
