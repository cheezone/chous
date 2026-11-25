import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { lintWorkspace } from "../../src/rules/lint";

// Key-shaped strings are assembled at runtime, so this file never contains one
// (and push protection never mistakes it for a leak).
// Pseudo-random, so it passes the "obviously typed fake" check.
const body = (n: number, seed = 7) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < n; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    out += chars[seed % chars.length];
  }
  return out;
};
const jwt = (payload: object) =>
  ["eyJhbGciOiJIUzI1NiJ9", Buffer.from(JSON.stringify(payload)).toString("base64url"), body(43)].join(".");

async function findings(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "chous-leaks-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content, "utf8");
  }
  const result = await lintWorkspace({ root });
  return result.issues.map((i) => i.displayPath).sort();
}

describe("committed secrets", () => {
  it("finds keys that are secret by definition", async () => {
    expect(
      await findings({
        ".env.production": `OPENAI_API_KEY=${"sk-proj-"}${body(48)}\nANTHROPIC_API_KEY=${"sk-ant-api03-"}${body(48, 11)}\n`,
        "src/admin.ts": `export const key = "${jwt({ role: "service_role" })}";\n`,
        "README.md": `## Gemini\n\nYour key is already set: ${"AIza"}${body(35)}\n`,
      }),
    ).toEqual([
      ".env.production:1 (OpenAI API key)",
      ".env.production:2 (Anthropic API key)",
      "README.md:3 (Gemini API key)",
      "src/admin.ts:1 (Supabase service_role key)",
    ]);
  });

  it("leaves keys alone that are public by design", async () => {
    expect(
      await findings({
        "google-services.json": `{ "api_key": [{ "current_key": "${"AIza"}${body(35)}" }] }\n`,
        "src/supabase.ts": `export const anon = "${jwt({ role: "anon" })}";\n`,
        ".env.example": `OPENAI_API_KEY=${"sk-"}your-key-here-xxxxxxxxxxxxxxxxxxxxxxxx\n`,
        "tests/redact.test.ts": `const fakes = ["${"xoxb-"}1234567890-abcdefghij", "${"AKIA"}ABCDEFGHIJKLMNOP", "${"ghp_"}${"a1B2".repeat(9)}"];\n`,
      }),
    ).toEqual([]);
  });
});

describe("committed build output", () => {
  it("flags output that is not gitignored", async () => {
    expect(
      await findings({
        "package.json": "{\"type\":\"module\"}",
        "dist/index.js": "",
        "node_modules/.package-lock.json": "{}",
        "api/Cargo.toml": "",
        "api/target/debug/app": "",
      }),
    ).toEqual(["api/target/", "dist/", "node_modules/"]);
  });

  it("trusts .gitignore, GitHub Actions and hand-written fixtures", async () => {
    expect(
      await findings({
        ".gitignore": "dist\n",
        "package.json": "{\"type\":\"module\"}",
        "dist/index.js": "",
        "action/action.yml": "",
        "action/package.json": "{\"type\":\"module\"}",
        "action/dist/index.js": "",
        "test/fixtures/node_modules/foo/index.js": "",
        "tasks/coverage/Cargo.toml": "",
      }),
    ).toEqual([]);
  });
});

describe("agent work logs", () => {
  it("flags root docs named after an event, and nothing else", async () => {
    expect(
      await findings({
        "README.md": "",
        "CHANGELOG.md": "",
        "ROADMAP.md": "",
        "ARCHITECTURE.md": "",
        "IMPLEMENTATION_COMPLETE.md": "",
        "FIXES_SUMMARY.md": "",
        "docs/BUGFIX_LOGIN.md": "",
      }),
    ).toEqual(["FIXES_SUMMARY.md", "IMPLEMENTATION_COMPLETE.md"]);
  });
});
