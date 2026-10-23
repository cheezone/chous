import type { Translation } from '../i18n-types.js'
import { APP_NAME, APP_CONFIG_FILE_NAME } from '../../constants'

const es = {
	app: {
		title: APP_NAME,
by: 'por',
	},
	cli: {
		help: {
			commands: 'Comandos:',
			initCmdDesc: `Crear un nuevo archivo de reglas ${APP_CONFIG_FILE_NAME}`,
			installCursorHookDesc: 'Instalar hooks de Cursor para lint automático',
			installClaudeHookDesc: 'Install Claude Code hooks for automatic linting',
			updateCmdDesc: 'Download remote persona presets',
			options: 'Opciones:',
			langHint: 'Establecer idioma de salida (predeterminado: auto)',
			verboseHint: 'Mostrar el árbol completo del sistema de archivos (modo: detallado)',
			configHint: `Especificar archivo de reglas (predeterminado: ./${APP_CONFIG_FILE_NAME})`,
			presetHint: 'Try a persona on this directory without writing a .chous file. Repeat to compare',
			strictHint: 'Habilitar modo estricto para todas las reglas de solo directorio',
			statsHint: 'Exportar estadísticas de rendimiento de reglas a archivo JSON',
			noColorHint: 'Desactivar salida con colores',
			helpHint: 'Mostrar ayuda',
		},
		error: {
			missingLangValue: 'Falta el valor de --lang (compatibles: {supported})',
			unsupportedLang: 'Idioma no compatible: {code} (compatibles: {supported})',
			missingConfigValue: 'Falta el valor de --config',
			missingPresetValue: 'Missing value for --preset',
			presetAndConfig: '--preset and --config cannot be used together',
			missingStatsOutputValue: 'Falta el valor de --stats-output',
			unknownArg: 'Argumento desconocido: {arg}',
			cannotReadRulesFile: 'No se puede leer el archivo de reglas: {path}',
		},
		initCmd: {
			created: 'Archivo de reglas creado',
			exists: 'El archivo de reglas ya existe, omitido: {path}',
			detectedFramework: 'Framework detectado: {name}',
			detectedPackageManager: 'Gestor de paquetes detectado: {name}',
			enabledPresets: 'Presets habilitados: {names}',
			usingPreset: 'Trying preset: {name}',
			nextStep: `Siguiente: ejecutar ${APP_NAME}`,
			cursorHooksInstalled: 'Cursor hooks instalados',
			claudeHooksInstalled: 'Claude Code hooks installed',
			installCredit: 'chous · https://github.com/cheezone/chous',
			suggestInit: `💡 Sugerencia: No se encontró el archivo de configuración ${APP_CONFIG_FILE_NAME}. Se detectó automáticamente el tipo de proyecto y se usaron reglas predefinidas. Ejecuta \`${APP_NAME} init\` para crear un archivo de configuración con reglas personalizadas.`,
			configHint: '💡 Sugerencia: Por favor, lee el archivo `{configPath}` para entender las reglas específicas (lista blanca, lista negra, etc.), lo que te ayudará a entender por qué estos archivos no cumplen con los requisitos y cómo solucionarlos.',
		},
	},
	meta: {
		rulesFile: 'Archivo de reglas: {path}',
		importedRules: 'Reglas importadas: {path}',
		lang: 'Idioma: Español',
		mode: 'Modo: {mode}',
		performance: 'Escaneados {fileCount} archivos en {duration}ms',
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
		verbose: 'detallado',
	},
	report: {
		foundIssues: 'Se encontraron {count} problemas',
		foundIssuesWithHint: 'Se encontraron {count} problemas (agregue el parámetro `--verbose` para obtener detalles)',
		noIssues: 'No se encontraron problemas',
		arrow: '→',
		foundRequiredDir: 'se encontró el directorio requerido: {dir}',
		foundRequiredFile: 'se encontró el archivo requerido: {name}',
		missingRequiredDir: 'falta el directorio requerido: {dir}',
		ellipsis: '...',
		workspace: 'workspace: {root}',
		whitelist: 'Lista blanca',
		blacklist: 'Lista negra',
		andMoreItems: 'y {count} elementos más',
	},
	issue: {
		move: {
			shouldMoveToDir: 'debería moverse a {dir}',
			destDirMustExist: 'falta el directorio requerido (para move {from} to {toDir})',
			destMustBeDir: 'el destino debe ser un directorio (para move {from} to {toDir})',
			unsafeManual: 'debería moverse a {dir} (se requiere acción manual)',
		},
		thoseOnly: {
			forbiddenOnlyAllowed: 'no está en la lista de permitidos',
			forbiddenTooMany: 'no está en la lista de permitidos',
		},
		renameDir: {
			shouldRenameTo: 'debería renombrarse a {to}',
			shouldMigrateTo: 'debería migrarse a {to} (el destino existe, se requiere acción manual)',
			removeEmptyDir: '{dir} está vacío y se puede eliminar (el destino {to} existe)',
		},
		renameGlob: {
			shouldRenameTo: 'debería renombrarse a {to}',
			targetExistsManual: 'debería renombrarse a {to} (el destino existe, se requiere acción manual)',
			cannotInferTarget: 'debería renombrarse (no se puede inferir el destino)',
		},
		inDirOnly: {
			dirMustExist: 'el directorio debe existir (solo {only})',
			forbiddenOnlyAllowed: 'no está en la lista de permitidos（{dir} solo permite {only}）',
			forbiddenTooMany: 'no está en la lista de permitidos',
		},
		no: {
			forbidden: 'coincide con la lista negra（{name}）',
		},
		has: {
			mustExist: 'archivo no encontrado (requerido: {name})',
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
			invalid: 'debe ser {style}',
			invalidPrefix: 'el prefijo debe ser {pattern}',
			invalidSuffix: 'el sufijo debe ser {pattern}',
		},
	},
	errors: {
		parser: {
			invalidWhereDirective: 'directiva where inválida',
			invalidPathDirective: 'directiva path inválida',
			ruleFormatError: 'error de formato de regla {rule}: {line}',
			renameMissingSources: 'rename sin fuentes: {line}',
			unknownPreset: 'preset desconocido: {name}',
			remotePresetMissing: 'remote preset is not cached: {name}. Run `chous update`',
			cannotParseLine: 'no se puede analizar la línea de regla: {line}',
		},
	},
} satisfies Translation

export default es

