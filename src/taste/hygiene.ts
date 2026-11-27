/**
 * Repository hygiene: what should never be committed, known by evidence a tool
 * or the operating system leaves (a marker file, a signature, its own header),
 * never by the words in a name. A name in English, Chinese or Korean says the
 * same nothing to chous; only names a tool defines count, with content to confirm.
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

/**
 * Output found by what its tool writes into it, whatever the directory is
 * called: the file says itself what it is. `dir` reports the directory the
 * marker sits in; otherwise the file itself.
 */
export const MARKED_OUTPUT: Array<{ name: RegExp; content: RegExp; key: "cache" | "venv" | "cmake" | "tsbuildinfo"; dir: boolean }> = [
  // The Cache Directory Tagging spec's signature; pytest, Ruff, mypy, Cargo and uv write it.
  { name: /^CACHEDIR\.TAG$/, content: /^Signature: 8a477f597d28d172789f06886806bc55/, key: "cache", dir: true },
  // venv writes the interpreter's `home` into pyvenv.cfg at the environment's root.
  { name: /^pyvenv\.cfg$/, content: /^home[ \t]*=/m, key: "venv", dir: true },
  { name: /^CMakeCache\.txt$/, content: /^# This is the CMakeCache file\./, key: "cmake", dir: true },
  // tsc's build state: TypeScript 4 starts it with `program`, 5 with `fileNames` or `root`.
  { name: /\.tsbuildinfo$/, content: /^\{"(program|fileNames|root)":/, key: "tsbuildinfo", dir: false },
];

/**
 * chous's stance on sizes, not a measurement of quality: past these, a person
 * or an agent should look. Chosen against 85 real repositories (test/corpus.json)
 * so that what is reported is the tail, not the norm: half of them have a
 * source file over 1000 lines, a sixth have more than 30 files at the root.
 * A file of 50 MiB does not belong in a repository's history: chous's policy,
 * whatever a host allows.
 */
export const MEASURES = {
  sourceLines: 1000,
  /** Long lines count too: a source file this heavy is worth a look, minified or not. */
  sourceBytes: 100 * 1024,
  filesPerDir: 50,
  rootFiles: 30,
  duplicateBytes: 4096,
  instructionLines: 300,
  /** The files agents read whole whenever they work in that directory. */
  instructions: /(^|\/)(AGENTS|CLAUDE|GEMINI)\.md$|^\.github\/copilot-instructions\.md$/,
  hugeBytes: 50 * 1024 * 1024,
};

/** Source code, by the extensions compilers and interpreters read. */
export const SOURCE_FILE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|vue|svelte|astro|py|go|rs|rb|php|java|kt|kts|scala|swift|m|mm|dart|c|h|cc|cpp|cxx|hpp|cs|fs|ex|exs|erl|zig|lua|sh|bash|ps1|sql|r|jl|hs|ml|clj|groovy|gradle)$/i;

/** Signs that a package builds something: a `build` script, or a bundler's config next to package.json. */
export const BUNDLER_CONFIG = /^(vite|vitest|tsdown|tsup|rollup|rolldown|webpack|esbuild|unbuild|parcel|rspack|rsbuild|svelte|astro|nuxt|next)\.config\.[cm]?[jt]s$|^tsconfig(\.[\w-]+)?\.json$/;

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
 * Source files whose directory should keep to one naming style, compared within
 * one language: PEP 8's `snake_case.py` beside a kebab TypeScript config is two
 * languages' habits, not a mix. Languages that prescribe the style themselves
 * are held to it by their facts instead (src/facts/tools/: Rust, Dart, Kotlin,
 * Elixir), and so are camelCase Python modules (PEP 8).
 *
 * The unit is the language, not the extension: `fooBar.js` beside `baz-qux.ts`
 * is one kind of module named two ways. Single-file components belong to their
 * language too: Vue's style guide names component files (PascalCase or
 * kebab-case throughout) and nothing else, so `date-picker.vue` beside
 * `datePicker.ts` is two conventions in one place, where `date-picker.ts`
 * would be one.
 */
const LANGUAGES: Array<[string, RegExp]> = [
  ["js", /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|vue|svelte|astro)$/],
  ["py", /\.py$/],
  ["go", /\.go$/],
  ["zig", /\.zig$/],
  ["rb", /\.rb$/],
  ["swift", /\.swift$/],
];
export const languageOf = (name: string) => LANGUAGES.find(([, ext]) => ext.test(name))?.[0];

/**
 * The chosen part of a Go file name. go/build reads a `_test` suffix, then
 * `_GOOS`, `_GOARCH` or `_GOOS_GOARCH`, as build constraints: they are the go
 * command's words, not a naming style.
 */
const GOOS = "aix|android|darwin|dragonfly|freebsd|hurd|illumos|ios|js|linux|nacl|netbsd|openbsd|plan9|solaris|wasip1|windows|zos";
const GOARCH = "386|amd64|arm|arm64|loong64|mips|mips64|mips64le|mipsle|ppc64|ppc64le|riscv64|s390x|wasm";
const GO_CONSTRAINT = new RegExp(`(_(${GOOS}))?(_(${GOARCH}))?$`);
export const goStem = (name: string) => name.slice(0, -".go".length).replace(/_test$/, "").replace(GO_CONSTRAINT, "");

/** Names a tool chose, not the project: type shims, generated files, framework file conventions. */
export const NAME_EXEMPT = /\.d\.[mc]?ts$|\.gen\.|^(not-found|global-error|global-not-found|instrumentation-client|mdx-components)\./;

/**
 * Root docs with a claim to the root: hosts and tools look for them there.
 * README and LICENSE everywhere; GitHub's community health files; the files
 * coding agents read. Everything else is a doc like any other, and docs
 * belong together.
 */
const LANGUAGE_TAG = "[a-z]{2}(?:[-_][a-z]{2,4})?|zh[a-z]"; // zh-CN, ja_JP, en, zht
const LICENSE_PART = "mit|apache(?:-?2(?:\\.0)?)?|bsd(?:-\\d-clause)?|[al]?gpl[\\w.-]*|mpl[\\w.-]*|isc|cc0[\\w.-]*|cc-by[\\w.-]*|ofl";
/**
 * The name exactly, in another language (`README.zh-CN.md`, `README_EN.md`),
 * or a license's companion by its SPDX identifier (`LICENSE-MIT`). Any other suffix
 * is a name of its own: no host looks for `README_IMPLEMENTATION_COMPLETE.md`.
 */
export const ROOT_CONTRACT_DOCS = new RegExp(
  `^(?:(?:readme|changelog|contributing|security|code_of_conduct|support|governance|accessibility|agents|claude|gemini)(?:[._-](?:${LANGUAGE_TAG}))?` +
    `|(?:licen[cs]e|copying|unlicense|notice)(?:[._-](?:${LICENSE_PART}|${LANGUAGE_TAG}))?)` +
    "(?:\\.(?:md|mdx|markdown|txt|rst|adoc|asciidoc|org))?$",
  "i",
);

/** Prose, as opposed to config: what counts as a doc at the root. */
export const DOC_FILE = /\.(md|mdx|markdown|rst|adoc|asciidoc|org)$/i;

/**
 * chous's position, not a measurement: the root is an entrance. Past this many
 * docs besides the contract ones, they belong in `docs/`.
 */
export const ROOT_DOCS_LIMIT = 3;

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
export const INSTALLERS: Array<{ ext: RegExp; magic: string[]; trailer?: string }> = [
  // A macOS disk image (UDIF) signs its last 512 bytes, not its first.
  { ext: /\.dmg$/i, magic: [], trailer: "koly" },
  { ext: /\.(apk|aab|ipa|msix|xapk|apks|vsix|nupkg)$/i, magic: [ZIP] },
  { ext: /\.pkg$/i, magic: ["xar!"] },
  { ext: /\.crx$/i, magic: ["Cr24"] },
  { ext: /\.snap$/i, magic: ["hsqs"] },
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
  // What Go, Rust and C builds name `server` or `myapp`: no extension, known by the header alone.
  { ext: /^[^.]+$/, magic: [ELF, ...MACH_O] },
  { ext: /^(vg)?core\.\d+$/, magic: [ELF] },
];

/** An ELF file whose type (bytes 16-17, in the byte order byte 5 names) is ET_CORE: a crash dump the OS wrote, not a program. */
export function isCoreDump(header: string): boolean {
  if (!header.startsWith(ELF) || header.length < 18) return false;
  const bigEndian = header.charCodeAt(5) === 2;
  const type = bigEndian ? (header.charCodeAt(16) << 8) | header.charCodeAt(17) : (header.charCodeAt(17) << 8) | header.charCodeAt(16);
  return type === 4;
}

/**
 * Data, and other people's code, by the names the tools that put them there
 * define: npm's `node_modules/`; `vendor/` (Go: "a vendor directory named
 * "vendor"", and GitHub Linguist's vendor.yml, `vendors?/`); Go's `testdata/`
 * ("The go tool will ignore a directory named "testdata""); the
 * `__snapshots__/` Jest and Vitest write; Linguist's test fixtures,
 * `tests/fixtures/` and `specs/fixtures/`. Any other name is the repository's
 * to declare: `linguist-vendored` or `linguist-generated` in .gitattributes
 * (src/vfs/gitattributes.ts). Tests and examples are the project's own code.
 */
export const NOT_OURS = /(^|\/)(node_modules|vendors?|testdata|__snapshots__)\/|(^|\/)([Tt]ests?|[Ss]pecs?)\/fixtures\//;

/**
 * Files known by what their maker writes into them, not by name alone: a file
 * by the same name that lacks it is something else.
 */
/** Files their makers write, known by what is in them; names are compared without case (`Desktop.ini`, `thumbs.db`). */
export const KNOWN_BY_CONTENT: Array<{ name: RegExp; content: RegExp; reason: "reason.osJunk" | "reason.localProperties"; binary?: boolean }> = [
  { name: /^\.ds_store$/i, content: /Bud1/, reason: "reason.osJunk" },
  // macOS AppleDouble resource forks (`._name`), written when copying to other file systems: 00 05 16 07.
  { name: /^\._./, content: new RegExp(`^${String.fromCharCode(0, 5, 0x16, 7)}`), reason: "reason.osJunk", binary: true },
  // An OLE compound file: D0 CF 11 E0.
  { name: /^(eh)?thumbs\.db$/i, content: new RegExp(`^${String.fromCharCode(0xd0, 0xcf, 0x11, 0xe0)}`), reason: "reason.osJunk" },
  { name: /^desktop\.ini$/i, content: /ShellClassInfo|LocalizedFileNames|ViewState/i, reason: "reason.osJunk" },
  // Android Studio's own header: "This file must *NOT* be checked into Version Control Systems".
  { name: /^local\.properties$/, content: /must \*NOT\* be checked into Version Control/i, reason: "reason.localProperties" },
];

