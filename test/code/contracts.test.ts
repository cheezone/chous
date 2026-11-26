import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { lintWorkspace } from "../../src/rules/lint";

/** `<contract id> <path>` for every contract finding. */
async function contracts(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "chous-contracts-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content, "utf8");
  }
  const result = await lintWorkspace({ root });
  return result.issues
    .filter((i) => i.ruleKind === "contracts")
    .map((i) => `${i.message.key.replace("issue.contract.", "")} ${i.displayPath}`)
    .sort();
}

describe("Cargo", () => {
  it("counts every crate that sets authors, inherited ones too, in one finding", async () => {
    expect(
      await contracts({
        "a/Cargo.toml": '[package]\nname = "a"\nauthors.workspace = true\n',
        "b/Cargo.toml": '[package]\nname = "b"\nauthors = ["x"]\n',
        "c/Cargo.toml": '[package]\nname = "c"\nedition.workspace = true\n',
      }),
    ).toEqual(["cargoAuthors **/Cargo.toml"]);
  });
});

describe("findings counted across a project", () => {
  it("are counted per project, and reported once whether the root or the workspace package is linted", async () => {
    expect(
      await contracts({
        "package.json": JSON.stringify({ name: "root", private: true }),
        "pnpm-workspace.yaml": "packages:\n  - packages/*\n",
        "packages/ui/package.json": JSON.stringify({ name: "ui", private: true }),
        "crate/Cargo.toml": '[package]\nname = "x"\nauthors = ["a"]\n',
        "packages/ui/native/Cargo.toml": '[package]\nname = "y"\nauthors = ["a"]\n',
      }),
    ).toEqual(["cargoAuthors crate/Cargo.toml", "cargoAuthors packages/ui/native/Cargo.toml"]);
  });
});
