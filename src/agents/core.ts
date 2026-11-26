import { isAbsolute, relative, resolve, sep } from "node:path";
import { getT, type TFunction } from "../i18n";
import { lintWorkspace } from "../rules/lint";
import { formatIssueMessage } from "../rules/report";

export type AgentIssue = {
  root: string;
  displayPath: string;
  message: string;
  verdict: "smell" | "review";
  reason?: string;
};

export type AgentCheckResult = {
  issues: AgentIssue[];
  summary: string;
};

const SUMMARY_ISSUE_LIMIT = 40;

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
      });
    }
  }

  return { issues, summary: formatAgentSummary(opts.lang, issues) };
}

function formatIssueBlock(t: TFunction, issues: AgentIssue[]): string[] {
  const lines: string[] = [];
  for (const issue of issues) {
    lines.push(`- ${issue.displayPath}: ${issue.message}`);
    if (issue.reason) lines.push(`  ${t("agent.reason", { reason: issue.reason })}`);
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
  if (issues.length > SUMMARY_ISSUE_LIMIT) lines.push(`- ... ${issues.length - SUMMARY_ISSUE_LIMIT}`, "");
  lines.push(t("agent.fix"));
  return lines.join("\n");
}
