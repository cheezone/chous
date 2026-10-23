import type { Translation } from '../i18n-types.js'
import { APP_NAME, APP_CONFIG_FILE_NAME } from '../../constants'

const de = {
	app: {
		title: APP_NAME,
by: 'von',
	},
	cli: {
		help: {
			commands: 'Befehle:',
			initCmdDesc: `Neue ${APP_CONFIG_FILE_NAME}-Regeldatei erstellen`,
			installCursorHookDesc: 'Cursor-Hooks für automatisches Linting installieren',
			installClaudeHookDesc: 'Install Claude Code hooks for automatic linting',
			updateCmdDesc: 'Download remote persona presets',
			options: 'Optionen:',
			langHint: 'Ausgabesprache festlegen (Standard: automatisch)',
			verboseHint: 'Vollen Dateisystembaum anzeigen (Modus: ausführlich)',
			configHint: `Regeldatei angeben (Standard: ./${APP_CONFIG_FILE_NAME})`,
			presetHint: 'Try a persona on this directory without writing a .chous file. Repeat to compare',
			strictHint: 'Strengen Modus für alle Verzeichnis-Regeln aktivieren',
			statsHint: 'Regel-Leistungsstatistiken in JSON-Datei ausgeben',
			noColorHint: 'Farbausgabe deaktivieren',
			helpHint: 'Hilfe anzeigen',
		},
		error: {
			missingLangValue: 'Fehlender Wert für --lang (unterstützt: {supported})',
			unsupportedLang: 'Nicht unterstützte Sprache: {code} (unterstützt: {supported})',
			missingConfigValue: 'Fehlender Wert für --config',
			missingPresetValue: 'Missing value for --preset',
			presetAndConfig: '--preset and --config cannot be used together',
			missingStatsOutputValue: 'Fehlender Wert für --stats-output',
			unknownArg: 'Unbekanntes Argument: {arg}',
			cannotReadRulesFile: 'Regeldatei kann nicht gelesen werden: {path}',
		},
		initCmd: {
			created: 'Regeldatei erstellt',
			exists: 'Regeldatei existiert bereits, übersprungen: {path}',
			detectedFramework: 'Framework erkannt: {name}',
			detectedPackageManager: 'Paketmanager erkannt: {name}',
			enabledPresets: 'Aktive Presets: {names}',
			usingPreset: 'Trying preset: {name}',
			nextStep: `Nächster Schritt: ${APP_NAME} ausführen`,
			cursorHooksInstalled: 'Cursor Hooks installiert',
			claudeHooksInstalled: 'Claude Code hooks installed',
			installCredit: 'chous · https://github.com/cheezone/chous',
			suggestInit: `💡 Tipp: Keine ${APP_CONFIG_FILE_NAME}-Konfigurationsdatei gefunden. Projekttyp automatisch erkannt und Voreinstellungsregeln verwendet. Führen Sie \`${APP_NAME} init\` aus, um eine Konfigurationsdatei mit benutzerdefinierten Regeln zu erstellen.`,
			configHint: '💡 Tipp: Bitte lesen Sie die Datei `{configPath}`, um die spezifischen Regeln (Whitelist, Blacklist usw.) zu verstehen. Dies hilft Ihnen zu verstehen, warum diese Dateien den Anforderungen nicht entsprechen und wie Sie sie beheben können.',
		},
	},
	meta: {
		rulesFile: 'Regeldatei: {path}',
		importedRules: 'Importierte Regeln: {path}',
		lang: 'Sprache: Deutsch',
		mode: 'Modus: {mode}',
		performance: '{fileCount} Dateien in {duration}ms gescannt',
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
		concise: 'kurz',
		verbose: 'ausführlich',
	},
	report: {
		foundIssues: '{count} Probleme gefunden',
		foundIssuesWithHint: '{count} Probleme gefunden (fügen Sie den Parameter `--verbose` hinzu, um Details zu erhalten)',
		noIssues: 'Keine Probleme gefunden',
		arrow: '→',
		foundRequiredDir: 'erforderliches Verzeichnis gefunden: {dir}',
		foundRequiredFile: 'erforderliche Datei gefunden: {name}',
		missingRequiredDir: 'erforderliches Verzeichnis fehlt: {dir}',
		ellipsis: '...',
		workspace: 'workspace: {root}',
		whitelist: 'Whitelist',
		blacklist: 'Blacklist',
		andMoreItems: 'und {count} weitere Elemente',
	},
	issue: {
		move: {
			shouldMoveToDir: 'sollte nach {dir} verschoben werden',
			destDirMustExist: 'erforderliches Verzeichnis fehlt (für move {from} to {toDir})',
			destMustBeDir: 'Ziel muss ein Verzeichnis sein (für move {from} to {toDir})',
			unsafeManual: 'sollte nach {dir} verschoben werden (manuelle Aktion erforderlich)',
		},
		thoseOnly: {
			forbiddenOnlyAllowed: 'nicht auf der Erlaubnisliste',
			forbiddenTooMany: 'nicht auf der Erlaubnisliste',
		},
		renameDir: {
			shouldRenameTo: 'sollte in {to} umbenannt werden',
			shouldMigrateTo: 'sollte nach {to} migriert werden (Ziel existiert, manuelle Aktion erforderlich)',
			removeEmptyDir: '{dir} ist leer und kann entfernt werden (Ziel {to} existiert)',
		},
		renameGlob: {
			shouldRenameTo: 'sollte in {to} umbenannt werden',
			targetExistsManual: 'sollte in {to} umbenannt werden (Ziel existiert, manuelle Aktion erforderlich)',
			cannotInferTarget: 'sollte umbenannt werden (Ziel kann nicht abgeleitet werden)',
		},
		inDirOnly: {
			dirMustExist: 'Verzeichnis muss existieren (nur {only})',
			forbiddenOnlyAllowed: 'nicht auf der Erlaubnisliste（{dir} erlaubt nur {only}）',
			forbiddenTooMany: 'nicht auf der Erlaubnisliste',
		},
		no: {
			forbidden: 'auf der schwarzen Liste gefunden（{name}）',
		},
		has: {
			mustExist: 'Datei nicht gefunden (erforderlich: {name})',
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
			invalid: 'sollte {style} sein',
			invalidPrefix: 'Präfix sollte {pattern} sein',
			invalidSuffix: 'Suffix sollte {pattern} sein',
		},
	},
	errors: {
		parser: {
			invalidWhereDirective: 'ungültige where-Direktive',
			invalidPathDirective: 'ungültige path-Direktive',
			ruleFormatError: '{rule}-Regelformatfehler: {line}',
			renameMissingSources: 'rename ohne Quellen: {line}',
			unknownPreset: 'unbekanntes Preset: {name}',
			remotePresetMissing: 'remote preset is not cached: {name}. Run `chous update`',
			cannotParseLine: 'Regelzeile kann nicht geparst werden: {line}',
		},
	},
} satisfies Translation

export default de

