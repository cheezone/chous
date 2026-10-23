import type { Translation } from '../i18n-types.js'
import { APP_NAME, APP_CONFIG_FILE_NAME } from '../../constants'

const ptBR = {
	app: {
		title: APP_NAME,
by: 'por',
	},
	cli: {
		help: {
			commands: 'Comandos:',
			initCmdDesc: `Criar um novo arquivo de regras ${APP_CONFIG_FILE_NAME}`,
			installCursorHookDesc: 'Instalar hooks do Cursor para lint automático',
			installClaudeHookDesc: 'Install Claude Code hooks for automatic linting',
			updateCmdDesc: 'Download remote persona presets',
			options: 'Opções:',
			langHint: 'Definir idioma de saída (padrão: automático)',
			verboseHint: 'Mostrar a árvore completa do sistema de arquivos (modo: detalhado)',
			configHint: `Especificar arquivo de regras (padrão: ./${APP_CONFIG_FILE_NAME})`,
			presetHint: 'Try a persona on this directory without writing a .chous file. Repeat to compare',
			strictHint: 'Habilitar modo estrito para todas as regras de apenas diretório',
			statsHint: 'Exportar estatísticas de desempenho das regras para arquivo JSON',
			noColorHint: 'Desativar saída colorida',
			helpHint: 'Mostrar ajuda',
		},
		error: {
			missingLangValue: 'Faltando valor para --lang (suportados: {supported})',
			unsupportedLang: 'Idioma não suportado: {code} (suportados: {supported})',
			missingConfigValue: 'Faltando valor para --config',
			missingPresetValue: 'Missing value for --preset',
			presetAndConfig: '--preset and --config cannot be used together',
			missingStatsOutputValue: 'Faltando valor para --stats-output',
			unknownArg: 'Argumento desconhecido: {arg}',
			cannotReadRulesFile: 'Não foi possível ler o arquivo de regras: {path}',
		},
		initCmd: {
			created: 'Arquivo de regras criado',
			exists: 'Arquivo de regras já existe, ignorado: {path}',
			detectedFramework: 'Framework detectado: {name}',
			detectedPackageManager: 'Gerenciador de pacotes detectado: {name}',
			enabledPresets: 'Presets ativados: {names}',
			usingPreset: 'Trying preset: {name}',
			nextStep: `Próximo: executar ${APP_NAME}`,
			cursorHooksInstalled: 'Cursor hooks instalados',
			claudeHooksInstalled: 'Claude Code hooks installed',
			installCredit: 'chous · https://github.com/cheezone/chous',
			suggestInit: `💡 Dica: Arquivo de configuração ${APP_CONFIG_FILE_NAME} não encontrado. Tipo de projeto detectado automaticamente e regras predefinidas usadas. Execute \`${APP_NAME} init\` para criar um arquivo de configuração com regras personalizadas.`,
			configHint: '💡 Dica: Por favor, leia o arquivo `{configPath}` para entender as regras específicas (lista branca, lista negra, etc.), o que ajudará você a entender por que esses arquivos não atendem aos requisitos e como corrigi-los.',
		},
	},
	meta: {
		rulesFile: 'Arquivo de regras: {path}',
		importedRules: 'Regras importadas: {path}',
		lang: 'Idioma: Português (Brasil)',
		mode: 'Modo: {mode}',
		performance: 'Escaneados {fileCount} arquivos em {duration}ms',
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
		concise: 'conciso',
		verbose: 'detalhado',
	},
	report: {
		foundIssues: 'Encontrados {count} problemas',
		foundIssuesWithHint: 'Encontrados {count} problemas (adicione o parâmetro `--verbose` para obter detalhes)',
		noIssues: 'Nenhum problema encontrado',
		arrow: '→',
		foundRequiredDir: 'diretório obrigatório encontrado: {dir}',
		foundRequiredFile: 'arquivo obrigatório encontrado: {name}',
		missingRequiredDir: 'diretório obrigatório ausente: {dir}',
		ellipsis: '...',
		workspace: 'workspace: {root}',
		whitelist: 'Lista branca',
		blacklist: 'Lista negra',
		andMoreItems: 'e {count} itens mais',
	},
	issue: {
		move: {
			shouldMoveToDir: 'deve ser movido para {dir}',
			destDirMustExist: 'diretório obrigatório ausente (para move {from} to {toDir})',
			destMustBeDir: 'o destino deve ser um diretório (para move {from} to {toDir})',
			unsafeManual: 'deve ser movido para {dir} (ação manual necessária)',
		},
		thoseOnly: {
			forbiddenOnlyAllowed: 'não está na lista de permissões',
			forbiddenTooMany: 'não está na lista de permissões',
		},
		renameDir: {
			shouldRenameTo: 'deve ser renomeado para {to}',
			shouldMigrateTo: 'deve ser migrado para {to} (o destino existe, ação manual necessária)',
			removeEmptyDir: '{dir} está vazio e pode ser removido (o destino {to} existe)',
		},
		renameGlob: {
			shouldRenameTo: 'deve ser renomeado para {to}',
			targetExistsManual: 'deve ser renomeado para {to} (o destino existe, ação manual necessária)',
			cannotInferTarget: 'deve ser renomeado (não foi possível inferir o destino)',
		},
		inDirOnly: {
			dirMustExist: 'o diretório deve existir (apenas {only})',
			forbiddenOnlyAllowed: 'não está na lista de permissões（{dir} permite apenas {only}）',
			forbiddenTooMany: 'não está na lista de permissões',
		},
		no: {
			forbidden: 'corresponde à lista negra（{name}）',
		},
		has: {
			mustExist: 'arquivo não encontrado (obrigatório: {name})',
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
			invalid: 'deve ser {style}',
			invalidPrefix: 'o prefixo deve ser {pattern}',
			invalidSuffix: 'o sufixo deve ser {pattern}',
		},
	},
	errors: {
		parser: {
			invalidWhereDirective: 'diretiva where inválida',
			invalidPathDirective: 'diretiva path inválida',
			ruleFormatError: 'erro de formato da regra {rule}: {line}',
			renameMissingSources: 'rename sem fontes: {line}',
			unknownPreset: 'preset desconhecido: {name}',
			remotePresetMissing: 'remote preset is not cached: {name}. Run `chous update`',
			cannotParseLine: 'não foi possível analisar a linha de regra: {line}',
		},
	},
} satisfies Translation

export default ptBR

