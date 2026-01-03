import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const CLI_PATH = resolve(PROJECT_ROOT, "dist/cli.mjs");

/**
 * Helper to create a temporary directory that is automatically deleted
 * when the 'using' scope ends.
 * Bun/Node compatibility: Implement Symbolic.dispose for Explicit Resource Management.
 */
class DisposableTempDir {
    path: string;
    constructor(prefix: string) {
        this.path = mkdtempSync(join(tmpdir(), prefix));
    }
    [Symbol.dispose]() {
        try {
            if (existsSync(this.path)) {
                rmSync(this.path, { recursive: true, force: true });
            }
        } catch {
            // Ignore cleanup errors
        }
    }
}

/**
 * CI-only gating: 
 * These tests involve file system side effects and are intended 
 * to verify cross-platform behavior in CI environments.
 */
const shouldSkip = !process.env.CI;

describe("chous init", () => {
    if (shouldSkip) {
        it.skip("should only run in CI environment", () => { });
        return;
    }

    function runInit(cwd: string, lang = "en") {
        const proc = Bun.spawnSync(["node", CLI_PATH, "init", "-l", lang], {
            cwd,
            stdout: "pipe",
            stderr: "pipe",
            env: { ...process.env, NO_COLOR: "1" },
        });
        return {
            code: proc.exitCode,
            stdout: proc.stdout.toString(),
            stderr: proc.stderr.toString(),
        };
    }

    it("should generate basic config for empty project", () => {
        using tmp = new DisposableTempDir("fslint-init-test-");
        const projectDir = tmp.path;
        const r = runInit(projectDir);

        expect(r.code).toBe(0);
        const configPath = resolve(projectDir, ".chous");
        expect(existsSync(configPath)).toBe(true);

        const content = readFileSync(configPath, "utf8");
        expect(content).toContain("import basic");
        // Should NOT contain framework imports
        expect(content).not.toContain("import nuxt4");
        expect(content).not.toContain("import nextjs");
    });

    it("should detect Nuxt project", () => {
        using tmp = new DisposableTempDir("fslint-init-test-");
        const projectDir = tmp.path;
        writeFileSync(resolve(projectDir, "nuxt.config.ts"), "");

        const r = runInit(projectDir);
        expect(r.code).toBe(0);

        const content = readFileSync(resolve(projectDir, ".chous"), "utf8");
        expect(content).toContain("import basic");
        expect(content).toContain("import nuxt4");
    });

    it("should detect Next.js project", () => {
        using tmp = new DisposableTempDir("fslint-init-test-");
        const projectDir = tmp.path;
        writeFileSync(resolve(projectDir, "next.config.js"), "");

        const r = runInit(projectDir);
        expect(r.code).toBe(0);

        const content = readFileSync(resolve(projectDir, ".chous"), "utf8");
        expect(content).toContain("import basic");
        expect(content).toContain("import nextjs");
    });

    it("should detect Go project", () => {
        using tmp = new DisposableTempDir("fslint-init-test-");
        const projectDir = tmp.path;
        writeFileSync(resolve(projectDir, "go.mod"), "module test");

        const r = runInit(projectDir);
        expect(r.code).toBe(0);

        const content = readFileSync(resolve(projectDir, ".chous"), "utf8");
        expect(content).toContain("import basic");
        expect(content).toContain("import go");
    });

    it("should detect Python project", () => {
        using tmp = new DisposableTempDir("fslint-init-test-");
        const projectDir = tmp.path;
        writeFileSync(resolve(projectDir, "pyproject.toml"), "");

        const r = runInit(projectDir);
        expect(r.code).toBe(0);

        const content = readFileSync(resolve(projectDir, ".chous"), "utf8");
        expect(content).toContain("import basic");
        expect(content).toContain("import python");
    });

    it("should detect mixed project (Go + Nuxt)", () => {
        using tmp = new DisposableTempDir("fslint-init-test-");
        const projectDir = tmp.path;
        writeFileSync(resolve(projectDir, "go.mod"), "module test");
        writeFileSync(resolve(projectDir, "nuxt.config.ts"), "");

        const r = runInit(projectDir);
        expect(r.code).toBe(0);

        const content = readFileSync(resolve(projectDir, ".chous"), "utf8");
        expect(content).toContain("import basic");
        expect(content).toContain("import go");
        expect(content).toContain("import nuxt4");

        // Check order: basic -> go -> nuxt4
        const basicIdx = content.indexOf("import basic");
        const goIdx = content.indexOf("import go");
        const nuxtIdx = content.indexOf("import nuxt4");
        expect(basicIdx).toBeLessThan(goIdx);
        expect(goIdx).toBeLessThan(nuxtIdx);
    });

    it("should generate localized config (Simplified Chinese)", () => {
        using tmp = new DisposableTempDir("fslint-init-test-");
        const projectDir = tmp.path;
        const r = runInit(projectDir, "zh");

        expect(r.code).toBe(0);
        const content = readFileSync(resolve(projectDir, ".chous"), "utf8");

        // Verify some Chinese characters from the template
        expect(content).toContain("通过结构约束来对抗混乱");
    });

    it("should not overwrite existing .chous", () => {
        using tmp = new DisposableTempDir("fslint-init-test-");
        const projectDir = tmp.path;
        const configPath = resolve(projectDir, ".chous");
        const originalContent = "custom config";
        writeFileSync(configPath, originalContent);

        const r = runInit(projectDir);
        expect(r.code).toBe(0);
        expect(r.stdout).toContain("already exists");

        const content = readFileSync(configPath, "utf8");
        expect(content).toBe(originalContent);
    });
});
