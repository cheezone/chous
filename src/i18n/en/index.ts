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
			installClaudeHookDesc: 'Install Claude Code hooks for automatic linting',
			updateCmdDesc: 'Download remote persona presets',
			options: 'Options:',
			langHint: 'Set output language (default: auto)',
			verboseHint: 'Show full filesystem tree (mode: verbose)',
			configHint: `Specify rules file (default: ./${APP_CONFIG_FILE_NAME})`,
			presetHint: 'Try a persona on this directory without writing a .chous file. Repeat to compare',
			strictHint: 'Enable strict mode for all directory-only rules',
			statsHint: 'Output rule performance statistics to JSON file',
			noColorHint: 'Disable colored output',
			helpHint: 'Show help',
		},
		error: {
			missingLangValue: 'Missing value for --lang (supported: {supported})',
			unsupportedLang: 'Unsupported language: {code} (supported: {supported})',
			missingConfigValue: 'Missing value for --config',
			missingPresetValue: 'Missing value for --preset',
			presetAndConfig: '--preset and --config cannot be used together',
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
			usingPreset: 'Trying preset: {name}',
			nextStep: `Next: run ${APP_NAME}`,
			cursorHooksInstalled: 'Cursor hooks installed',
			claudeHooksInstalled: 'Claude Code hooks installed',
			installCredit: 'chous · https://github.com/cheezone/chous',
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
		following: 'Following @{name} · {credit}',
		curated: 'preset curated by cheez.tech',
	},
	agent: {
		intro: 'The project rules found file and dependency issues.',
		follow: 'Follow @{name}.',
		fix: 'Fix the issues below, then run `chous --verbose` and confirm they are gone. Do not claim they are fixed before that command reports no issues.',
		updated: 'Updated {count} remote preset(s).',
		upToDate: 'Remote presets are already cached.',
		downloadFailed: 'Could not download {name}. Using the cached copy if one exists.',
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
		packageManager: {
			wrong: 'package manager should be {expected} (found {actual})',
			missing: 'package manager should be {expected}',
		},
		deps: {
			missing: 'missing dependency {name}',
			forbidden: 'dependency {name} is not allowed',
		},
		replaceDep: {
			replace: 'replace dependency {from} with {to}',
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
			remotePresetMissing: 'remote preset is not cached: {name}. Run `chous update`',
			cannotParseLine: 'cannot parse rule line: {line}',
		},
	},
} satisfies Translation

export default en
