import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import { readdirSync, statSync } from "node:fs";

const PROJECT_ROOT = resolve(import.meta.dir, "../..");
const CLI_PATH = resolve(PROJECT_ROOT, "src/cli.ts");
const FIXTURES_ROOT = resolve(PROJECT_ROOT, "tests/fixtures");

function runCli(args: string[], cwd: string) {
  const proc = Bun.spawnSync(["bun", "run", CLI_PATH, ...args], {
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

// 自动发现 fixtures 目录下的所有项目
function getFixtureProjects(): string[] {
  const projects: string[] = [];
  try {
    const entries = readdirSync(FIXTURES_ROOT);
    for (const entry of entries) {
      const entryPath = resolve(FIXTURES_ROOT, entry);
      if (statSync(entryPath).isDirectory()) {
        projects.push(entry);
      }
    }
  } catch (error) {
    console.error("Error reading fixtures directory:", error);
  }
  return projects.sort();
}

describe("fixtures (expected to fail)", () => {
  const projects = getFixtureProjects();
  
  for (const projectName of projects) {
    it(`${projectName} should detect errors`, () => {
      const projectPath = resolve(FIXTURES_ROOT, projectName);
      const r = runCli(["--no-color", "-l", "en"], projectPath);
      
      if (r.code === 0) {
        console.log(`${projectName} lint output:`, r.stdout);
        console.log(`${projectName} lint errors:`, r.stderr);
      }
      expect(r.code).not.toBe(0);
    });
  }
});
