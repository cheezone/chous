import type { Translation } from '../types'
import { APP_NAME } from '../../constants'

const zh = {
	app: {
		title: APP_NAME,
		by: '',
	},
	cli: {
		help: {
			tagline: '有主见的品味检查器，没有配置。',
			noCommand: '（不带命令）',
			commands: '命令：',
			lintCmdDesc: '检查当前目录',
			scanCmdDesc: '查找 git 仓库，显示识别到的项目类型和技术栈角色',
			knowledgeCmdDesc: '以 JSON 导出内置技术栈知识',
			installCursorHookDesc: '安装 Cursor hooks，自动检查',
			installClaudeHookDesc: '安装 Claude Code hooks，自动检查',
			options: '选项：',
			langHint: '设置输出语言（默认：自动）',
			verboseHint: '显示完整的文件结构',
			fixHint: '应用安全的自动修复',
			failOnWarningsHint: '存在警告时以错误码退出',
			ignoreWarningsHint: '仅报告错误（隐藏警告）',
			noColorHint: '禁用彩色输出',
			helpHint: '显示帮助',
		},
		error: {
			missingLangValue: '缺少 --lang 参数值（仅支持：{supported}）',
			unsupportedLang: '不支持的语言：{code}（仅支持：{supported}）',
			conflictIgnoreAndFailWarnings: '--ignore-warnings 与 --fail-on-warnings 不能同时使用',
			unknownArg: '未知参数：{arg}',
		},
		install: {
			cursorHooksInstalled: '已安装 Cursor hooks',
			claudeHooksInstalled: '已安装 Claude Code hooks',
			credit: 'chous · https://github.com/cheezone/chous',
		},
	},
	scan: {
		kinds: '项目类型',
		roles: '技术栈',
		component: '组件 {name}',
		issues: '问题（{count}）',
		none: '（无）',
	},
	meta: {
		taste: '品味：{names}',
		lang: '显示语言：简体中文',
		mode: '信息模式：{mode}',
		performance: '在 {duration}ms 内遍历了 {fileCount} 个文件',
		workspacePackages: '工作区包：{count}',
	},
	agent: {
		intro: 'chous 发现了文件和依赖问题。',
		fix: '先处理下面的问题，再运行 `chous --verbose`，确认已经没有问题。在那条命令报告没有问题之前，不要说已经修好了。',
		reason: '原因：{reason}',
		fixHint: '安全修复：{fix}',
		see: '参考：{url}',
		autoSection: '可直接运行 `chous --fix`：',
		agentSection: '需要你（或 AI）迁移：',
		infoSection: '仅提示：',
	},
	mode: {
		concise: '简洁',
		verbose: '详细',
	},
	report: {
		foundIssues: '发现 {count} 个问题',
		foundErrorsAndWarnings: '发现 {errors} 个错误，{warnings} 个警告',
		foundIssuesWithHint: '发现 {count} 个问题（添加 `--verbose` 参数获得详细信息）',
		fixable: '[可自动修复]',
		reason: '（{reason}）',
		fixedCount: '已自动修复 {count} 个问题',
		noIssues: '未发现问题',
		arrow: '→',
		foundRequiredDir: '已找到必需目录：{dir}',
		foundRequiredFile: '已找到必需文件：{name}',
		missingRequiredDir: '缺失必需目录：{dir}',
		ellipsis: '...',
		workspace: '工作区：{root}',
		whitelist: '白名单',
		blacklist: '黑名单',
		listSep: '、',
		andMoreItems: '等 {count} 项',
	},
	issue: {
		move: {
			shouldMoveToDir: '应移动到 {dir}',
			destDirMustExist: '目录必须存在（用于接收 move {from} to {toDir}）',
			destMustBeDir: '目标必须是目录（用于接收 move {from} to {toDir}）',
			unsafeManual: '应移动到 {dir}（目标已存在或目标不是目录，可能有副作用）',
		},
		thoseOnly: {
			forbiddenOnlyAllowed: '不在白名单',
			forbiddenTooMany: '不在白名单',
		},
		renameDir: {
			shouldRenameTo: '应重命名为 {to}',
			shouldMigrateTo: '应将内容迁移到 {to}（目标已存在）',
			removeEmptyDir: '{dir} 为空目录，可直接删除（目标 {to} 已存在）',
		},
		renameGlob: {
			shouldRenameTo: '应重命名为 {to}',
			targetExistsManual: '应重命名为 {to}（目标已存在，可能覆盖）',
			cannotInferTarget: '应重命名（目标路径无法推导）',
		},
		inDirOnly: {
			dirMustExist: '目录必须存在（用于约束内容：only {only}）',
			forbiddenOnlyAllowed: '不在白名单（{dir} 仅允许：{only}）',
			forbiddenTooMany: '不在白名单',
		},
		no: {
			forbidden: '命中黑名单（{name}）',
			because: '不允许：{reason}',
		},
		has: {
			mustExist: '未找到文件（必须存在：{name}）',
		},
		deps: {
			forbidden: '不允许依赖 {name}',
			obsolete: '依赖 {name} 已过时 → {use}',
			native: '依赖 {name} 平台已经自带 → {use}',
		},
		lifecycle: {
			expired: '{name} 已于 {date} 停止维护，不再有安全修复 → {use}',
			rotten: '{name} 已于 {date} 停止维护，超过两年了 → {use}',
		},
		exclusive: {
			conflict: '同时有 {names}，它们是同一个意思，只留一个',
		},
		stack: {
			conflict: '{role}同时用了 {tools}，它们会互相打架，只留一个',
		},
		manifest: {
			expected: '"{field}" 应为 {expected}',
			remove: '删除 "{field}"：{reason}',
			missing: '加上 "{field}"：{reason}',
		},
		workspace: {
			drift: '{name} 有多个版本（{versions}），统一成一个，或改用 pnpm catalog',
			protocol: '依赖工作区包 {name} 要写 workspace:*（当前是 {spec}）',
		},
		merged: {
			notInAllowList: '不在白名单（{labels}）',
			inBlockList: '命中黑名单（{labels}）',
		},
		naming: {
			invalid: '命名规范错误（应为 {style}）',
			invalidPrefix: '命名规范错误（前缀应为 {pattern}）',
			invalidSuffix: '命名规范错误（后缀应为 {pattern}）',
		},
	},
} satisfies Translation

export default zh

