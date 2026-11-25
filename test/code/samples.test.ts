import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const CLI_PATH = resolve(PROJECT_ROOT, "src/cli.ts");
const SAMPLES = resolve(PROJECT_ROOT, "test/samples");

function runCli(cwd: string) {
  const proc = spawnSync(process.execPath, ["--import", "tsx", CLI_PATH, "--no-color", "-l", "en", "-v"], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  return { code: proc.status, stdout: proc.stdout ?? "", stderr: proc.stderr ?? "" };
}

/**
 * Real projects measured against the taste. Most of them do not share it —
 * these lock in what chous says about them.
 */
describe("real-world samples", () => {
  for (const name of ["project-layout", "nuxt.com", "pythondotorg", "ai-chatbot"]) {
    it(`${name} has nothing rotten`, () => {
      const r = runCli(resolve(SAMPLES, name));
      if (r.code !== 0) console.log(r.stdout, r.stderr);
      expect(r.code).toBe(0);
    });
  }

  it("ai-chatbot still hears about what the platform ships", () => {
    const r = runCli(resolve(SAMPLES, "ai-chatbot"));
    expect(r.stdout).toContain("dependency dotenv is built in now → process.loadEnvFile()");
    expect(r.stdout).toContain('add "type"');
  });
});
