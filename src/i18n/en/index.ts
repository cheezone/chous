import { APP_NAME } from '../../constants'

const en = {
	app: {
		title: APP_NAME,
		by: 'by',
	},
	cli: {
		help: {
			tagline: 'an opinionated taste linter. No config.',
			noCommand: '(no command)',
			commands: 'Commands:',
			lintCmdDesc: 'Lint the current directory',
			scanCmdDesc: 'Find git repos and show detected kinds and stack roles',
			knowledgeCmdDesc: 'Dump built-in stack knowledge as JSON',
			installCursorHookDesc: 'Install Cursor hooks for automatic linting',
			installClaudeHookDesc: 'Install Claude Code hooks for automatic linting',
			options: 'Options:',
			langHint: 'Set output language (default: auto)',
			verboseHint: 'List every finding, with the reason behind it',
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
	scan: {
		kinds: 'kinds',
		roles: 'roles',
		component: 'component {name}',
		issues: 'issues ({count})',
		none: '(none)',
	},
	meta: {
		taste: 'Taste: {names}',
		performance: 'Scanned {fileCount} files in {duration}ms',
		workspacePackages: 'workspace packages: {count}',
	},
	agent: {
		intro: 'chous found problems with files and dependencies.',
		fix: 'Fix the issues below, then run `chous --verbose` and confirm they are gone. Do not claim they are fixed before that command reports no issues.',
		reason: 'Why: {reason}',
		errorsSection: 'Must fix:',
		warningsSection: 'Worth fixing:',
	},
	report: {
		found: 'Found {errors} errors, {warnings} warnings',
		noIssues: 'No issues found',
		moreHidden: '… and {count} more (add --verbose to see all)',
		reason: '({reason})',
		arrow: '→',
	},
	issue: {
		no: {
			because: 'not allowed: {reason}',
		},
		deps: {
			forbidden: 'dependency {name} is not allowed',
			obsolete: 'dependency {name} is obsolete → {use}',
			native: 'dependency {name} is built in now → {use}',
		},
		manifest: {
			expected: '"{field}" should be {expected}',
			remove: 'remove "{field}": {reason}',
			missing: 'add "{field}": {reason}',
		},
		workspace: {
			drift: '{name} is on several major versions ({versions}), so it gets installed twice',
		},
		lifecycle: {
			expired: '{name} reached end of life on {date}, no more security fixes → {use}',
			rotten: '{name} reached end of life on {date}, more than two years ago → {use}',
		},
		exclusive: {
			conflict: 'one thing under two names, keep one',
		},
		stack: {
			conflict: '{role}: {tools} at once, they fight over the same job, keep one',
		},
	},
} as const

export default en
