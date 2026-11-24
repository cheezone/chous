import { basename, dirname, relative, resolve, sep } from "node:path";
import type { NamingRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { toDisplayPath } from "../../fsutil";
import { checkNamingStyle } from "../utils/naming";
import { BaseRuleValidator } from "./base";

export class NamingRuleValidator extends BaseRuleValidator<NamingRule> {
  canHandle(rule: any): rule is NamingRule {
    return rule.kind === "naming";
  }

  protected async validateInternal(
    rule: NamingRule,
    context: RuleValidatorContext
  ): Promise<{ hitCount: number }> {
    const { root, snapshot, rawIssues, inDirGroups, config } = context;

    let hitCount = 0;

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
            if (snapshot.isDirectory(parentDirAbs)) {
              dirsToCheck.push(parentDirAbs);
            }
          }
        } else {
          // For file naming rules with glob patterns, find all matching directories
          const matches = snapshot.match(rule.pattern, { onlyFiles: false });
          for (const match of matches) {
            if (snapshot.isDirectory(match)) {
              dirsToCheck.push(match);
            }
          }
        }
      } else {
        // For non-glob patterns, treat as a single directory
        const dirAbs = resolve(root, rule.pattern);
        if (snapshot.isDirectory(dirAbs)) {
          dirsToCheck.push(dirAbs);
        }
      }
      
      // Collect all naming rules that match this pattern
      const namingRulesForPattern = config.rules.filter((r): r is NamingRule => 
        r.kind === "naming" && r.target === "in" && r.pattern === rule.pattern
      );
      
      // Process each matching directory
      for (const dirAbs of dirsToCheck) {
        const entries = snapshot.listDir(dirAbs).map((e) => ({
          name: e.name,
          abs: e.absPath,
          isDir: e.isDir,
        }));
        
        // Check if there are any allow rules for this directory (for naming exceptions)
        const allowRulesForDir = inDirGroups?.get(rule.pattern)?.filter(r => r.mode === "permissive") || [];
        const allowedNamesSet = new Set<string>();
        for (const allowRule of allowRulesForDir) {
          for (const allowedPattern of allowRule.only) {
            if (!allowedPattern.includes("*") && !allowedPattern.includes("?")) {
              allowedNamesSet.add(allowedPattern);
            } else {
              const matches = snapshot.match(allowedPattern, { cwd: dirAbs, onlyFiles: false });
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

            hitCount++;

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
                const matches = snapshot.match(exceptPattern, { cwd: patternDirAbs, onlyFiles: !entry.isDir });
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
          let lastFailedRule: { rule: NamingRule; result: ReturnType<typeof checkNamingStyle> } | null = null;
          
          // First, check conditional rules
          for (const r of conditionalRules) {
            // Filter by fileType if specified
            if (r.fileType === "files" && entry.isDir) continue;
            if (r.fileType === "dirs" && !entry.isDir) continue;
            
            
            // Check if-contains condition (for dirs)
            // This applies to directory naming rules: only apply if the directory contains the specified file
            if (r.ifContains && entry.isDir && r.fileType === "dirs") {
              const dirEntries = snapshot.listDir(entry.abs);
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
            let message: import("../../types").IssueMessage;
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
            rawIssues.push(issueFromRule(lastFailedRule?.rule ?? rule, {
              path: entry.abs,
              displayPath: toDisplayPath(entry.abs, root),
              message,
              category: "forbidden",
              severity: "error",
            }));
          }
        }
      }
    } else {
      // target: "those"
      const matches = snapshot.match(rule.pattern, { onlyFiles: rule.fileType !== "dirs" });
      
      // Collect all naming rules (not just same pattern) to check if file passes any rule
      // This allows more specific rules (like pages/**/components/**/*.vue) to work alongside broader rules
      const allNamingRules = config.rules.filter((r): r is NamingRule => 
        r.kind === "naming" && r.target === "those"
      );
      
      // Precompute match sets once per naming rule (avoid O(files × rules × tree) rescans)
      const matchesByRule = new Map<NamingRule, Set<string>>();
      for (const r of allNamingRules) {
        matchesByRule.set(
          r,
          new Set(snapshot.match(r.pattern, { onlyFiles: r.fileType !== "dirs" })),
        );
      }

      for (const abs of matches) {
        // Filter by fileType if specified
        const isDir = snapshot.isDirectory(abs);
        if (rule.fileType === "files" && isDir) continue;
        if (rule.fileType === "dirs" && !isDir) continue;

        hitCount++;
        const base = basename(abs);
        const relPath = relative(root, abs).split(sep).join("/");
        
        // Find all naming rules that match this file
        const matchingRules: NamingRule[] = [];
        for (const r of allNamingRules) {
          if (matchesByRule.get(r)!.has(abs)) {
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
              const matches = snapshot.match(exceptPattern, { cwd: scanDir, onlyFiles: !isDir });
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
        let lastFailedRule: { rule: NamingRule; result: ReturnType<typeof checkNamingStyle> } | null = null;
        
        // First, check conditional rules
        for (const r of conditionalRules) {
          // Filter by fileType if specified
          if (r.fileType === "files" && isDir) continue;
          if (r.fileType === "dirs" && !isDir) continue;
          
          
          // Check if-contains condition (for dirs)
          if (r.ifContains && isDir) {
            const dirEntries = snapshot.listDir(abs);
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
          let message: import("../../types").IssueMessage;
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
          rawIssues.push(issueFromRule(lastFailedRule?.rule ?? rule, {
            path: abs,
            displayPath: toDisplayPath(abs, root),
            message,
            category: "forbidden",
            severity: "error",
          }));
        }
      }
    }

    return { hitCount };
  }
}
