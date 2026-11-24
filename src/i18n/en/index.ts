import { APP_NAME } from '../../constants'

const en = {
	app: {
		title: APP_NAME,
		by: 'by',
	},
	cli: {
		help: {
			tagline: 'an opinionated taste linter. No config.',
			commands: 'Commands:',
			lintCmdDesc: 'Lint the current directory',
			scanCmdDesc: 'Find git repos and show detected kinds and stack roles',
			knowledgeCmdDesc: 'Dump built-in stack knowledge as JSON',
			installCursorHookDesc: 'Install Cursor hooks for automatic linting',
			installClaudeHookDesc: 'Install Claude Code hooks for automatic linting',
			options: 'Options:',
			langHint: 'Set output language (default: auto)',
			verboseHint: 'Show full filesystem tree',
			fixHint: 'Apply safe automatic fixes',
			failOnWarningsHint: 'Exit with error if there are warnings',
			ignoreWarningsHint: 'Report errors only (hide warnings)',
			noColorHint: 'Disable colored output',
			helpHint: 'Show help',
		},
		error: {
			missingLangValue: 'Missing value for --lang (supported: {supported})',
			unsupportedLang: 'Unsupported language: {code} (supported: {supported})',
			conflictIgnoreAndFailWarnings: '--ignore-warnings and --fail-on-warnings cannot be used together',
			unknownArg: 'Unknown argument: {arg}',
		},
		install: {
			cursorHooksInstalled: 'Cursor hooks installed',
			claudeHooksInstalled: 'Claude Code hooks installed',
			credit: 'chous · https://github.com/cheezone/chous',
		},
	},
	meta: {
		taste: 'Taste: {names}',
		lang: 'Language: English',
		mode: 'Mode: {mode}',
		performance: 'Scanned {fileCount} files in {duration}ms',
		workspacePackages: 'workspace packages: {count}',
	},
	agent: {
		intro: 'chous found problems with files and dependencies.',
		fix: 'Fix the issues below, then run `chous --verbose` and confirm they are gone. Do not claim they are fixed before that command reports no issues.',
		reason: 'Why: {reason}',
		fixHint: 'Safe fix: {fix}',
		see: 'See: {url}',
		autoSection: 'Safe to run `chous --fix`:',
		agentSection: 'Needs you (or an agent) to migrate:',
		infoSection: 'FYI:',
	},
	mode: {
		concise: 'concise',
		verbose: 'verbose',
	},
	report: {
		foundIssues: 'Found {count} issues',
		foundErrorsAndWarnings: 'Found {errors} errors, {warnings} warnings',
		foundIssuesWithHint: 'Found {count} issues (add `--verbose` flag for details)',
		noIssues: 'No issues found',
		fixable: '[fixable]',
		reason: '({reason})',
		fixedCount: 'Auto-fixed {count} issue(s)',
		arrow: '→',
		foundRequiredDir: 'found required directory: {dir}',
		foundRequiredFile: 'found required file: {name}',
		missingRequiredDir: 'missing required directory: {dir}',
		ellipsis: '...',
		workspace: 'workspace: {root}',
		whitelist: 'Whitelist',
		blacklist: 'Blacklist',
		listSep: ', ',
		andMoreItems: 'and {count} more items',
	},
	issue: {
		move: {
			shouldMoveToDir: 'should be moved to {dir}',
			destDirMustExist: 'required directory missing (for move {from} to {toDir})',
			destMustBeDir: 'target must be a directory (for move {from} to {toDir})',
			unsafeManual: 'should be moved to {dir} (manual action required)',
		},
		thoseOnly: {
			forbiddenOnlyAllowed: 'not in allow list',
			forbiddenTooMany: 'not in allow list',
		},
		renameDir: {
			shouldRenameTo: 'should be renamed to {to}',
			shouldMigrateTo: 'should be migrated to {to} (target exists)',
			removeEmptyDir: '{dir} is empty and can be removed (target {to} exists)',
		},
		renameGlob: {
			shouldRenameTo: 'should be renamed to {to}',
			targetExistsManual: 'should be renamed to {to} (target exists)',
			cannotInferTarget: 'should be renamed (cannot infer target)',
		},
		inDirOnly: {
			dirMustExist: 'directory must exist (only {only})',
			forbiddenOnlyAllowed: 'not in allow list ({dir} allows only {only})',
			forbiddenTooMany: 'not in allow list',
		},
		no: {
			forbidden: 'hit blacklist ({name})',
		},
		has: {
			mustExist: 'file not found (required: {name})',
		},
		packageManager: {
			wrong: 'package manager should be {expected} (found {actual})',
			missing: 'package manager should be {expected}',
		},
		deps: {
			missing: 'missing dependency {name}',
			forbidden: 'dependency {name} is not allowed',
			obsolete: 'dependency {name} is obsolete → {use}',
		},
		replaceDep: {
			replace: 'replace dependency {from} with {to}',
		},
		role: {
			mismatch: '{role} should be {expected} (found {actual})',
			missing: '{role} should be {expected}',
			deprecated: '{tool} is deprecated',
		},
		merged: {
			notInAllowList: 'not in allow list ({labels})',
			inBlockList: 'hit blacklist ({labels})',
		},
		naming: {
			invalid: 'should be {style}',
			invalidPrefix: 'prefix should be {pattern}',
			invalidSuffix: 'suffix should be {pattern}',
		},
	},
} as const

export default en
