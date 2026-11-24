import { resolve } from "node:path";
import type { InDirOnlyRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { toDisplayPath } from "../../fsutil";
import { BaseRuleValidator } from "./base";

export class InDirOnlyRuleValidator extends BaseRuleValidator<InDirOnlyRule> {
  canHandle(rule: any): rule is InDirOnlyRule {
    return rule.kind === "inDirOnly";
  }

  protected async validateInternal(
    _rule: InDirOnlyRule,
    _context: RuleValidatorContext
  ): Promise<{ hitCount: number }> {
    // Grouped processing happens via processInDirOnlyGroup from the lint pipeline.
    return { hitCount: 0 };
  }
}

/**
 * Process inDirOnly rules grouped by directory.
 * Single source of truth — the lint pipeline must not duplicate this logic.
 */
export async function processInDirOnlyGroup(
  dir: string,
  group: InDirOnlyRule[],
  context: RuleValidatorContext,
  filesMatchedByMoveRules: Set<string>
): Promise<{ hitCount: number }> {
  const { root, snapshot, rawIssues, rootAllowedSet } = context;

  const dirAbs = resolve(root, dir);
  const isRecursive = group.some((r) => r.only.some((p) => p.includes("**")));
  const dirExists = snapshot.isDirectory(dirAbs) || (dir === "." || dir === "");
  const allOnly = group.flatMap((r) => r.only);
  const representative = group[0]!;

  const hasStrictMode = group.some((r) => r.mode === "strict" || r.mode === undefined);
  const checkDotfiles = group.some((r) => r.dotfiles);
  const isSkipped = (rel: string) => rel.startsWith(".") && !checkDotfiles;

  if (!dirExists && dir !== "." && dir !== "") return { hitCount: 0 };

  let allPathsRel: string[];
  if (isRecursive) {
    const prefix = dir === "." || dir === "" ? "" : dir.replace(/\/$/, "") + "/";
    allPathsRel = [];
    for (const [rel, entry] of snapshot.byRel) {
      if (!entry.isDir) {
        if (prefix === "" || rel.startsWith(prefix)) {
          allPathsRel.push(prefix ? rel.slice(prefix.length) : rel);
        }
      }
    }
  } else {
    allPathsRel = snapshot.listDir(dirAbs).map((e) => e.name);
  }

  const rulesByFileType = new Map<"files" | "dirs" | undefined, InDirOnlyRule[]>();
  for (const rule of group) {
    const list = rulesByFileType.get(rule.fileType) ?? [];
    list.push(rule);
    rulesByFileType.set(rule.fileType, list);
  }

  const mergedAllowedRelByFileType = new Map<"files" | "dirs" | undefined, Set<string>>();
  for (const [fileType, rules] of rulesByFileType.entries()) {
    const allowedSet = new Set<string>();
    for (const rule of rules) {
      const cleanedPatterns = rule.only.map((pattern) => {
        let cleaned = pattern.replace(/\{([^}]+)\}/g, (_match, content: string) => {
          return `{${content.replace(/,\s+/g, ",")}}`;
        });
        if (!cleaned.startsWith("**") && cleaned.startsWith(dir + "/")) {
          cleaned = cleaned.slice(dir.length + 1);
        } else if (!cleaned.startsWith("**") && cleaned.startsWith("./" + dir + "/")) {
          cleaned = cleaned.slice(("./" + dir + "/").length);
        }
        return cleaned;
      });

      const allowedPaths = snapshot.match(cleanedPatterns, { cwd: dirAbs, onlyFiles: false });

      for (const p of allowedPaths) {
        const relPath = toDisplayPath(p, dirAbs);
        allowedSet.add(relPath);
      }
    }
    mergedAllowedRelByFileType.set(fileType, allowedSet);
    if (dir === "." && fileType === undefined && rootAllowedSet !== undefined) {
      for (const path of allowedSet) rootAllowedSet.add(path);
    }
  }

  if (dir === "." && rootAllowedSet) {
    const filesSet = mergedAllowedRelByFileType.get("files");
    if (filesSet) for (const path of rootAllowedSet) filesSet.add(path);
    const dirsSet = mergedAllowedRelByFileType.get("dirs");
    if (dirsSet) for (const path of rootAllowedSet) dirsSet.add(path);
  }

  if (hasStrictMode) {
    const hasStrictDirs = group.some((r) => r.mode === "strict" && r.fileType === "dirs");
    const hasStrictFiles = group.some((r) => r.mode === "strict" && r.fileType === "files");
    const hasBothFileTypes = hasStrictDirs && hasStrictFiles;

    for (const rel of allPathsRel) {
      if (isSkipped(rel)) continue;

      const abs = resolve(dirAbs, rel);
      const isDir = snapshot.isDirectory(abs);


      if (!isDir && filesMatchedByMoveRules.has(abs)) continue;

      if (!hasBothFileTypes) {
        if (hasStrictDirs && !isDir) continue;
        if (hasStrictFiles && isDir) continue;
      }

      let isAllowed = false;
      if (rootAllowedSet && rootAllowedSet.has(rel)) {
        isAllowed = true;
      }

      if (!isAllowed) {
        for (const [fileType, allowedSet] of mergedAllowedRelByFileType.entries()) {
          if (fileType === "files" && isDir) continue;
          if (fileType === "dirs" && !isDir) continue;

          let hasMatch = allowedSet.has(rel);
          if (!hasMatch && fileType === "files" && !isDir && rootAllowedSet) {
            hasMatch = rootAllowedSet.has(rel);
          }
          if (!hasMatch && fileType === undefined && rootAllowedSet) {
            hasMatch = rootAllowedSet.has(rel);
          }
          if (hasMatch) {
            isAllowed = true;
            break;
          }
        }
      }

      if (!isAllowed) {
        rawIssues.push(issueFromRule(representative, {
          path: abs,
          displayPath: toDisplayPath(abs, root),
          message: { key: "issue.inDirOnly.forbiddenOnlyAllowed", params: { dir: `${dir}/`, only: allOnly } },
          category: "forbidden",
          severity: "error",
          // Footer「白名单 N」is the explanation — do not inherit allow-comment jokes.
          reason: false,
        }));
      }
    }
  }

  return { hitCount: hasStrictMode ? allPathsRel.filter((rel) => !isSkipped(rel)).length : 0 };
}
