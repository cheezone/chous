# chous's rules

[The manifesto](manifesto.md) says what chous stands for; this document says what it checks and on what evidence. The numbers and lists here may be adjusted; the manifesto stays. The little chous knows about named software (end-of-life schedules, deprecations, a language's naming rules) is in [what chous knows](facts.md), generated from the registry.

## The stance

Sizes and counts only put something up for review; they settle nothing. The numbers are chous's stance, not a measure of quality: in 87 real repositories (`test/corpus.json`) they pick out the tail of the distribution.

| Check | Stance |
|---|---|
| A source file | over 1000 lines, or over 100 KiB |
| Source files laid out flat in one directory | more than 50 |
| Files at the root | more than 30 |
| Docs at the root, besides README, LICENSE and the like | more than 3 (this one is a smell) |
| Agent instructions (AGENTS.md, CLAUDE.md, GEMINI.md, Copilot's) | over 300 lines |
| Directories that copy each other | at least 10 files at the same relative paths byte for byte, and at least half of what both hold; only the outermost pair; directories copied from one another are one set while the whole set still meets this, apart otherwise; common names are skipped only to find candidates, never when counting; their files leave the files with identical content |
| Files with identical content | 4 KiB and up; agent instructions at any size |
| One file | 50 MiB and up (a smell) |

`chous --json` gives every fact behind a finding in full: every long file, flat directory, set of directories copying each other (with the files that changed), set of copies, root doc and committed-but-ignored file, untruncated. The human report lists the first few.

## How chous makes sure of a fact

- End-of-life dates exist only for the versions the official data lists. A version missing from it is not reported, and no date is ever inferred.
- Versions come from what actually runs: `.nvmrc`, `.node-version`, `.python-version`, `.tool-versions`, `FROM` in any Dockerfile of the project (through any registry, with `ARG` defaults filled in), the version a GitHub workflow job sets up or the container it runs in, a dev container's image and features, `volta.node`, framework dependencies. A CI matrix tests a promise of compatibility, like `engines`, and is not read. Node codenames (`lts/gallium`) are read through the official schedule. `engines.node` is a promise of compatibility, not a runtime; it is reported only when every version it allows has ended, as with `^16`.
- A file is known by its content, not its name: `Bud1` in a `.DS_Store`, the "must NOT be checked in" Android writes into `local.properties`, the signature at the start of an installer or executable, the marker files a build tool leaves.
- When chous quotes someone, the quote lives with its tool (`src/facts/tools/`) and is checked once, when it is added: a page rewording a sentence is not news. End-of-life dates are written from the makers' data by a program, and compared every week.

## Scope

Only two kinds of things go unchecked, under the names the tools that put them there define: npm's `node_modules/`; `vendor/` (the name Go requires, and `vendors?/` in GitHub Linguist's vendor.yml); Go's `testdata/` ("The go tool will ignore a directory named "testdata""); the `__snapshots__/` Jest and Vitest write; the test fixtures Linguist knows, `tests/fixtures/` and `specs/fixtures/`. Any other name chous does not guess: the repository declares it in `.gitattributes`, the way GitHub reads it (`upstream/** linguist-vendored`; `linguist-generated` counts too, and `-linguist-vendored` takes a path back). `tests/`, `examples/` and `playground/` are your own code and are checked like the rest.

Untracked files are seen as git sees them: what `.gitignore`, `.git/info/exclude` and the global excludes file (`core.excludesFile`, by default `~/.config/git/ignore`) hide, `git status` does not show, and neither does chous. The last two belong to one machine, so they hide untracked files only; "committed although ignored" reads the repository's own `.gitignore` alone. Run in a folder that is no repository but holds several, chous checks each repository on its own and gives one report, its paths starting with the repository's folder.

## What each rule knows, and what it claims

| Rule | What chous knows | What chous claims | Taste | Finding |
|---|---|---|---|---|
| Runtimes and frameworks past end of life | The version that runs, and the end-of-life date in its makers' data; where they say only "no longer supported" (Angular), chous says just that | Past end of life stinks | Modernity | Smell |
| `engines.node` that allows only ended versions | The declared range, and each of its versions' end-of-life date | Promise nothing only to the dead | Modernity | Smell |
| Dependencies deprecated or called legacy by their authors | The name, and the authors' public words: npm's deprecated field (copied into the lockfile by pnpm and npm at install time; chous reads it there, for the dependencies package.json names), the README, a security advisory | Build nothing on what is dead | Modernity | Smell |
| A manifest field its tool deprecated (Cargo's `authors`) | The field, and the tool's own words | Use what the tool recommends | Modernity | Smell |
| Names that differ only in case or Unicode form | Both names exist | One thing, one name | Order | Smell |
| Names Windows cannot check out | The reserved device names Microsoft lists (with an extension too), the characters it does not allow, a name ending in a space or a period | A repository checks out on every system | Order | Smell |
| Naming styles mixed in one directory | The style of each file name, compared within one language, not one extension (`.ts`, `.js` and `.vue` are one language); subdirectory names too, but only subdirectories holding JavaScript or TypeScript alone (a Python package, a Rust module or a Gradle source set is named by its language or tool); dot directories and `node_modules` are not compared; PascalCase and one-word names fit any style | One directory, one style | Order | Smell |
| Too many docs at the root | How many docs without a claim to the root sit there | The root is an entrance | Order | Smell |
| In a monorepo: a dependency on several majors, nested lockfiles, workspace lists that disagree | Versions, file locations, the two lists | One fact, said once | Order | Smell |
| Source files over 1000 lines or 100 KiB (not generated or someone else's) | Lines and bytes; long lines are not skipped | Whether one does too much is the agent's call; never split mechanically | Order | Review |
| A directory with more than 50 source files laid out flat | The count | Whether to group by responsibility is the agent's call | Order | Review |
| More than 30 files at the root | The count | The root is an entrance | Order | Review |
| Directories that copy each other | How many files at the same relative paths are identical, and how many have changed (paths and bytes only) | Whether they should be one is for an agent to judge, starting with the files that changed | Order | Review |
| Files with identical content (4 KiB and up; agent instructions at any size) | The same bytes; one file reached through a symlink counts once | Keep one, or have a reason for several | Order | Review |
| Agent instructions (AGENTS.md, CLAUDE.md, GEMINI.md, Copilot's) over 300 lines | The line count | Keep what applies every time | Order | Review |
| Names against a language's naming rules (file and directory names, or a package declared inside) | The name, and the language's style guide | Name things the language's way | Convention | Smell |
| Build output, caches and virtual environments, whatever the directory is called | A marker file its tool writes (`CACHEDIR.TAG`, `pyvenv.cfg`, `CMakeCache.txt`, a `.tsbuildinfo`), or a build script | Build output is not committed | Cleanliness | Smell |
| OS junk, core dumps (ELF core files), `local.properties` | The content the OS or Android Studio wrote | No OS junk or machine settings | Cleanliness | Smell |
| Files their own tools say not to commit (`.env*.local`, `.idea/workspace.xml`) | The name, and the tool's "do not commit" | Nothing personal or local | Cleanliness | Smell |
| Files committed although .gitignore ignores them (not empty placeholders, nor a directory's own .gitignore) | The git index and .gitignore say opposite things | Untrack it, or write the exception with `!` | Cleanliness | Smell |
| Files of 50 MiB and more | The size | A file this large does not belong in a repository's history; use Git LFS or releases (chous's policy, whatever a host allows) | Cleanliness | Smell |
| Installers (`.apk`, `.ipa`, `.msi`, `.deb`, `.dmg`, …) | The file's signature confirms the format | What users get belongs in releases | Cleanliness | Smell |
| Executables and libraries (`.exe`, `.dll`, `.so`, `.dylib`, and ELF or Mach-O without an extension) | The file's header confirms the format | Releases if this project builds it; keep it if a build reads it | Cleanliness | Review |
