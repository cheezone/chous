import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { readdirSync, statSync } from "node:fs";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const CLI_PATH = resolve(PROJECT_ROOT, "src/cli.ts");
const SAMPLES_ROOT = resolve(PROJECT_ROOT, "tests/samples");

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

// Automatically discover all projects in the samples directory
function getSampleProjects(): string[] {
  const projects: string[] = [];
  try {
    const entries = readdirSync(SAMPLES_ROOT);
    for (const entry of entries) {
      const entryPath = resolve(SAMPLES_ROOT, entry);
      if (statSync(entryPath).isDirectory()) {
        projects.push(entry);
      }
    }
  } catch (error) {
    console.error("Error reading samples directory:", error);
  }
  return projects.sort();
}

describe("samples (expected to pass)", () => {
  const projects = getSampleProjects();
  
  for (const projectName of projects) {
    it(`${projectName} should pass lint check`, () => {
      const projectPath = resolve(SAMPLES_ROOT, projectName);
      const r = runCli(["--no-color", "-l", "en"], projectPath);
      
      if (r.code !== 0) {
        console.log(`${projectName} lint output:`, r.stdout);
        console.log(`${projectName} lint errors:`, r.stderr);
      }
      expect(r.code).toBe(0);
    });
  }
});
