import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const CLI_PATH = resolve(PROJECT_ROOT, "src/cli.ts");
const FAIL_ANTFU = resolve(PROJECT_ROOT, "tests/fixtures/fail/preset-antfu");

function runCli(args: string[], cwd: string, stdin?: string) {
  const proc = spawnSync(process.execPath, ["--import", "tsx", CLI_PATH, ...args], {
    cwd,
    encoding: "utf8",
    input: stdin,
    env: { ...process.env, NO_COLOR: "1" },
  });
  return { code: proc.status, stdout: proc.stdout ?? "", stderr: proc.stderr ?? "" };
}

describe("claude hooks", () => {
  it("blocks a stop when the rules fail", () => {
    const input = JSON.stringify({
      hook_event_name: "Stop",
      cwd: FAIL_ANTFU,
      stop_hook_active: false,
    });
    const r = runCli(["claude", "stop", "--no-color", "-l", "en"], FAIL_ANTFU, input);
    expect(r.code).toBe(0);
    const payload = JSON.parse(r.stdout);
    expect(payload.decision).toBe("block");
    expect(payload.reason).toContain("prettier");
    expect(payload.reason).not.toContain("Thanks Cheez");
  });

  it("lets the agent stop when a stop hook is already active", () => {
    const input = JSON.stringify({ hook_event_name: "Stop", cwd: FAIL_ANTFU, stop_hook_active: true });
    const r = runCli(["claude", "stop", "--no-color", "-l", "en"], FAIL_ANTFU, input);
    expect(r.stdout.trim()).toBe("");
  });

  it("returns additional context after an edit", () => {
    const input = JSON.stringify({
      hook_event_name: "PostToolUse",
      cwd: FAIL_ANTFU,
      tool_input: { file_path: join(FAIL_ANTFU, "package.json") },
    });
    const r = runCli(["claude", "after-edit", "--no-color", "-l", "en"], FAIL_ANTFU, input);
    const payload = JSON.parse(r.stdout);
    expect(payload.hookSpecificOutput.hookEventName).toBe("PostToolUse");
    expect(payload.hookSpecificOutput.additionalContext).toContain("prettier");
  });

  it("merges into an existing settings file and stays idempotent", () => {
    const dir = mkdtempSync(join(PROJECT_ROOT, "tests", "tmp-claude-"));
    try {
      mkdirSync(join(dir, ".claude"));
      writeFileSync(join(dir, ".claude", "settings.json"), JSON.stringify({
        hooks: {
          PostToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "echo hi" }] }],
        },
      }, null, 2), "utf8");

      const first = runCli(["claude", "install", "--no-color", "-l", "en"], dir);
      expect(first.code).toBe(0);
      expect(first.stdout).toContain("https://github.com/cheezone/chous");

      const second = runCli(["claude", "install", "--no-color", "-l", "en"], dir);
      expect(second.code).toBe(0);

      const settings = JSON.parse(readFileSync(join(dir, ".claude", "settings.json"), "utf8"));
      const post = settings.hooks.PostToolUse as Array<{ matcher?: string; hooks: Array<{ command: string }> }>;
      expect(post.some((group) => group.matcher === "Bash" && group.hooks[0]?.command === "echo hi")).toBe(true);
      const chousEdits = post.filter((group) => group.hooks.some((hook) => hook.command.includes("chous claude after-edit")));
      expect(chousEdits).toHaveLength(1);
      expect(chousEdits[0]?.matcher).toBe("Write|Edit|MultiEdit");
      const stops = (settings.hooks.Stop as Array<{ hooks: Array<{ command: string }> }>)
        .flatMap((group) => group.hooks)
        .filter((hook) => hook.command.includes("chous claude stop"));
      expect(stops).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
