import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { readdirSync, statSync } from "node:fs";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const CLI_PATH = resolve(PROJECT_ROOT, "src/cli.ts");
const FIXTURES_ROOT = resolve(PROJECT_ROOT, "tests/fixtures");
const PASS_FIXTURES_ROOT = resolve(FIXTURES_ROOT, "pass");
const FAIL_FIXTURES_ROOT = resolve(FIXTURES_ROOT, "fail");

function runCli(args: string[], cwd: string) {
  // Run the TypeScript CLI directly through tsx
  const proc = spawnSync(process.execPath, ["--import", "tsx", CLI_PATH, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  return {
    code: proc.status,
    stdout: proc.stdout ?? "",
    stderr: proc.stderr ?? "",
  };
}

// Automatically discover all projects in a fixtures subdirectory
function getFixtureProjects(fixturesDir: string): string[] {
  const projects: string[] = [];
  try {
    const entries = readdirSync(fixturesDir);
    for (const entry of entries) {
      const entryPath = resolve(fixturesDir, entry);
      if (statSync(entryPath).isDirectory()) {
        projects.push(entry);
      }
    }
  } catch (error) {
    // Directory might not exist yet, that's okay
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Error reading fixtures directory:", error);
    }
  }
  return projects.sort();
}

describe("code fixtures (expected to pass)", () => {
  const projects = getFixtureProjects(PASS_FIXTURES_ROOT);
  
  for (const projectName of projects) {
    it(`${projectName} should pass lint check`, () => {
      const projectPath = resolve(PASS_FIXTURES_ROOT, projectName);
      const r = runCli(["--no-color", "-l", "en"], projectPath);
      
      if (r.code !== 0) {
        console.log(`${projectName} lint output:`, r.stdout);
        console.log(`${projectName} lint errors:`, r.stderr);
      }
      expect(r.code).toBe(0);
    });
  }
});

describe("code fixtures (expected to fail)", () => {
  const projects = getFixtureProjects(FAIL_FIXTURES_ROOT);
  
  for (const projectName of projects) {
    it(`${projectName} should detect errors`, () => {
      const projectPath = resolve(FAIL_FIXTURES_ROOT, projectName);
      const r = runCli(["--no-color", "-l", "en"], projectPath);
      
      if (r.code === 0) {
        console.log(`${projectName} lint output:`, r.stdout);
        console.log(`${projectName} lint errors:`, r.stderr);
      }
      expect(r.code).not.toBe(0);
    });
  }
});
