#!/usr/bin/env node
import { dirname, relative, resolve, sep } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stdin } from "node:process";
import { fileURLToPath } from "node:url";
import { checkWorkspaces } from "./agents/core";
import { handleClaudeHook, installClaudeHooks } from "./agents/claude";
import { lintWorkspace } from "./rules/lint";
import { findGitRepos, lintRepos, reposBelow } from "./scan";
import { renderReport, reportToJSON } from "./rules/report";
import { createColorizer } from "./color";
import { getT, isLocale, locales, type MessageKey, type TFunction } from "./i18n";
import { detectSystemLang } from "./runtime";
import { APP_NAME } from "./constants";

const packageJson = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf8"),
);
const VERSION: string = packageJson.version;

type HookSubcommand = "after-edit" | "stop" | "install";

type CliOptions = {
  command: "lint" | "cursor" | "claude" | "scan" | "manifesto";
  hook?: HookSubcommand;
  cwd: string;
  verbose: boolean;
  lang?: string;
  color: boolean;
  help: boolean;
  /** File paths from lint-staged or similar tools. */
  filePaths?: string[];
  json?: boolean;
  scanDir?: string;
  /** `scan`: check every repository below, one report. */
  scanAll?: boolean;
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

function parseArgs(argv: string[], t: TFunction): CliOptions {
  const opts: CliOptions = {
    command: "lint",
    cwd: process.cwd(),
    verbose: false,
    color: Boolean(process.stdout.isTTY) && process.env.NO_COLOR == null,
    help: false,
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
    } else if (a === "manifesto") opts.command = "manifesto";
    else if (a === "--json") opts.json = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--verbose" || a === "-v") opts.verbose = true;
    else if (a === "--no-color") opts.color = false;
    else if (a === "--lang" || a === "-l") {
      const code = argv[++i];
      const supported = `${locales.join(" / ")} / auto`;
      if (!code) throw new Error(t("cli.error.missingLangValue", { supported }));
      if (code !== "auto" && !isLocale(code)) {
        throw new Error(t("cli.error.unsupportedLang", { code, supported }));
      }
      opts.lang = code;
    } else if (a.startsWith("-")) {
      throw new Error(t("cli.error.unknownArg", { arg: a }));
    } else {
      filePaths.push(a);
    }
  }

  if (filePaths.length > 0) opts.filePaths = filePaths;
  return opts;
}

function printHelp(t: TFunction): void {
  // Pad by display width: CJK characters take two columns.
  const width = (text: string) => [...text].reduce((n, ch) => n + (ch.codePointAt(0)! > 0x2e80 ? 2 : 1), 0);
  const row = (left: string, key: MessageKey) => `  ${left}${" ".repeat(Math.max(1, 21 - width(left)))}${t(key)}`;
  console.log([
    `${APP_NAME} ${VERSION} — ${t("cli.help.tagline")}`,
    "",
    t("cli.help.commands"),
    row(t("cli.help.noCommand"), "cli.help.lintCmdDesc"),
    row("scan [dir]", "cli.help.scanCmdDesc"),
    row("manifesto", "cli.help.manifestoCmdDesc"),
    row("cursor install", "cli.help.installCursorHookDesc"),
    row("claude install", "cli.help.installClaudeHookDesc"),
    "",
    t("cli.help.options"),
    row("-v, --verbose", "cli.help.verboseHint"),
    row("-l, --lang <code>", "cli.help.langHint"),
    row("--json", "cli.help.jsonHint"),
    row("--no-color", "cli.help.noColorHint"),
    row("-h, --help", "cli.help.helpHint"),
    "",
  ].join("\n"));
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

async function runLint(opts: CliOptions, t: TFunction): Promise<number> {
  const relevantDirs = opts.filePaths?.length ? relevantDirsFor(opts.cwd, opts.filePaths) : undefined;
  // A folder of repositories: each is checked as git sees it, with its own index and ignore rules.
  // `scan` asks for every repository below, even inside one.
  const below = relevantDirs ? undefined : opts.scanAll ? findGitRepos(opts.cwd).filter((r) => r !== resolve(opts.cwd)) : reposBelow(opts.cwd);
  const repos = below?.length ? below : undefined;
  const result = repos ? await lintRepos(opts.cwd, repos) : await lintWorkspace({ root: opts.cwd, relevantDirs });

  if (opts.json) {
    console.log(JSON.stringify(reportToJSON(result, t, VERSION), null, 2));
    return result.issues.some((i) => i.verdict === "smell") ? 1 : 0;
  }

  console.log(
    renderReport(result, {
      verbose: opts.verbose,
      color: createColorizer({ enabled: opts.color }),
      t,
      version: VERSION,
      // A terminal reports its width; a pipe or a pseudo-terminal of size 0 does not.
      width: process.stdout.columns || Number(process.env.COLUMNS) || 100,
    }) + "\n",
  );

  // Smells fail; things to review never do.
  return result.issues.some((i) => i.verdict === "smell") ? 1 : 0;
}

async function main() {
  const argv = process.argv.slice(2);
  const preLang = detectLangArg(argv) ?? detectSystemLang();
  const { t } = getT(preLang);
  const opts = parseArgs(argv, t);
  const lang = opts.lang === "auto" ? detectSystemLang() : (opts.lang ?? preLang);

  if (opts.help) {
    printHelp(t);
    return;
  }

  if (opts.command === "cursor" && opts.hook) {
    if (opts.hook === "install") {
      const result = installCursorHook(opts.cwd);
      if (result.installed) console.log(t("cli.install.cursorHooksInstalled"));
      if (result.code === 0) console.log(t("cli.install.credit"));
      process.exitCode = result.code;
      return;
    }
    await handleCursorHook(opts.hook, opts, lang);
    return;
  }

  if (opts.command === "claude" && opts.hook) {
    if (opts.hook === "install") {
      const result = installClaudeHooks(opts.cwd, getRunnerCommand());
      if (result.installed) console.log(t("cli.install.claudeHooksInstalled"));
      if (result.code === 0) console.log(t("cli.install.credit"));
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

  if (opts.command === "manifesto") {
    // docs/ sits next to dist/ in the package and next to src/ in the repository.
    const file = lang.startsWith("zh") ? "manifesto.zh.md" : "manifesto.md";
    console.log(readFileSync(new URL(`../docs/${file}`, import.meta.url), "utf8"));
    return;
  }

  if (opts.command === "scan") {
    // The same report as a plain run, repository by repository: --json keeps every fact (details, key, sources).
    process.exitCode = await runLint({ ...opts, cwd: resolve(opts.cwd, opts.scanDir ?? "."), scanAll: true }, getT(lang).t);
    return;
  }

  process.exitCode = await runLint(opts, t);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 2;
});
