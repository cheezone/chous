import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { FsLintConfig, Rule, WhereDirective } from "./types";
import { FsLintError } from "./errors";
import { APP_CONFIG_FILE_NAME } from "./constants";

// Determine preset directory logic.
// In development (src/), presets are at ../presets relative to this file? No, relative to project root.
// In production (dist/), presets are at ../presets.
// We can try to find them relative to __dirname.
function findPresetPath(name: string): string | null {
  // Built-in presets map? Or just try to find files.
  // 1. Check relative to current working directory? No, presets are usually absolute or package relative.
  // 2. Check standard preset locations.

  // Hacky resolution for dev vs prod structure:
  // Prod: /.../dist/parser.mjs -> /.../presets/name.chous
  // Dev: /.../src/parser.ts -> /.../presets/name.chous

  // We don't have __dirname in ESM unless we construct it.
  // Use fileURLToPath for cross-platform compatibility (Windows support)
  const selfDir = dirname(fileURLToPath(import.meta.url));

  // Look up one level then presets/
  const candidate = resolve(selfDir, "..", "presets", `${name}${APP_CONFIG_FILE_NAME}`);
  if (existsSync(candidate)) return candidate;

  return null;
}

function splitCsvLike(input: string): string[] {
  const result: string[] = [];
  let current = "";
  let braceLevel = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === "{") braceLevel++;
    else if (char === "}") braceLevel--;

    if (char === "," && braceLevel === 0) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result.filter(Boolean);
}

function looksLikeGlob(s: string): boolean {
  return /[*?{}\[\]]/.test(s) || s.includes("**") || s.includes("/");
}

function isNamingStyle(s: string): boolean {
  return ["PascalCase", "camelCase", "kebab-case", "snake_case", "SCREAMING_SNAKE_CASE", "flatcase"].includes(s);
}

// Calculate the indentation level of a line (number of spaces)
function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1]!.length : 0;
}

// Preprocess nested block syntax, convert to flat rules
function preprocessNestedBlocks(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const output: string[] = [];
  const indentStack: { dir: string; indent: number }[] = [];

  // First process multi-line arrays, merge them into single lines
  const processedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]!;
    const trimmed = rawLine.trim();

    // Skip empty lines and comments (but keep them for indentation calculation)
    if (!trimmed || trimmed.startsWith("#")) {
      processedLines.push(rawLine);
      continue;
    }

    // Process multi-line array syntax
    if (trimmed.includes("[") && !trimmed.includes("]")) {
      let bracketCount = (trimmed.match(/\[/g) || []).length;
      let combined = trimmed;
      let j = i + 1;
      while (j < lines.length && bracketCount > 0) {
        const nextRawLine = lines[j];
        if (nextRawLine !== undefined) {
          const nextTrimmed = nextRawLine.trim();
          // Skip empty lines and comments, but continue searching for ]
          if (!nextTrimmed || nextTrimmed.startsWith("#")) {
            j++;
            continue;
          }
          combined += " " + nextTrimmed;
          bracketCount += (nextTrimmed.match(/\[/g) || []).length - (nextTrimmed.match(/\]/g) || []).length;
          if (bracketCount === 0) break;
        }
        j++;
      }
      processedLines.push(rawLine.replace(trimmed, combined));
      i = j;
      continue;
    }

    processedLines.push(rawLine);
  }

  // Now process indentation blocks
  for (let i = 0; i < processedLines.length; i++) {
    const rawLine = processedLines[i]!;
    const trimmed = rawLine.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      output.push(rawLine);
      continue;
    }

    const indent = getIndentLevel(rawLine);

    // Pop indentation stack items that no longer belong to the current block
    while (indentStack.length > 0 && indentStack[indentStack.length - 1]!.indent >= indent) {
      indentStack.pop();
    }

    const currentDir = indentStack.length > 0 ? indentStack[indentStack.length - 1]!.dir : "";

    // Check if it's `in <dir>:` or `in <dir> {` syntax
    const inDirMatch = trimmed.match(/^in\s+([^\s:{}]+)\s*[:{]\s*$/);
    if (inDirMatch) {
      const dir = inDirMatch[1]!.trim();
      const fullDir = currentDir ? `${currentDir}/${dir}` : dir;
      indentStack.push({ dir: fullDir, indent });
      // Don't output this line, it's just a block start marker
      continue;
    }

    // Check if it's block end `}`
    if (trimmed === "}") {
      // Block end, don't output
      continue;
    }

    // Process rules within the block, add parent directory prefix
    let processedLine = trimmed;

    if (currentDir) {
      // move rule: move <pattern> to <dir>
      const moveMatch = processedLine.match(/^move\s+(.+?)\s+to\s+(.+?)\s*$/);
      if (moveMatch) {
        const from = moveMatch[1]!.trim();
        const toDir = moveMatch[2]!.trim();
        // If from is not an absolute path, add parent directory prefix
        const prefixedFrom = from.startsWith(currentDir) ? from : `${currentDir}/${from}`;
        // If toDir is not an absolute path, add parent directory prefix
        const prefixedTo = toDir.startsWith(currentDir) ? toDir : `${currentDir}/${toDir}`;
        processedLine = `move ${prefixedFrom} to ${prefixedTo}`;
      } else {
        // allow rule: allow [...] or allow [...] in <dir>
        const allowMatch = processedLine.match(/^(allow|yes|ohyes)\s+(.+?)(?:\s+in\s+(.+?))?\s*$/);
        if (allowMatch) {
          // Extract pattern part, handle array syntax [...] or comma-separated patterns
          let patternsStr = allowMatch[2]!.trim();
          const originalWasArray = patternsStr.startsWith("[");
          // Remove array syntax brackets
          if (originalWasArray) {
            patternsStr = patternsStr.slice(1, -1).trim();
          }

          // Use splitCsvLike to correctly parse pattern list (handles braces, etc.)
          const patterns = splitCsvLike(patternsStr);

          // Add directory prefix to each pattern
          const prefixedPatterns = patterns.map(pattern => {
            const trimmed = pattern.trim();
            // If pattern already starts with currentDir, don't add again
            if (trimmed.startsWith(currentDir + '/')) {
              return trimmed;
            }
            // If pattern starts with **, don't add prefix (global match)
            if (trimmed.startsWith('**')) {
              return trimmed;
            }
            // If it's a simple directory name in array syntax (no glob characters), don't add prefix
            // These will be parsed as directory names relative to the current directory
            if (originalWasArray && !looksLikeGlob(trimmed)) {
              return trimmed;
            }
            // For glob patterns or relative path patterns, add prefix
            // Example: *.md -> docs/*.md, subdir/*.ts -> src/subdir/*.ts
            return `${currentDir}/${trimmed}`;
          });

          // Recombine pattern string (if array syntax, keep array format)
          const patternsStrResult = originalWasArray
            ? `[${prefixedPatterns.join(', ')}]`
            : prefixedPatterns.join(', ');

          if (!allowMatch[3]) {
            // If there's no in <dir>, add it
            processedLine = `${allowMatch[1]} ${patternsStrResult} in ${currentDir}`;
          } else {
            // If there's in <dir>, ensure path is correct, but pattern shouldn't be prefixed (already in block)
            const targetDir = allowMatch[3]!.startsWith(currentDir) ? allowMatch[3] : `${currentDir}/${allowMatch[3]}`;
            // If in <dir> already exists, pattern shouldn't be prefixed
            processedLine = `${allowMatch[1]} ${allowMatch[2]} in ${targetDir}`;
          }
        } else {
          // strict rule: strict or strict [files|dirs] or strict in <dir>
          const strictMatch = processedLine.match(/^strict(?:\s+(files|dirs))?(?:\s+in\s+(.+?))?\s*$/);
          if (strictMatch) {
            const fileType = strictMatch[1]; // "files" | "dirs" | undefined
            const targetDir = strictMatch[2]; // directory or undefined
            if (!targetDir) {
              // strict or strict files or strict dirs (no in <dir>)
              if (fileType) {
                processedLine = `strict ${fileType} in ${currentDir}`;
              } else {
                processedLine = `strict in ${currentDir}`;
              }
            } else {
              // strict in <dir> or strict files in <dir>
              const resolvedDir = targetDir.startsWith(currentDir) ? targetDir : `${currentDir}/${targetDir}`;
              if (fileType) {
                processedLine = `strict ${fileType} in ${resolvedDir}`;
              } else {
                processedLine = `strict in ${resolvedDir}`;
              }
            }
          } else {
            // no rule: no <pattern1>, <pattern2>, ...
            const noMatch = processedLine.match(/^no\s+(.+?)\s*$/);
            if (noMatch) {
              const patternsStr = noMatch[1]!.trim();
              // Use splitCsvLike to correctly parse pattern list (handles braces, etc.)
              const patterns = splitCsvLike(patternsStr);
              // Add directory prefix to each pattern (unless already contains directory separator or starts with **)
              const patternList = patterns.map(p => {
                const trimmed = p.trim();
                // If pattern already contains directory separator or starts with **, don't add prefix
                if (trimmed.includes('/') || trimmed.startsWith('**')) {
                  return trimmed;
                }
                // If pattern already starts with currentDir, don't add again
                if (trimmed.startsWith(currentDir + '/')) {
                  return trimmed;
                }
                return `${currentDir}/${trimmed}`;
              });
              processedLine = `no ${patternList.join(', ')}`;
            } else {
              // must have or has rule: must have <items> or has <items>
              const mustHaveMatch = processedLine.match(/^must\s+have\s+(.+?)\s*$/);
              const hasMatch = processedLine.match(/^has\s+(.+?)\s*$/);
              if (mustHaveMatch || hasMatch) {
                const namesStr = mustHaveMatch ? mustHaveMatch[1]!.trim() : hasMatch![1]!.trim();
                const patterns = splitCsvLike(namesStr);
                // Add directory prefix to each pattern (unless already contains directory separator or starts with **)
                const prefixedPatterns = patterns.map(p => {
                  const trimmed = p.trim();
                  // If pattern already contains directory separator or starts with **, don't add prefix
                  if (trimmed.includes('/') || trimmed.startsWith('**')) {
                    return trimmed;
                  }
                  // If pattern already starts with currentDir, don't add again
                  if (trimmed.startsWith(currentDir + '/')) {
                    return trimmed;
                  }
                  return `${currentDir}/${trimmed}`;
                });
                const prefix = mustHaveMatch ? 'must have' : 'has';
                processedLine = `${prefix} ${prefixedPatterns.join(', ')}`;
              } else {
                // use rule: use <style> for files <pattern> [with optional conditions]
                // We need to add prefix only to the pattern part, not the conditions
                // Match pattern part (stops at first keyword: if-contains, if-parent-matches, except, prefix:, suffix:)
                // Pattern can be a single word or multiple words (for glob patterns like "**/*.vue")
                const usePatternMatch = processedLine.match(/^use\s+(.+?)\s+for\s+(?:(files|dirs)\s+)?([^\s]+(?:\s+[^\s]+)*?)(?=\s+(?:if-contains|if-parent-matches|except|prefix:|suffix:)|$)/);
                if (usePatternMatch && usePatternMatch[3]) {
                  const patternPart = usePatternMatch[3].trim();
                  // Check if pattern needs prefix
                  // Don't add prefix if:
                  // 1. Already starts with currentDir
                  // 2. Starts with / (absolute path)
                  // 3. Starts with ** and already has a directory prefix (e.g., "app/components/**/*.vue")
                  if (patternPart && !patternPart.startsWith(currentDir) && !patternPart.startsWith('/')) {
                    let prefixedPattern: string;
                    if (patternPart.startsWith('**')) {
                      // For ** patterns, insert currentDir before ** (e.g., "**/*.vue" -> "app/components/**/*.vue")
                      prefixedPattern = `${currentDir}/${patternPart}`;
                    } else {
                      // For regular patterns, just prepend currentDir
                      prefixedPattern = `${currentDir}/${patternPart}`;
                    }
                    // Replace only the pattern part in the original line (use the match index for accuracy)
                    const patternStart = usePatternMatch.index! + usePatternMatch[0]!.indexOf(patternPart);
                    processedLine = processedLine.substring(0, patternStart) + prefixedPattern + processedLine.substring(patternStart + patternPart.length);
                  }
                }
              }
            }
          }
        }
      }
    }

    output.push(processedLine);
  }

  return output.join("\n");
}

export function parseFsLintConfig(raw: string, configPath?: string): FsLintConfig {
  return parseFsLintConfigInternal(raw, configPath, new Map());
}

// Parse multiple config groups separated by ---
export function parseFsLintConfigGroups(raw: string, configPath?: string): FsLintConfig[] {
  // Split by --- separator (must be on its own line, optionally with whitespace)
  const groups = raw.split(/^\s*---+\s*$/m).filter(g => g.trim());
  if (groups.length === 0) {
    // No separator found, treat as single config
    return [parseFsLintConfig(raw, configPath)];
  }

  return groups.map(group => parseFsLintConfig(group.trim(), configPath));
}

function parseFsLintConfigInternal(
  raw: string,
  configPath: string | undefined,
  importDependencies: Map<string, string[]>, // Shared across recursive calls
): FsLintConfig {
  // Preprocess nested block syntax
  raw = preprocessNestedBlocks(raw);
  const imports: string[] = []; // To track imported files
  const processedLines: { content: string; lineNum: number }[] = [];
  const rawLines = raw.split(/\r?\n/);
  for (let i = 0; i < rawLines.length; i++) {
    const startLineNum = i + 1;
    const rawLine = rawLines[i];
    if (rawLine === undefined) continue;
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    // Handle backslash line continuation
    while (line.endsWith("\\") && i + 1 < rawLines.length) {
      const nextLine = rawLines[++i];
      if (nextLine !== undefined) {
        line = line.slice(0, -1).trim() + " " + nextLine.trim();
      } else {
        break;
      }
    }

    // Handle multi-line array syntax: [...] spanning multiple lines
    if (line.includes("[") && !line.includes("]")) {
      let bracketCount = (line.match(/\[/g) || []).length;
      let j = i + 1;
      while (j < rawLines.length && bracketCount > 0) {
        const nextRawLine = rawLines[j];
        if (nextRawLine !== undefined) {
          const nextTrimmed = nextRawLine.trim();
          // Skip empty lines and comments within array
          if (!nextTrimmed || nextTrimmed.startsWith("#")) {
            j++;
            continue;
          }
          line += " " + nextTrimmed;
          bracketCount += (nextTrimmed.match(/\[/g) || []).length - (nextTrimmed.match(/\]/g) || []).length;
          if (bracketCount === 0) break;
        }
        j++;
      }
      // Skip the lines we consumed
      i = j;
    }

    processedLines.push({ content: line, lineNum: startLineNum });
  }

  let where: WhereDirective = { type: "config" };
  const rules: Rule[] = [];

  for (let idx = 0; idx < processedLines.length; idx++) {
    let { content: line, lineNum } = processedLines[idx]!;
    if (!line) continue;

    // Handle array syntax: extract items from [...] and replace with comma-separated list
    // Use [\s\S] instead of . with s flag for ES2017 compatibility
    // Support array syntax followed by text like "in <dir>" (e.g., "allow [...] in app")
    const arrayMatch = line.match(/^(.+?)\s*\[([\s\S]+?)\]\s*(.*)$/);
    if (arrayMatch) {
      const beforeBracket = arrayMatch[1]!.trim();
      const arrayContent = arrayMatch[2]!;
      const afterBracket = arrayMatch[3]?.trim() || "";
      // Split by comma or newline, trim each item, filter empty
      const arrayItems = arrayContent
        .split(/[,\n]/)
        .map((item: string) => item.trim())
        .filter(Boolean)
        .join(", ");
      line = beforeBracket + " " + arrayItems + (afterBracket ? " " + afterBracket : "");
      // Update the processed line
      processedLines[idx] = { content: line, lineNum };
    }
    const whereMatch = line.match(/^\[where:(.*?)\]$/);
    if (whereMatch) {
      const v = whereMatch[1]?.trim();
      if (!v) throw new FsLintError({ key: "parser.invalidWhereDirective", lineNum }, configPath);
      if (v === "cwd") where = { type: "cwd" };
      else where = { type: "glob", patterns: [v] };
      continue;
    }

    const pathMatch = line.match(/^\[(.+?)\]$/);
    if (pathMatch) {
      const v = pathMatch[1]?.trim();
      if (!v) throw new FsLintError({ key: "parser.invalidPathDirective", lineNum }, configPath);
      if (!v.startsWith("where:")) where = { type: "paths", paths: [v] };
      continue;
    }

    const importMatch = line.match(/^import\s+(.+?)\s*$/);
    if (importMatch) {
      const importName = importMatch[1]?.trim();
      if (!importName) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "import", line }, lineNum }, configPath);

      let importPath: string | null = null;

      // 1. Try to resolve as a file relative to the config file (if we have a config path)
      if (configPath) {
        const localCandidate = resolve(dirname(configPath), importName);
        if (existsSync(localCandidate)) {
          importPath = localCandidate;
        } else if (existsSync(localCandidate + APP_CONFIG_FILE_NAME)) {
          importPath = localCandidate + APP_CONFIG_FILE_NAME;
        }
      }

      // 2. Try to resolve as a "preset"
      if (!importPath) {
        importPath = findPresetPath(importName);
      }

      if (!importPath) {
        throw new FsLintError({ key: "parser.unknownPreset", params: { name: importName }, lineNum }, configPath);
      }

      // Check for cycles? (Simplistic check: don't import self)
      if (configPath && resolve(importPath) === resolve(configPath)) {
        // Cycle detected or self-import, ignore or error. Ignoring for now to be safe.
        continue;
      }

      try {
        const importRaw = readFileSync(importPath, "utf8");
        // Recursively parse (pass the shared importDependencies map)
        const importedConfig = parseFsLintConfigInternal(importRaw, importPath, importDependencies);
        // Import rules, but mark thoseOnly rules as needing re-filling
        // (they were filled with only the imported preset's allow rules)
        for (const rule of importedConfig.rules) {
          if (rule.kind === "thoseOnly" && rule.only.length > 0) {
            // Mark as needing re-filling by setting only to empty
            // This will be filled again after all rules are collected
            rule.only = [];
          }
          rules.push(rule);
        }

        // Track import dependencies for topological sorting
        // If configPath imports importPath, then importPath should come before configPath
        if (configPath) {
          const resolvedConfigPath = resolve(configPath);
          if (!importDependencies.has(resolvedConfigPath)) {
            importDependencies.set(resolvedConfigPath, []);
          }
          importDependencies.get(resolvedConfigPath)!.push(importPath);
        }

        imports.push(importPath);
        if (importedConfig.imports) {
          imports.push(...importedConfig.imports);
        }
      } catch (e) {
        // Wrap error? Or just propagate.
        throw e; // FsLintError propagates
      }

      continue;
    }

    const moveMatch = line.match(/^move\s+(.+?)\s+to\s+([^\s#]+)\s*$/);
    if (moveMatch) {
      const from = moveMatch[1];
      const toDir = moveMatch[2];
      if (!from || !toDir) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "move", line }, lineNum }, configPath);
      rules.push({ kind: "move", from: from.trim(), toDir: toDir.trim() });
      continue;
    }

    // strict [files|dirs] for <pattern> - new syntax for thoseOnly (strict mode for glob patterns)
    const strictForMatch = line.match(/^strict\s+(files|dirs)?\s+for\s+(.+?)\s*$/);
    if (strictForMatch) {
      const fileType = strictForMatch[1] as "files" | "dirs" | undefined;
      const pattern = strictForMatch[2];
      if (!pattern) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "strict...for", line }, lineNum }, configPath);

      // Create thoseOnly rule with empty only list - will be filled after all rules are parsed
      // This allows strict rules to be placed anywhere in the config file
      rules.push({
        kind: "thoseOnly",
        pattern: pattern.trim(),
        only: [], // Will be filled after all rules are parsed
      });
      continue;
    }

    // strict [files|dirs] in <dir> - new syntax for inDirOnly strict mode
    // First check for "strict in <dir>" (no fileType, means both files and dirs)
    const strictInOnlyMatch = line.match(/^strict\s+in\s+([^\s]+)\s*$/);
    if (strictInOnlyMatch) {
      const dir = strictInOnlyMatch[1];
      if (!dir) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "strict...in", line }, lineNum }, configPath);

      // Find previous allow rules for this directory
      const prevAllowRule = rules
        .slice()
        .reverse()
        .find((r) => r.kind === "inDirOnly" && r.dir === dir.trim() && r.mode === "permissive");
      let allowedItems = prevAllowRule && prevAllowRule.kind === "inDirOnly" && prevAllowRule.only.length > 0
        ? prevAllowRule.only
        : [];

      // Always check root-level allow rules (not just for ".")
      const rootAllowRules = rules.filter((r): r is Extract<Rule, { kind: "allow" }> => r.kind === "allow");
      for (const allowRule of rootAllowRules) {
        allowedItems.push(...allowRule.names);
      }

      rules.push({
        kind: "inDirOnly",
        dir: dir.trim(),
        only: allowedItems,
        mode: "strict",
        fileType: undefined
      });
      continue;
    }

    // Then check for "strict files in <dir>" or "strict dirs in <dir>"
    const strictInMatch = line.match(/^strict\s+(files|dirs)\s+in\s+([^\s]+)\s*$/);
    if (strictInMatch) {
      const fileType = strictInMatch[1] as "files" | "dirs";
      const dir = strictInMatch[2];
      if (!dir) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "strict...in", line }, lineNum }, configPath);

      // Find previous allow rules for this directory
      const prevAllowRule = rules
        .slice()
        .reverse()
        .find((r) => r.kind === "inDirOnly" && r.dir === dir.trim() && r.mode === "permissive");
      let allowedItems = prevAllowRule && prevAllowRule.kind === "inDirOnly" && prevAllowRule.only.length > 0
        ? prevAllowRule.only
        : [];

      // Always check root-level allow rules (not just for ".")
      const rootAllowRules = rules.filter((r): r is Extract<Rule, { kind: "allow" }> => r.kind === "allow");
      for (const allowRule of rootAllowRules) {
        allowedItems.push(...allowRule.names);
      }

      rules.push({
        kind: "inDirOnly",
        dir: dir.trim(),
        only: allowedItems,
        mode: "strict",
        fileType
      });
      continue;
    }

    // allow <items> in <dir> (permissive mode) - simplified syntax (check before root-level allow)
    const allowInMatch = line.match(/^(allow|yes|ohyes)\s+(.+?)\s+in\s+([^\s]+)\s*$/);
    if (allowInMatch) {
      const only = allowInMatch[2];
      const dir = allowInMatch[3];
      if (!dir || !only) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: `${allowInMatch[1] || "allow"}...in`, line }, lineNum }, configPath);
      rules.push({ kind: "inDirOnly", dir: dir.trim(), only: splitCsvLike(only), mode: "permissive" });
      continue;
    }

    // Root-level allow (permissive) - supports allow / yes / ohyes aliases
    const allowMatch = line.match(/^(allow|yes|ohyes)\s+(.+?)\s*$/);
    if (allowMatch) {
      const names = allowMatch[2];
      if (!names) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: allowMatch[1] || "allow", line }, lineNum }, configPath);
      rules.push({ kind: "allow", names: splitCsvLike(names) });
      continue;
    }


    // in <dir> allow <items> (permissive mode) - legacy syntax
    const inAllowMatch = line.match(/^in\s+([^\s]+)\s+(allow|yes|ohyes)\s+(.+?)\s*$/);
    if (inAllowMatch) {
      const dir = inAllowMatch[1];
      const only = inAllowMatch[3];
      if (!dir || !only) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: `in...${inAllowMatch[2] || "allow"}`, line }, lineNum }, configPath);
      rules.push({ kind: "inDirOnly", dir: dir.trim(), only: splitCsvLike(only), mode: "permissive" });
      continue;
    }


    // in <dir> [files|dirs] naming <style> [prefix: /pattern/] [suffix: /pattern/] [except <names>] - legacy syntax
    const inNamingMatch = line.match(/^in\s+([^\s]+)\s+(?:(files|dirs)\s+)?naming\s+([^\s]+)(?:\s+prefix:\s+(\/[^\/]+\/[gimuy]*))?(?:\s+suffix:\s+(\/[^\/]+\/[gimuy]*))?(?:\s+except\s+(.+?))?\s*$/);
    if (inNamingMatch) {
      const dir = inNamingMatch[1];
      const fileType = inNamingMatch[2] as "files" | "dirs" | undefined;
      const style = inNamingMatch[3];
      const prefix = inNamingMatch[4];
      const suffix = inNamingMatch[5];
      const except = inNamingMatch[6];
      if (!dir || !style) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "in...naming", line }, lineNum }, configPath);
      if (!isNamingStyle(style)) {
        throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "naming style (must be PascalCase/camelCase/kebab-case/snake_case/SCREAMING_SNAKE_CASE/flatcase)", line: style }, lineNum }, configPath);
      }
      rules.push({
        kind: "naming",
        target: "in",
        pattern: dir.trim(),
        style: style as import("./types").NamingStyle,
        fileType,
        prefix,
        suffix,
        except: except ? splitCsvLike(except) : undefined
      });
      continue;
    }

    // those <pattern> [files|dirs] naming <style> [prefix: /pattern/] [suffix: /pattern/] [except <names>] - legacy syntax
    const thoseNamingMatch = line.match(/^those\s+(.+?)\s+(?:(files|dirs)\s+)?naming\s+([^\s]+)(?:\s+prefix:\s+(\/[^\/]+\/[gimuy]*))?(?:\s+suffix:\s+(\/[^\/]+\/[gimuy]*))?(?:\s+except\s+(.+?))?\s*$/);
    if (thoseNamingMatch) {
      const pattern = thoseNamingMatch[1];
      const fileType = thoseNamingMatch[2] as "files" | "dirs" | undefined;
      const style = thoseNamingMatch[3];
      const prefix = thoseNamingMatch[4];
      const suffix = thoseNamingMatch[5];
      const except = thoseNamingMatch[6];
      if (!pattern || !style) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "those...naming", line }, lineNum }, configPath);
      if (!isNamingStyle(style)) {
        throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "naming style", line: style }, lineNum }, configPath);
      }
      rules.push({
        kind: "naming",
        target: "those",
        pattern: pattern.trim(),
        style: style as import("./types").NamingStyle,
        fileType,
        prefix,
        suffix,
        except: except ? splitCsvLike(except) : undefined
      });
      continue;
    }



    // no / deny / reject (forbidden rules)
    const noMatch = line.match(/^(no|deny|reject)\s+(.+?)\s*$/);
    if (noMatch) {
      const names = noMatch[2];
      if (!names) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: noMatch[1] || "no", line }, lineNum }, configPath);
      rules.push({ kind: "no", names: splitCsvLike(names) });
      continue;
    }

    // must have <items> - preferred syntax
    const mustHaveMatch = line.match(/^must\s+have\s+(.+?)\s*$/);
    if (mustHaveMatch) {
      const names = mustHaveMatch[1];
      if (!names) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "must have", line }, lineNum }, configPath);
      rules.push({ kind: "has", names: splitCsvLike(names) });
      continue;
    }

    const hasMatch = line.match(/^has\s+(.+?)\s*$/);
    if (hasMatch) {
      const names = hasMatch[1];
      if (!names) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "has", line }, lineNum }, configPath);
      rules.push({ kind: "has", names: splitCsvLike(names) });
      continue;
    }

    // optional (makes has rules optional)
    const optionalMatch = line.match(/^optional\s+(.+?)\s*$/);
    if (optionalMatch) {
      const names = optionalMatch[1];
      if (!names) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "optional", line }, lineNum }, configPath);
      rules.push({ kind: "optional", names: splitCsvLike(names) });
      continue;
    }

    const renameMatch = line.match(/^rename\s+(.+?)\s+to\s+(.+?)\s*$/);
    if (renameMatch) {
      const leftRaw = renameMatch[1];
      const rightRaw = renameMatch[2];
      if (!leftRaw || !rightRaw) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "rename", line }, lineNum }, configPath);
      const left = leftRaw.trim();
      let right = rightRaw.trim();

      // Support relative path targets (e.g., "*.test.ts" instead of full path)
      // If the source is a glob pattern and target is a relative glob (contains * but no / or **)
      // we need to construct the full path by extracting directory from source
      if (looksLikeGlob(left) && right.includes("*") && !right.includes("/") && !right.includes("**")) {
        // Extract the directory part from the source pattern
        // For "tests/**/*.{spec,tests}.ts", extract "tests/**/"
        const sourceDirMatch = left.match(/^(.+\/)(.+)$/);
        if (sourceDirMatch) {
          const sourceDir = sourceDirMatch[1];
          // If target is a relative pattern like "*.test.ts", prepend the source directory
          right = sourceDir + right;
        } else {
          // If no directory in source (unlikely but handle it), try to extract from ** pattern
          const doubleStarMatch = left.match(/^(.+\*\*\/)(.+)$/);
          if (doubleStarMatch) {
            right = doubleStarMatch[1] + right;
          }
        }
      }

      if (looksLikeGlob(left) || looksLikeGlob(right)) {
        rules.push({ kind: "renameGlob", from: left, to: right });
      } else {
        const fromNames = splitCsvLike(left);
        if (fromNames.length === 0) throw new FsLintError({ key: "parser.renameMissingSources", params: { line }, lineNum }, configPath);
        rules.push({ kind: "renameDir", fromNames, toName: right });
      }
      continue;
    }

    // use <style> for [files|dirs] <pattern> [prefix: /pattern/] [suffix: /pattern/] [except <names>] [if-contains <filename>] [if-parent-matches <style>]
    // Also supports: use <style1>, <style2> for ... (multiple styles, comma-separated)
    // Conditional rules:
    //   - if-contains <filename>: For dirs, only apply if directory contains this file
    //   - if-parent-matches <style>: For files, only apply if parent directory matches this naming style
    // We match from the end backwards to avoid greedy matching issues with optional parts
    let useNamingMatch: RegExpMatchArray | null = null;
    let ifParentStyle: string | undefined;
    let ifContains: string | undefined;
    let except: string | undefined;
    let suffix: string | undefined;
    let prefix: string | undefined;
    let pattern: string | undefined;
    let fileType: string | undefined;
    let stylesStr: string | undefined;

    // Try to match if-parent-matches first (last optional part)
    const ifParentMatch = line.match(/\s+if-parent-matches\s+([^\s]+)\s*$/);
    if (ifParentMatch) {
      ifParentStyle = ifParentMatch[1];
      line = line.replace(/\s+if-parent-matches\s+[^\s]+\s*$/, "");
    }

    // Try to match if-contains
    const ifContainsMatch = line.match(/\s+if-contains\s+([^\s]+)\s*$/);
    if (ifContainsMatch) {
      ifContains = ifContainsMatch[1];
      line = line.replace(/\s+if-contains\s+[^\s]+\s*$/, "");
    }

    // Try to match except (may contain spaces, so we need to be careful)
    // except can have multiple items separated by commas or spaces
    // Match except until end of line or next keyword (if-contains, if-parent-matches, prefix:, suffix:)
    // Since we already removed if-parent-matches and if-contains, we only need to check for prefix: and suffix:
    const exceptRegex = /\s+except\s+([^\s]+(?:\s+[^\s]+)*?)(?=\s+(?:prefix:|suffix:)|$)/;
    const exceptMatch = line.match(exceptRegex);
    if (exceptMatch && exceptMatch[1]) {
      except = exceptMatch[1].trim();
      line = line.replace(exceptRegex, "");
    }

    // Try to match suffix
    const suffixMatch = line.match(/\s+suffix:\s+(\/[^\/]+\/[gimuy]*)\s*/);
    if (suffixMatch) {
      suffix = suffixMatch[1];
      line = line.replace(/\s+suffix:\s+\/[^\/]+\/[gimuy]*\s*/, " ");
    }

    // Try to match prefix
    const prefixMatch = line.match(/\s+prefix:\s+(\/[^\/]+\/[gimuy]*)\s*/);
    if (prefixMatch) {
      prefix = prefixMatch[1];
      line = line.replace(/\s+prefix:\s+\/[^\/]+\/[gimuy]*\s*/, " ");
    }

    // Now match the main part: use <style> for [files|dirs] <pattern>
    const mainMatch = line.match(/^use\s+(.+?)\s+for\s+(?:(files|dirs)\s+)?(.+?)\s*$/);
    if (mainMatch) {
      stylesStr = mainMatch[1];
      fileType = mainMatch[2];
      pattern = mainMatch[3];
      useNamingMatch = mainMatch as RegExpMatchArray;
    }
    if (useNamingMatch && stylesStr && pattern) {
      // Variables are already extracted above
      if (!stylesStr || !pattern) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "use...for", line }, lineNum }, configPath);

      // Cast fileType to the correct type
      const fileTypeTyped = fileType as "files" | "dirs" | undefined;

      // Validate conditional rules
      if (ifContains && fileTypeTyped !== "dirs") {
        throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "if-contains can only be used with 'dirs'", line }, lineNum }, configPath);
      }
      if (ifParentStyle && fileTypeTyped !== "files") {
        throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "if-parent-matches can only be used with 'files'", line }, lineNum }, configPath);
      }
      if (ifParentStyle && !isNamingStyle(ifParentStyle.trim())) {
        throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: `if-parent-matches style "${ifParentStyle}" (must be PascalCase/camelCase/kebab-case/snake_case/SCREAMING_SNAKE_CASE/flatcase)`, line: ifParentStyle }, lineNum }, configPath);
      }

      // Split styles by comma and trim each
      const styles = stylesStr.split(",").map((s: string) => s.trim()).filter(Boolean);
      if (styles.length === 0) throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: "use...for (no styles provided)", line }, lineNum }, configPath);

      // Validate all styles
      for (const style of styles) {
        if (!isNamingStyle(style)) {
          throw new FsLintError({ key: "parser.ruleFormatError", params: { rule: `naming style "${style}" (must be PascalCase/camelCase/kebab-case/snake_case/SCREAMING_SNAKE_CASE/flatcase)`, line: style }, lineNum }, configPath);
        }
      }

      // Determine if pattern is a directory (for "in") or a glob (for "those")
      const trimmedPattern = pattern.trim();

      // Create a rule for each style
      for (const style of styles) {
        // If fileType is "dirs", always use "in" target (directory-based naming)
        // If fileType is "files" or undefined and pattern is a glob, use "those" target
        if (fileTypeTyped === "dirs") {
          // For directory naming, always use "in" target
          rules.push({
            kind: "naming",
            target: "in",
            pattern: trimmedPattern,
            style: style as import("./types").NamingStyle,
            fileType: fileTypeTyped,
            prefix,
            suffix,
            except: except ? splitCsvLike(except) : undefined,
            ifContains: ifContains ? ifContains.trim() : undefined
          });
        } else if (looksLikeGlob(trimmedPattern) || trimmedPattern.includes("**") || trimmedPattern.includes("*")) {
          // It's a glob pattern, use "those" target
          rules.push({
            kind: "naming",
            target: "those",
            pattern: trimmedPattern,
            style: style as import("./types").NamingStyle,
            fileType: fileTypeTyped,
            prefix,
            suffix,
            except: except ? splitCsvLike(except) : undefined,
            ifParentStyle: ifParentStyle ? (ifParentStyle.trim() as import("./types").NamingStyle) : undefined
          });
        } else {
          // It's a directory, use "in" target
          rules.push({
            kind: "naming",
            target: "in",
            pattern: trimmedPattern,
            style: style as import("./types").NamingStyle,
            fileType: fileTypeTyped,
            prefix,
            suffix,
            except: except ? splitCsvLike(except) : undefined,
            ifParentStyle: ifParentStyle ? (ifParentStyle.trim() as import("./types").NamingStyle) : undefined
          });
        }
      }
      continue;
    }

    throw new FsLintError({ key: "parser.cannotParseLine", params: { line }, lineNum }, configPath);
  }

  // Deduplicate imports list
  const uniqueImports = Array.from(new Set(imports));

  // Topologically sort imports: dependencies come before dependents
  // This ensures that if A imports B, B appears before A in the list
  function topologicalSort(importPaths: string[], dependencies: Map<string, string[]>): string[] {
    const resolvedPaths = new Map<string, string>(); // original path -> resolved path
    const resolvedToOriginal = new Map<string, string>(); // resolved path -> original path
    for (const path of importPaths) {
      const resolved = resolve(path);
      resolvedPaths.set(path, resolved);
      resolvedToOriginal.set(resolved, path);
    }

    // Build dependency graph using resolved paths
    const graph = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();

    // Initialize graph and in-degree
    for (const path of importPaths) {
      const resolved = resolve(path);
      graph.set(resolved, new Set());
      inDegree.set(resolved, 0);
    }

    // Add edges: if A imports B, then B -> A (B must come before A)
    for (const [importingPath, deps] of dependencies.entries()) {
      const resolvedImporting = resolve(importingPath);
      if (graph.has(resolvedImporting)) {
        for (const dep of deps) {
          const resolvedDep = resolve(dep);
          if (graph.has(resolvedDep) && !graph.get(resolvedDep)!.has(resolvedImporting)) {
            graph.get(resolvedDep)!.add(resolvedImporting);
            inDegree.set(resolvedImporting, (inDegree.get(resolvedImporting) || 0) + 1);
          }
        }
      }
    }

    // Kahn's algorithm for topological sort
    const queue: string[] = [];
    for (const [path, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(path);
      }
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);

      for (const neighbor of graph.get(current) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Convert back to original paths
    const result: string[] = [];
    const used = new Set<string>();
    for (const resolved of sorted) {
      const original = resolvedToOriginal.get(resolved);
      if (original && !used.has(original)) {
        result.push(original);
        used.add(original);
      }
    }

    // Add any remaining imports that weren't in the dependency graph
    for (const path of importPaths) {
      if (!used.has(path)) {
        result.push(path);
      }
    }

    return result;
  }

  const sortedImports = topologicalSort(uniqueImports, importDependencies);

  // Fill thoseOnly rules with allow lists after all rules are parsed
  // This allows "strict files for <pattern>" to be placed anywhere in the config file
  const allAllowRules = rules.filter((r): r is Extract<Rule, { kind: "allow" }> => r.kind === "allow");
  const allInDirAllowRules = rules.filter((r): r is Extract<Rule, { kind: "inDirOnly" }> =>
    r.kind === "inDirOnly" && r.mode === "permissive"
  );

  const allAllowedItems: string[] = [];
  for (const allowRule of allAllowRules) {
    allAllowedItems.push(...allowRule.names);
  }
  for (const allowRule of allInDirAllowRules) {
    // For inDirOnly rules, the patterns are scoped to the directory
    // e.g., "in docs: allow [*.md]" means "allow docs/*.md", not "allow *.md"
    // So we need to prefix each pattern with the directory path
    for (const pattern of allowRule.only) {
      // If the pattern already contains a path separator or starts with **, 
      // it's already a full path pattern, so don't add the directory prefix
      if (pattern.includes('/') || pattern.startsWith('**')) {
        allAllowedItems.push(pattern);
      } else {
        // Add the directory prefix to make it scoped to that directory
        const dir = allowRule.dir === '.' ? '' : allowRule.dir;
        const prefixedPattern = dir ? `${dir}/${pattern}` : pattern;
        allAllowedItems.push(prefixedPattern);
      }
    }
  }

  // Fill empty thoseOnly rules with collected allow list
  // Filter out "*" wildcard patterns and filter by pattern relevance
  for (const rule of rules) {
    if (rule.kind === "thoseOnly" && rule.only.length === 0) {
      // Filter out "*" patterns - they're too permissive for strict mode
      let filteredItems = allAllowedItems.filter(item => item !== "*");

      // If the pattern has a file extension, only include allow patterns that match that extension
      // This prevents overly permissive patterns (like "*.md" from docs/) from allowing everything
      const patternExtMatch = rule.pattern.match(/\.([a-z0-9]+)(\*|$)/i);
      if (patternExtMatch && patternExtMatch[1]) {
        const ext = patternExtMatch[1].toLowerCase();
        filteredItems = filteredItems.filter(item => {
          const itemLower = item.toLowerCase();
          // Include patterns that mention this extension
          if (itemLower.includes(`.${ext}`) ||
            itemLower.includes(`*.${ext}`) ||
            itemLower.includes(`*${ext}`)) {
            return true;
          }

          // Also include exact filename patterns (like "README*.md")
          if (itemLower.includes(ext) && (itemLower.includes("*") || itemLower.endsWith(`.${ext}`))) {
            return true;
          }

          // Relaxed rule: If the item doesn't have an extension at all (like "LICENSE*"), 
          // we should keep it because it might match the target file.
          const hasExtension = /\.[a-z0-9]+(\*|$)/i.test(itemLower);
          if (!hasExtension && itemLower.includes("*")) {
            return true;
          }

          return false;
        });
      }

      rule.only = filteredItems.length > 0 ? [...filteredItems] : [];
    }
  }

  return { where, rules, imports: sortedImports };
}
