import type { Translation } from '../i18n-types.js'
import { APP_NAME, APP_CONFIG_FILE_NAME } from '../../constants'

const fr = {
	app: {
		title: APP_NAME,
by: 'par',
	},
	cli: {
		help: {
			commands: 'Commandes :',
			initCmdDesc: `Créer un nouveau fichier de règles ${APP_CONFIG_FILE_NAME}`,
			installCursorHookDesc: 'Installer les hooks Cursor pour le lint automatique',
			options: 'Options :',
			langHint: 'Définir la langue de sortie (par défaut : auto)',
			verboseHint: 'Afficher l’arborescence complète (mode : détaillé)',
			configHint: `Spécifier le fichier de règles (par défaut : ./${APP_CONFIG_FILE_NAME})`,
			strictHint: 'Activer le mode strict pour toutes les règles de répertoire uniquement',
			statsHint: 'Exporter les statistiques de performance des règles vers un fichier JSON',
			noColorHint: 'Désactiver la sortie en couleur',
			helpHint: 'Afficher l’aide',
		},
		error: {
			missingLangValue: 'Valeur manquante pour --lang (prises en charge : {supported})',
			unsupportedLang: 'Langue non prise en charge : {code} (prises en charge : {supported})',
			missingConfigValue: 'Valeur manquante pour --config',
			missingStatsOutputValue: 'Valeur manquante pour --stats-output',
			unknownArg: 'Argument inconnu : {arg}',
			cannotReadRulesFile: 'Impossible de lire le fichier de règles : {path}',
		},
		initCmd: {
			created: 'Fichier de règles créé',
			exists: 'Le fichier de règles existe déjà, ignoré : {path}',
			detectedFramework: 'Framework détecté : {name}',
			detectedPackageManager: 'Gestionnaire de paquets détecté : {name}',
			enabledPresets: 'Presets activés : {names}',
			nextStep: `Étape suivante : exécuter ${APP_NAME}`,
			cursorHooksInstalled: 'Cursor hooks installés',
			suggestInit: `💡 Astuce : Aucun fichier de configuration ${APP_CONFIG_FILE_NAME} trouvé. Type de projet détecté automatiquement et règles prédéfinies utilisées. Exécutez \`${APP_NAME} init\` pour créer un fichier de configuration avec des règles personnalisées.`,
			configHint: '💡 Astuce : Veuillez lire le fichier `{configPath}` pour comprendre les règles spécifiques (liste blanche, liste noire, etc.), ce qui vous aidera à comprendre pourquoi ces fichiers ne répondent pas aux exigences et comment les corriger.',
		},
	},
	meta: {
		rulesFile: 'Fichier de règles : {path}',
		importedRules: 'Règles importées : {path}',
		lang: 'Langue : Français',
		mode: 'Mode : {mode}',
		performance: '{fileCount} fichiers scannés en {duration}ms',
	},
	mode: {
		concise: 'concis',
		verbose: 'détaillé',
	},
	report: {
		foundIssues: '{count} problèmes trouvés',
		foundIssuesWithHint: '{count} problèmes trouvés (ajoutez le paramètre `--verbose` pour obtenir des détails)',
		noIssues: 'Aucun problème trouvé',
		arrow: '→',
		foundRequiredDir: 'répertoire requis trouvé : {dir}',
		foundRequiredFile: 'fichier requis trouvé : {name}',
		missingRequiredDir: 'répertoire requis manquant : {dir}',
		ellipsis: '...',
		workspace: 'workspace : {root}',
		whitelist: 'Liste blanche',
		blacklist: 'Liste noire',
		andMoreItems: 'et {count} éléments de plus',
	},
	issue: {
		move: {
			shouldMoveToDir: 'devrait être déplacé vers {dir}',
			destDirMustExist: 'répertoire requis manquant (pour move {from} to {toDir})',
			destMustBeDir: 'la cible doit être un répertoire (pour move {from} to {toDir})',
			unsafeManual: 'devrait être déplacé vers {dir} (action manuelle requise)',
		},
		thoseOnly: {
			forbiddenOnlyAllowed: 'pas dans la liste autorisée',
			forbiddenTooMany: 'pas dans la liste autorisée',
		},
		renameDir: {
			shouldRenameTo: 'devrait être renommé en {to}',
			shouldMigrateTo: 'devrait être migré vers {to} (la cible existe, action manuelle requise)',
			removeEmptyDir: '{dir} est vide et peut être supprimé (la cible {to} existe)',
		},
		renameGlob: {
			shouldRenameTo: 'devrait être renommé en {to}',
			targetExistsManual: 'devrait être renommé en {to} (la cible existe, action manuelle requise)',
			cannotInferTarget: 'devrait être renommé (impossible d’inférer la cible)',
		},
		inDirOnly: {
			dirMustExist: 'le répertoire doit exister (seulement {only})',
			forbiddenOnlyAllowed: 'pas dans la liste autorisée（{dir} autorise seulement {only}）',
			forbiddenTooMany: 'pas dans la liste autorisée',
		},
		no: {
			forbidden: 'correspond à la liste noire（{name}）',
		},
		has: {
			mustExist: 'fichier introuvable (requis : {name})',
		},
		naming: {
			invalid: 'devrait être {style}',
			invalidPrefix: 'le préfixe devrait être {pattern}',
			invalidSuffix: 'le suffixe devrait être {pattern}',
		},
	},
	errors: {
		parser: {
			invalidWhereDirective: 'directive where invalide',
			invalidPathDirective: 'directive path invalide',
			ruleFormatError: 'erreur de format de règle {rule} : {line}',
			renameMissingSources: 'rename sans sources : {line}',
			unknownPreset: 'preset inconnu : {name}',
			cannotParseLine: 'impossible d’analyser la ligne de règle : {line}',
		},
	},
} satisfies Translation

export default fr

