import type { Translation } from '../i18n-types.js'
import { APP_NAME, APP_CONFIG_FILE_NAME } from '../../constants'

const zh = {
	app: {
		title: APP_NAME,
		by: '',
	},
	cli: {
		help: {
			commands: '命令：',
			initCmdDesc: `创建新的 ${APP_CONFIG_FILE_NAME} 规则文件`,
			installCursorHookDesc: '安装 Cursor hooks 以自动进行 lint 检查',
			options: '选项：',
			langHint: '设置输出语言（默认：自动）',
			verboseHint: '显示更完整的文件结构（信息模式：详细）',
			configHint: `指定规则文件（默认：当前目录的 ${APP_CONFIG_FILE_NAME}）`,
			strictHint: '为所有目录规则启用严格模式',
			statsHint: '将规则性能统计输出到 JSON 文件',
			noColorHint: '禁用彩色输出',
			helpHint: '显示帮助',
		},
		error: {
			missingLangValue: '缺少 --lang 参数值（仅支持：{supported}）',
			unsupportedLang: '不支持的语言：{code}（仅支持：{supported}）',
			missingConfigValue: '缺少 --config 参数值',
			missingStatsOutputValue: '缺少 --stats-output 参数值',
			unknownArg: '未知参数：{arg}',
			cannotReadRulesFile: '无法读取规则文件：{path}',
		},
		initCmd: {
			created: '已创建规则文件',
			exists: '规则文件已存在，跳过： {path}',
			detectedFramework: '检测到框架： {name}',
			detectedPackageManager: '检测到包管理器： {name}',
			enabledPresets: '已启用预设： {names}',
			nextStep: `下一步： 运行 ${APP_NAME}`,
			cursorHooksInstalled: '已安装 Cursor hooks',
			suggestInit: `💡 提示：未找到 ${APP_CONFIG_FILE_NAME} 配置文件，已自动检测项目类型并使用预设规则。运行 \`${APP_NAME} init\` 创建配置文件以自定义规则。`,
			configHint: '💡 提示：请读取 `{configPath}` 文件来了解具体的规则（白名单、黑名单等），这将帮助你理解为什么这些文件不符合要求以及如何修复。',
		},
	},
	meta: {
		rulesFile: '规则文件: {path}',
		importedRules: '引用规则: {path}',
		lang: '显示语言：简体中文',
		mode: '信息模式：{mode}',
		performance: '在 {duration}ms 内遍历了 {fileCount} 个文件',
	},
	mode: {
		concise: '简洁',
		verbose: '详细',
	},
	report: {
		foundIssues: '发现 {count} 个问题',
		foundIssuesWithHint: '发现 {count} 个问题（添加 `--verbose` 参数获得详细信息）',
		noIssues: '未发现问题',
		arrow: '→',
		foundRequiredDir: '已找到必需目录：{dir}',
		foundRequiredFile: '已找到必需文件：{name}',
		missingRequiredDir: '缺失必需目录：{dir}',
		ellipsis: '...',
		workspace: '工作区：{root}',
		whitelist: '白名单',
		blacklist: '黑名单',
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
		},
		has: {
			mustExist: '未找到文件（必须存在：{name}）',
		},
		naming: {
			invalid: '命名规范错误（应为 {style}）',
			invalidPrefix: '命名规范错误（前缀应为 {pattern}）',
			invalidSuffix: '命名规范错误（后缀应为 {pattern}）',
		},
	},
	errors: {
		parser: {
			invalidWhereDirective: 'where 指令无效',
			invalidPathDirective: 'path 指令无效',
			ruleFormatError: '{rule} 规则格式错误：{line}',
			renameMissingSources: 'rename 规则缺少来源：{line}',
			unknownPreset: '未知预设：{name}',
			cannotParseLine: '无法解析规则行：{line}',
		},
	},
} satisfies Translation

export default zh

