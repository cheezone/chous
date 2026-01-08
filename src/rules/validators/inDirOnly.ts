import { basename, resolve } from "node:path";
import type { InDirOnlyRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { isDirectory, listTopLevel, toDisplayPath, walkFiles } from "../../fsutil";
import { BaseRuleValidator } from "./base";
import { evaluateWhenConditions } from "./conditions";

export class InDirOnlyRuleValidator extends BaseRuleValidator<InDirOnlyRule> {
  canHandle(rule: any): rule is InDirOnlyRule {
    return rule.kind === "inDirOnly";
  }

  protected async validateInternal(
    rule: InDirOnlyRule,
    context: RuleValidatorContext,
    ruleIndex: number,
    config: { rules: any[] }
  ): Promise<{ hitCount: number }> {
    // Note: inDirOnly rules are handled specially in the main lint function
    // because they need to be grouped by directory first
    // This validator is a placeholder - actual validation happens in lint.ts
    // We keep this for consistency with the validator pattern
    // Statistics are tracked in processInDirOnlyGroup
    return { hitCount: 0 };
  }
}

/**
 * Process inDirOnly rules that have been grouped by directory
 * This is called from the main lint function after grouping
 * Returns hit count for statistics tracking
 */
export async function processInDirOnlyGroup(
  dir: string,
  group: InDirOnlyRule[],
  context: RuleValidatorContext,
  filesMatchedByMoveRules: Set<string>
): Promise<{ hitCount: number }> {
  const { root, cachedGlobScan, ig, rawIssues, debugLogMsg, rootAllowedSet, forceStrict } = context;
  const DEBUG_FILE = process.env.DEBUG_FILE;

  const dirAbs = resolve(root, dir);
  const isRecursive = group.some((r) => r.only.some((p) => p.includes("**")));
  const dirExists = await isDirectory(dirAbs);
  const allOnly = group.flatMap((r) => r.only);

  // Check if any rule in group is strict mode (for content checking)
  // If --strict flag is set, force all rules to strict mode for content checking
  const hasStrictMode = forceStrict || group.some((r) => r.mode === "strict" || r.mode === undefined);
  
  // Strict mode rules do NOT require directory to exist
  // They only constrain content IF the directory exists
  // Only "must have" rules require directory/file existence
  // Skip if dir doesn't exist - strict mode doesn't require directory to exist
  // It only constrains content when the directory does exist
  if (!dirExists) return { hitCount: 0 };

  let allPathsRel: string[];
  if (isRecursive) {
    const allFiles = await walkFiles(dirAbs, { gitignore: true, root });
    allPathsRel = allFiles.map((p) => toDisplayPath(p, dirAbs));
  } else {
    const entries = await listTopLevel(dirAbs, { gitignore: true });
    allPathsRel = entries.map((e) => e.name);
  }

  // Group rules by fileType to handle multiple fileType filters (files/dirs) separately
  const rulesByFileType = new Map<"files" | "dirs" | undefined, InDirOnlyRule[]>();
  for (const rule of group) {
    const fileType = rule.fileType;
    const list = rulesByFileType.get(fileType) ?? [];
    list.push(rule);
    rulesByFileType.set(fileType, list);
  }

  // Build merged allowed sets for each fileType
  const mergedAllowedRelByFileType = new Map<"files" | "dirs" | undefined, Set<string>>();
  for (const [fileType, rules] of rulesByFileType.entries()) {
    const allowedSet = new Set<string>();
    for (const rule of rules) {
      // Clean spaces in glob patterns (spaces in brace expansion cause matching failures)
      // Example: *.config.{ts, js} -> *.config.{ts,js}
      // Also, for inDirOnly rules, glob scanning is done within dirAbs,
      // so if pattern starts with directory name (e.g., "app/*.ts"), need to remove directory prefix
      const cleanedPatterns = rule.only.map(pattern => {
        // Match content within braces, remove spaces after commas
        let cleaned = pattern.replace(/\{([^}]+)\}/g, (match, content) => {
          const cleanedContent = content.replace(/,\s+/g, ',');
          return `{${cleanedContent}}`;
        });
        
        // If pattern starts with directory name (e.g., "app/*.ts"), remove directory prefix
        // Because glob scanning is done within dirAbs, need pattern relative to that directory
        // But patterns starting with ** should not be processed (they are global matches)
        if (!cleaned.startsWith('**') && cleaned.startsWith(dir + '/')) {
          cleaned = cleaned.slice(dir.length + 1);
        } else if (!cleaned.startsWith('**') && cleaned.startsWith('./' + dir + '/')) {
          cleaned = cleaned.slice(('./' + dir + '/').length);
        }
        
        return cleaned;
      });
      const allowedPaths = await cachedGlobScan(cleanedPatterns, dirAbs, root, { onlyFiles: false, ig });
      debugLogMsg?.("Scan allowed patterns", { 
        dir, 
        fileType, 
        originalPattern: rule.only, 
        cleanedPattern: cleanedPatterns,
        mode: rule.mode, 
        found: allowedPaths.length 
      });
      
      // Detailed logging for tracked files
      if (DEBUG_FILE) {
        const trackingMatches = allowedPaths.filter(p => basename(p) === DEBUG_FILE);
        if (trackingMatches.length > 0) {
          debugLogMsg?.("🔍 [Track] globScan found target file", {
            originalPattern: rule.only,
            cleanedPattern: cleanedPatterns,
            matches: trackingMatches.map(p => ({
              absolute: p,
              relative: toDisplayPath(p, dirAbs),
              basename: basename(p)
            }))
          });
        } else {
          debugLogMsg?.("🔍 [Track] globScan did not find target file", {
            originalPattern: rule.only,
            cleanedPattern: cleanedPatterns,
            allMatches: allowedPaths.map(p => basename(p)).slice(0, 10),
            totalMatches: allowedPaths.length
          });
        }
      }
      
      for (const p of allowedPaths) {
        const relPath = toDisplayPath(p, dirAbs);
        allowedSet.add(relPath);
        // If this is the file we're tracking, log detailed information
        if (DEBUG_FILE && basename(p) === DEBUG_FILE) {
          debugLogMsg?.("✓ [Track] File added to whitelist", { 
            file: DEBUG_FILE, 
            pattern: rule.only, 
            relativePath: relPath, 
            absolutePath: p,
            dirAbs,
            root
          });
        }
      }
    }
    mergedAllowedRelByFileType.set(fileType, allowedSet);
    // Store root directory's allowed set for later updates
    if (dir === "." && fileType === undefined && rootAllowedSet !== undefined) {
      // Update rootAllowedSet with the new allowed paths
      for (const path of allowedSet) {
        rootAllowedSet.add(path);
      }
    }
    if (DEBUG_FILE) {
      debugLogMsg?.("Merged allowed set", { 
        fileType, 
        size: allowedSet.size, 
        items: Array.from(allowedSet).slice(0, 20),
        containsTarget: Array.from(allowedSet).some(p => basename(p) === DEBUG_FILE || p === DEBUG_FILE || p.endsWith(DEBUG_FILE))
      });
    }
  }

  // Also merge root-level allow rules (fileType === undefined) into fileType-specific sets
  // This ensures that root-level allow rules (like LICENSE*) are also checked when
  // strict mode checks specific fileTypes (like "strict files for ./*.md")
  if (dir === "." && rootAllowedSet) {
    // Merge root-level allow set into "files" set if it exists
    const filesSet = mergedAllowedRelByFileType.get("files");
    if (filesSet) {
      for (const path of rootAllowedSet) {
        filesSet.add(path);
      }
    }
    // Also merge into "dirs" set if it exists
    const dirsSet = mergedAllowedRelByFileType.get("dirs");
    if (dirsSet) {
      for (const path of rootAllowedSet) {
        dirsSet.add(path);
      }
    }
  }

  // Only check violations in strict mode
  if (hasStrictMode) {
    // Check if there are fileType-specific strict rules
    const hasStrictDirs = group.some((r) => r.mode === "strict" && r.fileType === "dirs");
    const hasStrictFiles = group.some((r) => r.mode === "strict" && r.fileType === "files");
    const hasBothFileTypes = hasStrictDirs && hasStrictFiles;
    
      for (const rel of allPathsRel) {
      // Skip hidden directories/files (starting with .)
      if (rel.startsWith(".")) continue;

      const abs = resolve(dirAbs, rel);
      const isDir = await isDirectory(abs);
      const fileName = basename(abs);
      
      // Check when conditions for all rules in the group
      // If any rule has when conditions, check them against this path
      let shouldCheckThisPath = true;
      for (const rule of group) {
        if (rule.when && rule.when.length > 0) {
          const shouldApply = await evaluateWhenConditions(rule.when, abs, context);
          if (!shouldApply) {
            shouldCheckThisPath = false;
            break; // Skip this path if any rule's conditions are not met
          }
        }
      }
      if (!shouldCheckThisPath) continue; // Skip this path if conditions not met
      
      // Skip files that are matched by move rules (move rule is more specific and should take precedence)
      if (!isDir && filesMatchedByMoveRules.has(abs)) {
        if (DEBUG_FILE && fileName === DEBUG_FILE) {
          debugLogMsg?.("Skip: File matched by move rule, move rule takes precedence", {});
        }
        continue;
      }
      
      // Track the check process for specific files
      const isTrackingFile = DEBUG_FILE && fileName === DEBUG_FILE;

      if (isTrackingFile) {
        debugLogMsg?.("--- Starting file check ---", { file: DEBUG_FILE, relativePath: rel, absolutePath: abs, isDir, dir });
        debugLogMsg?.("Strict mode status", { hasStrictMode, forceStrict, hasStrictDirs, hasStrictFiles, hasBothFileTypes });
      }

      // Skip if we have ONLY one fileType-specific strict rule and this path type doesn't match
      // If we have both strict dirs and files, check both (no skip)
      // If we have neither (only undefined fileType strict), check both
      if (!hasBothFileTypes) {
        if (hasStrictDirs && !isDir) {
          if (isTrackingFile) debugLogMsg?.("Skip: Only checking directories, but this is a file", {});
          continue; // Only check dirs, skip files
        }
        if (hasStrictFiles && isDir) {
          if (isTrackingFile) debugLogMsg?.("Skip: Only checking files, but this is a directory", {});
          continue; // Only check files, skip dirs
        }
      }

      // Check if this path is allowed by any rule that matches its fileType
      let isAllowed = false;
      let matchedFileType: string | undefined;
      
      // First check root-level allow set (fileType === undefined) if it exists
      // This ensures root-level allow rules (like LICENSE*) are checked even when strict mode checks specific fileTypes
      if (rootAllowedSet && rootAllowedSet.has(rel)) {
        isAllowed = true;
        matchedFileType = "all";
        if (isTrackingFile) {
          debugLogMsg?.("✓ [Track] File in root-level whitelist", { 
            relativePath: rel, 
            rootAllowedSetSize: rootAllowedSet.size
          });
        }
      }
      
      if (isTrackingFile) {
        debugLogMsg?.("🔍 [Track] Start checking if file is in whitelist", {
          relativePath: rel,
          absolutePath: abs,
          dirAbs,
          root,
          allPathsRelSample: allPathsRel.slice(0, 5),
          rootAllowedSetSize: rootAllowedSet?.size,
          inRootAllowedSet: rootAllowedSet?.has(rel)
        });
        
        // Show all allowed set contents
        for (const [fileType, allowedSet] of mergedAllowedRelByFileType.entries()) {
          debugLogMsg?.("🔍 [Track] Check allowed set", {
            fileType: fileType || "all",
            setSize: allowedSet.size,
            setContents: Array.from(allowedSet),
            targetInSet: allowedSet.has(rel),
            targetPath: rel,
            setContainsSimilar: Array.from(allowedSet).filter(p => 
              p.includes(DEBUG_FILE) || basename(p) === DEBUG_FILE
            )
          });
        }
      }
      
      // Then check fileType-specific sets if not already allowed
      if (!isAllowed) {
        for (const [fileType, allowedSet] of mergedAllowedRelByFileType.entries()) {
          // If fileType is specified, only check rules that match the fileType
          if (fileType === "files" && isDir) {
            if (isTrackingFile) {
              debugLogMsg?.("🔍 [Track] Skip: Rule only checks files, but this is a directory", { fileType });
            }
            continue;
          }
          if (fileType === "dirs" && !isDir) {
            if (isTrackingFile) {
              debugLogMsg?.("🔍 [Track] Skip: Rule only checks directories, but this is a file", { fileType });
            }
            continue;
          }
          
          // Check if this path is in the allowed set (glob matching happens in globScan)
          // Also check root-level allow set (fileType === undefined) for files when checking fileType === "files"
          // This ensures root-level allow rules (like LICENSE*) are checked even when strict mode checks specific fileTypes
          let hasMatch = allowedSet.has(rel);
          if (!hasMatch && fileType === "files" && !isDir && rootAllowedSet) {
            hasMatch = rootAllowedSet.has(rel);
          }
          // Also check root-level allow set for fileType === undefined
          if (!hasMatch && fileType === undefined && rootAllowedSet) {
            hasMatch = rootAllowedSet.has(rel);
          }
          if (isTrackingFile) {
            debugLogMsg?.("🔍 [Track] Check match", {
              fileType: fileType || "all",
              relativePath: rel,
              hasMatch,
              setSize: allowedSet.size,
              exactMatch: hasMatch,
              similarPaths: Array.from(allowedSet).filter(p => {
                const pBase = basename(p);
                const relBase = basename(rel);
                return pBase === relBase || p === rel || p.endsWith(rel) || rel.endsWith(p);
              })
            });
          }
          
          if (hasMatch) {
            isAllowed = true;
            matchedFileType = fileType || "all";
            if (isTrackingFile) {
              debugLogMsg?.("✓ [Track] File in whitelist", { 
                fileType, 
                relativePath: rel, 
                allowedSetSize: allowedSet.size,
                matchedFileType
              });
            }
            break;
          }
        }
      }

      if (isTrackingFile) {
        debugLogMsg?.("🔍 [Track] Final check result", { 
          isAllowed, 
          matchedFileType, 
          relativePath: rel,
          absolutePath: abs,
          dirAbs,
          root
        });
        if (!isAllowed) {
          debugLogMsg?.("✗ [Track] File not in whitelist - detailed analysis", { 
            allowedPatterns: allOnly,
            checkedFileTypes: Array.from(mergedAllowedRelByFileType.keys()),
            allowedSets: Object.fromEntries(
              Array.from(mergedAllowedRelByFileType.entries()).map(([ft, set]) => [
                ft || "all", 
                {
                  size: set.size,
                  items: Array.from(set),
                  containsTarget: set.has(rel),
                  targetPath: rel
                }
              ])
            ),
            pathComparison: {
              targetRelative: rel,
              targetAbsolute: abs,
              dirAbs,
              root,
              allPathsRelSample: allPathsRel.slice(0, 10)
            }
          });
        }
      }

      if (!isAllowed) {
        const issue = {
          ruleKind: "inDirOnly" as const,
          path: abs,
          displayPath: toDisplayPath(abs, root),
          message: { key: "issue.inDirOnly.forbiddenOnlyAllowed" as const, params: { dir: `${dir}/`, only: allOnly } },
          category: "forbidden" as const,
          severity: "error" as const,
        };
        debugLogMsg?.("🔴 [inDirOnly] Create issue", {
          displayPath: issue.displayPath,
          dir: dir,
          only: allOnly,
          existingIssuesForSameFile: rawIssues.filter(i => i.displayPath === issue.displayPath).map(i => ({
            ruleKind: i.ruleKind,
            messageKey: i.message.key,
            params: 'params' in i.message ? i.message.params : undefined
          }))
        });
        rawIssues.push(issue);
      }
    }
  }

  // Return hit count (number of paths checked in strict mode)
  return { hitCount: hasStrictMode ? allPathsRel.filter(rel => !rel.startsWith(".")).length : 0 };
}
