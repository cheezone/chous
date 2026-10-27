import { basename, dirname } from "node:path";
import type { Condition } from "../../types";
import type { RuleValidatorContext } from "./types";
import { checkNamingStyle } from "../utils/naming";

/**
 * Evaluate a single condition against the in-memory snapshot.
 */
async function evaluateCondition(
  condition: Condition,
  targetPath: string,
  context: RuleValidatorContext
): Promise<boolean> {
  const { snapshot } = context;

  switch (condition.type) {
    case "isEmpty": {
      if (!snapshot.isDirectory(targetPath)) return false;
      return snapshot.listDir(targetPath).length === 0;
    }

    case "contains": {
      if (!snapshot.isDirectory(targetPath)) return false;
      const entries = snapshot.listDir(targetPath);
      if (entries.some((e) => e.name === condition.pattern)) return true;
      const matches = snapshot.match(condition.pattern, { cwd: targetPath, onlyFiles: true });
      return matches.length > 0;
    }

    case "exists": {
      const matches = snapshot.match(condition.pattern, { onlyFiles: false });
      return matches.length > 0;
    }

    case "parentMatches": {
      const parentDirPath = dirname(targetPath);
      const parentDirName = basename(parentDirPath);
      const result = checkNamingStyle(parentDirName, condition.style);
      return result.valid;
    }

    case "fileSize": {
      if (snapshot.isDirectory(targetPath)) return false;
      const entry = snapshot.byAbs.get(targetPath);
      if (!entry) return false;
      // Size is lazy (0 until needed) to avoid per-file stat during snapshot build
      if (entry.size === 0) {
        try {
          const { statSync } = await import("node:fs");
          entry.size = statSync(targetPath).size;
        } catch {
          return false;
        }
      }
      const sizeBytes = entry.size;

      const sizeStr = condition.value.toUpperCase();
      const sizeMatch = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$/);
      if (!sizeMatch) return false;

      const sizeValue = parseFloat(sizeMatch[1]!);
      const sizeUnit = sizeMatch[2]!;

      let sizeInBytes: number;
      switch (sizeUnit) {
        case "B":
          sizeInBytes = sizeValue;
          break;
        case "KB":
          sizeInBytes = sizeValue * 1024;
          break;
        case "MB":
          sizeInBytes = sizeValue * 1024 * 1024;
          break;
        case "GB":
          sizeInBytes = sizeValue * 1024 * 1024 * 1024;
          break;
        case "TB":
          sizeInBytes = sizeValue * 1024 * 1024 * 1024 * 1024;
          break;
        default:
          return false;
      }

      if (condition.op === ">") return sizeBytes > sizeInBytes;
      if (condition.op === "<") return sizeBytes < sizeInBytes;
      return false;
    }

    default:
      return false;
  }
}

/**
 * Evaluate all when conditions for a rule (AND logic).
 */
export async function evaluateWhenConditions(
  when: Condition[] | undefined,
  targetPath: string,
  context: RuleValidatorContext
): Promise<boolean> {
  if (!when || when.length === 0) return true;

  for (const condition of when) {
    const result = await evaluateCondition(condition, targetPath, context);
    if (!result) return false;
  }
  return true;
}
