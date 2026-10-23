import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { APP_NAME } from "../constants";
import { checkWorkspaces } from "./core";

export type ClaudeHookSubcommand = "after-edit" | "stop" | "install";

type ClaudeHookCommand = { type?: string; command?: string; args?: string[] };
type ClaudeHookGroup = { matcher?: string; hooks?: ClaudeHookCommand[] };
type ClaudeSettings = {
  hooks?: Record<string, ClaudeHookGroup[] | undefined>;
  [key: string]: unknown;
};

const POST_TOOL_MATCHER = "Write|Edit|MultiEdit";

function isChousCommand(command: string | undefined, subcommand: string): boolean {
  return Boolean(command && command.includes(`${APP_NAME} claude ${subcommand}`));
}

function readSettings(path: string): ClaudeSettings {
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as ClaudeSettings;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Merge chous hooks into `.claude/settings.json` without dropping existing hooks.
 * Running it again updates the command in place instead of appending a duplicate.
 */
export function installClaudeHooks(cwd: string, runner: "bunx" | "npx"): { code: number; installed: boolean } {
  const claudeDir = resolve(cwd, ".claude");
  const settingsPath = resolve(claudeDir, "settings.json");
  try {
    if (!existsSync(claudeDir)) mkdirSync(claudeDir, { recursive: true });
  } catch {
    return { code: 1, installed: false };
  }

  const settings = readSettings(settingsPath);
  const hooks = { ...settings.hooks };
  const afterCommand = `${runner} ${APP_NAME} claude after-edit -l auto`;
  const stopCommand = `${runner} ${APP_NAME} claude stop -l auto`;

  const postTool = Array.isArray(hooks.PostToolUse) ? [...hooks.PostToolUse] : [];
  const stop = Array.isArray(hooks.Stop) ? [...hooks.Stop] : [];

  const already = hasCommand(postTool, "after-edit", afterCommand) && hasCommand(stop, "stop", stopCommand);
  if (already) return { code: 0, installed: false };

  hooks.PostToolUse = upsertGroup(postTool, POST_TOOL_MATCHER, "after-edit", { type: "command", command: afterCommand });
  hooks.Stop = upsertGroup(stripMatcher(stop, "stop"), undefined, "stop", { type: "command", command: stopCommand });

  try {
    writeFileSync(settingsPath, JSON.stringify({ ...settings, hooks }, null, 2) + "\n", "utf8");
    return { code: 0, installed: true };
  } catch {
    return { code: 1, installed: false };
  }
}

function hasCommand(groups: ClaudeHookGroup[], subcommand: string, expected: string): boolean {
  return groups.some((group) =>
    (group.hooks ?? []).some((hook) => hook.command === expected && isChousCommand(hook.command, subcommand)),
  );
}

function stripMatcher(groups: ClaudeHookGroup[], subcommand: string): ClaudeHookGroup[] {
  return groups
    .map((group) => ({
      ...group,
      hooks: (group.hooks ?? []).filter((hook) => !isChousCommand(hook.command, subcommand)),
    }))
    .filter((group) => (group.hooks ?? []).length > 0 || group.matcher);
}

function upsertGroup(
  groups: ClaudeHookGroup[],
  matcher: string | undefined,
  subcommand: string,
  command: ClaudeHookCommand,
): ClaudeHookGroup[] {
  const cleaned = groups
    .map((group) => ({
      ...group,
      hooks: (group.hooks ?? []).filter((hook) => !isChousCommand(hook.command, subcommand)),
    }))
    .filter((group) => (group.hooks ?? []).length > 0);

  const index = cleaned.findIndex((group) => (matcher ? group.matcher === matcher : !group.matcher));
  if (index >= 0) {
    const current = cleaned[index]!;
    cleaned[index] = { ...current, hooks: [...(current.hooks ?? []), command] };
    return cleaned;
  }
  return [...cleaned, matcher ? { matcher, hooks: [command] } : { hooks: [command] }];
}

export async function handleClaudeHook(opts: {
  subcommand: "after-edit" | "stop";
  stdin: string;
  cwd: string;
  configPath?: string;
  strict: boolean;
  lang: string;
}): Promise<string | null> {
  if (!opts.stdin.trim()) return null;
  const hook = JSON.parse(opts.stdin) as {
    cwd?: string;
    workspace_roots?: string[];
    stop_hook_active?: boolean;
    tool_input?: { file_path?: string };
  };
  if (opts.subcommand === "stop" && hook.stop_hook_active) return null;

  const roots = hook.workspace_roots?.length
    ? hook.workspace_roots
    : [hook.cwd || opts.cwd];
  const editedFile = opts.subcommand === "after-edit" ? hook.tool_input?.file_path : undefined;
  const result = await checkWorkspaces({
    workspaceRoots: roots,
    configPath: opts.configPath,
    strict: opts.strict,
    lang: opts.lang,
    editedFile,
  });
  if (result.issues.length === 0) return null;

  if (opts.subcommand === "after-edit") {
    return JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: result.summary,
      },
    });
  }
  return JSON.stringify({ decision: "block", reason: result.summary });
}
