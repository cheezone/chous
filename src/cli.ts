#!/usr/bin/env node
import { dirname, relative, resolve, sep } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stdin } from "node:process";
import { fileURLToPath } from "node:url";
import { checkWorkspaces } from "./agents/core";
import { handleClaudeHook, installClaudeHooks } from "./agents/claude";
import { lintWorkspace } from "./rules/lint";
import { applySafeFixes } from "./rules/autofix";
import { renderReport } from "./rules/report";
import { createColorizer } from "./color";
import { getLL, isLocale, locales, type TranslationFunctions } from "./i18n";
import { detectSystemLang } from "./runtime";
import { APP_NAME } from "./constants";

const packageJson = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf8"),
);
const VERSION: string = packageJson.version;

type HookSubcommand = "after-edit" | "stop" | "install";

type CliOptions = {
  command: "lint" | "cursor" | "claude" | "scan" | "knowledge";
  hook?: HookSubcommand;
  cwd: string;
  verbose: boolean;
  lang?: string;
  color: boolean;
  help: boolean;
  fix: boolean;
  failOnWarnings: boolean;
  ignoreWarnings: boolean;
  /** File paths from lint-staged or similar tools. */
  filePaths?: string[];
  json?: boolean;
  scanDir?: string;
};

function detectLangArg(argv: string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--lang" || argv[i] === "-l") {
      const code = argv[i + 1];
      return code === "auto" ? detectSystemLang() : code;
    }
  }
  return undefined;
}

function isHookSubcommand(value: string | undefined): value is HookSubcommand {
  return value === "after-edit" || value === "stop" || value === "install";
}

function parseArgs(argv: string[], LL: TranslationFunctions): CliOptions {
  const opts: CliOptions = {
    command: "lint",
    cwd: process.cwd(),
    verbose: false,
    color: Boolean(process.stdout.isTTY) && process.env.NO_COLOR == null,
    help: false,
    fix: false,
    failOnWarnings: false,
    ignoreWarnings: false,
  };
  const filePaths: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a) continue;

    if (a === "cursor" || a === "claude") {
      opts.command = a;
      if (isHookSubcommand(argv[i + 1])) opts.hook = argv[++i] as HookSubcommand;
    } else if (a === "scan") {
      opts.command = "scan";
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        opts.scanDir = next;
        i++;
      }
    } else if (a === "knowledge") opts.command = "knowledge";
    else if (a === "--json") opts.json = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--verbose" || a === "-v") opts.verbose = true;
    else if (a === "--fix") opts.fix = true;
    else if (a === "--fail-on-warnings") opts.failOnWarnings = true;
    else if (a === "--ignore-warnings") opts.ignoreWarnings = true;
    else if (a === "--no-color") opts.color = false;
    else if (a === "--lang" || a === "-l") {
      const code = argv[++i];
      const supported = `${locales.join(" / ")} / auto`;
      if (!code) throw new Error(String(LL.cli.error.missingLangValue({ supported })));
      if (code !== "auto" && !isLocale(code)) {
        throw new Error(String(LL.cli.error.unsupportedLang({ code, supported })));
      }
      opts.lang = code;
    } else if (a.startsWith("-")) {
      throw new Error(String(LL.cli.error.unknownArg({ arg: a })));
    } else {
      filePaths.push(a);
    }
  }

  if (filePaths.length > 0) opts.filePaths = filePaths;
  if (opts.ignoreWarnings && opts.failOnWarnings) {
    throw new Error(String(LL.cli.error.conflictIgnoreAndFailWarnings()));
  }
  return opts;
}

function printHelp(LL: TranslationFunctions): void {
  const h = LL.cli.help;
  console.log(`${APP_NAME} ${VERSION} — ${String(h.tagline())}

${String(h.commands())}
  (none)               ${String(h.lintCmdDesc())}
  scan [dir]           ${String(h.scanCmdDesc())}
  knowledge            ${String(h.knowledgeCmdDesc())}
  cursor install       ${String(h.installCursorHookDesc())}
  claude install       ${String(h.installClaudeHookDesc())}

${String(h.options())}
  --fix                ${String(h.fixHint())}
  -v, --verbose        ${String(h.verboseHint())}
  -l, --lang <code>    ${String(h.langHint())}
  --fail-on-warnings   ${String(h.failOnWarningsHint())}
  --ignore-warnings    ${String(h.ignoreWarningsHint())}
  --no-color           ${String(h.noColorHint())}
  -h, --help           ${String(h.helpHint())}
`);
}

/**
 * Runner embedded into agent hooks. bunx is faster, but only exists when Bun is installed.
 */
function getRunnerCommand(): "bunx" | "npx" {
  try {
    const bun = (globalThis as { Bun?: { which?: (cmd: string) => string | null } }).Bun;
    if (typeof bun?.which === "function" && bun.which("bun")) return "bunx";
  } catch {
    // Fall back to npx.
  }
  return "npx";
}

type CursorHook = { command?: string };

function installCursorHook(cwd: string): { code: number; installed: boolean } {
  const cursorDir = resolve(cwd, ".cursor");
  const hooksJsonPath = resolve(cursorDir, "hooks.json");
  const runner = getRunnerCommand();
  const afterEdit = `${runner} ${APP_NAME} cursor after-edit -l auto`;
  const stop = `${runner} ${APP_NAME} cursor stop -l auto`;

  let existing: { version?: number; hooks?: Record<string, CursorHook[]> } = {};
  if (existsSync(hooksJsonPath)) {
    try {
      existing = JSON.parse(readFileSync(hooksJsonPath, "utf8"));
    } catch {
      // Rewrite a broken file.
    }
  }

  const hooks = { ...existing.hooks };
  const upsert = (list: CursorHook[] | undefined, sub: string, command: string) => {
    const kept = (Array.isArray(list) ? list : []).filter((h) => !h.command?.includes(`${APP_NAME} cursor ${sub}`));
    return [...kept, { command }];
  };
  const has = (list: CursorHook[] | undefined, command: string) =>
    Array.isArray(list) && list.some((h) => h.command === command);

  if (has(hooks.afterFileEdit, afterEdit) && has(hooks.stop, stop)) return { code: 0, installed: false };

  hooks.afterFileEdit = upsert(hooks.afterFileEdit, "after-edit", afterEdit);
  hooks.stop = upsert(hooks.stop, "stop", stop);

  try {
    mkdirSync(cursorDir, { recursive: true });
    writeFileSync(hooksJsonPath, JSON.stringify({ version: existing.version ?? 1, hooks }, null, 2) + "\n", "utf8");
    return { code: 0, installed: true };
  } catch {
    return { code: 1, installed: false };
  }
}

async function readStdin(): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    let data = "";
    stdin.setEncoding("utf8");
    stdin.on("data", (chunk) => (data += chunk));
    stdin.on("end", () => resolvePromise(data));
    stdin.on("error", reject);
  });
}

type CursorHookData = {
  workspace_roots?: string[];
  file_path?: string;
  edits?: unknown[];
  /** Number of auto-followups already sent in this conversation. */
  loop_count?: number;
};

const CURSOR_MAX_FOLLOWUPS = 5;

async function handleCursorHook(subcommand: "after-edit" | "stop", opts: CliOptions, lang: string): Promise<void> {
  try {
    const raw = await readStdin();
    if (!raw.trim()) return;
    const hook = JSON.parse(raw) as CursorHookData;
    // afterFileEdit has no output channel in Cursor; only stop can talk back.
    if (subcommand === "after-edit") return;

    const checked = await checkWorkspaces({ workspaceRoots: hook.workspace_roots ?? [opts.cwd], lang });
    if (checked.issues.length > 0 && (hook.loop_count ?? 0) < CURSOR_MAX_FOLLOWUPS) {
      console.log(JSON.stringify({ followup_message: checked.summary }));
    }
  } catch (err) {
    // Never break the editor's workflow.
    if (opts.verbose) console.error(err instanceof Error ? err.message : String(err));
  }
}

/** Directories touched by the given files, so lint-staged runs only scan what changed. */
function relevantDirsFor(cwd: string, filePaths: string[]): Set<string> {
  const dirs = new Set<string>(["."]);
  for (const filePath of filePaths) {
    const parts = relative(cwd, resolve(cwd, filePath)).split(sep).filter(Boolean);
    for (let i = 1; i <= parts.length; i++) dirs.add(parts.slice(0, i).join("/"));
  }
  return dirs;
}

async function runLint(opts: CliOptions, LL: TranslationFunctions): Promise<number> {
  const relevantDirs = opts.filePaths?.length ? relevantDirsFor(opts.cwd, opts.filePaths) : undefined;
  let result = await lintWorkspace({ root: opts.cwd, relevantDirs });

  if (opts.fix && result.issues.some((i) => i.fix)) {
    const fixed = await applySafeFixes(result.issues);
    result = { ...result, issues: fixed.remaining, fixedCount: fixed.applied };
  }
  if (opts.ignoreWarnings) {
    result = { ...result, issues: result.issues.filter((i) => i.severity === "error") };
  }

  console.log(
    renderReport(result, {
      verbose: opts.verbose,
      color: createColorizer({ enabled: opts.color }),
      LL,
      showHeader: true,
      showMeta: true,
      version: VERSION,
    }) + "\n",
  );

  const errors = result.issues.filter((i) => i.severity === "error").length;
  const warnings = result.issues.length - errors;
  return errors > 0 || (warnings > 0 && opts.failOnWarnings) ? 1 : 0;
}

async function main() {
  const argv = process.argv.slice(2);
  const preLang = detectLangArg(argv) ?? detectSystemLang();
  const { LL } = getLL(preLang);
  const opts = parseArgs(argv, LL);
  const lang = opts.lang === "auto" ? detectSystemLang() : (opts.lang ?? preLang);

  if (opts.help) {
    printHelp(LL);
    return;
  }

  if (opts.command === "cursor" && opts.hook) {
    if (opts.hook === "install") {
      const result = installCursorHook(opts.cwd);
      if (result.installed) console.log(String(LL.cli.install.cursorHooksInstalled()));
      if (result.code === 0) console.log(String(LL.cli.install.credit()));
      process.exitCode = result.code;
      return;
    }
    await handleCursorHook(opts.hook, opts, lang);
    return;
  }

  if (opts.command === "claude" && opts.hook) {
    if (opts.hook === "install") {
      const result = installClaudeHooks(opts.cwd, getRunnerCommand());
      if (result.installed) console.log(String(LL.cli.install.claudeHooksInstalled()));
      if (result.code === 0) console.log(String(LL.cli.install.credit()));
      process.exitCode = result.code;
      return;
    }
    try {
      const output = await handleClaudeHook({ subcommand: opts.hook, stdin: await readStdin(), cwd: opts.cwd, lang });
      if (output) console.log(output);
    } catch (err) {
      if (opts.verbose) console.error(err instanceof Error ? err.message : String(err));
    }
    return;
  }

  if (opts.command === "knowledge") {
    const { knowledgeToJSON } = await import("./knowledge");
    console.log(JSON.stringify(knowledgeToJSON(), null, 2));
    return;
  }

  if (opts.command === "scan") {
    const { scanDirectory, formatScanText } = await import("./scan");
    const result = await scanDirectory({
      dir: resolve(opts.cwd, opts.scanDir ?? "."),
      lang,
      json: opts.json,
      withKnowledge: Boolean(opts.json && opts.verbose),
      withSpecfy: true,
    });
    console.log(opts.json ? JSON.stringify(result, null, 2) : formatScanText(result));
    process.exitCode = result.repos.some((r) => r.issues.some((i) => i.severity === "error")) ? 1 : 0;
    return;
  }

  process.exitCode = await runLint(opts, LL);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 2;
});
