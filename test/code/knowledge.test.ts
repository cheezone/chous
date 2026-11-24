import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildWorkspaceSnapshot } from "../../src/vfs/snapshot";
import {
  detectKinds,
  detectRoleOccupancy,
  getKnowledge,
} from "../../src/knowledge";
import { lintWorkspace } from "../../src/rules/lint";

describe("knowledge / roles", () => {
  it("exposes tools and kinds", () => {
    const k = getKnowledge();
    expect(k.tools.length).toBeGreaterThan(10);
    expect(k.kinds.some((x) => x.id === "cli")).toBe(true);
  });

  it("detects roles and kinds from a memory snapshot", async () => {
    const root = mkdtempSync(join(tmpdir(), "chous-know-"));
    try {
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({
          name: "demo",
          type: "module",
          bin: { demo: "dist/cli.mjs" },
          packageManager: "pnpm@10.0.0",
          devDependencies: { oxlint: "1.0.0", vitest: "3.0.0" },
        }),
      );
      writeFileSync(join(root, ".oxlintrc.json"), "{}");
      writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
      const snap = await buildWorkspaceSnapshot({ root, rootOnly: true });
      const roles = detectRoleOccupancy(snap);
      expect(roles.get("package-manager")?.some((o) => o.toolId === "pnpm")).toBe(true);
      expect(roles.get("linter")?.some((o) => o.toolId === "oxlint")).toBe(true);
      const kinds = detectKinds(snap);
      expect(kinds).toContain("cli");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("leaves a lone linter alone, whichever it is", async () => {
    const root = mkdtempSync(join(tmpdir(), "chous-stack-"));
    try {
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "demo", type: "module", devDependencies: { eslint: "9.0.0" } }));
      writeFileSync(join(root, "eslint.config.js"), "export default []\n");
      const result = await lintWorkspace({ root });
      expect(result.issues.filter((i) => i.ruleKind === "stack")).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags two package managers at once", async () => {
    const root = mkdtempSync(join(tmpdir(), "chous-stack-"));
    try {
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "demo", type: "module" }));
      writeFileSync(join(root, "package-lock.json"), "{}");
      writeFileSync(join(root, "yarn.lock"), "");
      const result = await lintWorkspace({ root });
      const conflict = result.issues.find((i) => i.message.key === "issue.stack.conflict");
      expect(conflict?.message.params).toEqual({ role: "package manager", tools: "npm + yarn" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
