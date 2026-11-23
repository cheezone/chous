import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildWorkspaceSnapshot } from "../../src/vfs/snapshot";
import {
  detectKinds,
  detectRoleOccupancy,
  getKnowledge,
  toolFileEffects,
} from "../../src/knowledge";
import { lintWorkspace } from "../../src/rules/lint";

describe("knowledge / roles", () => {
  it("exposes tools, kinds, and migrations", () => {
    const k = getKnowledge();
    expect(k.tools.length).toBeGreaterThan(10);
    expect(k.kinds.some((x) => x.id === "cli")).toBe(true);
    expect(k.migrations.some((m) => m.from === "eslint" && m.to === "oxlint")).toBe(true);
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

  it("auto-allows declared tool files and forbids siblings", () => {
    const effects = toolFileEffects(new Map([["linter", ["oxlint"]]]));
    expect(effects.allow.some((f) => f.includes("oxlint") || f.includes(".oxlintrc"))).toBe(true);
    expect(effects.forbid.some((f) => f.includes("eslint"))).toBe(true);
  });

  it("reports role mismatch with agent resolution for eslint→oxlint", async () => {
    const root = mkdtempSync(join(tmpdir(), "chous-role-"));
    try {
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({
          name: "demo",
          devDependencies: { eslint: "9.0.0" },
        }),
      );
      writeFileSync(join(root, "eslint.config.js"), "export default []\n");
      const result = await lintWorkspace({ root });
      const mismatch = result.issues.find((i) => i.message.key === "issue.role.mismatch");
      expect(mismatch).toBeTruthy();
      expect(mismatch?.resolution).toBe("agent");
      expect(mismatch?.see).toContain("oxc.rs");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
