import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { parseFsLintConfig } from "../config/parser";
import { prefetchImports } from "../config/prefetch";
import { resolveWorkspaceRoots } from "../config/where";
import { APP_CONFIG_FILE_NAME } from "../constants";
import { getLL } from "../i18n/runtime";
import { lintWorkspace } from "../rules/lint";
import { formatIssueMessage } from "../rules/report";
import type { Persona, Resolution } from "../types";

export type AgentIssue = {
  root: string;
  displayPath: string;
  message: string;
  severity?: "error" | "warn";
  reason?: string;
  fixSummary?: string;
  resolution?: Resolution;
  see?: string;
};

export type AgentCheckResult = {
  issues: AgentIssue[];
  summary: string;
  persona?: Persona;
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
  configPath?: string;
  strict: boolean;
  lang: string;
  editedFile?: string;
}): Promise<AgentCheckResult> {
  const { LL } = getLL(opts.lang);
  const issues: AgentIssue[] = [];
  let persona: Persona | undefined;
  const relevantDirs = opts.editedFile ? relevantDirsFor(opts.editedFile, opts.workspaceRoots) : undefined;

  for (const root of opts.workspaceRoots) {
    const configPath = resolve(root, opts.configPath ?? APP_CONFIG_FILE_NAME);
    if (!existsSync(configPath)) continue;

    let raw: string;
    try {
      raw = readFileSync(configPath, "utf8");
    } catch {
      continue;
    }

    await prefetchImports(configPath);
    const config = parseFsLintConfig(raw, configPath);
    if (!persona && config.persona) persona = config.persona;
    const roots = await resolveWorkspaceRoots({ cwd: root, configDir: dirname(configPath), where: config.where });

    for (const workspaceRoot of roots) {
      let rootRelevantDirs: Set<string> | undefined;
      if (relevantDirs) {
        rootRelevantDirs = new Set<string>();
        for (const dir of relevantDirs) {
          const dirAbs = resolve(root, dir);
          const rootRel = relative(workspaceRoot, dirAbs);
          if (!rootRel.startsWith("..") && !isAbsolute(rootRel)) {
            rootRelevantDirs.add(rootRel === "" ? "." : rootRel.split(sep).join("/"));
          }
        }
        rootRelevantDirs.add(".");
      }

      const result = await lintWorkspace({
        root: workspaceRoot,
        config,
        configPath,
        strict: opts.strict,
        relevantDirs: rootRelevantDirs,
      });
      if (!persona && result.persona) persona = result.persona;
      for (const issue of result.issues) {
        let fixSummary: string | undefined;
        if (issue.fix) {
          const f = issue.fix;
          if (f.type === "rename") fixSummary = `rename ${f.fromPath} → ${f.toPath}`;
          else if (f.type === "deleteEmptyDir") fixSummary = `delete empty dir ${f.path}`;
          else if (f.type === "pkgSetManager") fixSummary = `set packageManager to ${f.manager}`;
          else if (f.type === "pkgReplaceDep") fixSummary = `replace dep ${f.from} with ${f.to}`;
        }
        issues.push({
          root: workspaceRoot,
          displayPath: issue.displayPath,
          message: formatIssueMessage(LL, issue.message),
          severity: issue.severity,
          reason: issue.reason,
          fixSummary,
          resolution: issue.resolution ?? (issue.fix ? "auto" : "agent"),
          see: issue.see,
        });
      }
    }
  }

  return { issues, summary: formatAgentSummary(opts.lang, issues, persona), persona };
}

function formatIssueBlock(
  LL: ReturnType<typeof getLL>["LL"],
  issues: AgentIssue[],
): string[] {
  const lines: string[] = [];
  for (const issue of issues) {
    const sev = issue.severity ? `[${issue.severity}] ` : "";
    lines.push(`- ${sev}${issue.displayPath}: ${issue.message}`);
    if (issue.reason) lines.push(`  ${String(LL.agent.reason({ reason: issue.reason }))}`);
    if (issue.see) lines.push(`  ${String(LL.agent.see({ url: issue.see }))}`);
    if (issue.fixSummary) lines.push(`  ${String(LL.agent.fixHint({ fix: issue.fixSummary }))}`);
  }
  return lines;
}

export function formatAgentSummary(lang: string, issues: AgentIssue[], persona?: Persona): string {
  const { LL } = getLL(lang);
  const lines = [String(LL.agent.intro())];
  if (persona) lines.push(String(LL.agent.follow({ name: persona.name })));
  lines.push("");

  const limited = issues.slice(0, SUMMARY_ISSUE_LIMIT);
  const auto = limited.filter((i) => i.resolution === "auto");
  const agent = limited.filter((i) => i.resolution === "agent" || !i.resolution);
  const info = limited.filter((i) => i.resolution === "info");

  if (auto.length) {
    lines.push(String(LL.agent.autoSection()));
    lines.push(...formatIssueBlock(LL, auto));
    lines.push("");
  }
  if (agent.length) {
    lines.push(String(LL.agent.agentSection()));
    lines.push(...formatIssueBlock(LL, agent));
    lines.push("");
  }
  if (info.length) {
    lines.push(String(LL.agent.infoSection()));
    lines.push(...formatIssueBlock(LL, info));
    lines.push("");
  }

  if (issues.length > SUMMARY_ISSUE_LIMIT) {
    lines.push(`- ... ${issues.length - SUMMARY_ISSUE_LIMIT}`);
    lines.push("");
  }
  lines.push(String(LL.agent.fix()));
  return lines.join("\n");
}
