import { basename, resolve, relative, sep } from "node:path";
import { glob } from "tinyglobby";
import ignore from "ignore";
import type { FsLintConfig, Issue, IssueMessage, LintResult, Rule } from "../types";
import { DEFAULT_IGNORE_DIRS, isDirectory, listTopLevel, loadGitIgnorePatterns, pickTopLevelName, toDisplayPath, walkFiles } from "../fsutil";
import { findValidator, processInDirOnlyGroup, type RuleValidatorContext, RuleStatisticsCollector } from "./validators";

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

// computeRenameDest moved to renameGlob validator

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
        source: allowRule.source, // Use source from the original allow rule
        when: allowRule.when, // Preserve when conditions if any
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
        // Use source from the first has rule that contributed to this list
        const firstHasRule = hasRules[0];
        rootGroup.push({
          kind: "inDirOnly",
          dir: rootDir,
          only: requiredNames,
          mode: "permissive",
          source: firstHasRule ? firstHasRule.source : { file: configPath, line: 0 }, // Fallback if no has rules
        });
      }
      inDirGroups.set(rootDir, rootGroup);
    }
  }

  // Store root directory's allowed set for later updates (for must have files)
  let rootAllowedSet: Set<string> | undefined = undefined;

  // Create statistics collector for rule metrics
  const statisticsCollector = new RuleStatisticsCollector();

  // Create validator context
  const processedThoseOnlyPatterns = new Map<string, number>();
  const validatorContext: RuleValidatorContext = {
    root,
    cachedGlobScan,
    ig,
    rawIssues,
    debugLogMsg,
    statisticsCollector,
    inDirGroups,
    rootAllowedSet,
    filesMatchedByMoveRules,
    forceStrict,
    config,
    processedThoseOnlyPatterns,
  };

  for (const [dir, group] of inDirGroups.entries()) {
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

    // Process inDirOnly group using the validator
    // Track statistics for inDirOnly rules (use first rule's index as representative)
    const firstRuleIndex = config.rules.findIndex(r => r.kind === "inDirOnly" && r.dir === dir);
    if (firstRuleIndex >= 0) {
      const startTime = performance.now();
      const result = await processInDirOnlyGroup(dir, group, validatorContext, filesMatchedByMoveRules);
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      // Record metrics for all rules in this group
      for (let i = 0; i < config.rules.length; i++) {
        const r = config.rules[i]!;
        if (r.kind === "inDirOnly" && r.dir === dir) {
          statisticsCollector.record(i, {
            duration,
            hitCount: result.hitCount,
          });
        }
      }
        } else {
      await processInDirOnlyGroup(dir, group, validatorContext, filesMatchedByMoveRules);
    }
  }

  // Update validator context with rootAllowedSet and matchedGlobFiles after inDirOnly processing
  validatorContext.rootAllowedSet = rootAllowedSet;
  validatorContext.matchedGlobFiles = matchedGlobFiles;

  // 2. Handle all other rules using validators
  for (let ruleIndex = 0; ruleIndex < config.rules.length; ruleIndex++) {
    const rule = config.rules[ruleIndex]!;
    if (rule.kind === "inDirOnly") continue;

    // Find and use validator for this rule
    const validator = findValidator(rule);
    if (validator) {
      await validator.validate(rule, validatorContext, ruleIndex, config);
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
    ruleMetrics: statisticsCollector.getAllMetrics(),
    rules: config.rules, // Include rules for statistics display
  };
}
