import type { Translation } from '../i18n-types.js'
import { APP_NAME, APP_CONFIG_FILE_NAME } from '../../constants'

const en = {
	app: {
		title: APP_NAME,
		by: 'by',
	},
	cli: {
		help: {
			commands: 'Commands:',
			initCmdDesc: `Create a new ${APP_CONFIG_FILE_NAME} rules file`,
			installCursorHookDesc: 'Install Cursor hooks for automatic linting',
			options: 'Options:',
			langHint: 'Set output language (default: auto)',
			verboseHint: 'Show full filesystem tree (mode: verbose)',
			configHint: `Specify rules file (default: ./${APP_CONFIG_FILE_NAME})`,
			strictHint: 'Enable strict mode for all directory-only rules',
			statsHint: 'Output rule performance statistics to JSON file',
			noColorHint: 'Disable colored output',
			helpHint: 'Show help',
		},
		error: {
			missingLangValue: 'Missing value for --lang (supported: {supported})',
			unsupportedLang: 'Unsupported language: {code} (supported: {supported})',
			missingConfigValue: 'Missing value for --config',
			missingStatsOutputValue: 'Missing value for --stats-output',
			unknownArg: 'Unknown argument: {arg}',
			cannotReadRulesFile: 'Cannot read rules file: {path}',
		},
		initCmd: {
			created: 'Created rules file',
			exists: 'Rules file already exists, skipped: {path}',
			detectedFramework: 'Detected framework: {name}',
			detectedPackageManager: 'Detected package manager: {name}',
			enabledPresets: 'Enabled presets: {names}',
			nextStep: `Next: run ${APP_NAME}`,
			cursorHooksInstalled: 'Cursor hooks installed',
			suggestInit: `💡 Tip: No ${APP_CONFIG_FILE_NAME} config file found. Auto-detected project type and used preset rules. Run \`${APP_NAME} init\` to create a config file for custom rules.`,
			configHint: '💡 Tip: Please read the `{configPath}` file to understand the specific rules (whitelist, blacklist, etc.), which will help you understand why these files don\'t meet the requirements and how to fix them.',
		},
	},
	meta: {
		rulesFile: 'Rules file: {path}',
		importedRules: 'Imported rules: {path}',
		lang: 'Language: English',
		mode: 'Mode: {mode}',
		performance: 'Scanned {fileCount} files in {duration}ms',
	},
	mode: {
		concise: 'concise',
		verbose: 'verbose',
	},
	report: {
		foundIssues: 'Found {count} issues',
		foundIssuesWithHint: 'Found {count} issues (add `--verbose` flag for details)',
		noIssues: 'No issues found',
		arrow: '→',
		foundRequiredDir: 'found required directory: {dir}',
		foundRequiredFile: 'found required file: {name}',
		missingRequiredDir: 'missing required directory: {dir}',
		ellipsis: '...',
		workspace: 'workspace: {root}',
		whitelist: 'Whitelist',
		blacklist: 'Blacklist',
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
		naming: {
			invalid: 'should be {style}',
			invalidPrefix: 'prefix should be {pattern}',
			invalidSuffix: 'suffix should be {pattern}',
		},
	},
	errors: {
		parser: {
			invalidWhereDirective: 'invalid where directive',
			invalidPathDirective: 'invalid path directive',
			ruleFormatError: '{rule} rule format error: {line}',
			renameMissingSources: 'rename missing sources: {line}',
			unknownPreset: 'unknown preset: {name}',
			cannotParseLine: 'cannot parse rule line: {line}',
		},
	},
} satisfies Translation

export default en
