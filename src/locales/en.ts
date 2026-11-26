import { absentMessages, depMessages, eolMessages, factMessages } from "../facts";

/** English messages. The source of truth: every other locale mirrors these keys. */
export default {
  app: {
    by: "by",
  },
  cli: {
    help: {
      tagline: "an opinionated taste linter. No config.",
      noCommand: "(no command)",
      commands: "Commands:",
      lintCmdDesc: "Lint the current directory",
      scanCmdDesc: "Find git repos below a directory and lint each",
      manifestoCmdDesc: "Print the taste chous stands for (for you and your agent)",
      installCursorHookDesc: "Install Cursor hooks for automatic linting",
      installClaudeHookDesc: "Install Claude Code hooks for automatic linting",
      options: "Options:",
      langHint: "Set output language (default: auto)",
      jsonHint: "Findings as JSON, for agents",
      verboseHint: "List every finding, with the reason behind it",
      noColorHint: "Disable colored output",
      helpHint: "Show help",
    },
    error: {
      missingLangValue: "Missing value for --lang (supported: {{supported}})",
      unsupportedLang: "Unsupported language: {{code}} (supported: {{supported}})",
      unknownArg: "Unknown argument: {{arg}}",
    },
    install: {
      cursorHooksInstalled: "Cursor hooks installed",
      claudeHooksInstalled: "Claude Code hooks installed",
      credit: "chous · https://github.com/cheezone/chous",
    },
  },
  scan: {
    issues: "issues ({{count}})",
  },
  meta: {
    taste: "Taste: {{names}}",
    performance: "Scanned {{fileCount}} files in {{duration}}ms",
    workspacePackages: "workspace packages: {{count}}",
  },
  agent: {
    intro: "chous found taste problems in this repository: things that smell, and things to look at.",
    fix: "Fix every smell, then run `chous --verbose` and confirm it reports none; do not say they are fixed before that. For each item to review, look at the file, decide whether it should stay, and say what you decided. `chous manifesto` explains the taste.",
    reason: "Why: {{reason}}",
    smells: "Smells (fix them):",
    review: "To review (decide):",
  },
  report: {
    found: "Smells: {{smells}} · to review: {{reviews}}",
    noIssues: "Nothing smells",
    moreHidden: "… and {{count}} more (add --verbose to see all)",
    reason: "({{reason}})",
    source: "source: {{url}}",
    arrow: "→",
    review: "To review: chous knows the fact, not the purpose. You or your agent decide.",
    scope: "Taste only: correctness, security and tests are not checked.",
    value: {
      modernity: "Modernity",
      order: "Order",
      convention: "Convention",
      cleanliness: "Cleanliness",
    },
  },
  issue: {
    no: {
      because: "not allowed: {{reason}}",
    },
    deps: {
      obsolete: "{{name}}: {{why}} → {{use}}",
      deprecated: "{{name}} {{version}}, deprecated by its authors on npm: “{{message}}”",
    },
    manifest: {
      remove: "remove \"{{field}}\": {{reason}}",
    },
    workspace: {
      drift: "{{name}} is on several major versions ({{versions}}), so it gets installed twice",
      listsDiffer: "package.json lists {{json}}, pnpm-workspace.yaml lists {{yaml}}: one fact said twice, and the two disagree",
    },
    leftover: {
      installer: "an installer in the source tree: built things belong in releases, and git keeps every version of them forever",
      executable: "a compiled executable or library: if this project builds it, it belongs in releases; if a build reads it, keep it",
      ignoredTracked: "{{count}} committed file(s) that .gitignore ignores: untrack them with `git rm --cached`, or unignore them with a `!` pattern",
      rootDocs: "{{count}} docs at the root besides README, LICENSE and the like ({{names}}): the root is an entrance, keep at most {{limit}} and move the rest into docs/",
    },
    contract: {
      ...factMessages("en"),
    },
    twins: {
      case: "same name as {{other}} except for case; macOS and Windows keep only one of them on checkout",
      unicode: "same name as {{other}}, its accents written in another Unicode form; macOS keeps only one of them on checkout",
      styles: "mixes {{styles}} names ({{examples}}); one directory, one way of naming",
    },
    measure: {
      longFiles: "{{count}} source files over {{limit}} lines ({{files}}): whether one holds too many jobs is for you or your agent to judge; never split mechanically",
      flatDirs: "{{count}} directories hold more than {{limit}} source files each ({{dirs}}): is each one a single concern?",
      crowdedRoot: "{{count}} files at the root, more than {{limit}}: the root is an entrance",
      copies: "{{count}} sets of identical files ({{groups}}): keep one, link to it, or say why there are several",
      instructions: "{{lines}} lines of agent instructions (more than {{limit}}): an agent reads all of it whenever it works here; keep what applies every time, move the rest where it is needed",
      hugeFile: "{{size}} MiB: GitHub warns above 50 MiB and rejects files of 100 MiB; use Git LFS or releases",
    },
    leak: {
      artifact: "build output that is not gitignored, so it gets committed",
      cache: "a cache directory, by its own CACHEDIR.TAG: the tool rebuilds it; gitignore it",
      venv: "a Python virtual environment (pyvenv.cfg): Python's docs say it is not checked into source control",
      cmake: "a CMake build tree (CMakeCache.txt): build output, not source; gitignore it",
      tsbuildinfo: "TypeScript's incremental build state: tsc writes it on every build; gitignore it",
    },
    lifecycle: {
      ended: "{{name}} reached end of life on {{date}} → {{use}}",
      unsupported: "{{name}} is no longer supported, by its makers' own word → {{use}}",
      declared: "engines.node allows only {{versions}}, all past end of life (the last on {{date}}) → {{use}}",
    },
  },
  reason: {
    ...absentMessages("en"),
    chousConfig: "chous has no config, delete it",
    osJunk: "OS junk, delete it and gitignore it",
    coreDump: "a crash dump the operating system wrote (ELF core file); delete it",
    nestedLockfile: "one lockfile, at the workspace root",
    nestedPackageManager: "set it once, in the workspace root",
    localProperties: "machine-specific Android SDK path; the file's own header says it must NOT be checked in",
  },
  dep: depMessages("en"),
  eol: eolMessages("en"),
} as const;
