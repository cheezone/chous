import { isAbsolute, relative, resolve, sep } from "node:path";
import { getLL } from "../i18n";
import { lintWorkspace } from "../rules/lint";
import { formatIssueMessage } from "../rules/report";

export type AgentIssue = {
  root: string;
  displayPath: string;
  message: string;
  severity: "error" | "warn";
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
  const { LL } = getLL(opts.lang);
  const issues: AgentIssue[] = [];
  const relevantDirs = opts.editedFile ? relevantDirsFor(opts.editedFile, opts.workspaceRoots) : undefined;

  const { locale } = getLL(opts.lang);
  for (const root of opts.workspaceRoots) {
    const result = await lintWorkspace({ root, relevantDirs });
    for (const issue of result.issues) {
      issues.push({
        root,
        displayPath: issue.displayPath,
        message: formatIssueMessage(LL, issue.message),
        severity: issue.severity,
        reason: issue.reason?.[locale],
      });
    }
  }

  return { issues, summary: formatAgentSummary(opts.lang, issues) };
}

function formatIssueBlock(LL: ReturnType<typeof getLL>["LL"], issues: AgentIssue[]): string[] {
  const lines: string[] = [];
  for (const issue of issues) {
    lines.push(`- ${issue.displayPath}: ${issue.message}`);
    if (issue.reason) lines.push(`  ${LL.agent.reason({ reason: issue.reason })}`);
  }
  return lines;
}

export function formatAgentSummary(lang: string, issues: AgentIssue[]): string {
  const { LL } = getLL(lang);
  const lines = [LL.agent.intro(), ""];
  const limited = issues.slice(0, SUMMARY_ISSUE_LIMIT);
  const errors = limited.filter((i) => i.severity === "error");
  const warnings = limited.filter((i) => i.severity === "warn");

  if (errors.length) lines.push(LL.agent.errorsSection(), ...formatIssueBlock(LL, errors), "");
  if (warnings.length) lines.push(LL.agent.warningsSection(), ...formatIssueBlock(LL, warnings), "");
  if (issues.length > SUMMARY_ISSUE_LIMIT) lines.push(`- ... ${issues.length - SUMMARY_ISSUE_LIMIT}`, "");
  lines.push(LL.agent.fix());
  return lines.join("\n");
}
