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
			verboseHint: '列出全部问题，并附上原因',
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
		performance: '在 {duration}ms 内遍历了 {fileCount} 个文件',
		workspacePackages: '工作区包：{count}',
	},
	agent: {
		intro: 'chous 发现了文件和依赖问题。',
		fix: '先处理下面的问题，再运行 `chous --verbose`，确认已经没有问题。在那条命令报告没有问题之前，不要说已经修好了。',
		reason: '原因：{reason}',
		errorsSection: '必须修：',
		warningsSection: '值得修：',
	},
	report: {
		found: '发现 {errors} 个错误，{warnings} 个警告',
		noIssues: '未发现问题',
		moreHidden: '……还有 {count} 条（加 --verbose 查看全部）',
		reason: '（{reason}）',
		arrow: '→',
	},
	issue: {
		no: {
			because: '不允许：{reason}',
		},
		deps: {
			forbidden: '不允许依赖 {name}',
			obsolete: '依赖 {name} 已过时 → {use}',
			native: '依赖 {name} 平台已经自带 → {use}',
		},
		manifest: {
			expected: '"{field}" 应为 {expected}',
			remove: '删除 "{field}"：{reason}',
			missing: '加上 "{field}"：{reason}',
		},
		workspace: {
			drift: '{name} 同时用了不同的大版本（{versions}），会被装两份',
		},
		leak: {
			secret: '{name} 以明文提交了，作废它，改从不提交的环境变量文件读取',
			artifact: '构建产物没有被 gitignore，会被提交上去',
		},
		lifecycle: {
			expired: '{name} 已于 {date} 停止维护，不再有安全修复 → {use}',
			rotten: '{name} 已于 {date} 停止维护，超过两年了 → {use}',
		},
		exclusive: {
			conflict: '同一个意思用了两个名字，只留一个',
		},
		stack: {
			conflict: '{role}同时用了 {tools}，它们会互相打架，只留一个',
		},
	},
} satisfies Translation

export default zh
