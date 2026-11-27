import { isAbsolute, relative, resolve, sep } from "node:path";
import { getT, type TFunction } from "../i18n";
import { lintWorkspace } from "../rules/lint";
import { detailItems, formatIssueMessage, visible } from "../rules/report";

export type AgentIssue = {
  root: string;
  displayPath: string;
  message: string;
  verdict: "smell" | "review";
  reason?: string;
  /** What the finding lists (files, directories, copies), one line each. */
  items?: string[];
};

export type AgentCheckResult = {
  issues: AgentIssue[];
  summary: string;
};

const SUMMARY_ISSUE_LIMIT = 40;
/** Items listed under one finding for an agent; the rest are in `chous --json`. */
const SUMMARY_ITEM_LIMIT = 50;

/**
 * Resolve a hook-provided path. Claude Code and Cursor on Windows both pass
 * absolute paths such as `C:\repo\file.ts`, which a slash-prefix check misses.
 */
export function resolveEditedFile(filePath: string, root: string): string {
  return isAbsolute(filePath) ? filePath : resolve(root, filePath);
}

function relevantDirsFor(filePath: string, workspaceRoots: string[]): Set<string> | undefined {
  const dirs = new Set<string>();
  for (const root of workspaceRoots) {
    const absFilePath = resolveEditedFile(filePath, root);
    const relPath = relative(root, absFilePath);
    if (relPath.startsWith("..") || isAbsolute(relPath)) continue;
    const parts = relPath.split(sep).filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      const dir = parts.slice(0, i + 1).join("/");
      if (dir && dir !== ".") dirs.add(dir);
    }
    if (parts.length > 1) {
      const parentDir = parts.slice(0, -1).join("/");
      if (parentDir && parentDir !== ".") dirs.add(parentDir);
    }
    dirs.add(".");
    return dirs;
  }
  return undefined;
}

export async function checkWorkspaces(opts: {
  workspaceRoots: string[];
  lang: string;
  editedFile?: string;
}): Promise<AgentCheckResult> {
  const { t } = getT(opts.lang);
  const issues: AgentIssue[] = [];
  const relevantDirs = opts.editedFile ? relevantDirsFor(opts.editedFile, opts.workspaceRoots) : undefined;

  for (const root of opts.workspaceRoots) {
    const result = await lintWorkspace({ root, relevantDirs });
    for (const issue of result.issues) {
      issues.push({
        root,
        displayPath: issue.displayPath,
        message: formatIssueMessage(t, issue.message),
        verdict: issue.verdict,
        reason: issue.reason && t(issue.reason),
        items: agentItems(t, issue),
      });
    }
  }

  return { issues, summary: formatAgentSummary(opts.lang, issues) };
}

/**
 * Every place behind a finding, one per entry. A person reads `dist/  3 files`;
 * an agent gets the three files, since it is the one who will act on each.
 */
function agentItems(t: TFunction, issue: Parameters<typeof detailItems>[1]): string[] {
  const rows = detailItems(t, issue);
  if (rows.length) return rows.flatMap((it) => [`${it.text}${it.note ? ` (${it.note})` : ""}`, ...(it.children ?? []).map((c) => `  ${c}`)]);
  const files = issue.details?.files;
  return Array.isArray(files) ? files.filter((f): f is string => typeof f === "string") : [];
}

// The summary is read line by line: a name with a newline in it must not become two lines.
// JSON keeps names as they are.
function formatIssueBlock(t: TFunction, issues: AgentIssue[]): string[] {
  const lines: string[] = [];
  for (const issue of issues) {
    lines.push(`- ${visible(issue.displayPath)}: ${visible(issue.message)}`);
    if (issue.reason) lines.push(`  ${t("agent.reason", { reason: issue.reason })}`);
    const items = issue.items ?? [];
    for (const item of items.slice(0, SUMMARY_ITEM_LIMIT)) lines.push(`  - ${visible(item)}`);
    if (items.length > SUMMARY_ITEM_LIMIT) lines.push(`  - ${t("report.more", { count: items.length - SUMMARY_ITEM_LIMIT })}`);
  }
  return lines;
}

export function formatAgentSummary(lang: string, issues: AgentIssue[]): string {
  const { t } = getT(lang);
  const lines = [t("agent.intro"), ""];
  const limited = issues.slice(0, SUMMARY_ISSUE_LIMIT);
  const smells = limited.filter((i) => i.verdict === "smell");
  const reviews = limited.filter((i) => i.verdict === "review");

  if (smells.length) lines.push(t("agent.smells"), ...formatIssueBlock(t, smells), "");
  if (reviews.length) lines.push(t("agent.review"), ...formatIssueBlock(t, reviews), "");
  if (issues.length > SUMMARY_ISSUE_LIMIT) lines.push(`- ${t("report.more", { count: issues.length - SUMMARY_ISSUE_LIMIT })}`, "");
  lines.push(t("agent.fix"));
  return lines.join("\n");
}
