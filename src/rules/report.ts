import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type { LintResult, Issue } from "../types";
import type { IssueMessage } from "../types";
import { DEFAULT_IGNORE_DIRS } from "../fsutil";
import type { Colorizer } from "../color";
import type { TranslationFunctions } from "../i18n/i18n-types";
import { APP_NAME } from "../constants";

const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
function visibleLen(s: string): number {
  return s.replace(ANSI_RE, "").length;
}

class AlignedLines {
  private maxLeft = 0;
  private lines: Array<{ left: string; leftLen: number; suffix?: string }> = [];

  push(left: string, suffix?: string): void {
    const trimmedLeft = left.replace(/\s+$/g, "");
    const leftLen = visibleLen(trimmedLeft);
    this.lines.push({ left: trimmedLeft, leftLen, suffix });
    if (suffix) this.maxLeft = Math.max(this.maxLeft, leftLen);
  }

  toStrings(): string[] {
    return this.lines.map(({ left, leftLen, suffix }) => {
      if (!suffix) return left;
      const pad = " ".repeat(Math.max(1, this.maxLeft - leftLen + 1));
      return (left + pad + suffix).replace(/\s+$/g, "");
    });
  }
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}


function listActualTopLevelNames(root: string, visibleSet?: Set<string>): string[] {
  try {
    return readdirSync(root).filter((n) => {
      if (DEFAULT_IGNORE_DIRS.has(n)) return false;
      if (visibleSet && !visibleSet.has(resolve(root, n))) return false;
      return true;
    });
  } catch {
    return [];
  }
}

export function formatIssueMessage(LL: TranslationFunctions, msg: IssueMessage): string {
  const joinIfArray = (v: string | string[]) => (Array.isArray(v) ? v.join(", ") : v);
  switch (msg.key) {
    case "issue.move.shouldMoveToDir":
      return String(LL.issue.move.shouldMoveToDir(msg.params));
    case "issue.move.destDirMustExist":
      return String(LL.issue.move.destDirMustExist(msg.params));
    case "issue.move.destMustBeDir":
      return String(LL.issue.move.destMustBeDir(msg.params));
    case "issue.move.unsafeManual":
      return String(LL.issue.move.unsafeManual(msg.params));
    case "issue.thoseOnly.forbiddenOnlyAllowed": {
      const only = msg.params.only;
      const pattern = msg.params.pattern;

      if (Array.isArray(only)) {
        // Filter to show only relevant patterns based on the pattern
        // For example, for *.md files, show only *.md patterns
        let relevantOnly = only;

        if (pattern) {
          // Extract file extension from pattern (e.g., "*.md" -> ".md")
          const extMatch = pattern.match(/\.([a-z0-9]+)$/i);
          const ext = extMatch?.[1];
          if (ext) {
            const extLower = ext.toLowerCase();
            relevantOnly = only.filter((item: string) => {
              const itemLower = item.toLowerCase();
              if (itemLower.includes(`.${extLower}`) ||
                itemLower.includes(`*.${extLower}`) ||
                itemLower.includes(`*${extLower}`)) {
                return true;
              }

              // Also include exact filename patterns (like "README*.md")
              if (itemLower.includes(extLower) && (itemLower.includes("*") || itemLower.endsWith(`.${extLower}`))) {
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
            // If no matches, fall back to all items
            if (relevantOnly.length === 0) {
              relevantOnly = only;
            } else {
              // Sort to show exact matches first, then wildcards
              relevantOnly.sort((a, b) => {
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();
                // Exact extension matches first
                if (aLower.endsWith(`.${extLower}`) && !bLower.endsWith(`.${extLower}`)) return -1;
                if (!aLower.endsWith(`.${extLower}`) && bLower.endsWith(`.${extLower}`)) return 1;
                return 0;
              });
            }
          }
        }

        // If still too many, show first 15 with indication (increased from 10 to show more relevant items)
        if (relevantOnly.length > 15) {
          const displayed = relevantOnly.slice(0, 15);
          return String(LL.issue.thoseOnly.forbiddenOnlyAllowed()) + ` (${joinIfArray(displayed)} ${String(LL.report.andMoreItems({ count: relevantOnly.length }))})`;
        }
        return String(LL.issue.thoseOnly.forbiddenOnlyAllowed()) + ` (${joinIfArray(relevantOnly)})`;
      }
      return String(LL.issue.thoseOnly.forbiddenOnlyAllowed());
    }
    case "issue.renameDir.shouldRenameTo":
      return String(LL.issue.renameDir.shouldRenameTo(msg.params));
    case "issue.renameDir.shouldMigrateTo":
      return String(LL.issue.renameDir.shouldMigrateTo(msg.params));
    case "issue.renameDir.removeEmptyDir":
      return String(LL.issue.renameDir.removeEmptyDir(msg.params));
    case "issue.renameGlob.shouldRenameTo":
      return String(LL.issue.renameGlob.shouldRenameTo(msg.params));
    case "issue.renameGlob.targetExistsManual":
      return String(LL.issue.renameGlob.targetExistsManual(msg.params));
    case "issue.renameGlob.cannotInferTarget":
      return String(LL.issue.renameGlob.cannotInferTarget());
    case "issue.inDirOnly.dirMustExist": {
      const only = msg.params.only;
      // If the allow list is too long, truncate it for display
      if (Array.isArray(only) && only.length > 10) {
        const displayed = only.slice(0, 10);
        return String(LL.issue.inDirOnly.dirMustExist({ only: joinIfArray(displayed) + ` ${String(LL.report.andMoreItems({ count: only.length - 10 }))}` }));
      }
      return String(LL.issue.inDirOnly.dirMustExist({ only: joinIfArray(only) }));
    }
    case "issue.inDirOnly.forbiddenOnlyAllowed": {
      const only = msg.params.only;
      // If the allow list is too long, use simplified message
      if (Array.isArray(only) && only.length > 10) {
        const displayed = only.slice(0, 10);
        return String(LL.issue.inDirOnly.forbiddenOnlyAllowed({
          dir: msg.params.dir,
          only: joinIfArray(displayed) + ` ${String(LL.report.andMoreItems({ count: only.length - 10 }))}`
        }));
      }
      if (Array.isArray(only) && only.length > 5) {
        return String(LL.issue.inDirOnly.forbiddenTooMany());
      }
      return String(LL.issue.inDirOnly.forbiddenOnlyAllowed({ dir: msg.params.dir, only: joinIfArray(only) }));
    }
    case "issue.no.forbidden":
      return String(LL.issue.no.forbidden(msg.params));
    case "issue.has.mustExist":
      return String(LL.issue.has.mustExist(msg.params));
    case "issue.naming.invalid":
      return String(LL.issue.naming.invalid(msg.params));
    case "issue.naming.invalidPrefix":
      return String(LL.issue.naming.invalidPrefix(msg.params));
    case "issue.naming.invalidSuffix":
      return String(LL.issue.naming.invalidSuffix(msg.params));
    case "issue.merged.forbiddenOnlyAllowed": {
      // Merged whitelist message: display "not in whitelist (1, 2)"
      // If global index is provided, use global index; otherwise use local index
      if ((msg.params as any)._displayLabels) {
        const labels = (msg.params as any)._displayLabels;
        return String(LL.issue.thoseOnly.forbiddenOnlyAllowed()) + ` (${labels})`;
      }
      const whitelists = msg.params.whitelists;
      if (whitelists.length === 0) {
        return String(LL.issue.thoseOnly.forbiddenOnlyAllowed());
      }
      const labels = whitelists.map((_, idx) => String(idx + 1)).join("、");
      return String(LL.issue.thoseOnly.forbiddenOnlyAllowed()) + ` (${labels})`;
    }
    case "issue.merged.forbiddenBlacklist": {
      // Merged blacklist message: display "hit blacklist (1, 2)"
      // If global index is provided, use global index; otherwise use local index
      if ((msg.params as any)._displayLabels) {
        const labels = (msg.params as any)._displayLabels;
        const firstPattern = (msg.params as any)._firstPattern || "";
        const baseMsg = String(LL.issue.no.forbidden({ name: firstPattern }));
        return baseMsg.replace(/（.*?）|\(.*?\)/, `（${labels}）`);
      }
      const blacklists = msg.params.blacklists;
      if (blacklists.length === 0) {
        return String(LL.issue.no.forbidden({ name: "" }));
      }
      const labels = blacklists.map((_, idx) => String(idx + 1)).join("、");
      // Extract "hit blacklist" part from original message, then add index
      const firstPattern = blacklists[0]!.patterns[0] || "";
      const baseMsg = String(LL.issue.no.forbidden({ name: firstPattern }));
      // Remove original parameter part, add index (using parentheses)
      return baseMsg.replace(/（.*?）|\(.*?\)/, `（${labels}）`);
    }
  }
}


type IssueMeta = {
  message: IssueMessage;
  category: "missing" | "forbidden";
  severity: "error" | "warn";
};

function buildIssueMap(result: LintResult): Map<string, IssueMeta> {
  const m = new Map<string, IssueMeta>();
  const issuesByFile = new Map<string, Issue[]>();

  // Collect all issues for each file
  for (const i of result.issues) {
    if (!issuesByFile.has(i.displayPath)) {
      issuesByFile.set(i.displayPath, []);
    }
    issuesByFile.get(i.displayPath)!.push(i);
  }

  // Debug: Output files with multiple issues (for tracking merge issues)
  if (process.env.DEBUG_FILE) {
    for (const [displayPath, issues] of issuesByFile.entries()) {
      if (issues.length > 1) {
        console.error(`[DEBUG] [buildIssueMap] File "${displayPath}" has ${issues.length} issues:`);
        for (const issue of issues) {
          console.error(`[DEBUG]   - ${issue.ruleKind}: ${issue.message.key}`, 'params' in issue.message ? issue.message.params : undefined);
        }
      }
    }
  }

  // Merge multiple whitelist and blacklist issues for the same file
  for (const [displayPath, issues] of issuesByFile.entries()) {
    // Collect all whitelist-related issues
    const whitelistIssues = issues.filter(i =>
      i.message.key === "issue.inDirOnly.forbiddenOnlyAllowed" ||
      i.message.key === "issue.thoseOnly.forbiddenOnlyAllowed"
    );

    // Collect all blacklist-related issues
    const blacklistIssues = issues.filter(i =>
      i.message.key === "issue.no.forbidden"
    );

    // Handle whitelist merging
    if (whitelistIssues.length > 1) {
      // Merge multiple whitelists
      const whitelists: Array<{ label: string; only: string[] }> = [];

      for (const issue of whitelistIssues) {
        if (issue.message.key === "issue.inDirOnly.forbiddenOnlyAllowed") {
          const params = issue.message.params;
          const only = Array.isArray(params.only) ? params.only : [params.only];
          const dirLabel = params.dir === "." || params.dir === "./" ? "." : params.dir;
          whitelists.push({
            label: dirLabel,
            only: only
          });
        } else if (issue.message.key === "issue.thoseOnly.forbiddenOnlyAllowed") {
          const params = issue.message.params;
          const only = Array.isArray(params.only) ? params.only : [params.only];
          whitelists.push({
            label: params.pattern || "*.md",
            only: only
          });
        }
      }

      // Use first issue's category and severity
      const firstIssue = whitelistIssues[0]!;
      m.set(displayPath, {
        message: {
          key: "issue.merged.forbiddenOnlyAllowed",
          params: { whitelists }
        },
        category: firstIssue.category,
        severity: firstIssue.severity,
      });
    } else if (whitelistIssues.length === 1) {
      // Only one whitelist issue, also convert to merged format to display index
      const issue = whitelistIssues[0]!;
      const whitelists: Array<{ label: string; only: string[] }> = [];

      if (issue.message.key === "issue.inDirOnly.forbiddenOnlyAllowed") {
        const params = issue.message.params;
        const only = Array.isArray(params.only) ? params.only : [params.only];
        const dirLabel = params.dir === "." || params.dir === "./" ? "." : params.dir;
        whitelists.push({
          label: dirLabel,
          only: only
        });
      } else if (issue.message.key === "issue.thoseOnly.forbiddenOnlyAllowed") {
        const params = issue.message.params;
        const only = Array.isArray(params.only) ? params.only : [params.only];
        whitelists.push({
          label: params.pattern || "*.md",
          only: only
        });
      }

      m.set(displayPath, {
        message: {
          key: "issue.merged.forbiddenOnlyAllowed",
          params: { whitelists }
        },
        category: issue.category,
        severity: issue.severity,
      });
    }
    // Handle blacklist merging
    else if (blacklistIssues.length > 0) {
      // Merge multiple blacklists: group by directory
      const blacklistsByDir = new Map<string, Set<string>>();

      for (const issue of blacklistIssues) {
        if (issue.message.key === "issue.no.forbidden") {
          const params = issue.message.params;
          const fullPattern = params.name;

          // Extract directory and filename
          // Example: xx/1.sh -> dir: xx, pattern: 1.sh
          // Example: *.sh -> dir: ., pattern: *.sh
          const lastSlash = fullPattern.lastIndexOf('/');
          let dir: string;
          let pattern: string;

          if (lastSlash >= 0) {
            dir = fullPattern.substring(0, lastSlash);
            pattern = fullPattern.substring(lastSlash + 1);
          } else {
            // No directory, might be a global pattern
            dir = ".";
            pattern = fullPattern;
          }

          if (!blacklistsByDir.has(dir)) {
            blacklistsByDir.set(dir, new Set());
          }
          blacklistsByDir.get(dir)!.add(pattern);
        }
      }

      // Convert to array format
      const blacklists: Array<{ label: string; patterns: string[] }> = [];
      for (const [dir, patterns] of blacklistsByDir.entries()) {
        const dirLabel = dir === "." ? "." : dir;
        blacklists.push({
          label: dirLabel,
          patterns: Array.from(patterns).sort()
        });
      }

      // Use first issue's category and severity
      const firstIssue = blacklistIssues[0]!;
      m.set(displayPath, {
        message: {
          key: "issue.merged.forbiddenBlacklist",
          params: { blacklists }
        },
        category: firstIssue.category,
        severity: firstIssue.severity,
      });
    } else {
      // No whitelist or blacklist issues, use first issue (might be other type of issue)
      const firstIssue = issues[0]!;
      m.set(displayPath, {
        message: firstIssue.message,
        category: firstIssue.category,
        severity: firstIssue.severity,
      });
    }
  }

  return m;
}


function addAncestors(relPath: string, out: Set<string>): void {
  const parts = relPath.split("/").filter(Boolean);
  let cur = "";
  for (let i = 0; i < parts.length; i++) {
    cur = cur ? `${cur}/${parts[i]}` : parts[i]!;
    out.add(cur);
  }
}

function buildRelevantSet(opts: {
  includeIrrelevant: boolean;
  issueMap: Map<string, unknown>;
  requiredTopLevelNames: string[];
}): Set<string> {
  const s = new Set<string>();
  if (opts.includeIrrelevant) return s;
  for (const p of opts.issueMap.keys()) addAncestors(p, s);
  for (const d of opts.requiredTopLevelNames) addAncestors(d, s);
  return s;
}

function renderConciseTreeLines(opts: {
  result: LintResult;
  issueMap: Map<string, IssueMeta>;
  requiredSet: Set<string>;
  c: Colorizer;
  LL: TranslationFunctions;
  rootLabel?: string;
}): string[] {
  const { result, issueMap, requiredSet, c, LL, rootLabel } = opts;
  const relevantSet = buildRelevantSet({
    includeIrrelevant: false,
    issueMap,
    requiredTopLevelNames: result.requiredTopLevelNames,
  });

  const out = new AlignedLines();
  out.push(rootLabel ?? ".");

  const iconFor = (meta?: { category: "missing" | "forbidden"; severity: "error" | "warn" }, ok?: boolean): string => {
    if (meta) {
      if (meta.severity === "warn") return c.yellow("⚠");
      return meta.category === "missing" ? c.yellow("✖") : c.red("✖");
    }
    if (ok) return c.green("✔");
    return c.dim("·");
  };

  const colorName = (
    name: string,
    meta?: { category: "missing" | "forbidden"; severity: "error" | "warn" },
    ok?: boolean,
  ): string => {
    if (meta) {
      if (meta.severity === "warn") return c.yellow(name);
      return meta.category === "missing" ? c.yellow(name) : c.red(name);
    }
    if (ok) return c.green(name);
    return c.dim(name);
  };

  const renderDir = (absDir: string, relDir: string, prefix: string) => {
    let ents: { name: string; abs: string; isDir: boolean; isFile: boolean }[] = [];
    try {
      ents = readdirSync(absDir).map((name) => {
        const abs = resolve(absDir, name);
        return { name, abs, isDir: isDir(abs), isFile: isFile(abs) };
      });
    } catch {
      return;
    }

    const all = ents
      .filter((e) => !(e.isDir && DEFAULT_IGNORE_DIRS.has(e.name)))
      .filter((e) => {
        if (result.visibleSet && !result.visibleSet.has(resolve(absDir, e.name))) return false;
        return true;
      })
      .filter((e) => e.isDir || e.isFile)
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    const shown = all.filter((e) => {
      const rel = relDir ? `${relDir}/${e.name}` : e.name;
      return relevantSet.has(rel);
    });

    const hasHidden = shown.length < all.length;
    for (let i = 0; i < shown.length; i++) {
      const e = shown[i]!;
      const isLast = i === shown.length - 1 && !hasHidden;
      const branch = isLast ? "└──" : "├──";
      const nextPrefix = prefix + (isLast ? "    " : "│   ");
      const rel = relDir ? `${relDir}/${e.name}` : e.name;
      const meta = issueMap.get(rel);
      const ok = !meta && requiredSet.has(rel);
      const rawName = e.isDir ? `${e.name}/` : e.name;
      const nameStyled = colorName(rawName, meta, ok);
      const icon = iconFor(meta, ok);

      const left = `${prefix}${branch} ${icon} ${nameStyled}`;
      if (meta) {
        const suffix = `${c.dim(String(LL.report.arrow()))} ${c.dim(formatIssueMessage(LL, meta.message))}`;
        out.push(left, suffix);
      } else if (ok) {
        const suffix = e.isDir
          ? `${c.dim(String(LL.report.arrow()))} ${c.dim(String(LL.report.foundRequiredDir({ dir: rawName })))}`
          : `${c.dim(String(LL.report.arrow()))} ${c.dim(String(LL.report.foundRequiredFile({ name: e.name })))}`;
        out.push(left, suffix);
      } else {
        out.push(left);
      }

      if (e.isDir) renderDir(e.abs, rel, nextPrefix);
    }

    if (hasHidden) {
      out.push(`${prefix}└── ${String(LL.report.ellipsis())}`);
    }
  };

  // Top level: only list "relevant" top-level (issues / required / moved), hide irrelevant ones to `└── ...`
  const topAll = listActualTopLevelNames(result.root, result.visibleSet);
  const extraTop = new Set<string>();
  for (const p of relevantSet) extraTop.add(p.split("/")[0]!);
  for (const t of topAll) {
    if (extraTop.has(t)) continue;
  }
  const topShownNames = Array.from(extraTop)
    .map((name) => {
      const abs = resolve(result.root, name);
      const existsNow = existsSync(abs);
      const isDirNow = existsNow && isDir(abs);
      const isMissingFile = !existsNow && result.issues.some((i) => i.ruleKind === "has" && i.displayPath === name);
      const actsAsDir = isDirNow || (requiredSet.has(name) && !existsNow && !isMissingFile);
      return { name, actsAsDir };
    })
    .sort((a, b) => {
      if (a.actsAsDir !== b.actsAsDir) return a.actsAsDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map((x) => x.name);

  for (let i = 0; i < topShownNames.length; i++) {
    const name = topShownNames[i]!;
    const abs = resolve(result.root, name);
    const existsNow = existsSync(abs);
    const isDirNow = existsNow && isDir(abs);
    const rel = name;

    const meta = issueMap.get(rel);
    const ok = !meta && requiredSet.has(rel);
    const isMissingFile = !existsNow && result.issues.some((i) => i.ruleKind === "has" && i.displayPath === rel);
    const rawName = isDirNow || (requiredSet.has(rel) && !existsNow && !isMissingFile) ? `${name}/` : name;
    const icon = iconFor(meta, ok);
    const styled = colorName(rawName, meta, ok);

    const left = `${icon} ${styled}`;
    let suffix: string | undefined;
    if (meta) {
      suffix = `${c.dim(String(LL.report.arrow()))} ${c.dim(formatIssueMessage(LL, meta.message))}`;
    } else if (ok) {
      suffix = (isDirNow || (requiredSet.has(rel) && !existsNow && !isMissingFile))
        ? `${c.dim(String(LL.report.arrow()))} ${c.dim(String(LL.report.foundRequiredDir({ dir: rawName })))}`
        : `${c.dim(String(LL.report.arrow()))} ${c.dim(String(LL.report.foundRequiredFile({ name: name })))}`;
    }

    const isLast = i === topShownNames.length - 1;
    const branch = isLast ? "└──" : "├──";
    out.push(`${branch} ${left}`, suffix);

    const isFileNow = existsNow && isFile(abs);
    // ...
    if (isDirNow) {
      const prefix = isLast ? "    " : "│   ";
      renderDir(abs, rel, prefix);
    } else if (requiredSet.has(rel) && !isDirNow && !isFileNow && !isMissingFile) {
      // When required directory is missing, also give a collapse hint
      const prefix = isLast ? "    " : "│   ";
      out.push(`${prefix}└── ${String(LL.report.ellipsis())}`);
    }
  }

  out.push(`└── ${String(LL.report.ellipsis())}`);
  return out.toStrings();
}

export function renderReport(
  result: LintResult,
  opts: {
    verbose: boolean;
    color: Colorizer;
    LL: TranslationFunctions;
    showHeader?: boolean;
    showMeta?: boolean;
    rootLabel?: string;
    initMessages?: string[]; // Messages to show after header (e.g., "Created rules file", "Cursor hooks installed")
    version?: string; // Version string
  },
): string {
  const lines: string[] = [];
  const issues = result.issues;
  const c = opts.color;
  const t = opts.LL;
  const showHeader = opts.showHeader ?? true;
  const showMeta = opts.showMeta ?? true;

  if (showHeader) {
    const version = opts.version ? ` v${opts.version}` : "";
    const authorConnector = String(t.app.by());
    const authorInfo = authorConnector ? `${authorConnector} @Cheez Lin <https://cheez.tech>` : `@Cheez Lin <https://cheez.tech>`;
    lines.push(`${c.bold(APP_NAME)}${version} ${c.dim(authorInfo)}`);
    lines.push("");

    // Show init messages after header if provided
    if (opts.initMessages && opts.initMessages.length > 0) {
      for (const msg of opts.initMessages) {
        lines.push(msg);
      }
      lines.push("");
    }
  }

  const issueMap = buildIssueMap(result);
  const requiredSet = new Set(result.requiredTopLevelNames);

  // Both verbose and concise modes use the same tree rendering (concise tree)
  // Verbose mode shows more detailed issue information instead
  lines.push(
    ...renderConciseTreeLines({ result, issueMap, requiredSet, c, LL: t, rootLabel: opts.rootLabel }),
  );
  lines.push("");

  // Use merged issueMap to calculate issue count
  const uniqueIssueCount = issueMap.size;

  if (uniqueIssueCount === 0) {
    lines.push(c.green(String(t.report.noIssues())));
  } else {
    // Show hint in the message if not in verbose mode
    const issueMessage = opts.verbose
      ? String(t.report.foundIssues({ count: uniqueIssueCount }))
      : String(t.report.foundIssuesWithHint({ count: uniqueIssueCount }));
    lines.push(c.red(issueMessage));

    // Only show issue list in verbose mode
    if (opts.verbose && issues.length > 0) {
      lines.push("");

      // Collect all original issues for each file (for displaying detailed whitelist)
      const issuesByFile = new Map<string, Issue[]>();
      for (const issue of issues) {
        if (!issuesByFile.has(issue.displayPath)) {
          issuesByFile.set(issue.displayPath, []);
        }
        issuesByFile.get(issue.displayPath)!.push(issue);
      }

      // Debug: Count how many issues each file has
      if (process.env.DEBUG_FILE) {
        for (const [displayPath, fileIssues] of issuesByFile.entries()) {
          if (fileIssues.length > 1) {
            console.error(`[DEBUG] [verbose output] File "${displayPath}" has ${fileIssues.length} issues:`);
            for (const issue of fileIssues) {
              console.error(`[DEBUG]   - ${issue.ruleKind}: ${issue.message.key}`, 'params' in issue.message ? issue.message.params : undefined);
            }
          }
        }
      }

      // First collect all whitelists and blacklists, build label to global index mapping
      const mergedWhitelistIssues: Array<{ displayPath: string; meta: IssueMeta; whitelists: Array<{ label: string; only: string[] }> }> = [];
      const mergedBlacklistIssues: Array<{ displayPath: string; meta: IssueMeta; blacklists: Array<{ label: string; patterns: string[] }> }> = [];

      // Collect all whitelists and blacklists
      for (const [displayPath, meta] of issueMap.entries()) {
        // If it's a merged whitelist, collect it for later display
        if (meta.message.key === "issue.merged.forbiddenOnlyAllowed") {
          mergedWhitelistIssues.push({
            displayPath,
            meta,
            whitelists: meta.message.params.whitelists
          });
        }
        // If it's a merged blacklist, collect it for later display
        if (meta.message.key === "issue.merged.forbiddenBlacklist") {
          mergedBlacklistIssues.push({
            displayPath,
            meta,
            blacklists: meta.message.params.blacklists
          });
        }
      }

      // Build whitelist label to global index mapping
      const whitelistLabelToIndex = new Map<string, number>();
      const whitelistsByLabel = new Map<string, Set<string>>();
      for (const { whitelists } of mergedWhitelistIssues) {
        for (const wl of whitelists) {
          const label = wl.label === "./" || wl.label === "." ? "." : wl.label;
          if (!whitelistsByLabel.has(label)) {
            whitelistsByLabel.set(label, new Set());
          }
          // Merge all whitelist items
          for (const item of wl.only) {
            whitelistsByLabel.get(label)!.add(item);
          }
        }
      }
      // Assign global index to each unique label
      let whitelistGlobalIndex = 1;
      for (const label of Array.from(whitelistsByLabel.keys()).sort()) {
        whitelistLabelToIndex.set(label, whitelistGlobalIndex);
        whitelistGlobalIndex++;
      }

      // Build blacklist label to global index mapping
      const blacklistLabelToIndex = new Map<string, number>();
      const blacklistsByDir = new Map<string, Set<string>>();
      for (const { blacklists } of mergedBlacklistIssues) {
        for (const bl of blacklists) {
          const dir = bl.label === "./" || bl.label === "." ? "." : bl.label;
          if (!blacklistsByDir.has(dir)) {
            blacklistsByDir.set(dir, new Set());
          }
          for (const pattern of bl.patterns) {
            blacklistsByDir.get(dir)!.add(pattern);
          }
        }
      }
      // Assign global index to each unique label
      let blacklistGlobalIndex = 1;
      for (const dir of Array.from(blacklistsByDir.keys()).sort()) {
        blacklistLabelToIndex.set(dir, blacklistGlobalIndex);
        blacklistGlobalIndex++;
      }

      // Display issue list, using global index
      for (const [displayPath, meta] of issueMap.entries()) {
        const icon = meta.severity === "warn" ? c.yellow("⚠") : (meta.category === "missing" ? c.yellow("✖") : c.red("✖"));

        // If it's a whitelist issue, need to update index to global index
        let messageToDisplay = meta.message;
        if (meta.message.key === "issue.merged.forbiddenOnlyAllowed") {
          const whitelists = meta.message.params.whitelists;
          const globalIndices = whitelists
            .map(wl => {
              const label = wl.label === "./" || wl.label === "." ? "." : wl.label;
              return whitelistLabelToIndex.get(label);
            })
            .filter((idx): idx is number => idx !== undefined)
            .sort((a, b) => a - b);

          if (globalIndices.length > 0) {
            const labels = globalIndices.map(idx => String(idx)).join("、");
            messageToDisplay = {
              key: "issue.merged.forbiddenOnlyAllowed",
              params: { whitelists: [], _displayLabels: labels }
            } as any;
          }
        }
        // If it's a blacklist issue, need to update index to global index
        else if (meta.message.key === "issue.merged.forbiddenBlacklist") {
          const blacklists = meta.message.params.blacklists;
          const globalIndices = blacklists
            .map(bl => {
              const label = bl.label === "./" || bl.label === "." ? "." : bl.label;
              return blacklistLabelToIndex.get(label);
            })
            .filter((idx): idx is number => idx !== undefined)
            .sort((a, b) => a - b);

          if (globalIndices.length > 0) {
            const labels = globalIndices.map(idx => String(idx)).join("、");
            const firstPattern = blacklists[0]!.patterns[0] || "";
            // Here we need to create a temporary message format
            // Since formatIssueMessage needs to handle this, we need special handling
            messageToDisplay = {
              key: "issue.merged.forbiddenBlacklist",
              params: { blacklists: [], _displayLabels: labels, _firstPattern: firstPattern }
            } as any;
          }
        }

        lines.push(c.dim(`  ${icon} ${displayPath} ${c.dim(String(t.report.arrow()))} ${c.dim(formatIssueMessage(t, messageToDisplay))}`));
      }

      // Display blacklist details after issue list (same level as "Found X issues", no indentation)
      // Blacklist placed first because it's generally fewer
      // Use established blacklistsByDir and blacklistLabelToIndex
      if (blacklistsByDir.size > 0) {
        lines.push("");

        // Display merged blacklist, using global index
        const blacklistEntries = Array.from(blacklistsByDir.entries()).sort((a, b) => {
          const idxA = blacklistLabelToIndex.get(a[0]) || 0;
          const idxB = blacklistLabelToIndex.get(b[0]) || 0;
          return idxA - idxB;
        });

        for (let i = 0; i < blacklistEntries.length; i++) {
          const [dir, patterns] = blacklistEntries[i]!;
          const label = dir === "./" || dir === "." ? "." : dir;
          const globalIndex = blacklistLabelToIndex.get(dir) || (i + 1);
          const patternsStr = Array.from(patterns).sort().join(", ");
          // title uses darker color (c.bold), items use lighter color (c.dim), and indent 2 spaces
          lines.push(c.bold(`${String(t.report.blacklist())} ${globalIndex} (${label})`));
          lines.push(c.dim(`  ${patternsStr}`));
          // Add empty line between entries (except the last one)
          if (i < blacklistEntries.length - 1) {
            lines.push("");
          }
        }
      }

      // Display whitelist details after issue list (same level as "Found X issues", no indentation)
      // Use established whitelistsByLabel and whitelistLabelToIndex
      if (whitelistsByLabel.size > 0) {
        lines.push("");

        // Display merged whitelist, using global index
        const whitelistEntries = Array.from(whitelistsByLabel.entries()).sort((a, b) => {
          const idxA = whitelistLabelToIndex.get(a[0]) || 0;
          const idxB = whitelistLabelToIndex.get(b[0]) || 0;
          return idxA - idxB;
        });

        for (let i = 0; i < whitelistEntries.length; i++) {
          const [label, items] = whitelistEntries[i]!;
          const globalIndex = whitelistLabelToIndex.get(label) || (i + 1);
          const itemsArray = Array.from(items).sort();
          const itemsStr = itemsArray.join(", ");
          // title uses darker color (c.bold), items use lighter color (c.dim), and indent 2 spaces
          lines.push(c.bold(`${String(t.report.whitelist())} ${globalIndex} (${label})`));
          lines.push(c.dim(`  ${itemsStr}`));
          // Add empty line between entries (except the last one)
          if (i < whitelistEntries.length - 1) {
            lines.push("");
          }
        }
      }
    }
  }

  if (showMeta) {
    lines.push("");
    // Rules file info - always show
    lines.push(c.dim(String(t.meta.rulesFile({ path: result.configPath }))));
    if (result.imports) {
      for (const imp of result.imports) {
        lines.push(c.dim(String(t.meta.importedRules({ path: imp }))));
      }
    }

    // Language and mode - only show in verbose mode
    if (opts.verbose) {
      lines.push(c.dim(String(t.meta.lang())));
      lines.push(c.dim(String(t.meta.mode({ mode: opts.verbose ? String(t.mode.verbose()) : String(t.mode.concise()) }))));
    }

    // Performance stats - always show basic
    // Text uses dim color like rules file, numbers with units (e.g., "3000ms", "200") are colored cyan
    if (result.fileCount !== undefined && result.duration !== undefined) {
      const perfText = String(t.meta.performance({ fileCount: result.fileCount, duration: result.duration }));

      // Match numbers with optional units (e.g., "3000ms", "200", "114 items")
      // Pattern: \d+ followed by optional non-space characters, then space or end
      // This matches "3000ms", "200", "114 items" etc. as a whole unit
      const numberWithUnitRegex = /\d+[^\s]*(?=\s|$)/g;
      const parts: string[] = [];
      let lastIndex = 0;
      let match;

      while ((match = numberWithUnitRegex.exec(perfText)) !== null) {
        // Add dim-wrapped text before the number+unit
        if (match.index > lastIndex) {
          parts.push(c.dim(perfText.substring(lastIndex, match.index)));
        }
        // Add cyan-colored number+unit as a whole
        parts.push(c.cyan(match[0]!));
        lastIndex = match.index + match[0]!.length;
      }
      // Add remaining dim-wrapped text
      if (lastIndex < perfText.length) {
        parts.push(c.dim(perfText.substring(lastIndex)));
      }

      lines.push(parts.length > 0 ? parts.join('') : c.dim(perfText));
    }
  }

  return lines.join("\n");
}
