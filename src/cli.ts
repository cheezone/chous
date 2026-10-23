#!/usr/bin/env node
import { dirname, relative, resolve, sep } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stdin } from "node:process";
import { parseFsLintConfigGroups } from "./config/parser";
import { prefetchImports } from "./config/prefetch";
import { ensureGithubCached } from "./config/github";
import { resolveNpmPreset } from "./config/npm";
import { checkWorkspaces } from "./agents/core";
import { handleClaudeHook, installClaudeHooks } from "./agents/claude";
import { lintWorkspace } from "./rules/lint";
import { renderReport } from "./rules/report";
import { writeStatsJson } from "./rules/stats";
import { createColorizer } from "./color";
import { getLL } from "./i18n/runtime";
import type { TranslationFunctions } from "./i18n/i18n-types";
import { baseLocale, isLocale, locales } from "./i18n/i18n-util";
import { resolveWorkspaceRoots } from "./config/where";
import { formatFsLintError, isFsLintError } from "./errors";
import { detectSystemLang } from "./runtime";
import { fileURLToPath } from "node:url";
import { glob } from "tinyglobby";
import { DEFAULT_IGNORE_DIRS, loadChousIgnorePatterns } from "./fsutil";
import { stat } from "node:fs/promises";
import { APP_NAME, APP_CONFIG_FILE_NAME } from "./constants";
import ignore from "ignore";
import { compare } from "compare-versions";

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf8"));
const VERSION = packageJson.version;

type CliOptions = {
  command: "lint" | "init" | "cursor" | "claude" | "update";
  cursorSubcommand?: "after-edit" | "stop" | "install";
  claudeSubcommand?: "after-edit" | "stop" | "install";
  cwd: string;
  configPath?: string;
  presets?: string[];
  verbose: boolean;
  lang?: string;
  color: boolean;
  help: boolean;
  strict: boolean;
  statsOutput?: string; // Output rule performance statistics to JSON file
  filePaths?: string[]; // File paths from lint-staged or similar tools
};

// Cursor hooks JSON types
type CursorHookData = {
  conversation_id: string;
  generation_id: string;
  hook_event_name: string;
  workspace_roots: string[];
  file_path?: string;
  edits?: Array<{ old_string: string; new_string: string }>;
  status?: "completed" | "aborted" | "error";
  loop_count?: number; // For stop hook: number of auto-followup messages already sent
};

function detectLangArg(argv: string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--lang" || a === "-l") {
      const code = argv[i + 1];
      // "auto" means follow the system language, exactly like omitting --lang
      return code === "auto" ? detectSystemLang() : code;
    }
  }
  return undefined;
}

function parseArgs(argv: string[], LL: TranslationFunctions): CliOptions {
  const defaultColor = Boolean(process.stdout.isTTY) && process.env.NO_COLOR == null;
  const opts: CliOptions = { command: "lint", cwd: process.cwd(), verbose: false, color: defaultColor, help: false, strict: false };
  const filePaths: string[] = [];
  
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a) continue;
    
    if (a === "init") {
      opts.command = "init";
      continue;
    }
    if (a === "cursor") {
      opts.command = "cursor";
      const subcommand = argv[i + 1];
      if (subcommand === "after-edit" || subcommand === "stop" || subcommand === "install") {
        opts.cursorSubcommand = subcommand;
        i++;
      }
      continue;
    }
    if (a === "claude") {
      opts.command = "claude";
      const subcommand = argv[i + 1];
      if (subcommand === "after-edit" || subcommand === "stop" || subcommand === "install") {
        opts.claudeSubcommand = subcommand;
        i++;
      }
      continue;
    }
    if (a === "update") {
      opts.command = "update";
      continue;
    }
    if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--verbose" || a === "-v") opts.verbose = true;
    else if (a === "--strict" || a === "-s") opts.strict = true;
    else if (a === "--stats-output") {
      const path = argv[i + 1];
      if (!path) throw new Error(String(LL.cli.error.missingStatsOutputValue()));
      opts.statsOutput = path;
      i++;
    }
    else if (a === "--lang" || a === "-l") {
      const code = argv[i + 1];
      const supportedLangs = `${locales.join(" / ")} / auto`;
      if (!code) throw new Error(String(LL.cli.error.missingLangValue({ supported: supportedLangs })));
      if (code === "auto") {
        // "auto" means use system language detection
        opts.lang = "auto";
      } else if (!isLocale(code)) {
        throw new Error(String(LL.cli.error.unsupportedLang({ code, supported: supportedLangs })));
      } else {
        opts.lang = code;
      }
      i++;
    }
    else if (a === "--no-color") opts.color = false;
    else if (a === "--config" || a === "-c") {
      const p = argv[i + 1];
      if (!p) throw new Error(String(LL.cli.error.missingConfigValue()));
      opts.configPath = p;
      i++;
    }
    else if (a === "--preset" || a === "-p") {
      const name = argv[i + 1];
      if (!name || name.startsWith("-")) throw new Error(String(LL.cli.error.missingPresetValue()));
      opts.presets = [...(opts.presets ?? []), name];
      i++;
    } else if (a && a.startsWith("-")) {
      // Unknown flag argument
      throw new Error(String(LL.cli.error.unknownArg({ arg: a })));
    } else if (a) {
      // File path from lint-staged or similar tools
      filePaths.push(a);
    }
  }
  
  if (filePaths.length > 0) {
    opts.filePaths = filePaths;
  }
  if (opts.presets?.length && opts.configPath) {
    throw new Error(String(LL.cli.error.presetAndConfig()));
  }
  
  return opts;
}

function printHelp(LL: TranslationFunctions): void {
  console.log(
    `${APP_NAME}

${String(LL.cli.help.commands())}
  init                  ${String(LL.cli.help.initCmdDesc())}
  update                ${String(LL.cli.help.updateCmdDesc())}
  cursor install        ${String(LL.cli.help.installCursorHookDesc())}
  claude install        ${String(LL.cli.help.installClaudeHookDesc())}

${String(LL.cli.help.options())}
  -c, --config <path>  ${String(LL.cli.help.configHint())}
  -p, --preset <name>  ${String(LL.cli.help.presetHint())}
  -v, --verbose        ${String(LL.cli.help.verboseHint())}
  -l, --lang <code>    ${String(LL.cli.help.langHint())}
  -s, --strict         ${String(LL.cli.help.strictHint())}
  --stats-output <path> ${String(LL.cli.help.statsHint())}
  --no-color           ${String(LL.cli.help.noColorHint())}
  -h, --help           ${String(LL.cli.help.helpHint())}
`,
  );
}

function findBuiltInPresetPath(name: string): string | null {
  // Keep consistent with parser.ts resolution:
  // Prod: /.../dist/cli.mjs -> /.../presets/name.chous
  // Dev:  /.../src/cli.ts  -> /.../presets/name.chous
  // Use fileURLToPath for cross-platform compatibility (Windows support)
  const selfDir = dirname(fileURLToPath(import.meta.url));
  const candidate = resolve(selfDir, "..", "presets", `${name}${APP_CONFIG_FILE_NAME}`);
  return existsSync(candidate) ? candidate : null;
}

/**
 * Resolve a localized template file under `templates/<lang>/`.
 * Prefers the template matching the UI language, falls back to the base locale
 * for languages without a template directory, and to the base locale's template
 * when a localized file is missing.
 */
function resolveLangTemplate(selfDir: string, fileName: string, lang: string): string | null {
  const templateLang = isLocale(lang) ? lang : baseLocale;
  const candidate = resolve(selfDir, "..", "templates", templateLang, fileName);
  if (existsSync(candidate)) return candidate;

  if (templateLang !== baseLocale) {
    const fallback = resolve(selfDir, "..", "templates", baseLocale, fileName);
    if (existsSync(fallback)) return fallback;
  }
  return null;
}

function findTemplatePath(lang: string): string | null {
  // Prod: /.../dist/cli.mjs -> /.../templates/lang/.chous
  // Dev:  /.../src/cli.ts  -> /.../templates/lang/.chous
  // Use fileURLToPath for cross-platform compatibility (Windows support)
  return resolveLangTemplate(dirname(fileURLToPath(import.meta.url)), APP_CONFIG_FILE_NAME, lang);
}

function findPromptTemplatePath(lang: string, promptType: "stop"): string | null {
  // Prod: /.../dist/cli.mjs -> /.../templates/lang/stop.prompt
  // Dev:  /.../src/cli.ts  -> /.../templates/lang/stop.prompt
  // Use fileURLToPath for cross-platform compatibility (Windows support)
  return resolveLangTemplate(dirname(fileURLToPath(import.meta.url)), `${promptType}.prompt`, lang);
}

function detectFrameworkPreset(cwd: string): "nuxt3" | "nuxt4" | "nextjs" | undefined {
  const nuxtConfigs = ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs", "nuxt.config.cjs"];
  if (nuxtConfigs.some((f) => existsSync(resolve(cwd, f)))) {
    // Read version from node_modules/nuxt/package.json
    const nuxtPackageJsonPath = resolve(cwd, "node_modules", "nuxt", "package.json");
    if (existsSync(nuxtPackageJsonPath)) {
      try {
        const nuxtPackageJson = JSON.parse(readFileSync(nuxtPackageJsonPath, "utf8"));
        const version = nuxtPackageJson.version;
        if (version) {
          // Check if version >= 4.0.0
          if (compare(version, "4.0.0", ">=")) {
            return "nuxt4";
          } else if (compare(version, "3.0.0", ">=")) {
            return "nuxt3";
          }
        }
      } catch {
        // If reading fails, fall back to nuxt4 (default)
      }
    }
    // Fallback to nuxt4 if version cannot be determined
    return "nuxt4";
  }

  const nextConfigs = ["next.config.ts", "next.config.js", "next.config.mjs", "next.config.mts", "next.config.cjs"];
  if (nextConfigs.some((f) => existsSync(resolve(cwd, f)))) return "nextjs";

  return undefined;
}

function detectJsPreset(cwd: string): boolean {
  // Detect JS/TS projects by checking for package.json or tsconfig.json/jsconfig.json
  return existsSync(resolve(cwd, "package.json")) || 
         existsSync(resolve(cwd, "tsconfig.json")) || 
         existsSync(resolve(cwd, "jsconfig.json"));
}

function detectGoPreset(cwd: string): boolean {
  // Detect Go projects by checking for go.mod
  return existsSync(resolve(cwd, "go.mod"));
}

function detectPythonPreset(cwd: string): boolean {
  // Detect Python projects by checking for common Python dependency management files
  return existsSync(resolve(cwd, "pyproject.toml")) ||
         existsSync(resolve(cwd, "setup.py")) ||
         existsSync(resolve(cwd, "requirements.txt")) ||
         existsSync(resolve(cwd, "Pipfile")) ||
         existsSync(resolve(cwd, "poetry.lock"));
}

/**
 * Detect the package manager of a JS/TS project from its lockfile.
 * Returns undefined when no known lockfile exists, so callers can skip reporting it.
 */
function detectPackageManager(cwd: string): "npm" | "pnpm" | "yarn" | "bun" | undefined {
  if (existsSync(resolve(cwd, "bun.lockb")) || existsSync(resolve(cwd, "bun.lock"))) return "bun";
  if (existsSync(resolve(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(resolve(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(resolve(cwd, "package-lock.json"))) return "npm";
  return undefined;
}

type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/**
 * Pick the package runner embedded into Cursor hooks.
 * bunx is faster and reuses local installs, but only exists when Bun is installed,
 * so fall back to npx for Node-only environments.
 */
function getRunnerCommand(): "bunx" | "npx" {
  try {
    // Bun is not typed here (no @types/bun), so probe it through globalThis
    const bun = (globalThis as { Bun?: { which?: (cmd: string) => string | null } }).Bun;
    if (typeof bun?.which === "function" && bun.which("bun")) {
      return "bunx";
    }
  } catch {
    // Ignore detection failures and fall back to npx
  }
  return "npx";
}

function installCursorHook(cwd: string, verbose: boolean = false): { code: number; installed: boolean } {
  const cursorDir = resolve(cwd, ".cursor");
  const hooksJsonPath = resolve(cursorDir, "hooks.json");

  // Create .cursor directory if it doesn't exist
  try {
    if (!existsSync(cursorDir)) {
      mkdirSync(cursorDir, { recursive: true });
    }
  } catch {
    // Ignore error, let writeFileSync handle it
  }

  // Read existing hooks.json if it exists
  let existingHooks: any = null;
  if (existsSync(hooksJsonPath)) {
    try {
      const content = readFileSync(hooksJsonPath, "utf8");
      existingHooks = JSON.parse(content);
    } catch (err: any) {
      if (verbose) {
        console.error(`Failed to read existing hooks.json: ${err.message}`);
      }
      // Continue with creating new file
    }
  }

  // Prepare chous hooks, preferring bunx when Bun is available
  const runner = getRunnerCommand();
  const chousAfterEditHook = {
    command: `${runner} ${APP_NAME} cursor after-edit -l auto`
  };
  const chousStopHook = {
    command: `${runner} ${APP_NAME} cursor stop -l auto`
  };

  // Merge with existing hooks or create new
  let hooksJson: any;
  if (existingHooks && existingHooks.hooks) {
    // Merge with existing hooks
    hooksJson = {
      version: existingHooks.version || 1,
      hooks: {
        ...existingHooks.hooks
      }
    };

    // Check if chous hooks already exist
    const afterFileEdit = hooksJson.hooks.afterFileEdit || [];
    const stop = hooksJson.hooks.stop || [];

    // Check if chous hooks are already installed with the expected runner
    const hasAfterEdit = Array.isArray(afterFileEdit) && afterFileEdit.some(
      (hook: any) => hook.command && 
        hook.command.includes(`${APP_NAME} cursor after-edit`) &&
        hook.command.startsWith(`${runner} `) &&
        hook.command.includes('-l auto')
    );
    const hasStop = Array.isArray(stop) && stop.some(
      (hook: any) => hook.command && 
        hook.command.includes(`${APP_NAME} cursor stop`) &&
        hook.command.startsWith(`${runner} `) &&
        hook.command.includes('-l auto')
    );

    if (hasAfterEdit && hasStop) {
      // Already installed with correct format
      return { code: 0, installed: false };
    }

    // Remove old chous hooks if they exist with wrong format
    const filteredAfterEdit = Array.isArray(afterFileEdit) 
      ? afterFileEdit.filter((hook: any) => 
          !hook.command || !hook.command.includes(`${APP_NAME} cursor after-edit`)
        )
      : [];
    const filteredStop = Array.isArray(stop)
      ? stop.filter((hook: any) => 
          !hook.command || !hook.command.includes(`${APP_NAME} cursor stop`)
        )
      : [];

    // Add chous hooks with correct format
    hooksJson.hooks.afterFileEdit = [...filteredAfterEdit, chousAfterEditHook];
    hooksJson.hooks.stop = [...filteredStop, chousStopHook];
  } else {
    // Create new hooks.json
    hooksJson = {
      version: 1,
      hooks: {
        afterFileEdit: [chousAfterEditHook],
        stop: [chousStopHook]
      }
    };
  }

  try {
    writeFileSync(hooksJsonPath, JSON.stringify(hooksJson, null, 2) + "\n", { encoding: "utf8" });
    return { code: 0, installed: true };
  } catch (err: any) {
    if (verbose) {
      console.error(`Failed to install Cursor hooks: ${err.message}`);
    }
    return { code: 1, installed: false };
  }
}

function findAutoDetectedPresetPath(cwd: string): { presetPath: string | null; presets: string[] } {
  const framework = detectFrameworkPreset(cwd);
  const hasJs = detectJsPreset(cwd);
  const hasGo = detectGoPreset(cwd);
  const hasPython = detectPythonPreset(cwd);
  const presets: string[] = ["basic"];
  
  // Import order: basic → language → framework
  if (hasJs) presets.push("js");
  if (hasGo) presets.push("go");
  if (hasPython) presets.push("python");
  if (framework) presets.push(framework);
  
  // If framework is detected, use framework preset file directly
  if (framework) {
    const presetPath = findBuiltInPresetPath(framework);
    if (presetPath) {
      return { presetPath, presets };
    }
  }
  
  // If no framework, detect language presets by priority
  if (hasGo) {
    const presetPath = findBuiltInPresetPath("go");
    if (presetPath) {
      return { presetPath, presets };
    }
  }
  
  if (hasPython) {
    const presetPath = findBuiltInPresetPath("python");
    if (presetPath) {
      return { presetPath, presets };
    }
  }
  
  if (hasJs && !framework) {
    const presetPath = findBuiltInPresetPath("js");
    if (presetPath) {
      return { presetPath, presets };
    }
  }
  
  // Finally fall back to basic
  const presetPath = findBuiltInPresetPath("basic");
  return { presetPath, presets };
}

function generateAutoDetectedConfig(cwd: string, lang: string): {
  content: string;
  presets: string[];
  framework: "nuxt3" | "nuxt4" | "nextjs" | undefined;
  packageManager: PackageManager | undefined;
} {
  const framework = detectFrameworkPreset(cwd);
  const packageManager = detectPackageManager(cwd);
  const hasJs = detectJsPreset(cwd);
  const hasGo = detectGoPreset(cwd);
  const hasPython = detectPythonPreset(cwd);
  const presets: string[] = ["basic"];
  // Import order: basic → language → framework
  if (hasJs) presets.push("js");
  if (hasGo) presets.push("go");
  if (hasPython) presets.push("python");
  if (framework) presets.push(framework);

  // Read template file
  const templatePath = findTemplatePath(lang);
  let content: string;
  
  if (templatePath) {
    // Read template content
    const templateContent = readFileSync(templatePath, "utf8");
    
    // Parse existing imports and their order in template
    const existingImports: string[] = [];
    const lines = templateContent.split("\n");
    const importLines: Array<{ preset: string; lineIndex: number }> = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const importMatch = line.match(/^import\s+(\w+)/);
      if (importMatch && importMatch[1]) {
        const preset = importMatch[1];
        existingImports.push(preset);
        importLines.push({ preset, lineIndex: i });
      }
    }
    
    // Define correct order: basic → language → framework
    const presetOrder: Record<string, number> = {
      basic: 0,
      js: 1,
      go: 1,
      python: 1,
      nextjs: 2,
      nuxt3: 2,
      nuxt4: 2,
    };
    
    // Package manager preset merged into js preset, remove old references
    const packageManagers = new Set(["npm", "pnpm", "yarn", "bun"]);
    const filteredExistingImports = existingImports.filter((p) => !packageManagers.has(p));
    
    const allPresets = new Set([...filteredExistingImports, ...presets]);
    const sortedPresets = Array.from(allPresets).sort((a, b) => {
      const orderA = presetOrder[a] ?? 999;
      const orderB = presetOrder[b] ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      // Keep original order within same group
      const indexA = presets.indexOf(a);
      const indexB = presets.indexOf(b);
      if (indexA >= 0 && indexB >= 0) return indexA - indexB;
      if (indexA >= 0) return -1;
      if (indexB >= 0) return 1;
      return a.localeCompare(b);
    });
    
    // Build new import section
    const newImportsSection = sortedPresets.map((p) => `import ${p}`).join("\n");
    
    if (importLines.length > 0) {
      // Replace import section in template
      const firstImport = importLines[0];
      const lastImport = importLines[importLines.length - 1];
      if (firstImport && lastImport) {
        const firstImportLine = firstImport.lineIndex;
        const lastImportLine = lastImport.lineIndex;
        const beforeImports = lines.slice(0, firstImportLine).join("\n");
        const afterImports = lines.slice(lastImportLine + 1).join("\n");
        content = beforeImports + (beforeImports ? "\n" : "") + newImportsSection + (afterImports ? "\n" + afterImports : "");
      } else {
        content = templateContent;
      }
    } else {
      // If no imports found, add at the beginning
      content = newImportsSection + "\n\n" + templateContent;
    }
  } else {
    // If template not found, fall back to original simple method
    content = presets.map((p) => `import ${p}`).join("\n") + "\n";
  }

  return { content, presets, framework, packageManager };
}

function installDetectedAgentHooks(LL: TranslationFunctions, cwd: string, quiet?: boolean): void {
  if (!existsSync(resolve(cwd, ".claude"))) return;
  const result = installClaudeHooks(cwd, getRunnerCommand());
  if (!quiet && result.code === 0 && result.installed) {
    console.log(String(LL.cli.initCmd.claudeHooksInstalled()));
    console.log(String(LL.cli.initCmd.installCredit()));
  }
}

function runInit(
  LL: TranslationFunctions,
  cwd: string,
  configPath: string,
  lang: string,
  opts?: { quiet?: boolean },
): { code: number; created: boolean; presets: string[]; hooksInstalled: boolean } {
  if (existsSync(configPath)) {
    if (!opts?.quiet) {
      console.log(String(LL.cli.initCmd.exists({ path: configPath })));
    }
    installDetectedAgentHooks(LL, cwd, opts?.quiet);
    return { code: 0, created: false, presets: [], hooksInstalled: false };
  }

  const { content, presets, framework, packageManager } = generateAutoDetectedConfig(cwd, lang);

  try {
    writeFileSync(configPath, content, { encoding: "utf8", flag: "wx" });
  } catch (err: any) {
    if (err && typeof err === "object" && (err as any).code === "EEXIST") {
      if (!opts?.quiet) {
        console.log(String(LL.cli.initCmd.exists({ path: configPath })));
      }
      return { code: 0, created: false, presets: [], hooksInstalled: false };
    }
    throw err;
  }

  installDetectedAgentHooks(LL, cwd, opts?.quiet);

  if (!opts?.quiet) {
    console.log(String(LL.cli.initCmd.created()));
    if (framework) {
      console.log(String(LL.cli.initCmd.detectedFramework({ name: framework })));
    }
    if (packageManager) {
      console.log(String(LL.cli.initCmd.detectedPackageManager({ name: packageManager })));
    }
    if (presets.length > 0) {
      console.log(String(LL.cli.initCmd.enabledPresets({ names: presets.join(", ") })));
    }
    console.log(String(LL.cli.initCmd.nextStep()));
  }

  return { code: 0, created: true, presets, hooksInstalled: false };
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    stdin.setEncoding("utf8");
    stdin.on("data", (chunk) => {
      data += chunk;
    });
    stdin.on("end", () => {
      resolve(data);
    });
    stdin.on("error", (err) => {
      reject(err);
    });
  });
}

async function handleCursorHook(
  subcommand: "after-edit" | "stop",
  opts: CliOptions,
  lang: string,
): Promise<void> {
  try {
    const stdinData = await readStdin();
    if (!stdinData.trim()) {
      // No data from stdin, exit silently
      return;
    }

    const hookData: CursorHookData = JSON.parse(stdinData);
    const workspaceRoots = hookData.workspace_roots || [opts.cwd];
    const editedFile = subcommand === "after-edit" && hookData.file_path && hookData.edits
      ? hookData.file_path
      : undefined;
    const checked = await checkWorkspaces({
      workspaceRoots,
      configPath: opts.configPath,
      strict: opts.strict,
      lang,
      editedFile,
    });

    // Handle output based on hook type
    if (subcommand === "after-edit") {
      // afterFileEdit: no output (as per Cursor hooks spec)
      // Issues are silently collected but not reported
      // User can run the app manually to see issues
      return;
    } else if (subcommand === "stop") {
      // stop: return JSON with followup_message if there are issues
      // Check loop_count to prevent infinite loops (max 5 auto-followups)
      const loopCount = hookData.loop_count ?? 0;
      if (checked.issues.length > 0 && loopCount < 5) {
        // Build the followup message using template
        // The template is self-contained: the Agent inspects the details by running the app with --verbose
        const promptTemplatePath = findPromptTemplatePath(lang, "stop");
        const issueLines = checked.issues.slice(0, 40).map((issue) => `- ${issue.displayPath}: ${issue.message}`).join("\n");
        const fallback = `Some file structure inconsistencies with the project rules were found.\n\n1. Fix the issues listed below\n2. Run \`${APP_NAME} --verbose\` and confirm there are no issues\n3. Do not claim the issues are fixed before that command passes`;
        let followupMessage = `${fallback}\n\n${issueLines}`;
        if (promptTemplatePath) {
          try {
            const template = readFileSync(promptTemplatePath, "utf8").trim();
            if (template) followupMessage = `${template}\n\n${issueLines}`;
          } catch {
            // Keep the English fallback above.
          }
        }
        
        // Output JSON format as required by Cursor hooks
        console.log(JSON.stringify({
          followup_message: followupMessage
        }));
      }
      // If no issues or loop_count >= 5, don't output anything (or empty JSON)
      return;
    }

    process.exitCode = 0;
  } catch (err) {
    // Silently fail for cursor hooks to avoid disrupting the workflow
    // Errors can be viewed in Cursor's hooks output channel
    if (opts.verbose) {
      console.error(err instanceof Error ? err.message : String(err));
    }
    process.exitCode = 0; // Don't fail the hook
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const preLang = detectLangArg(argv) ?? detectSystemLang();
  const { LL } = getLL(preLang);
  const opts = parseArgs(argv, LL);
  if (opts.help) {
    printHelp(LL);
    return;
  }

  const configPath = resolve(opts.cwd, opts.configPath ?? APP_CONFIG_FILE_NAME);
  if (opts.command === "init") {
    // If lang is "auto", use system language detection
    const lang = opts.lang === "auto" ? detectSystemLang() : (opts.lang ?? preLang);
    const r = runInit(LL, opts.cwd, configPath, lang);
    process.exitCode = r.code;
    return;
  }

  if (opts.command === "cursor" && opts.cursorSubcommand) {
    if (opts.cursorSubcommand === "install") {
      const result = installCursorHook(opts.cwd, opts.verbose);
      if (result.code === 0 && result.installed) {
        console.log(String(LL.cli.initCmd.cursorHooksInstalled()));
      }
      if (result.code === 0) console.log(String(LL.cli.initCmd.installCredit()));
      process.exitCode = result.code;
      return;
    }
    if (opts.cursorSubcommand === "after-edit" || opts.cursorSubcommand === "stop") {
      // If lang is "auto", use system language detection
      const lang = opts.lang === "auto" ? detectSystemLang() : (opts.lang ?? preLang);
      await handleCursorHook(opts.cursorSubcommand, opts, lang);
      return;
    }
  }

  if (opts.command === "claude" && opts.claudeSubcommand) {
    const lang = opts.lang === "auto" ? detectSystemLang() : (opts.lang ?? preLang);
    if (opts.claudeSubcommand === "install") {
      const result = installClaudeHooks(opts.cwd, getRunnerCommand());
      if (result.code === 0 && result.installed) {
        console.log(String(LL.cli.initCmd.claudeHooksInstalled()));
      }
      if (result.code === 0) console.log(String(LL.cli.initCmd.installCredit()));
      process.exitCode = result.code;
      return;
    }
    try {
      const output = await handleClaudeHook({
        subcommand: opts.claudeSubcommand,
        stdin: await readStdin(),
        cwd: opts.cwd,
        configPath: opts.configPath,
        strict: opts.strict,
        lang,
      });
      if (output) console.log(output);
    } catch (err) {
      if (opts.verbose) console.error(err instanceof Error ? err.message : String(err));
    }
    return;
  }

  if (opts.command === "update") {
    if (!existsSync(configPath)) {
      console.error(String(LL.cli.error.cannotReadRulesFile({ path: configPath })));
      process.exitCode = 2;
      return;
    }
    const result = await prefetchImports(configPath, { force: true });
    if (result.updated.length > 0) {
      console.log(String(LL.agent.updated({ count: result.updated.length })));
    } else {
      console.log(String(LL.agent.upToDate()));
    }
    for (const name of result.failed) {
      console.error(String(LL.agent.downloadFailed({ name })));
    }
    process.exitCode = result.failed.length > 0 && result.updated.length === 0 ? 1 : 0;
    return;
  }

  // Extract relevant directories from file paths (for lint-staged optimization)
  // However, if any config files (.chous or presets/*.chous) are modified,
  // we should check the entire project because rules may have changed
  let relevantDirs: Set<string> | undefined;
  if (opts.filePaths && opts.filePaths.length > 0) {
    // Check if any config files are in the file paths
    const hasConfigFile = opts.filePaths.some((filePath) => {
      const relPath = relative(opts.cwd, resolve(opts.cwd, filePath));
      return relPath === APP_CONFIG_FILE_NAME || 
             relPath.startsWith("presets/") && relPath.endsWith(APP_CONFIG_FILE_NAME);
    });
    
    // If config files are modified, disable optimization and check entire project
    if (hasConfigFile) {
      relevantDirs = undefined; // Check entire project
    } else {
      // Otherwise, only check relevant directories
      relevantDirs = new Set<string>();
      for (const filePath of opts.filePaths) {
        const absPath = resolve(opts.cwd, filePath);
        const relPath = relative(opts.cwd, absPath);
        // Extract all parent directories
        const parts = relPath.split(sep).filter(Boolean);
        for (let i = 0; i < parts.length; i++) {
          const dir = parts.slice(0, i + 1).join("/");
          if (dir !== ".") {
            relevantDirs.add(dir);
          }
        }
        // Also add parent directory if file is not at root
        if (parts.length > 1) {
          const parentDir = parts.slice(0, -1).join("/");
          if (parentDir !== ".") {
            relevantDirs.add(parentDir);
          }
        }
      }
      // Always include root for root-level rules
      relevantDirs.add(".");
    }
  }

  type RulesSource = { path: string; raw: string; autoDetected: boolean; trying?: string };

  async function resolvePresetSpec(spec: string): Promise<string | null> {
    if (spec.startsWith("npm:")) return resolveNpmPreset(spec.slice("npm:".length), resolve(opts.cwd, "package.json"));
    if (spec.startsWith("github:")) return (await ensureGithubCached(spec, false)).file;
    return findBuiltInPresetPath(spec);
  }

  function forceCwd(raw: string): string {
    if (/^\[where:/m.test(raw)) return raw;
    return `[where:cwd]\n${raw}`;
  }

  const sources: RulesSource[] = [];
  if (opts.presets?.length) {
    for (const name of opts.presets) {
      const presetPath = await resolvePresetSpec(name);
      if (!presetPath) {
        console.error(String(LL.errors.parser.unknownPreset({ name })));
        process.exitCode = 2;
        return;
      }
      sources.push({ path: presetPath, raw: forceCwd(readFileSync(presetPath, "utf8")), autoDetected: false, trying: name });
    }
  } else {
    let raw: string;
    let isAutoDetected = false;
    let actualConfigPath = configPath;
    try {
      raw = readFileSync(configPath, "utf8");
    } catch {
      const autoDetected = findAutoDetectedPresetPath(opts.cwd);
      if (autoDetected.presetPath) {
        actualConfigPath = autoDetected.presetPath;
        raw = forceCwd(readFileSync(actualConfigPath, "utf8"));
        isAutoDetected = true;
      } else {
        console.error(String(LL.cli.error.cannotReadRulesFile({ path: configPath })));
        process.exitCode = 2;
        return;
      }
    }
    sources.push({ path: actualConfigPath, raw, autoDetected: isAutoDetected });
  }

  let raw = sources[0]!.raw;
  let isAutoDetected = sources[0]!.autoDetected;
  let actualConfigPath = sources[0]!.path;
  let tryingPreset = sources[0]!.trying;

  const c = createColorizer({ enabled: opts.color });

  const visitedConfigs = new Set<string>();
  const visitedConfigRoot = new Set<string>(); // `${configPath}::${root}`
  let initMessages: string[] | undefined = tryingPreset
    ? [String(LL.cli.initCmd.usingPreset({ name: tryingPreset }))]
    : isAutoDetected
      ? [String(LL.cli.initCmd.suggestInit())]
      : undefined;

  async function runConfigGroup(groupConfigPath: string, forcedHeader: boolean, providedRaw?: string): Promise<number> {
    const absConfigPath = resolve(groupConfigPath);
    if (visitedConfigs.has(absConfigPath) && !forcedHeader) return 0;
    visitedConfigs.add(absConfigPath);

    let groupRaw: string;
    if (providedRaw !== undefined) {
      // Use provided raw content (for auto-detected config)
      groupRaw = providedRaw;
    } else {
      try {
        groupRaw = readFileSync(absConfigPath, "utf8");
      } catch {
        console.error(String(LL.cli.error.cannotReadRulesFile({ path: absConfigPath })));
        return 2;
      }
    }

    await prefetchImports(absConfigPath);
    // Check if config contains multiple groups (separated by ---)
    const configGroups = parseFsLintConfigGroups(groupRaw, absConfigPath);
    const groupDir = dirname(absConfigPath);

    // `-c <file>` names a rules file, not a project: without an explicit [where:],
    // lint the current directory. Delegated child configs keep their own directory.
    const whereFor = (groupConfig: import("./types").FsLintConfig): import("./types").WhereDirective => {
      const w = groupConfig.where;
      if (opts.presets?.length && !forcedHeader && w.type === "config") return { type: "cwd" };
      if (opts.configPath && !forcedHeader && w.type === "config" && w.implicit) return { type: "cwd" };
      return w;
    };
    
    // If multiple groups, process each one separately
    if (configGroups.length > 1) {
      let exit = 0;
      for (const groupConfig of configGroups) {
        const roots = await resolveWorkspaceRoots({ cwd: opts.cwd, configDir: groupDir, where: whereFor(groupConfig) });
        const groupExit = await processConfigGroup(groupConfig, roots, groupDir, absConfigPath, forcedHeader);
        if (groupExit !== 0) exit = Math.max(exit, groupExit);
      }
      return exit;
    }
    
    // Single config group (backward compatible)
    const groupConfig = configGroups[0]!;
    const roots = await resolveWorkspaceRoots({ cwd: opts.cwd, configDir: groupDir, where: whereFor(groupConfig) });
    return await processConfigGroup(groupConfig, roots, groupDir, absConfigPath, forcedHeader);
  }

  async function processConfigGroup(
    groupConfig: import("./types").FsLintConfig,
    roots: string[],
    groupDir: string,
    absConfigPath: string,
    forcedHeader: boolean
  ): Promise<number> {
    // Subdirectory config files: recursively find all config files in subdirectories
    // If a root has config file inside, use it (no longer use parent rules to lint that root)
    const delegated = new Set<string>();
    
    // Load .chousignore patterns from project root (cwd)
    const chousIgnorePatterns = await loadChousIgnorePatterns(opts.cwd);
    const chousIgnore = chousIgnorePatterns.length > 0 ? ignore().add(chousIgnorePatterns) : null;
    
    // An explicit `-c` owns the cwd root even if that directory has its own .chous.
    const presetMode = Boolean(opts.presets?.length);
    const isExplicitCwdRoot = (dir: string) =>
      (Boolean(opts.configPath) || presetMode) && !forcedHeader && resolve(dir) === resolve(opts.cwd);

    for (const root of roots) {
      if (presetMode) continue;
      // First check if root itself has config file (different from config file directory)
      const rootConfig = resolve(root, APP_CONFIG_FILE_NAME);
      if (rootConfig !== absConfigPath && existsSync(rootConfig) && !isExplicitCwdRoot(root)) {
        // Check if this config file is ignored by .chousignore
        const rootConfigRel = relative(opts.cwd, rootConfig);
        if (!chousIgnore || !chousIgnore.ignores(rootConfigRel)) {
          delegated.add(root);
        }
      }
      
        // Recursively find all config files in subdirectories
        const ignorePatterns = Array.from(DEFAULT_IGNORE_DIRS).map((d) => `**/${d}/**`);
        try {
        const childConfigs = await glob(`**/${APP_CONFIG_FILE_NAME}`, {
          cwd: root,
          absolute: true,
          dot: true,
          onlyFiles: true,
          ignore: ignorePatterns,
        });
        
        for (const childConfigPath of childConfigs) {
          const absChildConfig = resolve(String(childConfigPath));
          if (absChildConfig !== absConfigPath) {
            // Check if this config file is ignored by .chousignore
            const childConfigRel = relative(opts.cwd, absChildConfig);
            if (chousIgnore && chousIgnore.ignores(childConfigRel)) {
              continue;
            }
            
            const childDir = dirname(absChildConfig);
            if (isExplicitCwdRoot(childDir)) continue;
            // Ensure subdirectory is actually a directory
            try {
              const stats = await stat(childDir);
              if (stats.isDirectory()) {
                delegated.add(childDir);
              }
            } catch {
              // Ignore inaccessible directories
            }
          }
        }
      } catch {
        // Ignore glob errors (e.g., permission issues)
      }
    }

    const directRoots = roots.filter((r) => !delegated.has(r));
    const multi = forcedHeader || roots.length > 1 || delegated.size > 0;
   
    if (multi) {
      console.log(String(LL.meta.rulesFile({ path: absConfigPath })) + "\n");
    }

    let exit = 0;
    for (const root of directRoots) {
      const key = `${absConfigPath}::${root}`;
      if (visitedConfigRoot.has(key)) continue;
      visitedConfigRoot.add(key);

      // Calculate relevant directories for this root
      let rootRelevantDirs: Set<string> | undefined;
      if (relevantDirs) {
        rootRelevantDirs = new Set<string>();
        for (const dir of relevantDirs) {
          const dirAbs = resolve(opts.cwd, dir);
          const rootRel = relative(root, dirAbs);
          // If the directory is within this root, include it
          if (!rootRel.startsWith("..") && !rootRel.startsWith("/")) {
            rootRelevantDirs.add(rootRel === "" ? "." : rootRel);
          }
        }
        // Always include root for root-level rules
        rootRelevantDirs.add(".");
      }
      
      let result = await lintWorkspace({ 
        root, 
        config: groupConfig, 
        configPath: absConfigPath, 
        strict: opts.strict,
        relevantDirs: rootRelevantDirs
      });
      
      const rel = relative(groupDir, root).split("\\").join("/");
      const label = rel && rel !== "" ? rel : groupDir.split("/").pop() ?? ".";

      const report = renderReport(result, {
        verbose: opts.verbose,
        color: c,
        LL,
        showHeader: !multi,
        showMeta: !multi,
        rootLabel: multi ? label : undefined,
        initMessages: !multi && initMessages ? initMessages : undefined,
        version: VERSION,
      });
      console.log(report + "\n");
      
      // Write statistics to JSON file if requested
      if (opts.statsOutput) {
        writeStatsJson(result, opts.statsOutput);
      }
      
      if (result.issues.length !== 0) exit = 1;
    }

    for (const root of delegated) {
      const childConfig = resolve(root, APP_CONFIG_FILE_NAME);
      const childExit = await runConfigGroup(childConfig, true);
      if (childExit !== 0) exit = Math.max(exit, childExit);
    }
    
    return exit;
  }

  let overallExit = 0;
  for (const source of sources) {
    raw = source.raw;
    isAutoDetected = source.autoDetected;
    actualConfigPath = source.path;
    tryingPreset = source.trying;
    initMessages = tryingPreset
      ? [String(LL.cli.initCmd.usingPreset({ name: tryingPreset }))]
      : isAutoDetected
        ? [String(LL.cli.initCmd.suggestInit())]
        : undefined;
    const code = await runConfigGroup(actualConfigPath, false, source.autoDetected || source.trying ? raw : undefined);
    if (code !== 0) overallExit = Math.max(overallExit, code);
  }

  process.exitCode = overallExit;
}

main().catch((err) => {
  const argv = process.argv.slice(2);
  const preLang = detectLangArg(argv) ?? detectSystemLang();
  const { LL } = getLL(preLang);
  if (isFsLintError(err)) console.error(formatFsLintError(LL, err));
  else console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 2;
});

