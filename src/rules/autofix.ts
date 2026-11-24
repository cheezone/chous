import { mkdir, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import type { Issue, SafeFix } from "../types";

export type AutofixResult = {
  applied: number;
  skipped: number;
  remaining: Issue[];
};

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

async function tryApplyFix(fix: SafeFix): Promise<boolean> {
  switch (fix.type) {
    case "rename":
      return applyRename(fix);
    case "deleteEmptyDir":
      return applyDeleteEmptyDir(fix);
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
