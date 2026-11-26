import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { npmLocked, pnpmLocked } from "../../src/vfs/lockfile";
import { lintWorkspace } from "../../src/rules/lint";

const PNPM = `---
lockfileVersion: '9.0'

importers:

  .:
    packageManagerDependencies:
      pnpm:
        specifier: 12.0.0
        version: 12.0.0

packages:

  pnpm@12.0.0:
    resolution: {integrity: sha512-x}

---
lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      vue-i18n:
        specifier: 9.14.5
        version: 9.14.5(vue@3.5.12(typescript@5.6.2))
      '@scope/fine':
        specifier: ^1.0.0
        version: 1.2.0
      shared:
        specifier: workspace:*
        version: link:packages/shared
    devDependencies:
      strip:
        specifier: npm:string-width@4
        version: string-width@4.2.3

  packages/shared:
    dependencies:
      evalite:
        specifier: 1.0.0-beta.16
        version: 1.0.0-beta.16

packages:

  vue-i18n@9.14.5:
    resolution: {integrity: sha512-x}
    deprecated: v9 and v10 no longer supported. please migrate to v11.

  '@scope/fine@1.2.0':
    resolution: {integrity: sha512-x}

  string-width@4.2.3:
    resolution: {integrity: sha512-x}
    deprecated: 'It''s old'

  evalite@1.0.0-beta.16:
    resolution: {integrity: sha512-x}
    deprecated: 'No longer maintained. Recommended replacement: Langfuse.'
`;

describe("lockfiles", () => {
  it("reads pnpm's resolved versions and deprecations, per project, through peers, aliases and documents", () => {
    expect(Object.fromEntries(pnpmLocked(PNPM, ".")!)).toEqual({
      "vue-i18n": { version: "9.14.5", deprecated: "v9 and v10 no longer supported. please migrate to v11." },
      "@scope/fine": { version: "1.2.0" },
      strip: { version: "4.2.3", deprecated: "It's old" },
    });
    expect(pnpmLocked(PNPM, "packages/shared")!.get("evalite")?.deprecated).toBe("No longer maintained. Recommended replacement: Langfuse.");
    expect(pnpmLocked(PNPM, "elsewhere")).toBeUndefined();
  });

  it("reads pnpm lockfile 6 keys", () => {
    const v6 = "lockfileVersion: '6.0'\n\nimporters:\n\n  .:\n    dependencies:\n      left-pad:\n        specifier: ^1.3.0\n        version: 1.3.0\n\npackages:\n\n  /left-pad@1.3.0:\n    resolution: {integrity: sha512-x}\n    deprecated: use String.prototype.padStart()\n";
    expect(pnpmLocked(v6, ".")!.get("left-pad")).toEqual({ version: "1.3.0", deprecated: "use String.prototype.padStart()" });
  });

  it("reads npm's lockfile, installed beside the project or hoisted", () => {
    const lock = JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "": { dependencies: { glob: "^7" }, devDependencies: { ok: "1" } },
        "node_modules/glob": { version: "7.2.3", deprecated: "Old versions of glob are not supported" },
        "node_modules/ok": { version: "1.0.0" },
        "apps/web": { dependencies: { glob: "^10" } },
        "apps/web/node_modules/glob": { version: "10.5.0" },
      },
    });
    expect(Object.fromEntries(npmLocked(lock, ".")!)).toEqual({ glob: { version: "7.2.3", deprecated: "Old versions of glob are not supported" }, ok: { version: "1.0.0" } });
    expect(npmLocked(lock, "apps/web")!.get("glob")).toEqual({ version: "10.5.0" });
    expect(npmLocked(lock, "apps/api")).toBeUndefined();
    expect(npmLocked("null", ".")).toBeUndefined();
  });

  it("smells a direct dependency its authors deprecated, in their words, and leaves what chous already knows", async () => {
    const root = mkdtempSync(join(tmpdir(), "chous-lock-"));
    const write = (path: string, content: string) => {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    };
    write("package.json", JSON.stringify({ name: "a", private: true, dependencies: { "vue-i18n": "9.14.5", request: "^2", moment: "2.30.1" }, devDependencies: { eslint: "8.57.0" } }));
    write("package-lock.json", JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "": { dependencies: { "vue-i18n": "9.14.5", request: "^2", moment: "2.30.1" }, devDependencies: { eslint: "8.57.0" } },
        "node_modules/moment": { version: "2.30.1", deprecated: "known to chous by its README" },
        "node_modules/vue-i18n": { version: "9.14.5", deprecated: "v9 and v10 no longer supported. please migrate to v11." },
        "node_modules/request": { version: "2.88.2", deprecated: "request has been deprecated" },
        "node_modules/eslint": { version: "8.57.0", deprecated: "This version is no longer supported." },
        "node_modules/transitive": { version: "1.0.0", deprecated: "gone" },
      },
    }));
    const found = (await lintWorkspace({ root, today: "2026-11-25" })).issues.filter((i) => i.ruleKind === "deprecated");
    expect(found.map((i) => [i.displayPath, i.message.params])).toEqual([
      ["package.json (request)", { name: "request", version: "2.88.2", message: "request has been deprecated" }],
      ["package.json (vue-i18n)", { name: "vue-i18n", version: "9.14.5", message: "v9 and v10 no longer supported. please migrate to v11." }],
    ]);
  });
});
