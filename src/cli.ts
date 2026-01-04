#!/usr/bin/env node
import { dirname, relative, resolve, sep } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stdin } from "node:process";
import { parseFsLintConfig, parseFsLintConfigGroups } from "./parser";
import { lintWorkspace } from "./lint";
import { renderReport } from "./report";
import { createColorizer } from "./color";
import { formatIssueMessage } from "./report";
import { getLL } from "./i18n/runtime";
import type { TranslationFunctions } from "./i18n/i18n-types";
import { isLocale, locales } from "./i18n/i18n-util";
import { resolveWorkspaceRoots } from "./where";
import { formatFsLintError, isFsLintError } from "./errors";
import { detectSystemLang } from "./runtime";
import { fileURLToPath } from "node:url";
import { glob } from "tinyglobby";
import { DEFAULT_IGNORE_DIRS, loadChousIgnorePatterns } from "./fsutil";
import { stat } from "node:fs/promises";
import { APP_NAME, APP_CONFIG_FILE_NAME } from "./constants";
import ignore from "ignore";

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf8"));
const VERSION = packageJson.version;

type CliOptions = {
  command: "lint" | "init" | "cursor";
  cursorSubcommand?: "after-edit" | "stop" | "install";
  cwd: string;
  configPath?: string;
  verbose: boolean;
  lang?: string;
  color: boolean;
  help: boolean;
  strict: boolean;
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
    if (a === "--lang" || a === "-l") return argv[i + 1];
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
    if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--verbose" || a === "-v") opts.verbose = true;
    else if (a === "--strict" || a === "-s") opts.strict = true;
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
  
  return opts;
}

function printHelp(LL: TranslationFunctions): void {
  console.log(
    `${APP_NAME}

${String(LL.cli.help.commands())}
  init                  ${String(LL.cli.help.initCmdDesc())}
  cursor install        ${String(LL.cli.help.installCursorHookDesc())}

${String(LL.cli.help.options())}
  -c, --config <path>  ${String(LL.cli.help.configHint())}
  -v, --verbose        ${String(LL.cli.help.verboseHint())}
  -l, --lang <code>    ${String(LL.cli.help.langHint())}
  -s, --strict         ${String(LL.cli.help.strictHint())}
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

function findTemplatePath(lang: string): string | null {
  // Prod: /.../dist/cli.mjs -> /.../templates/lang/.chous
  // Dev:  /.../src/cli.ts  -> /.../templates/lang/.chous
  // Use fileURLToPath for cross-platform compatibility (Windows support)
  const selfDir = dirname(fileURLToPath(import.meta.url));
  // Supported languages use corresponding template, other languages default to English template
  const templateLang = (lang === "zh") ? "zh" : "en";
  const candidate = resolve(selfDir, "..", "templates", templateLang, APP_CONFIG_FILE_NAME);
  return existsSync(candidate) ? candidate : null;
}

function findPromptTemplatePath(lang: string, promptType: "stop"): string | null {
  // Prod: /.../dist/cli.mjs -> /.../templates/lang/stop.prompt
  // Dev:  /.../src/cli.ts  -> /.../templates/lang/stop.prompt
  // Use fileURLToPath for cross-platform compatibility (Windows support)
  const selfDir = dirname(fileURLToPath(import.meta.url));
  
  // List of supported languages
  const supportedLangs = ["zh", "en", "es", "pt-BR", "de", "fr", "ja", "ko"];
  
  // First try to use the specified language
  if (supportedLangs.includes(lang)) {
    const candidate = resolve(selfDir, "..", "templates", lang, `${promptType}.prompt`);
    if (existsSync(candidate)) return candidate;
  }
  
  // If not found, fall back to English template
  const enCandidate = resolve(selfDir, "..", "templates", "en", `${promptType}.prompt`);
  return existsSync(enCandidate) ? enCandidate : null;
}

function detectFrameworkPreset(cwd: string): "nuxt4" | "nextjs" | undefined {
  const nuxtConfigs = ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs", "nuxt.config.cjs"];
  if (nuxtConfigs.some((f) => existsSync(resolve(cwd, f)))) return "nuxt4";

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

  // Prepare chous hooks
  const chousAfterEditHook = {
    command: `npx ${APP_NAME} cursor after-edit -l auto`
  };
  const chousStopHook = {
    command: `npx ${APP_NAME} cursor stop -l auto`
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

    // Check if chous hooks are already installed with correct format (npx and -l auto)
    const hasAfterEdit = Array.isArray(afterFileEdit) && afterFileEdit.some(
      (hook: any) => hook.command && 
        hook.command.includes(`${APP_NAME} cursor after-edit`) &&
        hook.command.includes('npx') &&
        hook.command.includes('-l auto')
    );
    const hasStop = Array.isArray(stop) && stop.some(
      (hook: any) => hook.command && 
        hook.command.includes(`${APP_NAME} cursor stop`) &&
        hook.command.includes('npx') &&
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

function generateAutoDetectedConfig(cwd: string, lang: string): { content: string; presets: string[] } {
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
      ts: 1,
      go: 1,
      python: 1,
      nextjs: 2,
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

  return { content, presets };
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
    return { code: 0, created: false, presets: [], hooksInstalled: false };
  }

  const { content, presets } = generateAutoDetectedConfig(cwd, lang);

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
  LL: TranslationFunctions,
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

    // For after-edit, we can optimize by only checking directories containing edited files
    let relevantDirs: Set<string> | undefined;
    if (subcommand === "after-edit" && hookData.file_path && hookData.edits) {
      relevantDirs = new Set<string>();
      // file_path from Cursor can be absolute or relative path
      let filePath = hookData.file_path;
      
      // Find which workspace root this file belongs to
      for (const root of workspaceRoots) {
        // If file_path is relative, resolve it relative to workspace root
        // If it's absolute, use it directly
        const absFilePath = filePath.startsWith("/") || filePath.startsWith("\\") 
          ? filePath 
          : resolve(root, filePath);
        
        const relPath = relative(root, absFilePath);
        // If the file is within this workspace root
        if (!relPath.startsWith("..") && !relPath.startsWith("/")) {
          const parts = relPath.split(sep).filter(Boolean);
          for (let i = 0; i < parts.length; i++) {
            const dir = parts.slice(0, i + 1).join("/");
            if (dir !== ".") {
              relevantDirs.add(dir);
            }
          }
          // Also add parent directory
          if (parts.length > 1) {
            const parentDir = parts.slice(0, -1).join("/");
            if (parentDir !== ".") {
              relevantDirs.add(parentDir);
            }
          }
          // Always include root for root-level rules
          relevantDirs.add(".");
          break; // File can only belong to one workspace root
        }
      }
    }

    // Run lint for each workspace root
    createColorizer({ enabled: opts.color });
    const allIssues: Array<{ root: string; issues: any[] }> = [];
    const configPaths = new Set<string>(); // Collect all config paths for reference

    for (const root of workspaceRoots) {
      const configPath = resolve(root, opts.configPath ?? APP_CONFIG_FILE_NAME);
      
      if (!existsSync(configPath)) {
        // Skip if no config file exists
        continue;
      }

      configPaths.add(configPath);

      let raw: string;
      try {
        raw = readFileSync(configPath, "utf8");
      } catch {
        continue;
      }

      const config = parseFsLintConfig(raw, configPath);
      const configDir = dirname(configPath);
      const roots = await resolveWorkspaceRoots({ cwd: root, configDir, where: config.where });

      for (const workspaceRoot of roots) {
        // Calculate relevant directories for this root
        let rootRelevantDirs: Set<string> | undefined;
        if (relevantDirs) {
          rootRelevantDirs = new Set<string>();
          for (const dir of relevantDirs) {
            // dir is relative to workspace root, check if it's within this workspaceRoot
            const dirAbs = resolve(root, dir);
            const rootRel = relative(workspaceRoot, dirAbs);
            if (!rootRel.startsWith("..") && !rootRel.startsWith("/")) {
              rootRelevantDirs.add(rootRel === "" ? "." : rootRel);
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

        if (result.issues.length > 0) {
          allIssues.push({ root: workspaceRoot, issues: result.issues });
        }
      }
    }

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
      if (allIssues.length > 0 && loopCount < 5) {
        // Collect all issues with their details
        const issueDetails: string[] = [];
        for (const { issues } of allIssues) {
          for (const issue of issues) {
            const issueMsg = formatIssueMessage(LL, issue.message);
            // Use displayPath (relative path) for better readability
            issueDetails.push(`- \`${issue.displayPath}\`: ${issueMsg}`);
          }
        }
        
        // Build config file references (relative to workspace roots for readability)
        const configRefs: string[] = [];
        for (const configPath of configPaths) {
          // Find the workspace root this config belongs to
          for (const root of workspaceRoots) {
            if (configPath.startsWith(root)) {
              const relConfigPath = relative(root, configPath);
              configRefs.push(relConfigPath === APP_CONFIG_FILE_NAME ? APP_CONFIG_FILE_NAME : relConfigPath);
              break;
            }
          }
        }
        
        // Build the followup message using template (no need to include issue details, Agent will run the app --verbose)
        // Try to load prompt template
        const promptTemplatePath = findPromptTemplatePath(lang, "stop");
        let followupMessage: string;
        
        if (promptTemplatePath) {
          try {
            const template = readFileSync(promptTemplatePath, "utf8");
            // No placeholders to replace - template is self-contained
            followupMessage = template;
          } catch {
            // Fallback to English message if template read fails
            followupMessage = `Cheez Lin reminds you: Some file structure inconsistencies with current conventions have been detected. Please review and decide whether adjustments are needed based on your project design goals.\n\n**Please follow these steps**:\n1. Run \`${APP_NAME} --verbose\` to see specific issue details and fix suggestions\n2. Decide how to fix based on the actual situation\n3. **After fixing, you MUST run \`${APP_NAME} --verbose\` to verify all issues are resolved**\n\n**Please start your reply with "Thanks Cheez!"**`;
          }
        } else {
          // Fallback to English message if template not found
          followupMessage = `Cheez Lin reminds you: Some file structure inconsistencies with current conventions have been detected. Please review and decide whether adjustments are needed based on your project design goals.\n\n**Please follow these steps**:\n1. Run \`${APP_NAME} --verbose\` to see specific issue details and fix suggestions\n2. Decide how to fix based on the actual situation\n3. **After fixing, you MUST run \`${APP_NAME} --verbose\` to verify all issues are resolved**\n\n**Please start your reply with "Thanks Cheez!"**`;
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
      process.exitCode = result.code;
      return;
    }
    if (opts.cursorSubcommand === "after-edit" || opts.cursorSubcommand === "stop") {
      // If lang is "auto", use system language detection
      const lang = opts.lang === "auto" ? detectSystemLang() : (opts.lang ?? preLang);
      await handleCursorHook(opts.cursorSubcommand, opts, LL, lang);
      return;
    }
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

  let raw: string;
  let isAutoDetected = false;
  let actualConfigPath = configPath;
  try {
    raw = readFileSync(configPath, "utf8");
  } catch {
    // Missing rules file: auto-detect project type and use preset file directly
    const autoDetected = findAutoDetectedPresetPath(opts.cwd);
    if (autoDetected.presetPath) {
      actualConfigPath = autoDetected.presetPath;
      raw = readFileSync(actualConfigPath, "utf8");
      isAutoDetected = true;
      
      // Ensure workspace root is cwd, not preset file directory
      // Add [where:cwd] directive if not present
      if (!raw.match(/^\[where:/m)) {
        raw = "[where:cwd]\n" + raw;
      }
    } else {
      // Fallback: cannot find any preset, report error
      console.error(String(LL.cli.error.cannotReadRulesFile({ path: configPath })));
      process.exitCode = 2;
      return;
    }
  }

  const c = createColorizer({ enabled: opts.color });

  const visitedConfigs = new Set<string>();
  const visitedConfigRoot = new Set<string>(); // `${configPath}::${root}`
  let totalFileCount = 0;
  const initMessages: string[] | undefined = isAutoDetected 
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

    // Check if config contains multiple groups (separated by ---)
    const configGroups = parseFsLintConfigGroups(groupRaw, absConfigPath);
    const groupDir = dirname(absConfigPath);
    
    // If multiple groups, process each one separately
    if (configGroups.length > 1) {
      let exit = 0;
      for (const groupConfig of configGroups) {
        const roots = await resolveWorkspaceRoots({ cwd: opts.cwd, configDir: groupDir, where: groupConfig.where });
        const groupExit = await processConfigGroup(groupConfig, roots, groupDir, absConfigPath, forcedHeader);
        if (groupExit !== 0) exit = Math.max(exit, groupExit);
      }
      return exit;
    }
    
    // Single config group (backward compatible)
    const groupConfig = configGroups[0]!;
    const roots = await resolveWorkspaceRoots({ cwd: opts.cwd, configDir: groupDir, where: groupConfig.where });
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
    
    for (const root of roots) {
      // First check if root itself has config file (different from config file directory)
      const rootConfig = resolve(root, APP_CONFIG_FILE_NAME);
      if (rootConfig !== absConfigPath && existsSync(rootConfig)) {
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
      
      // Accumulate file count
      if (result.fileCount !== undefined) {
        totalFileCount += result.fileCount;
      }

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
      if (result.issues.length !== 0) exit = 1;
    }

    for (const root of delegated) {
      const childConfig = resolve(root, APP_CONFIG_FILE_NAME);
      const childExit = await runConfigGroup(childConfig, true);
      if (childExit !== 0) exit = Math.max(exit, childExit);
    }
    
    // Note: File count is already accumulated inside runConfigGroup, no additional processing needed here

    return exit;
  }

  const overallExit = await runConfigGroup(actualConfigPath, false, isAutoDetected ? raw : undefined);

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

