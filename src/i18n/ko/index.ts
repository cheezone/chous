import type { Translation } from '../i18n-types.js'
import { APP_NAME, APP_CONFIG_FILE_NAME } from '../../constants'

const ko = {
	app: {
		title: APP_NAME,
by: 'by',
	},
	cli: {
		help: {
			commands: '명령어:',
			initCmdDesc: `새 ${APP_CONFIG_FILE_NAME} 규칙 파일 생성`,
			installCursorHookDesc: '자동 lint 검사를 위한 Cursor 훅 설치',
			options: '옵션:',
			langHint: '출력 언어 설정 (기본값: 자동)',
			verboseHint: '전체 파일 트리 표시(모드: 상세)',
			configHint: `규칙 파일 지정(기본값: ./${APP_CONFIG_FILE_NAME})`,
			strictHint: '모든 디렉토리 전용 규칙에 엄격 모드 활성화',
			noColorHint: '색상 출력 비활성화',
			helpHint: '도움말 표시',
		},
		error: {
			missingLangValue: '--lang 값이 없습니다(지원: {supported})',
			unsupportedLang: '지원하지 않는 언어: {code}(지원: {supported})',
			missingConfigValue: '--config 값이 없습니다',
			unknownArg: '알 수 없는 인자: {arg}',
			cannotReadRulesFile: '규칙 파일을 읽을 수 없습니다: {path}',
		},
		initCmd: {
			created: '규칙 파일을 생성했습니다',
			exists: '규칙 파일이 이미 존재합니다(건너뜀): {path}',
			detectedFramework: '프레임워크 감지: {name}',
			detectedPackageManager: '패키지 매니저 감지: {name}',
			enabledPresets: '활성화된 프리셋: {names}',
			nextStep: `다음: ${APP_NAME} 실행`,
			cursorHooksInstalled: 'Cursor 훅이 설치되었습니다',
			suggestInit: `💡 팁: ${APP_CONFIG_FILE_NAME} 설정 파일을 찾을 수 없습니다. 프로젝트 유형을 자동으로 감지하고 사전 설정 규칙을 사용했습니다. 사용자 정의 규칙으로 설정 파일을 만들려면 \`${APP_NAME} init\`을 실행하세요.`,
			configHint: '💡 팁: 특정 규칙(화이트리스트, 블랙리스트 등)을 이해하려면 `{configPath}` 파일을 읽어보세요. 이를 통해 이러한 파일이 요구사항을 충족하지 않는 이유와 수정 방법을 이해할 수 있습니다.',
		},
	},
	meta: {
		rulesFile: '규칙 파일: {path}',
		importedRules: '가져온 규칙: {path}',
		lang: '언어: 한국어',
		mode: '모드: {mode}',
		performance: '{fileCount}개 파일을 {duration}ms에 스캔했습니다',
	},
	mode: {
		concise: '간단',
		verbose: '상세',
	},
	report: {
		foundIssues: '{count}개의 문제가 발견되었습니다',
		foundIssuesWithHint: '{count}개의 문제가 발견되었습니다 (자세한 정보를 보려면 `--verbose` 매개변수를 추가하세요)',
		noIssues: '문제가 없습니다',
		arrow: '→',
		foundRequiredDir: '필수 디렉터리 발견: {dir}',
		foundRequiredFile: '필수 파일 발견: {name}',
		missingRequiredDir: '필수 디렉터리 누락: {dir}',
		ellipsis: '...',
		workspace: '워크스페이스: {root}',
		whitelist: '화이트리스트',
		blacklist: '블랙리스트',
		andMoreItems: '외 {count}개 항목',
	},
	issue: {
		move: {
			shouldMoveToDir: '{dir}(으)로 이동해야 합니다',
			destDirMustExist: '필수 디렉터리가 없습니다(move {from} to {toDir})',
			destMustBeDir: '대상은 디렉터리여야 합니다(move {from} to {toDir})',
			unsafeManual: '{dir}(으)로 이동해야 합니다(수동 조치 필요)',
		},
		thoseOnly: {
			forbiddenOnlyAllowed: '허용 목록에 없습니다',
			forbiddenTooMany: '허용 목록에 없습니다',
		},
		renameDir: {
			shouldRenameTo: '{to}(으)로 이름을 바꿔야 합니다',
			shouldMigrateTo: '{to}(으)로 마이그레이션해야 합니다(대상이 존재, 수동 조치 필요)',
			removeEmptyDir: '{dir}는 비어 있어 삭제할 수 있습니다(대상 {to} 존재)',
		},
		renameGlob: {
			shouldRenameTo: '{to}(으)로 이름을 바꿔야 합니다',
			targetExistsManual: '{to}(으)로 이름을 바꿔야 합니다(대상이 존재, 수동 조치 필요)',
			cannotInferTarget: '이름을 바꿔야 합니다(대상 경로를 추론할 수 없음)',
		},
		inDirOnly: {
			dirMustExist: '디렉터리가 있어야 합니다(only {only})',
			forbiddenOnlyAllowed: '허용 목록에 없습니다({dir}는 {only}만 허용)',
			forbiddenTooMany: '허용 목록에 없습니다',
		},
		no: {
			forbidden: '블랙리스트에 해당합니다（{name}）',
		},
		has: {
			mustExist: '파일을 찾을 수 없습니다（필수：{name}）',
		},
		naming: {
			invalid: '{style}이어야 합니다',
			invalidPrefix: '접두사는 {pattern}이어야 합니다',
			invalidSuffix: '접미사는 {pattern}이어야 합니다',
		},
	},
	errors: {
		parser: {
			invalidWhereDirective: 'where 지시문이 올바르지 않습니다',
			invalidPathDirective: 'path 지시문이 올바르지 않습니다',
			ruleFormatError: '{rule} 규칙 형식 오류: {line}',
			renameMissingSources: 'rename 소스가 없습니다: {line}',
			unknownPreset: '알 수 없는 프리셋: {name}',
			cannotParseLine: '규칙 줄을 파싱할 수 없습니다: {line}',
		},
	},
} satisfies Translation

export default ko

