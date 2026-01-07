import { basename, dirname, resolve, relative, sep } from "node:path";
import { readdir } from "node:fs/promises";
import { glob } from "tinyglobby";
import ignore from "ignore";
import type { FsLintConfig, Issue, IssueMessage, LintResult, Rule } from "../types";
import { DEFAULT_IGNORE_DIRS, exists, isDirectory, listTopLevel, loadGitIgnorePatterns, pickTopLevelName, toDisplayPath, walkFiles } from "../fsutil";
import { checkNamingStyle } from "./utils/naming";

// Type guard to safely extract params from IssueMessage
function hasParams(msg: IssueMessage): msg is Extract<IssueMessage, { params: any }> {
  return 'params' in msg;
}

/**
 * Perform a glob scan that respects .gitignore and default ignores.
 */
async function globScan(
  pattern: string | string[],
  cwd: string,
  root: string,
  opts?: { onlyFiles?: boolean; ig?: ReturnType<typeof ignore> }
): Promise<string[]> {
  const ignorePatterns = Array.from(DEFAULT_IGNORE_DIRS).map((d) => `**/${d}/**`);
  const matches = await glob(pattern, {
    cwd,
    absolute: true,
    dot: true,
    onlyFiles: opts?.onlyFiles ?? true,
    ignore: ignorePatterns,
  });

  const absMatches = (matches as string[]).map((p: string) => resolve(String(p)));
  if (!opts?.ig) return absMatches;

  return absMatches.filter(abs => {
    const rel = relative(root, abs).split(sep).join("/");
    return !opts.ig!.ignores(rel);
  });
}

/**
 * Create a cached version of globScan.
 * Cache key includes pattern, cwd, root, and onlyFiles option.
 * Assumes file system doesn't change during a single lint execution.
 * Note: ig (ignore) object is not included in cache key since it's the same for the entire lint run.
 */
function createCachedGlobScan() {
  const cache = new Map<string, Promise<string[]>>();
  
  return async function cachedGlobScan(
    pattern: string | string[],
    cwd: string,
    root: string,
    opts?: { onlyFiles?: boolean; ig?: ReturnType<typeof ignore> }
  ): Promise<string[]> {
    // Create cache key from parameters (ig is excluded since it's the same for entire lint run)
    const patternStr = Array.isArray(pattern) ? pattern.sort().join("|") : pattern;
    const cacheKey = `${patternStr}::${cwd}::${root}::${opts?.onlyFiles ?? true}`;
    
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }
    
    const promise = globScan(pattern, cwd, root, opts);
    cache.set(cacheKey, promise);
    return promise;
  };
}

function computeRequiredTopLevelNames(config: FsLintConfig): string[] {
  const required = new Set<string>();
  const optional = new Set<string>();
  
  // First, collect all files marked as required by "has" rules
  for (const r of config.rules) {
    // Removed: move should not mark target as required - it already checks if dest exists and reports error
    // if (r.kind === "move") required.add(pickTopLevelName(r.toDir));
    // Removed: inDirOnly rules no longer automatically mark directories as required
    // if (r.kind === "inDirOnly" && r.dir !== "." && r.dir !== "") required.add(pickTopLevelName(r.dir));
    // Removed: renameDir should not mark target as required - it's just a suggestion to rename source
    // if (r.kind === "renameDir") required.add(pickTopLevelName(r.toName));
    if (r.kind === "has") {
      for (const name of r.names) {
        // Skip glob patterns - they will be resolved during lint to actual file paths
        const isGlobPattern = /[*?{}[\]]/.test(name) || name.includes("**");
        if (!isGlobPattern) {
          required.add(pickTopLevelName(name));
        }
      }
    }
    // Collect files marked as optional by "optional" rules
    if (r.kind === "optional") {
      for (const name of r.names) {
        optional.add(pickTopLevelName(name));
      }
    }
  }
  
  // Remove optional files from required set
  for (const opt of optional) {
    required.delete(opt);
  }
  
  required.delete(".");
  return Array.from(required).sort();
}

function computeRenameDest(fromAbs: string, root: string, rule: Extract<Rule, { kind: "renameGlob" }>): string | null {
  const rel = toDisplayPath(fromAbs, root);

  // Example: tests/**/*.{spec,tests}.ts -> tests/**/*.test.ts
  if (rule.to.endsWith(".test.ts")) {
    if (rel.endsWith(".spec.ts")) return resolve(root, rel.replace(/\.spec\.ts$/, ".test.ts"));
    if (rel.endsWith(".tests.ts")) return resolve(root, rel.replace(/\.tests\.ts$/, ".test.ts"));
  }

  // Simple fallback: if to is a concrete path (no wildcards), use it directly
  if (!/[*?{}[\]]/.test(rule.to) && !rule.to.includes("**")) {
    return resolve(root, rule.to);
  }

  return null;
}

// Debug logging for specific files (set via DEBUG_FILE environment variable)
const DEBUG_FILE = process.env.DEBUG_FILE;
const debugLog: string[] = [];

function debugLogMsg(msg: string, ...args: any[]): void {
  if (DEBUG_FILE) {
    const formattedMsg = args.length > 0 ? `${msg} ${JSON.stringify(args, null, 2)}` : msg;
    debugLog.push(`[DEBUG] ${formattedMsg}`);
  }
}

export async function lintWorkspace(opts: {
  root: string;
  config: FsLintConfig;
  configPath: string;
  strict?: boolean;
  relevantDirs?: Set<string>; // When provided, only check these directories
}): Promise<LintResult> {
  const startTime = performance.now();
  const { root, config, configPath, strict: forceStrict, relevantDirs } = opts;
  const rawIssues: Issue[] = [];
  const requiredTopLevelNames = computeRequiredTopLevelNames(config);
  // Track actual matched files from glob patterns in "has" rules
  const matchedGlobFiles = new Set<string>();
  
  debugLogMsg("=== Starting lint check ===", { root, configPath, strict: forceStrict });

  // Load GitIgnore
  const patterns = await loadGitIgnorePatterns(root);
  const ig = ignore().add(patterns);

  // Create cached globScan for this lint execution
  // Assumes file system doesn't change during a single lint run
  const cachedGlobScan = createCachedGlobScan();

  // Calculate visibleSet for report tree filtering
  // Optimize: detect if rules are mostly root-level constraints to avoid full filesystem scan
  const hasRootLevelOnlyRules = config.rules.every(rule => {
    if (rule.kind === "inDirOnly") {
      return rule.dir === "." || rule.dir === "";
    }
    if (rule.kind === "thoseOnly") {
      // Check if pattern is root-level (starts with ./ or is a simple filename without / or **)
      const pattern = rule.pattern.trim();
      // Pattern like "./*.md" or "*.md" (root-level) vs "**/*.md" or "src/**/*.md" (recursive)
      return (pattern.startsWith("./") || (!pattern.includes("/") && !pattern.includes("**"))) &&
             !pattern.startsWith("**");
    }
    if (rule.kind === "has" || rule.kind === "no" || rule.kind === "allow") {
      // Check if all names are root-level (no /, no **, no recursive patterns)
      return rule.names.every(name => {
        const trimmed = name.trim();
        // Allow patterns like "*.config.{ts,js}" (root-level glob) but not "src/**/*.ts" (recursive)
        return !trimmed.includes("/") && !trimmed.includes("**") && 
               (trimmed.startsWith("./") || trimmed.match(/^\.?\/?[^/]*$/));
      });
    }
    if (rule.kind === "naming") {
      // Check if pattern is root-level
      const pattern = rule.pattern.trim();
      // Pattern is root-level if:
      // 1. It's "." or empty (root directory)
      // 2. It starts with "./" and doesn't contain "**" (like "./*.md")
      // 3. It doesn't contain "/" and doesn't start with "**" (like "*.md")
      // Patterns like "app/components/**/*.vue" or "**/*.vue" are NOT root-level
      // (they require scanning subdirectories or the entire filesystem)
      return pattern === "." || pattern === "" || 
             (pattern.startsWith("./") && !pattern.includes("**") && !pattern.includes("*")) ||
             (!pattern.includes("/") && !pattern.startsWith("**") && pattern.includes("*"));
    }
    // For other rules (move, rename, etc.), assume they might need full scan
    return false;
  });

  // If relevantDirs is provided, only scan those directories
  let visiblePaths: string[];
  if (relevantDirs && relevantDirs.size > 0) {
    // Only scan relevant directories
    const paths = new Set<string>();
    for (const dir of relevantDirs) {
      const dirAbs = dir === "." ? root : resolve(root, dir);
      if (await isDirectory(dirAbs)) {
        // Scan this directory recursively
        const dirFiles = await cachedGlobScan(`${dir === "." ? "*" : `${dir}/**/*`}`, root, root, { onlyFiles: false, ig });
        for (const p of dirFiles) {
          paths.add(p);
        }
      }
      // Also include the directory itself
      if (dir !== ".") {
        paths.add(dirAbs);
      }
    }
    // Always include root directory for root-level rules
    const rootFiles = await cachedGlobScan("*", root, root, { onlyFiles: false, ig });
    for (const p of rootFiles) {
      paths.add(p);
    }
    visiblePaths = Array.from(paths);
  } else if (hasRootLevelOnlyRules) {
    // Optimize: if all rules are root-level, only scan root directory
    visiblePaths = await cachedGlobScan("*", root, root, { onlyFiles: false, ig });
  } else {
    // Full filesystem scan for rules that need it
    visiblePaths = await cachedGlobScan("**/*", root, root, { onlyFiles: false, ig });
  }
  const visibleSet = new Set(visiblePaths);
  
  // Count files (excluding directories)
  let fileCount = 0;
  for (const path of visiblePaths) {
    const absPath = resolve(root, path);
    if (await isDirectory(absPath)) continue;
    fileCount++;
  }

  // Collect move rules first to track which files are matched by move rules
  // This allows us to skip those files in strict mode checks (move rule is more specific)
  const moveRules = config.rules.filter((r): r is Extract<Rule, { kind: "move" }> => r.kind === "move");
  const filesMatchedByMoveRules = new Set<string>();
  for (const rule of moveRules) {
    const matches = await cachedGlobScan(rule.from, root, root, { onlyFiles: true, ig });
    for (const abs of matches) {
      // Only track files that are not already in the target directory
      if (!toDisplayPath(abs, root).startsWith(`${rule.toDir}/`)) {
        filesMatchedByMoveRules.add(abs);
      }
    }
  }

  // 1. Group and handle inDirOnly (allow) rules
  const inDirRules = config.rules.filter((r): r is Extract<Rule, { kind: "inDirOnly" }> => r.kind === "inDirOnly");
  const inDirGroups = new Map<string, Extract<Rule, { kind: "inDirOnly" }>[]>();
  for (const r of inDirRules) {
    const list = inDirGroups.get(r.dir) ?? [];
    list.push(r);
    inDirGroups.set(r.dir, list);
  }

  // Merge root-level "allow" rules into "inDirOnly" for root directory
  // "allow" at root is equivalent to "in . allow"
  const rootAllowRules = config.rules.filter((r): r is Extract<Rule, { kind: "allow" }> => r.kind === "allow");
  if (rootAllowRules.length > 0) {
    debugLogMsg("Found root-level allow rules", { count: rootAllowRules.length, rules: rootAllowRules.map(r => r.names) });
    const rootDir = "."; // Root directory
    const rootGroup = inDirGroups.get(rootDir) ?? [];
    // Convert "allow" rules to "inDirOnly" permissive rules
    for (const allowRule of rootAllowRules) {
      debugLogMsg("Convert allow rule to inDirOnly (permissive)", { dir: rootDir, only: allowRule.names });
      rootGroup.push({
        kind: "inDirOnly",
        dir: rootDir,
        only: allowRule.names,
        mode: "permissive",
      });
    }
    inDirGroups.set(rootDir, rootGroup);
  }

  // Merge "must have" (has) rules into "inDirOnly" for root directory
  // Files that are required should automatically be allowed
  const hasRules = config.rules.filter((r): r is Extract<Rule, { kind: "has" }> => r.kind === "has");
  if (hasRules.length > 0) {
    debugLogMsg("Found must have rules, automatically added to whitelist", { count: hasRules.length, rules: hasRules.map(r => r.names) });
    const rootDir = "."; // Root directory
    const rootGroup = inDirGroups.get(rootDir) ?? [];
    // Collect all required file names from has rules (both exact and glob patterns)
    const requiredNames: string[] = [];
    for (const hasRule of hasRules) {
      for (const name of hasRule.names) {
        // Check if the pattern is a glob pattern
        const isGlobPattern = /[*?{}[\]]/.test(name) || name.includes("**");
        if (!isGlobPattern) {
          // Exact file path, add directly
          requiredNames.push(name);
        } else {
          // Glob pattern, resolve it now and add matching files
          const matches = await cachedGlobScan(name, root, root, { onlyFiles: true, ig });
          for (const match of matches) {
            const relPath = toDisplayPath(match, root);
            requiredNames.push(relPath);
          }
        }
      }
    }
    if (requiredNames.length > 0) {
      debugLogMsg("Add must have files to root directory whitelist", { names: requiredNames });
      // Check if there's already a permissive rule for root
      const existingPermissive = rootGroup.find(r => r.mode === "permissive");
      if (existingPermissive) {
        // Merge into existing permissive rule
        existingPermissive.only.push(...requiredNames);
      } else {
        // Create new permissive rule for required files
        rootGroup.push({
          kind: "inDirOnly",
          dir: rootDir,
          only: requiredNames,
          mode: "permissive",
        });
      }
      inDirGroups.set(rootDir, rootGroup);
    }
  }

  // Store root directory's allowed set for later updates (for must have files)
  let rootAllowedSet: Set<string> | undefined = undefined;

  for (const [dir, group] of inDirGroups.entries()) {
    const dirAbs = resolve(root, dir);
    const isRecursive = group.some((r) => r.only.some((p) => p.includes("**")));
    const dirExists = await isDirectory(dirAbs);
    const allOnly = group.flatMap((r) => r.only);

    // Check if any rule in group is strict mode (for content checking)
    // If --strict flag is set, force all rules to strict mode for content checking
    const hasStrictMode = forceStrict || group.some((r) => r.mode === "strict" || r.mode === undefined);
    
    // Check if any rule explicitly requires directory to exist
    // Only explicitly strict mode rules require directory existence
    // Permissive mode rules (in <dir> allow ...) are constraints only, not requirements
    // Even with --strict flag, permissive rules should not require directory to exist
    // Only rules with mode === "strict" or mode === undefined (default strict) require directory
    const hasExplicitStrictMode = group.some((r) => r.mode === "strict" || r.mode === undefined);

    // Only report missing directory for explicitly strict mode rules
    // Permissive mode rules (in <dir> allow ...) are constraints only, not requirements
    // They only constrain content IF the directory exists, but don't require it to exist
    // Note: --strict flag affects content checking, but permissive rules still don't require directory existence
    if (!dirExists && hasExplicitStrictMode) {
      rawIssues.push({
        ruleKind: "inDirOnly",
        path: dirAbs,
        displayPath: toDisplayPath(dirAbs, root),
        message: { key: "issue.inDirOnly.dirMustExist", params: { only: allOnly } },
        category: "missing",
        severity: "error",
      });
      continue;
    }

    // Skip if dir doesn't exist - permissive mode doesn't require directory to exist
    // It only constrains content when the directory does exist
    if (!dirExists) continue;

    let allPathsRel: string[];
    if (isRecursive) {
      const allFiles = await walkFiles(dirAbs, { gitignore: true, root });
      allPathsRel = allFiles.map((p) => toDisplayPath(p, dirAbs));
    } else {
      const entries = await listTopLevel(dirAbs, { gitignore: true });
      allPathsRel = entries.map((e) => e.name);
    }

    // Group rules by fileType to handle multiple fileType filters (files/dirs) separately
    const rulesByFileType = new Map<"files" | "dirs" | undefined, Extract<Rule, { kind: "inDirOnly" }>[]>();
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
        debugLogMsg("Scan allowed patterns", { 
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
            debugLogMsg("🔍 [Track] globScan found target file", {
              originalPattern: rule.only,
              cleanedPattern: cleanedPatterns,
              matches: trackingMatches.map(p => ({
                absolute: p,
                relative: toDisplayPath(p, dirAbs),
                basename: basename(p)
              }))
            });
          } else {
            debugLogMsg("🔍 [Track] globScan did not find target file", {
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
            debugLogMsg("✓ [Track] File added to whitelist", { 
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
      if (dir === "." && fileType === undefined) {
        rootAllowedSet = allowedSet;
      }
      if (DEBUG_FILE) {
        debugLogMsg("Merged allowed set", { 
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
        
        // Skip files that are matched by move rules (move rule is more specific and should take precedence)
        if (!isDir && filesMatchedByMoveRules.has(abs)) {
          if (DEBUG_FILE && fileName === DEBUG_FILE) {
            debugLogMsg("Skip: File matched by move rule, move rule takes precedence", {});
          }
          continue;
        }
        
        // Track the check process for specific files
        const isTrackingFile = DEBUG_FILE && fileName === DEBUG_FILE;

        if (isTrackingFile) {
          debugLogMsg("--- Starting file check ---", { file: DEBUG_FILE, relativePath: rel, absolutePath: abs, isDir, dir });
          debugLogMsg("Strict mode status", { hasStrictMode, forceStrict, hasStrictDirs, hasStrictFiles, hasBothFileTypes });
        }

        // Skip if we have ONLY one fileType-specific strict rule and this path type doesn't match
        // If we have both strict dirs and files, check both (no skip)
        // If we have neither (only undefined fileType strict), check both
        if (!hasBothFileTypes) {
          if (hasStrictDirs && !isDir) {
            if (isTrackingFile) debugLogMsg("Skip: Only checking directories, but this is a file", {});
            continue; // Only check dirs, skip files
          }
          if (hasStrictFiles && isDir) {
            if (isTrackingFile) debugLogMsg("Skip: Only checking files, but this is a directory", {});
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
            debugLogMsg("✓ [Track] File in root-level whitelist", { 
              relativePath: rel, 
              rootAllowedSetSize: rootAllowedSet.size
            });
          }
        }
        
        if (isTrackingFile) {
          debugLogMsg("🔍 [Track] Start checking if file is in whitelist", {
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
            debugLogMsg("🔍 [Track] Check allowed set", {
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
                debugLogMsg("🔍 [Track] Skip: Rule only checks files, but this is a directory", { fileType });
              }
              continue;
            }
            if (fileType === "dirs" && !isDir) {
              if (isTrackingFile) {
                debugLogMsg("🔍 [Track] Skip: Rule only checks directories, but this is a file", { fileType });
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
              debugLogMsg("🔍 [Track] Check match", {
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
                debugLogMsg("✓ [Track] File in whitelist", { 
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
          debugLogMsg("🔍 [Track] Final check result", { 
            isAllowed, 
            matchedFileType, 
            relativePath: rel,
            absolutePath: abs,
            dirAbs,
            root
          });
          if (!isAllowed) {
            debugLogMsg("✗ [Track] File not in whitelist - detailed analysis", { 
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
          debugLogMsg("🔴 [inDirOnly] Create issue", {
            displayPath: issue.displayPath,
            dir: dir,
            only: allOnly,
            existingIssuesForSameFile: rawIssues.filter(i => i.displayPath === issue.displayPath).map(i => ({
              ruleKind: i.ruleKind,
              messageKey: i.message.key,
              params: hasParams(i.message) ? i.message.params : undefined
            }))
          });
          rawIssues.push(issue);
        }
      }
    }
  }

  // 2. Handle all other rules
  // Track processed patterns for thoseOnly and no rules to allow later rules to override earlier ones
  const processedThoseOnlyPatterns = new Map<string, number>(); // pattern -> last rule index
  
  for (let ruleIndex = 0; ruleIndex < config.rules.length; ruleIndex++) {
    const rule = config.rules[ruleIndex]!;
    if (rule.kind === "inDirOnly") continue;

    if (rule.kind === "move") {
      const destDirAbs = resolve(root, rule.toDir);
      const destDirExists = exists(destDirAbs);
      const destDirIsDir = await isDirectory(destDirAbs);
      // Only check if destination exists and is not a directory (target directory doesn't need to exist)
      if (destDirExists && !destDirIsDir) {
        rawIssues.push({
          ruleKind: rule.kind,
          path: destDirAbs,
          displayPath: toDisplayPath(destDirAbs, root),
          message: { key: "issue.move.destMustBeDir", params: { from: rule.from, toDir: rule.toDir } },
          category: "forbidden",
          severity: "warn",
        });
      }

      const matches = await cachedGlobScan(rule.from, root, root, { onlyFiles: true, ig });
      const safeDestDir = destDirIsDir || !destDirExists;
      for (const abs of matches) {
        const base = basename(abs);
        const target = resolve(root, rule.toDir, base);
        if (toDisplayPath(abs, root).startsWith(`${rule.toDir}/`)) continue;
        const targetExists = exists(target);
        const safeToFix = safeDestDir && !targetExists;
        rawIssues.push({
          ruleKind: rule.kind,
          path: abs,
          displayPath: toDisplayPath(abs, root),
          message: safeToFix
            ? { key: "issue.move.shouldMoveToDir", params: { dir: `${rule.toDir}/` } }
            : { key: "issue.move.unsafeManual", params: { dir: `${rule.toDir}/` } },
          category: "forbidden",
          severity: safeToFix ? "error" : "warn",
        });
      }
      continue;
    }

    if (rule.kind === "thoseOnly") {
      debugLogMsg("🔵 [thoseOnly] Start processing rule", { pattern: rule.pattern, onlyCount: rule.only.length });
      // Remove issues from previous rules with the same pattern (later rules override earlier ones)
      const previousRuleIndex = processedThoseOnlyPatterns.get(rule.pattern);
      if (previousRuleIndex !== undefined) {
        // Remove issues from the previous rule with the same pattern
        const allFiles = await cachedGlobScan(rule.pattern, root, root, { onlyFiles: true, ig });
        const allFilesSet = new Set(allFiles.map(p => resolve(root, p)));
        for (let i = rawIssues.length - 1; i >= 0; i--) {
          const issue = rawIssues[i]!;
          if (issue.ruleKind === "thoseOnly" && issue.path && allFilesSet.has(resolve(issue.path))) {
            rawIssues.splice(i, 1);
          }
        }
      }
      processedThoseOnlyPatterns.set(rule.pattern, ruleIndex);
      
      const all = await cachedGlobScan(rule.pattern, root, root, { onlyFiles: true, ig });
      debugLogMsg("🔵 [thoseOnly] Scan matching files", { pattern: rule.pattern, matches: all.length, matchesList: all });
      const allowed = new Set((await cachedGlobScan(rule.only, root, root, { onlyFiles: true, ig })).map((p) => resolve(root, p)));
      const allowedList = Array.from(allowed);
      const targetInAllowed = DEBUG_FILE ? allowedList.filter(p => basename(p) === DEBUG_FILE || p.includes(DEBUG_FILE)) : [];
      debugLogMsg("🔵 [thoseOnly] Scan allowed files", { allowedCount: allowed.size, targetInAllowed, allowedPatterns: rule.only.slice(0, 10) });
      for (const abs of all) {
        const absPath = resolve(root, abs);
        const isAllowed = allowed.has(absPath);
        debugLogMsg("🔵 [thoseOnly] Check file", { file: absPath, isAllowed });
        if (!isAllowed) {
          const issue = {
            ruleKind: rule.kind,
            path: absPath,
            displayPath: toDisplayPath(absPath, root),
            message: { key: "issue.thoseOnly.forbiddenOnlyAllowed" as const, params: { only: rule.only, pattern: rule.pattern } },
            category: "forbidden" as const,
            severity: "error" as const,
          };
          debugLogMsg("🔴 [thoseOnly] Create issue", {
            displayPath: issue.displayPath,
            pattern: rule.pattern,
            only: rule.only,
            existingIssuesForSameFile: rawIssues.filter(i => i.displayPath === issue.displayPath).map(i => ({
              ruleKind: i.ruleKind,
              messageKey: i.message.key,
              params: hasParams(i.message) ? i.message.params : undefined
            }))
          });
          rawIssues.push(issue);
        }
      }
      continue;
    }

    if (rule.kind === "renameDir") {
      for (const name of rule.fromNames) {
        const abs = resolve(root, name);
        if (!exists(abs)) continue;
        const dest = resolve(root, rule.toName);
        const destExists = exists(dest);
        const safeToRename = !destExists;
        const srcIsDir = await isDirectory(abs);
        const srcIsEmptyDir = srcIsDir ? (await readdir(abs)).length === 0 : false;
        rawIssues.push({
          ruleKind: rule.kind,
          path: abs,
          displayPath: toDisplayPath(abs, root),
          message: safeToRename
            ? { key: "issue.renameDir.shouldRenameTo", params: { to: `${rule.toName}/` } }
            : srcIsEmptyDir
              ? { key: "issue.renameDir.removeEmptyDir", params: { dir: `${name.replace(/\/$/, "")}/`, to: `${rule.toName}/` } }
              : { key: "issue.renameDir.shouldMigrateTo", params: { to: `${rule.toName}/` } },
          category: "forbidden",
          severity: safeToRename ? "error" : "warn",
        });
      }
      continue;
    }

    if (rule.kind === "renameGlob") {
      const matches = await cachedGlobScan(rule.from, root, root, { onlyFiles: true, ig });
      for (const abs of matches) {
        const dest = computeRenameDest(abs, root, rule);
        const destExists = dest ? exists(dest) : false;
        const safeToFix = Boolean(dest) && !destExists;
        rawIssues.push({
          ruleKind: rule.kind,
          path: abs,
          displayPath: toDisplayPath(abs, root),
          message: dest
            ? safeToFix
              ? { key: "issue.renameGlob.shouldRenameTo", params: { to: toDisplayPath(dest, root) } }
              : { key: "issue.renameGlob.targetExistsManual", params: { to: toDisplayPath(dest, root) } }
            : { key: "issue.renameGlob.cannotInferTarget" },
          category: "forbidden",
          severity: safeToFix ? "error" : "warn",
        });
      }
      continue;
    }

    if (rule.kind === "no") {
      // Remove issues from previous "no" rules with matching patterns (later rules override earlier ones)
      // First, collect all files that match current rule's patterns
      const currentRuleFiles = new Set<string>();
      for (const name of rule.names) {
        const matches = await cachedGlobScan(name, root, root, { onlyFiles: true, ig });
        for (const match of matches) {
          currentRuleFiles.add(resolve(root, match));
        }
      }
      
      // Remove previous issues that match current rule's patterns
      for (let i = rawIssues.length - 1; i >= 0; i--) {
        const issue = rawIssues[i]!;
        if (issue.ruleKind === "no" && issue.path && currentRuleFiles.has(resolve(issue.path))) {
          rawIssues.splice(i, 1);
        }
      }
      
      // Add new issues for current rule
      for (const name of rule.names) {
        const matches = await cachedGlobScan(name, root, root, { onlyFiles: true, ig });
        for (const match of matches) {
          const abs = resolve(root, match);
          if (!exists(abs)) continue;
          rawIssues.push({
            ruleKind: rule.kind,
            path: abs,
            displayPath: toDisplayPath(abs, root),
            message: { key: "issue.no.forbidden", params: { name } },
            category: "forbidden",
            severity: "error",
          });
        }
      }
      continue;
    }

    if (rule.kind === "has") {
      for (const name of rule.names) {
        // Check if the pattern is a glob pattern
        const isGlobPattern = /[*?{}[\]]/.test(name) || name.includes("**");
        
        if (isGlobPattern) {
          // Use glob scan to find matching files
          const matches = await cachedGlobScan(name, root, root, { onlyFiles: true, ig });
          if (matches.length > 0) {
            // At least one file matches, rule is satisfied
            // Add actual matched file paths to requiredTopLevelNames for display
            for (const match of matches) {
              const relPath = toDisplayPath(match, root);
              const topLevelName = pickTopLevelName(relPath);
              matchedGlobFiles.add(topLevelName);
              // Add to root allowed set if it exists
              if (rootAllowedSet) {
                rootAllowedSet.add(relPath);
              }
            }
            continue;
          }
          
          // No files match the glob pattern, report error
          // Use the pattern itself as the path for error reporting
          const abs = resolve(root, name);
          rawIssues.push({
            ruleKind: rule.kind,
            path: abs,
          displayPath: toDisplayPath(abs, root),
            message: { key: "issue.has.mustExist", params: { name } },
            category: "missing",
            severity: "error",
          });
        } else {
          // Exact file path, use original logic
          const abs = resolve(root, name);
          if (exists(abs)) {
            // File exists, add to root allowed set if it exists
            if (rootAllowedSet) {
              const relPath = toDisplayPath(abs, root);
              rootAllowedSet.add(relPath);
            }
            continue;
          }
          rawIssues.push({
            ruleKind: rule.kind,
            path: abs,
            displayPath: toDisplayPath(abs, root),
            message: { key: "issue.has.mustExist", params: { name } },
            category: "missing",
            severity: "error",
          });
        }
      }
      continue;
    }

    if (rule.kind === "allow") {
      // Remove issues from "no" rules that match the allowed patterns
      // This allows "allow" rules to override "no" rules
      const allowedFiles = new Set<string>();
      for (const name of rule.names) {
        const matches = await cachedGlobScan(name, root, root, { onlyFiles: true, ig });
        for (const match of matches) {
          allowedFiles.add(resolve(root, match));
        }
      }
      
      // Remove "no" rule issues that match allowed patterns
      for (let i = rawIssues.length - 1; i >= 0; i--) {
        const issue = rawIssues[i]!;
        if (issue.ruleKind === "no" && issue.path && allowedFiles.has(resolve(issue.path))) {
          rawIssues.splice(i, 1);
        }
      }
      continue;
    }

    if (rule.kind === "optional") {
      // Remove issues from "has" rules that match the optional patterns
      // This allows "optional" rules to override "has" rules, making files optional instead of required
      // We need to match both by exact path and by pattern, similar to how "has" rules work
      const optionalPaths = new Set<string>();
      for (const name of rule.names) {
        // First, try to resolve as direct path (like "has" does)
        const abs = resolve(root, name);
        optionalPaths.add(abs);
        
        // Also try glob matching for patterns (e.g., "*.lock.yaml")
        const matches = await cachedGlobScan(name, root, root, { onlyFiles: true, ig });
        for (const match of matches) {
          optionalPaths.add(resolve(root, match));
        }
      }
      
      // Remove "has" rule issues that match optional patterns
      for (let i = rawIssues.length - 1; i >= 0; i--) {
        const issue = rawIssues[i]!;
        if (issue.ruleKind === "has" && issue.path && optionalPaths.has(resolve(issue.path))) {
          rawIssues.splice(i, 1);
        }
      }
      continue;
    }

    if (rule.kind === "naming") {
      if (rule.target === "in") {
        // Check if pattern is a glob pattern (contains * or **)
        const isGlobPattern = rule.pattern.includes("*") || rule.pattern.includes("**");
        
        let dirsToCheck: string[] = [];
        
        if (isGlobPattern) {
          // For "for dirs" rules with glob patterns like "tests/*", 
          // we need to extract the parent directory and list its subdirectories
          if (rule.fileType === "dirs") {
            // Extract parent directory from glob pattern (e.g., "tests/*" -> "tests")
            // Find the last "/" before the first "*" or "**"
            const globIndex = Math.min(
              rule.pattern.indexOf("*"),
              rule.pattern.indexOf("**") >= 0 ? rule.pattern.indexOf("**") : Infinity
            );
            if (globIndex > 0) {
              const parentDirPattern = rule.pattern.substring(0, globIndex).replace(/\/+$/, "");
              const parentDirAbs = resolve(root, parentDirPattern);
              if (await isDirectory(parentDirAbs)) {
                dirsToCheck.push(parentDirAbs);
              }
            }
          } else {
            // For file naming rules with glob patterns, find all matching directories
            const matches = await cachedGlobScan(rule.pattern, root, root, { onlyFiles: false, ig });
            // Filter to only directories
            for (const match of matches) {
              if (await isDirectory(match)) {
                dirsToCheck.push(match);
              }
            }
          }
        } else {
          // For non-glob patterns, treat as a single directory
          const dirAbs = resolve(root, rule.pattern);
          if (await isDirectory(dirAbs)) {
            dirsToCheck.push(dirAbs);
          }
        }
        
        // Collect all naming rules that match this pattern
        const namingRulesForPattern = config.rules.filter((r): r is Extract<Rule, { kind: "naming" }> => 
          r.kind === "naming" && r.target === "in" && r.pattern === rule.pattern
        );
        
        // Process each matching directory
        for (const dirAbs of dirsToCheck) {
          const entries = await listTopLevel(dirAbs, { gitignore: true });
          
          // Check if there are any allow rules for this directory (for naming exceptions)
          const allowRulesForDir = inDirGroups.get(rule.pattern)?.filter(r => r.mode === "permissive") || [];
          const allowedNamesSet = new Set<string>();
          for (const allowRule of allowRulesForDir) {
            // For permissive allow rules, collect all allowed names/patterns
            for (const allowedPattern of allowRule.only) {
              // For exact matches (no glob), add directly
              if (!allowedPattern.includes("*") && !allowedPattern.includes("?")) {
                allowedNamesSet.add(allowedPattern);
              } else {
                // For glob patterns, resolve them and collect matching names
                const matches = await cachedGlobScan(allowedPattern, dirAbs, root, { onlyFiles: false, ig });
                for (const match of matches) {
                  allowedNamesSet.add(basename(match));
                }
              }
            }
          }
          
          for (const entry of entries) {
            // Filter by fileType if specified
            if (rule.fileType === "files" && entry.isDir) continue;
            if (rule.fileType === "dirs" && !entry.isDir) continue;

            // Skip naming check if this name is explicitly allowed by an allow rule
            if (allowedNamesSet.has(entry.name)) continue;

            // Check if the entry is in the except list of any naming rule for this pattern
            // except supports both exact names and glob patterns
            let isInExceptList = false;
            for (const r of namingRulesForPattern) {
              if (!r.except) continue;
              const relPath = toDisplayPath(entry.abs, root);
              for (const exceptPattern of r.except) {
                // If it's a glob pattern, use globScan to match
                if (exceptPattern.includes("*") || exceptPattern.includes("**")) {
                  // For "in" target, the except pattern is relative to the pattern directory
                  const patternDirAbs = resolve(root, rule.pattern);
                  const matches = await cachedGlobScan(exceptPattern, patternDirAbs, root, { onlyFiles: !entry.isDir, ig });
                  if (matches.some(m => resolve(root, m) === entry.abs)) {
                    isInExceptList = true;
                    break;
                  }
                } else {
                  // Exact match: check if the filename matches
                  if (entry.name === exceptPattern || relPath === exceptPattern || relPath.endsWith(`/${exceptPattern}`)) {
                    isInExceptList = true;
                    break;
                  }
                }
              }
              if (isInExceptList) break;
            }
            if (isInExceptList) continue;

            // Check if the entry passes any of the naming rules for this pattern
            // Priority: conditional rules (with ifContains or ifParentStyle) are checked first
            // If no conditional rule matches, fall back to default rules
            
            // Separate conditional rules from default rules
            const conditionalRules = namingRulesForPattern.filter(r => r.ifContains || r.ifParentStyle);
            const defaultRules = namingRulesForPattern.filter(r => !r.ifContains && !r.ifParentStyle);
            
            let passesAnyRule = false;
            let lastFailedRule: { rule: Extract<Rule, { kind: "naming" }>; result: import("./utils/naming").NamingCheckResult } | null = null;
            
            // First, check conditional rules
            for (const r of conditionalRules) {
              // Filter by fileType if specified
              if (r.fileType === "files" && entry.isDir) continue;
              if (r.fileType === "dirs" && !entry.isDir) continue;
              
              // Check if-contains condition (for dirs)
              // This applies to directory naming rules: only apply if the directory contains the specified file
              if (r.ifContains && entry.isDir && r.fileType === "dirs") {
                const dirEntries = await listTopLevel(entry.abs, { gitignore: true });
                const hasFile = dirEntries.some(e => !e.isDir && e.name === r.ifContains);
                if (!hasFile) continue; // Condition not met, skip this rule
              }
              
              // Check if-parent-matches condition (for files)
              // This applies to file naming rules: only apply if the parent directory matches the specified style
              if (r.ifParentStyle && !entry.isDir && r.fileType === "files") {
                // Get the immediate parent directory of the file, not the rule pattern directory
                const parentDirPath = dirname(entry.abs);
                const parentDirName = basename(parentDirPath);
                const parentMatches = checkNamingStyle(parentDirName, r.ifParentStyle);
                if (!parentMatches.valid) continue; // Condition not met, skip this rule
              }
              
              // Condition met, check naming style
              if (r.except?.includes(entry.name)) {
                passesAnyRule = true;
                break;
              }
              const checkResult = checkNamingStyle(entry.name, r.style, r.prefix, r.suffix);
              if (checkResult.valid) {
                passesAnyRule = true;
                break;
              } else {
                // Store the first matching rule's error for later use
                lastFailedRule = { rule: r, result: checkResult };
              }
            }
            
            // If no conditional rule matched, check default rules
            if (!passesAnyRule) {
              for (const r of defaultRules) {
                // Filter by fileType if specified
                if (r.fileType === "files" && entry.isDir) continue;
                if (r.fileType === "dirs" && !entry.isDir) continue;
                // Skip if this rule has this name in its except list
                if (r.except?.includes(entry.name)) {
                  passesAnyRule = true;
                  break;
                }
                const checkResult = checkNamingStyle(entry.name, r.style, r.prefix, r.suffix);
                if (checkResult.valid) {
                  passesAnyRule = true;
                  break;
                } else {
                  // Store the first matching rule's error for later use
                  lastFailedRule = { rule: r, result: checkResult };
                }
              }
            }

            if (!passesAnyRule) {
              // Determine error message based on the failure reason
              let message: IssueMessage;
              if (lastFailedRule && !lastFailedRule.result.valid) {
                const { result, rule: failedRule } = lastFailedRule;
                if (result.reason === "prefix") {
                  message = { key: "issue.naming.invalidPrefix", params: { pattern: result.pattern } };
                } else if (result.reason === "suffix") {
                  message = { key: "issue.naming.invalidSuffix", params: { pattern: result.pattern } };
                } else {
                  // Use the rule's style as fallback if result.style is empty
                  const styleToUse = result.style || failedRule.style;
                  message = { key: "issue.naming.invalid", params: { style: styleToUse } };
                }
              } else {
                // Fallback: use the first matching rule's style, or the original rule's style
                const firstRule = defaultRules[0] || conditionalRules[0] || rule;
                message = { key: "issue.naming.invalid", params: { style: firstRule.style } };
              }
              rawIssues.push({
                ruleKind: rule.kind,
                path: entry.abs,
                displayPath: toDisplayPath(entry.abs, root),
                message,
                category: "forbidden",
                severity: "error"
              });
            }
          }
        }
      } else {
        // target: "those"
        const matches = await cachedGlobScan(rule.pattern, root, root, { onlyFiles: rule.fileType !== "dirs", ig });
        
        // Collect all naming rules (not just same pattern) to check if file passes any rule
        // This allows more specific rules (like pages/**/components/**/*.vue) to work alongside broader rules
        const allNamingRules = config.rules.filter((r): r is Extract<Rule, { kind: "naming" }> => 
          r.kind === "naming" && r.target === "those"
        );
        
        for (const abs of matches) {
          // Filter by fileType if specified
          const isDir = await isDirectory(abs);
          if (rule.fileType === "files" && isDir) continue;
          if (rule.fileType === "dirs" && !isDir) continue;

          const base = basename(abs);
          const relPath = relative(root, abs).split(sep).join("/");
          
          // Find all naming rules that match this file by checking their patterns
          const matchingRules: Extract<Rule, { kind: "naming" }>[] = [];
          for (const r of allNamingRules) {
            const ruleMatches = await cachedGlobScan(r.pattern, root, root, { onlyFiles: r.fileType !== "dirs", ig });
            if (ruleMatches.includes(abs)) {
              matchingRules.push(r);
            }
          }
          
          // Check if the file is in the except list of any matching rule
          // except supports both exact names and glob patterns
          let isInExceptList = false;
          for (const r of matchingRules) {
            if (!r.except) continue;
            for (const exceptPattern of r.except) {
              // If it's a glob pattern, use globScan to match
              if (exceptPattern.includes("*") || exceptPattern.includes("**")) {
                // For "those" target, the except pattern should be scanned from root
                // because "those" patterns are already global (e.g., "**/*.py")
                // If the pattern starts with "**", scan from root
                // Otherwise, try to extract a base directory from the pattern if possible
                let scanDir = root;
                if (!r.pattern.startsWith("**")) {
                  // Try to extract directory from pattern (e.g., "components/**/*.tsx" -> "components")
                  const patternParts = r.pattern.split("/");
                  const patternDir = patternParts.slice(0, -1).join("/");
                  if (patternDir && !patternDir.includes("*") && !patternDir.includes("**")) {
                    scanDir = resolve(root, patternDir);
                  }
                }
                const matches = await cachedGlobScan(exceptPattern, scanDir, root, { onlyFiles: !isDir, ig });
                if (matches.some(m => resolve(root, m) === abs)) {
                  isInExceptList = true;
                  break;
                }
              } else {
                // Exact match: check filename or relative path
                if (base === exceptPattern || relPath === exceptPattern || relPath.endsWith(`/${exceptPattern}`)) {
                  isInExceptList = true;
                  break;
                }
              }
            }
            if (isInExceptList) break;
          }
          if (isInExceptList) continue;
          
          // Check if the file passes any of the matching naming rules
          // Priority: conditional rules (with ifContains or ifParentStyle) are checked first
          // If no conditional rule matches, fall back to default rules
          
          // Separate conditional rules from default rules
          const conditionalRules = matchingRules.filter(r => r.ifContains || r.ifParentStyle);
          const defaultRules = matchingRules.filter(r => !r.ifContains && !r.ifParentStyle);
          
          let passesAnyRule = false;
          let lastFailedRule: { rule: Extract<Rule, { kind: "naming" }>; result: import("./utils/naming").NamingCheckResult } | null = null;
          
          // First, check conditional rules
          for (const r of conditionalRules) {
            // Filter by fileType if specified
            if (r.fileType === "files" && isDir) continue;
            if (r.fileType === "dirs" && !isDir) continue;
            
            // Check if-contains condition (for dirs)
            if (r.ifContains && isDir) {
              const dirEntries = await listTopLevel(abs, { gitignore: true });
              const hasFile = dirEntries.some(e => !e.isDir && e.name === r.ifContains);
              if (!hasFile) continue; // Condition not met, skip this rule
            }
            
            // Check if-parent-matches condition (for files)
            if (r.ifParentStyle && !isDir) {
              const parentDirPath = dirname(abs);
              const parentDirName = basename(parentDirPath);
              const parentMatches = checkNamingStyle(parentDirName, r.ifParentStyle);
              if (!parentMatches.valid) continue; // Condition not met, skip this rule
            }
            
            // Condition met, check naming style
            if (r.except?.includes(base)) {
              passesAnyRule = true;
              break;
            }
            const checkResult = checkNamingStyle(base, r.style, r.prefix, r.suffix);
            if (checkResult.valid) {
              passesAnyRule = true;
              break;
            } else {
              // Store the first matching rule's error for later use
              lastFailedRule = { rule: r, result: checkResult };
            }
          }
          
          // If no conditional rule matched, check default rules
          if (!passesAnyRule) {
            for (const r of defaultRules) {
              // Filter by fileType if specified
              if (r.fileType === "files" && isDir) continue;
              if (r.fileType === "dirs" && !isDir) continue;
              // Skip if this rule has this name in its except list
              if (r.except?.includes(base)) {
                passesAnyRule = true;
                break;
              }
              const checkResult = checkNamingStyle(base, r.style, r.prefix, r.suffix);
              if (checkResult.valid) {
                passesAnyRule = true;
                break;
              } else {
                // Store the first matching rule's error for later use
                lastFailedRule = { rule: r, result: checkResult };
              }
            }
          }

          if (!passesAnyRule) {
            // Determine error message based on the failure reason
            let message: IssueMessage;
            if (lastFailedRule && !lastFailedRule.result.valid) {
              const { result, rule: failedRule } = lastFailedRule;
              if (result.reason === "prefix") {
                message = { key: "issue.naming.invalidPrefix", params: { pattern: result.pattern } };
              } else if (result.reason === "suffix") {
                message = { key: "issue.naming.invalidSuffix", params: { pattern: result.pattern } };
              } else {
                // Use the rule's style as fallback if result.style is empty
                const styleToUse = result.style || failedRule.style;
                message = { key: "issue.naming.invalid", params: { style: styleToUse } };
              }
            } else {
              // Fallback: use the first matching rule's style, or the original rule's style
              const firstRule = defaultRules[0] || conditionalRules[0] || rule;
              message = { key: "issue.naming.invalid", params: { style: firstRule.style } };
            }
            rawIssues.push({
              ruleKind: rule.kind,
              path: abs,
              displayPath: toDisplayPath(abs, root),
              message,
              category: "forbidden",
              severity: "error"
            });
          }
        }
      }
      continue;
    }
  }


  // Output debug logs
  if (DEBUG_FILE && debugLog.length > 0) {
    console.error("\n" + "=".repeat(80));
    console.error(`Debug log: Tracking file "${DEBUG_FILE}"`);
    console.error("=".repeat(80));
    for (const msg of debugLog) {
      console.error(msg);
    }
    console.error("=".repeat(80) + "\n");
  }

  // 3. Final filter based on gitignore and Dedup
  
  const finalIssues: Issue[] = [];
  const seen = new Set<string>();

  // Debug: Count how many issues each file has
  const issuesByFile = new Map<string, Issue[]>();
  for (const i of rawIssues) {
    const rel = relative(root, i.path).split(sep).join("/");
    // Ignored paths should not report errors
    if (ig.ignores(rel)) continue;
    
    if (!issuesByFile.has(i.displayPath)) {
      issuesByFile.set(i.displayPath, []);
    }
    issuesByFile.get(i.displayPath)!.push(i);
  }
  
  // Debug: Output files with multiple issues
  for (const [displayPath, issues] of issuesByFile.entries()) {
    if (issues.length > 1) {
      debugLogMsg("⚠️ [Before dedup] File has multiple issues", {
        displayPath,
        count: issues.length,
        issues: issues.map(i => ({
          ruleKind: i.ruleKind,
          messageKey: i.message.key,
          params: hasParams(i.message) ? i.message.params : undefined
        }))
      });
    }
  }

  for (const i of rawIssues) {
    const rel = relative(root, i.path).split(sep).join("/");
    // Ignored paths should not report errors
    if (ig.ignores(rel)) continue;

    const key = `${i.ruleKind}:${i.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    finalIssues.push(i);
  }
  
  // Debug: Count how many issues each file has after deduplication
  const finalIssuesByFile = new Map<string, Issue[]>();
  for (const i of finalIssues) {
    if (!finalIssuesByFile.has(i.displayPath)) {
      finalIssuesByFile.set(i.displayPath, []);
    }
    finalIssuesByFile.get(i.displayPath)!.push(i);
  }
  
  for (const [displayPath, issues] of finalIssuesByFile.entries()) {
    if (issues.length > 1) {
      debugLogMsg("⚠️ [After dedup] File still has multiple issues (different ruleKind)", {
        displayPath,
        count: issues.length,
        issues: issues.map(i => ({
          ruleKind: i.ruleKind,
          messageKey: i.message.key,
          params: hasParams(i.message) ? i.message.params : undefined
        }))
      });
    }
  }

  const endTime = performance.now();
  const duration = Math.round(endTime - startTime);
  
  // Merge matched glob files into requiredTopLevelNames
  const finalRequiredTopLevelNames = Array.from(new Set([...requiredTopLevelNames, ...matchedGlobFiles])).sort();
  
  return { 
    root, 
    configPath, 
    issues: finalIssues, 
    requiredTopLevelNames: finalRequiredTopLevelNames, 
    visibleSet, 
    imports: config.imports, 
    fileCount, 
    duration,
  };
}
