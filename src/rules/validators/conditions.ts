import { basename, dirname, resolve } from "node:path";
import { stat } from "node:fs/promises";
import type { Condition, NamingStyle } from "../../types";
import type { RuleValidatorContext } from "./types";
import { isDirectory, listTopLevel, exists } from "../../fsutil";
import { checkNamingStyle } from "../utils/naming";

/**
 * Evaluate a single condition
 */
async function evaluateCondition(
  condition: Condition,
  targetPath: string, // Absolute path to the file/directory being checked
  context: RuleValidatorContext
): Promise<boolean> {
  const { root, cachedGlobScan, ig } = context;

  switch (condition.type) {
    case "isEmpty": {
      // Check if directory is empty
      const isDir = await isDirectory(targetPath);
      if (!isDir) return false; // Files are never "empty"
      const entries = await listTopLevel(targetPath, { gitignore: true });
      return entries.length === 0;
    }

    case "contains": {
      // Check if directory contains a file matching the pattern
      const isDir = await isDirectory(targetPath);
      if (!isDir) return false; // Files don't "contain" other files
      
      // Try exact filename match first
      const entries = await listTopLevel(targetPath, { gitignore: true });
      const exactMatch = entries.some(e => e.name === condition.pattern);
      if (exactMatch) return true;

      // Try glob pattern match
      const matches = await cachedGlobScan(condition.pattern, targetPath, root, { onlyFiles: true, ig });
      return matches.length > 0;
    }

    case "exists": {
      // Check if pattern exists (glob match)
      const matches = await cachedGlobScan(condition.pattern, root, root, { onlyFiles: false, ig });
      return matches.length > 0;
    }

    case "parentMatches": {
      // Check if parent directory matches naming style
      const parentDirPath = dirname(targetPath);
      const parentDirName = basename(parentDirPath);
      const result = checkNamingStyle(parentDirName, condition.style);
      return result.valid;
    }

    case "fileSize": {
      // Check file size (only applies to files, not directories)
      const isDir = await isDirectory(targetPath);
      if (isDir) return false; // Directories don't have file size

      try {
        const stats = await stat(targetPath);
        const sizeBytes = stats.size;
        
        // Parse size value (e.g., "1MB", "500KB", "2GB")
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

        if (condition.op === ">") {
          return sizeBytes > sizeInBytes;
        } else if (condition.op === "<") {
          return sizeBytes < sizeInBytes;
        }
        return false;
      } catch {
        return false; // File doesn't exist or can't be read
      }
    }

    default:
      return false;
  }
}

/**
 * Evaluate all when conditions for a rule
 * Returns true if all conditions are met (AND logic)
 */
export async function evaluateWhenConditions(
  when: Condition[] | undefined,
  targetPath: string, // Absolute path to the file/directory being checked
  context: RuleValidatorContext
): Promise<boolean> {
  if (!when || when.length === 0) {
    return true; // No conditions means rule always applies
  }

  // All conditions must be true (AND logic)
  for (const condition of when) {
    const result = await evaluateCondition(condition, targetPath, context);
    if (!result) {
      return false; // One condition failed, rule doesn't apply
    }
  }

  return true; // All conditions passed
}
