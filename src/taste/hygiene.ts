/**
 * Repository hygiene: build output that should never be committed, and agent
 * work logs that should never sit at the root.
 */

/**
 * Directories that are build output. A name alone can lie — Vite commits
 * hand-written `node_modules` fixtures, Oxc has a crate called `coverage`,
 * Deno hand-writes `dist/` packages — so every entry needs evidence the tool
 * left behind: a file only it writes inside (`marker`, `markerMatch`), the
 * project file next to it (`when`), or a build that produces it (`built`).
 */
export const ARTIFACT_DIRS: Array<{ dir: string; when?: string[]; unless?: string[]; marker?: string[]; markerMatch?: RegExp; built?: boolean }> = [
  { dir: "node_modules", marker: [".package-lock.json", ".modules.yaml", ".yarn-integrity", ".yarn-state.yml"] },
  { dir: ".next", marker: ["BUILD_ID", "build-manifest.json", "cache", "server", "trace", "types"] },
  { dir: ".nuxt", marker: ["nuxt.d.ts", "tsconfig.json", "manifest"] },
  { dir: ".output", marker: ["nitro.json"] },
  { dir: ".svelte-kit", marker: ["ambient.d.ts", "tsconfig.json", "generated"] },
  { dir: "__pycache__", markerMatch: /\.pyc$/ },
  // Gradle's docs: `.gradle` and `build` "are transient files Gradle uses to support features like incremental builds".
  { dir: ".gradle", when: ["settings.gradle", "settings.gradle.kts", "build.gradle", "build.gradle.kts", "gradlew"], marker: ["buildOutputCleanup", "vcs-1", "file-system.probe"] },
  { dir: "coverage", marker: ["lcov.info", "coverage-final.json", "coverage-summary.json", "clover.xml", "lcov-report"] },
  // Cargo writes CACHEDIR.TAG and .rustc_info.json; Maven's plugins write maven-status / maven-archiver.
  { dir: "target", when: ["Cargo.toml", "pom.xml"], marker: ["CACHEDIR.TAG", ".rustc_info.json", "maven-status", "maven-archiver", "classes"] },
  { dir: "build", when: ["build.gradle", "build.gradle.kts"], marker: ["tmp", "intermediates", "classes", "generated", "reports", "outputs", "libs", "kotlin"] },
  // GitHub's docs tell JavaScript actions to commit dist/.
  // Built only if something builds it: Deno's test registry hand-writes `dist/` packages.
  { dir: "dist", when: ["package.json"], unless: ["action.yml", "action.yaml"], built: true },
];

/** Signs that a package builds something: a `build` script, or a bundler's config next to package.json. */
export const BUNDLER_CONFIG = /^(vite|vitest|tsdown|tsup|rollup|rolldown|webpack|esbuild|unbuild|parcel|rspack|rsbuild|svelte|astro|nuxt|next)\.config\.[cm]?[jt]s$|^tsconfig(\.[\w-]+)?\.json$/;

/**
 * Leftovers. chous knows a file's name, place and content; it does not know
 * what the file is for. So a name alone never makes a smell: a file named
 * like a work log or a one-off script is put up for review, and a backup is a
 * smell only when the original sits right next to it.
 */

/** Named like a work log: `IMPLEMENTATION_COMPLETE.md`, `FIXES_SUMMARY.md`, `PHASE_4_PLAN.md`. Any name at the root; SCREAMING_CASE deeper down. */
export const WORKLOG = /(^|[_\-. ])(summary|complete|completed|completion|status|progress|report|reports|fix|fixes|fixed|bugfix|hotfix|done|improvements?|implementation|changes[_-]made|session|handoff|walkthrough|analysis|cleanup|audit|debug|phase[_-]?\d*|prompts?|brief)([_\-. ]|$)/i;

/**
 * Root directories that mean the same thing. Which name you pick is up to you;
 * two of them is a mess. `spec/` is left out: it may hold tests (RSpec) or
 * specifications (fastrender keeps the WHATWG specs there). Plain plurals (`plugin/` + `plugins/`) are found
 * without a list.
 */
export const SYNONYM_DIRS = [["test", "tests", "__tests__"]];

/**
 * Naming styles of multi-word file names. One word (`index`) fits every style;
 * PascalCase is left out on purpose: components and classes are PascalCase in
 * projects whose other files are kebab or camel (React, Vue, Svelte).
 */
export function nameStyle(stem: string): "kebab-case" | "snake_case" | "camelCase" | undefined {
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(stem)) return "kebab-case";
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(stem)) return "snake_case";
  if (/^[a-z][a-z0-9]*([A-Z][a-z0-9]*)+$/.test(stem)) return "camelCase";
  return undefined;
}

/**
 * Source files whose directory should keep to one naming style. Languages that
 * prescribe the style themselves are held to it by their facts instead
 * (src/facts/tools/: Rust, Dart, Kotlin, Elixir, Vue), and so are camelCase
 * Python modules (PEP 8) and an Angular app's TypeScript.
 */
export const SOURCE_FILE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|svelte|astro|py|go|zig|rb|swift)$/;

/** Names a tool chose, not the project: type shims, generated files, framework file conventions. */
export const NAME_EXEMPT = /\.d\.[mc]?ts$|\.gen\.|^(not-found|global-error|global-not-found|instrumentation-client|mdx-components)\./;

/** Decision records and book tables of contents are formats, not logs: `docs/adr/ADR-003-…`, mdBook's `src/SUMMARY.md`. */
export const DECISION_RECORD = /(^|\/)(adrs?|decisions|rfcs?)\/|(^|\/)(adr|rfc)[-_]?\d/i;

/**
 * Root docs with a claim to the root: hosts and tools look for them there.
 * README and LICENSE everywhere; GitHub's community health files; the files
 * coding agents read. Everything else is a doc like any other, and docs
 * belong together.
 */
export const ROOT_CONTRACT_DOCS = /^(readme|licen[cs]e|copying|unlicense|notice|changelog|contributing|security|code_of_conduct|support|governance|accessibility|agents|claude|gemini)([.\-_].*)?$/i;

/** Prose, as opposed to config: what counts as a doc at the root. */
export const DOC_FILE = /\.(md|mdx|markdown|rst|adoc|asciidoc|org)$/i;

/**
 * chous's position, not a measurement: the root is an entrance. Past this many
 * docs besides the contract ones, they belong in `docs/`.
 */
export const ROOT_DOCS_LIMIT = 3;

/** Named like a one-off script: `fix_login.sh`, `test_api.py`, `debug-auth.js`. */
export const ONE_OFF_SCRIPT = /^(fix|test|debug|check|verify|temp|tmp|quick|try)[_-][\w.-]*\.(sh|bash|py|js|mjs|cjs|ts|bat|cmd|ps1)$/i;

/**
 * Hand-made copies, and the name of the original they were copied from:
 * `package.json.bak` ← `package.json`, `logo (1).png` ← `logo.png`.
 */
export function backupOf(name: string): string | undefined {
  const forms: Array<[RegExp, string]> = [
    [/^(.+)\.(bak|backup|orig|old)$/i, "$1"],
    [/^(.+)_original$/i, "$1"],
    [/^(.+)~$/, "$1"],
    [/^(.+) \(\d+\)(\.\w+)?$/, "$1$2"],
    [/^(.+) copy(\.\w+)?$/i, "$1$2"],
  ];
  for (const [re, to] of forms) if (re.test(name)) return name.replace(re, to);
  return undefined;
}

/** File signatures, as latin1 strings: the format is read from the bytes, never from the extension. */
const ZIP = "PK\x03\x04";
const MZ = "MZ";
const ELF = "\x7fELF";
const OLE = "\xd0\xcf\x11\xe0";
const MACH_O = ["\xfe\xed\xfa\xce", "\xfe\xed\xfa\xcf", "\xce\xfa\xed\xfe", "\xcf\xfa\xed\xfe", "\xca\xfe\xba\xbe"];

/**
 * Installers and app bundles: what a build hands to users, never what a build
 * reads. In the source tree they are a smell; they belong in releases.
 */
export const INSTALLERS: Array<{ ext: RegExp; magic: string[] }> = [
  { ext: /\.(apk|aab|ipa|msix)$/i, magic: [ZIP] },
  { ext: /\.msi$/i, magic: [OLE] },
  { ext: /\.deb$/i, magic: ["!<arch>"] },
  { ext: /\.rpm$/i, magic: ["\xed\xab\xee\xdb"] },
  { ext: /\.appimage$/i, magic: [ELF] },
];

/**
 * Executables and libraries. A build may read them as well as write them —
 * Android packages prebuilt `.so` files from `src/main/jniLibs`, uv embeds its
 * trampolines — so they are put up for review, not called a smell.
 */
export const EXECUTABLES: Array<{ ext: RegExp; magic: string[] }> = [
  { ext: /\.(exe|dll)$/i, magic: [MZ] },
  { ext: /\.so(\.\d+)*$/i, magic: [ELF] },
  { ext: /\.dylib$/i, magic: MACH_O },
];

/**
 * Data, and other people's code: test fixtures may hold anything (`fixtures/`,
 * and named ones like Nuxt's `components-fixture/`), `vendor/` is someone
 * else's taste. Tests and examples are the project's own code and are checked
 * like the rest.
 */
export const NOT_OURS = /(^|\/)([\w.-]+-)?(fixtures?|__fixtures__|testdata|test-data|__snapshots__|vendor|third_party)\//i;

/**
 * Files known by what their maker writes into them, not by name alone: a file
 * by the same name that lacks it is something else.
 */
export const KNOWN_BY_CONTENT: Array<{ name: string; content: RegExp; reason: "reason.osJunk" | "reason.localProperties" }> = [
  { name: ".DS_Store", content: /Bud1/, reason: "reason.osJunk" },
  // An OLE compound file: D0 CF 11 E0.
  { name: "Thumbs.db", content: new RegExp(`^${String.fromCharCode(0xd0, 0xcf, 0x11, 0xe0)}`), reason: "reason.osJunk" },
  { name: "desktop.ini", content: /ShellClassInfo|LocalizedFileNames|ViewState/i, reason: "reason.osJunk" },
  // Android Studio's own header: "This file must *NOT* be checked into Version Control Systems".
  { name: "local.properties", content: /must \*NOT\* be checked into Version Control/i, reason: "reason.localProperties" },
];

/** Release notes kept one file per version: `v2.0.1.md`, `1.4.0.md`. */
export const VERSION_NAMED = /^v?\d+\.\d+(\.\d+)?([-.][\w.]+)?$/i;

/** Directories that hold records of work done. */
export const RECORD_DIRS = /^(reports?|handoffs?|progress|sessions?|worklogs?|task-reports?)$/i;

/** How many alike files make a series. */
export const SERIES = 5;
