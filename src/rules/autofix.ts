import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import type { Issue, SafeFix } from "../types";

export type AutofixResult = {
  applied: number;
  skipped: number;
  remaining: Issue[];
};

function detectIndent(raw: string): string {
  const match = raw.match(/\n([ \t]+)"/);
  return match?.[1] ?? "  ";
}

async function applyRename(fix: Extract<SafeFix, { type: "rename" }>): Promise<boolean> {
  if (!existsSync(fix.fromPath)) return false;
  if (existsSync(fix.toPath)) return false;
  await mkdir(dirname(fix.toPath), { recursive: true });
  await rename(fix.fromPath, fix.toPath);
  return true;
}

async function applyDeleteEmptyDir(fix: Extract<SafeFix, { type: "deleteEmptyDir" }>): Promise<boolean> {
  if (!existsSync(fix.path)) return false;
  try {
    await rm(fix.path, { recursive: false });
    return true;
  } catch {
    return false;
  }
}

async function applyPkgSetManager(fix: Extract<SafeFix, { type: "pkgSetManager" }>): Promise<boolean> {
  if (!existsSync(fix.pkgJsonPath)) return false;
  const raw = await readFile(fix.pkgJsonPath, "utf8");
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return false;
  }
  const indent = detectIndent(raw);
  const current = typeof pkg.packageManager === "string" ? pkg.packageManager : "";
  const currentName = current.split("@")[0] ?? "";
  if (currentName === fix.manager) return false;
  // Keep version suffix if present on current, else use bare name (user runs install to pin)
  pkg.packageManager = current.includes("@") && currentName
    ? `${fix.manager}@${current.split("@").slice(1).join("@") || "latest"}`
    : `${fix.manager}@latest`;
  const trailingNewline = raw.endsWith("\n") ? "\n" : "";
  await writeFile(fix.pkgJsonPath, JSON.stringify(pkg, null, indent) + trailingNewline, "utf8");
  return true;
}

async function applyPkgReplaceDep(fix: Extract<SafeFix, { type: "pkgReplaceDep" }>): Promise<boolean> {
  if (!existsSync(fix.pkgJsonPath)) return false;
  if (fix.from.endsWith("/*")) return false;
  const raw = await readFile(fix.pkgJsonPath, "utf8");
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return false;
  }
  const indent = detectIndent(raw);
  const sections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const;
  let foundSection: (typeof sections)[number] | null = null;
  let foundVersion = "latest";

  for (const key of sections) {
    const section = pkg[key];
    if (section && typeof section === "object" && fix.from in (section as Record<string, unknown>)) {
      foundSection = key;
      const ver = (section as Record<string, unknown>)[fix.from];
      if (typeof ver === "string" && ver) foundVersion = ver;
      delete (section as Record<string, unknown>)[fix.from];
      if (Object.keys(section as Record<string, unknown>).length === 0) {
        delete pkg[key];
      }
      break;
    }
  }
  if (!foundSection) return false;

  // Ensure `to` exists in the same section (or dependencies)
  const targetKey = foundSection === "peerDependencies" || foundSection === "optionalDependencies"
    ? "dependencies"
    : foundSection;
  if (!pkg[targetKey] || typeof pkg[targetKey] !== "object") {
    pkg[targetKey] = {};
  }
  const target = pkg[targetKey] as Record<string, unknown>;
  if (!(fix.to in target)) {
    target[fix.to] = foundVersion === "latest" ? "latest" : foundVersion;
  }

  const trailingNewline = raw.endsWith("\n") ? "\n" : "";
  await writeFile(fix.pkgJsonPath, JSON.stringify(pkg, null, indent) + trailingNewline, "utf8");
  return true;
}

async function tryApplyFix(fix: SafeFix): Promise<boolean> {
  switch (fix.type) {
    case "rename":
      return applyRename(fix);
    case "deleteEmptyDir":
      return applyDeleteEmptyDir(fix);
    case "pkgSetManager":
      return applyPkgSetManager(fix);
    case "pkgReplaceDep":
      return applyPkgReplaceDep(fix);
  }
}

/**
 * Apply safe autofixes. Skips conflicting renames that target the same destination.
 * Returns issues that remain after successful fixes are removed.
 */
export async function applySafeFixes(issues: Issue[]): Promise<AutofixResult> {
  const fixable = issues.filter((i) => i.fix);
  const unfixable = issues.filter((i) => !i.fix);

  // Detect rename destination conflicts within this batch
  const renameTargets = new Map<string, number>();
  for (const issue of fixable) {
    const fix = issue.fix!;
    if (fix.type === "rename") {
      const key = resolve(fix.toPath);
      renameTargets.set(key, (renameTargets.get(key) ?? 0) + 1);
    }
  }

  let applied = 0;
  let skipped = 0;
  const remaining: Issue[] = [...unfixable];

  for (const issue of fixable) {
    const fix = issue.fix!;
    if (fix.type === "rename") {
      const key = resolve(fix.toPath);
      if ((renameTargets.get(key) ?? 0) > 1) {
        skipped++;
        remaining.push(issue);
        continue;
      }
    }
    try {
      const ok = await tryApplyFix(fix);
      if (ok) {
        applied++;
      } else {
        skipped++;
        remaining.push(issue);
      }
    } catch {
      skipped++;
      remaining.push(issue);
    }
  }

  return { applied, skipped, remaining };
}
