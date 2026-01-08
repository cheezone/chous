import type { Translation } from '../i18n-types.js'
import { APP_NAME, APP_CONFIG_FILE_NAME } from '../../constants'

const ja = {
	app: {
		title: APP_NAME,
by: 'by',
	},
	cli: {
		help: {
			commands: 'コマンド:',
			initCmdDesc: `新しい ${APP_CONFIG_FILE_NAME} ルールファイルを作成`,
			installCursorHookDesc: '自動 lint チェック用の Cursor フックをインストール',
			options: 'オプション:',
			langHint: '出力言語を設定（デフォルト: 自動）',
			verboseHint: 'ファイルツリーをすべて表示（モード: 詳細）',
			configHint: `ルールファイルを指定（デフォルト: ./${APP_CONFIG_FILE_NAME}）`,
			strictHint: 'すべてのディレクトリ専用ルールに厳格モードを有効化',
			statsHint: 'ルールのパフォーマンス統計を JSON ファイルに出力',
			noColorHint: 'カラー出力を無効化',
			helpHint: 'ヘルプを表示',
		},
		error: {
			missingLangValue: '--lang の値がありません（対応: {supported}）',
			unsupportedLang: '未対応の言語: {code}（対応: {supported}）',
			missingConfigValue: '--config の値がありません',
			missingStatsOutputValue: '--stats-output の値がありません',
			unknownArg: '不明な引数: {arg}',
			cannotReadRulesFile: 'ルールファイルを読み取れません: {path}',
		},
		initCmd: {
			created: 'ルールファイルを作成しました: {path}',
			exists: 'ルールファイルは既に存在します（スキップ）: {path}',
			detectedFramework: 'フレームワークを検出: {name}',
			detectedPackageManager: 'パッケージマネージャーを検出: {name}',
			enabledPresets: '有効なプリセット: {names}',
			nextStep: `次: ${APP_NAME} を実行`,
			cursorHooksInstalled: 'Cursor フックをインストールしました',
			suggestInit: `💡 ヒント: ${APP_CONFIG_FILE_NAME} 設定ファイルが見つかりませんでした。プロジェクトタイプを自動検出し、プリセットルールを使用しました。カスタムルールで設定ファイルを作成するには、\`${APP_NAME} init\` を実行してください。`,
			configHint: '💡 ヒント: 特定のルール（ホワイトリスト、ブラックリストなど）を理解するために、`{configPath}` ファイルを読んでください。これにより、これらのファイルが要件を満たしていない理由と修正方法を理解できます。',
		},
	},
	meta: {
		rulesFile: 'ルールファイル: {path}',
		importedRules: 'インポートされたルール: {path}',
		lang: '言語: 日本語',
		mode: 'モード: {mode}',
		performance: '{fileCount} 個のファイルを {duration}ms でスキャンしました',
	},
	mode: {
		concise: '簡潔',
		verbose: '詳細',
	},
	report: {
		foundIssues: '{count} 件の問題が見つかりました',
		foundIssuesWithHint: '{count} 件の問題が見つかりました（詳細情報を取得するには `--verbose` パラメータを追加してください）',
		noIssues: '問題は見つかりませんでした',
		arrow: '→',
		foundRequiredDir: '必須ディレクトリを検出: {dir}',
		foundRequiredFile: '必須ファイルを検出: {name}',
		missingRequiredDir: '必須ディレクトリがありません: {dir}',
		ellipsis: '...',
		workspace: 'ワークスペース: {root}',
		whitelist: 'ホワイトリスト',
		blacklist: 'ブラックリスト',
		andMoreItems: '他 {count} 項目',
	},
	issue: {
		move: {
			shouldMoveToDir: '{dir} に移動する必要があります',
			destDirMustExist: '必須ディレクトリがありません（move {from} to {toDir} 用）',
			destMustBeDir: '移動先はディレクトリである必要があります（move {from} to {toDir} 用）',
			unsafeManual: '{dir} に移動する必要があります（手動対応が必要）',
		},
		thoseOnly: {
			forbiddenOnlyAllowed: '許可リストに含まれていません',
			forbiddenTooMany: '許可リストに含まれていません',
		},
		renameDir: {
			shouldRenameTo: '{to} にリネームする必要があります',
			shouldMigrateTo: '{to} に移行する必要があります（移行先が存在。手動対応が必要）',
			removeEmptyDir: '{dir} は空なので削除できます（移行先 {to} は存在）',
		},
		renameGlob: {
			shouldRenameTo: '{to} にリネームする必要があります',
			targetExistsManual: '{to} にリネームする必要があります（移行先が存在。手動対応が必要）',
			cannotInferTarget: 'リネームする必要があります（移行先を推論できません）',
		},
		inDirOnly: {
			dirMustExist: 'ディレクトリが必要です（only {only}）',
			forbiddenOnlyAllowed: '許可リストに含まれていません（{dir} は {only} のみ許可）',
			forbiddenTooMany: '許可リストに含まれていません',
		},
		no: {
			forbidden: 'ブラックリストに一致しました（{name}）',
		},
		has: {
			mustExist: 'ファイルが見つかりません（必須：{name}）',
		},
		naming: {
			invalid: '{style} である必要があります',
			invalidPrefix: 'プレフィックスは {pattern} である必要があります',
			invalidSuffix: 'サフィックスは {pattern} である必要があります',
		},
	},
	errors: {
		parser: {
			invalidWhereDirective: 'where ディレクティブが無効です',
			invalidPathDirective: 'path ディレクティブが無効です',
			ruleFormatError: '{rule} ルールの形式エラー: {line}',
			renameMissingSources: 'rename の移行元がありません: {line}',
			unknownPreset: '不明なプリセット: {name}',
			cannotParseLine: 'ルール行を解析できません: {line}',
		},
	},
} satisfies Translation

export default ja

