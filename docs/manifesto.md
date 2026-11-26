# The chous manifesto

> It works. It still stinks.

chous checks a repository's taste: whether it is clean, whether it has order, whether what it is built on has rotted. It does not check correctness, security, performance, features or tests. A repository full of bugs can be elegant; one that is entirely correct can be ugly.

There is one taste. It cannot be configured or switched off. chous has the right to point out ugliness; you have the right to keep it.

## Four tastes

### Modernity

- What has reached end of life stinks, from the day it ends. There is no grace period. That it still runs has nothing to do with it.
- What its authors deprecated, broke on purpose, or call legacy or in maintenance mode themselves: all of it stinks — tsconfig options TypeScript 6 deprecated, Vue CLI in maintenance mode, Cargo's deprecated `authors` field.
- A healthy old technology does not stink. No chasing the new, no pecking order: slow, old or unfashionable is not a smell, and neither is silence nobody announced.

### Order

- One thing, one name: `test/` beside `tests/`, `plugin/` beside `plugins/`, two files that differ only in case.
- One directory, one way of naming. Where the language prescribes none, kebab, snake or camel is yours to pick; just one.
- The root is an entrance, not a heap. Besides the files with a claim to the root (README, LICENSE, CONTRIBUTING and the like, AGENTS.md, CLAUDE.md), it holds at most 3 more docs. That is a stance, not a measurement.
- Hidden files count like any others: a directory starting with `.` does not make what is in it smell any less.
- Configuration as gathered as it can be without crossing responsibilities: one tool's config in one place, each tool its own.
- Nothing laid out flat. Hundreds of files in one directory, every responsibility in one file: neither is organised. But a count proves nothing by itself, so chous does not judge counts; the agent does (see below).
- Which tools you use, and how many, is yours to decide; chous does not count tools by job. It speaks only where a tool speaks itself: Yarn warns that a `package-lock.json` beside `yarn.lock` makes two lockfiles that drift apart.
- One tool, one config per directory. A tool reads one of them by its own precedence (ESLint takes `eslint.config.js` before `.ts`); the rest are never read.
- One fact, said once: a dependency on two major versions, two instruction files with the same text, two workspace lists that disagree, Node pinned twice to different versions.
- How many files or dependencies a project has is not a smell.

### Convention

- Where a framework documents a convention, follow it. A file the framework never reads (`src/app` beside a root `app/` in Next.js, `pages/` outside `app/` in Nuxt 4) is dead code that looks alive, and stinks worst.
- Where the vendor gives a limit, keep to it: Codex reads only the first 32 KiB of AGENTS.md, GitHub warns on files over 50 MiB.
- Where a tool says what it reads, where a file lives or what it is called, follow it: pnpm 11 no longer reads the `pnpm` field of package.json, GitHub Actions reads only `.github/workflows/`. What a tool does not read never takes effect.
- Where a language or framework says how names are written, follow it: Python modules are all lowercase, a Go package name is one lowercase word, Vue components are always PascalCase or always kebab-case. Where the makers call it "unclear" (Rust crate names) or stay "unopinionated" (Next.js, React), chous prescribes nothing either.
- What a tool itself calls an older format or location stinks: `.eslintrc` from ESLint 9, `docker-compose.yml`, `.claude/commands/` (merged into skills).
- Supporting several runtimes is fine, and so is the duplication it needs: `workspaces` in package.json alongside `pnpm-workspace.yaml` lets npm, Yarn and Bun read the workspace too. Only when the two disagree does it stink.
- The convention is what the official docs say, word for word, and every rule cites them.

### Cleanliness

- No build output, OS junk or personal settings in the repository.
- No leftovers of the work: hand-made backups, one-off scripts, the record of one session. History belongs to version control, the story of a change to its pull request.
- No installers in the source tree. What a build hands to users belongs in releases.
- An empty file created for what comes next is fine. Empty is not useless.

## What chous knows

chous only states facts it is sure of, so every finding is one of two:

- **Smell**: the fact is certain and it goes against the taste above. There is nothing to decide. "Node 16 reached end of life on 2023-09-11." "`package.json.bak` is a copy of the `package.json` next to it." "The root holds 9 docs."
- **To review**: the fact is certain, but what it means needs context chous does not have. A file named like a work log: chous knows its name, not what it says. You or your agent decide.

These are not degrees of badness but degrees of knowledge. There are no errors, warnings or hints, and no score. Smells make chous exit non-zero; things to review never do.

**A wrong fact is a false positive; a different taste is not.** Saying Node 16 has reached end of life when it has not is a false positive. Saying it stinks when you find it still useful is not. Famous projects compromise too, and chous makes no exception for any of them.

How chous makes sure of a fact:

- End-of-life dates exist only for the versions the official data lists. A version missing from it is not reported, and no date is ever inferred.
- Versions come from what actually runs: `.nvmrc`, `.node-version`, `.python-version`, `.tool-versions`, `FROM` in any Dockerfile of the project (through any registry, with `ARG` defaults filled in), `volta.node`, framework dependencies. Node codenames (`lts/gallium`) are read through the official schedule. `engines.node` is a promise of compatibility, not a runtime; it is reported only when every version it allows has ended, as with `^16`.
- A file is known by its content, not its name: `Bud1` in a `.DS_Store`, the "must NOT be checked in" Android writes into `local.properties`, the signature at the start of an installer or executable, the marker files a build tool leaves.
- When chous quotes someone, the quote lives with its tool (`src/facts/tools/`) and is checked on its page every week. End-of-life dates are written from the makers' data by a program, and compared every week too.

## What chous does not do

- It does not punish what is missing: no tests, no CI, no TypeScript, no license. chous looks only at the choices you made.
- It does not judge by line counts, sizes or file counts, unless official docs set the limit.
- It does not judge a file by its name: a name can put a file up for review, never make it a smell.
- It adds no exceptions to suit a project. It keeps two kinds of lists only: where official conventions put things, and history that has happened and can be checked (end-of-life dates, deprecations announced by their authors).
- It does not go online, call an AI or need a key.

## What the agent judges

Some taste needs the code read and understood. That is not written into chous's rules; an agent judges it by this manifesto:

- Whether a giant file carries too many responsibilities. Its line count proves nothing; a compiler's code generator is large for good reason. **Do not split a file mechanically to bring its line count down**: one file per responsibility, not one file per thousand lines.
- Whether a directory lays out too much flat and should be grouped by responsibility.
- Languages mixed without reason: one responsibility written in two languages, or a new language brought in for a sliver of functionality.
- Old implementations kept in comments: history belongs to version control.
- Compatibility, adapter and forwarding layers that nothing calls any more.
- Duplicated implementations and needless abstraction.
- Generated code committed without the means to generate it.
- Dispatch records, task reports, delivery notes and per-version release notes piled up in the source and docs: once the work is done, its story is in pull requests and the changelog. chous can only say "22 delivery reports are here"; the agent can read them and decide which still belong.
- Whether a file is still of use: chous can only say "named like a work log"; an agent can read it and decide whether it goes in docs/, in a pull request, or away.
- Whether a dependency can give way to what the platform ships: chous knows what the platform ships, the agent knows which parts of the package this project uses.

`chous manifesto` prints this document and `chous --json` prints every finding as data, so an agent can read the taste first and then review the whole repository, not only what chous listed.

## Appendix: what each rule knows, and what it claims

What each tool says, and which files chous checks for it: [what chous knows](facts.md), generated from the registry. The table below lists the kinds of rule.

| Rule | What chous knows | What chous claims | Taste | Finding |
|---|---|---|---|---|
| Runtimes and frameworks past end of life | The version that runs, and the end-of-life date in its makers' data; where they say only "no longer supported" (Angular), chous says just that | Past end of life stinks | Modernity | Smell |
| `engines.node` that allows only ended versions | The declared range, and each of its versions' end-of-life date | Promise nothing only to the dead | Modernity | Smell |
| Dependencies deprecated, called legacy or sabotaged by their authors | The name, and the authors' public words (npm's deprecated field, the README, a security advisory) | Build nothing on what is dead | Modernity | Smell |
| Files, fields and options a tool itself calls deprecated, obsolete or legacy (an old config format, a retired linter's config, a deprecated manifest field or tsconfig option) | The file or field, the version in use, and the tool's own words | Use what the tool recommends | Modernity | Smell |
| Dependencies the platform now ships | The version from which the platform ships it | Whether it fully replaces the package depends on how the project uses it | Modernity | Review |
| Names that differ only in case or Unicode form; singular and plural directories at the root; synonym directories anywhere (`test/`, `tests/`, `__tests__/`) | Both names exist | One thing, one name | Order | Smell |
| Singular and plural directories side by side deeper down (`language/` and `languages/`) | Both names exist | One kind of thing, one name; they may also be two things | Order | Review |
| Mixed naming styles in one directory | Each name's style | One directory, one style | Order | Smell |
| A crowded root | How many docs without a claim to the root it holds | The root is an entrance | Order | Smell |
| `package-lock.json` beside `yarn.lock` | Both lockfiles in one directory; Yarn's own warning | One fact, said once | Order | Smell |
| A second config of one tool in one directory | Which configs exist, and the order in which the tool's docs say it reads them | One tool, one config | Order | Smell |
| One fact said twice, disagreeing: Node pinned to two versions; in a monorepo, major-version drift, nested lockfiles, workspace lists that differ | Versions, file locations, the two lists | One fact, said once | Order | Smell |
| `CLAUDE.md` identical to `AGENTS.md` | Both files have the same text | Keep one; symlink the other or import it with `@AGENTS.md` | Order | Smell |
| Files and fields a tool does not read: in the wrong place, under the wrong name, shadowed by another, or dropped from some version on | Place, name, the version in use, and the tool's own words | Write what the tool reads, where it reads it | Convention | Smell |
| Sizes past a limit a tool or platform states (GitHub's file sizes, Codex's AGENTS.md, line limits of agent instructions) | Bytes, lines or characters, and the stated limit | Keep to the stated limit | Convention | Smell |
| Names that break a language's or framework's naming rules (file names, directory names, or the package name a file declares) | The name, and the style guide's own words | Name things the language's way | Convention | Smell |
| Names and fields that break a stated spec (npm package names, the Agent Skills spec) | The name or the frontmatter | Follow the spec | Convention | Smell |
| Directories a framework never reads; capitalised directories it cannot find | The rule as the framework's docs state it | Follow the framework's convention | Convention | Smell |
| Build output | A marker file its tool writes, or a build script | Build output is not committed | Cleanliness | Smell |
| OS junk, crash dumps (ELF core files), `local.properties` | The content the OS or Android Studio writes | No OS junk or machine settings committed | Cleanliness | Smell |
| Files their own tools say not to commit (`.env*.local`, personal IDE and agent settings, local Worker secrets) | The name, and the tool's own words: do not commit it | Nothing personal or local is committed | Cleanliness | Smell |
| A backup next to its original (`package.json.bak`, `index - Copy.ts`, `src copy/`; a name that only says old or backup must have the original's exact bytes) | The original is right there | Git already keeps the old version | Cleanliness | Smell |
| Installers (`.apk`, `.ipa`, `.msi`, `.deb`, …) | The file's signature confirms the format | What users get belongs in releases | Cleanliness | Smell |
| Executables and libraries (`.exe`, `.dll`, `.so`, `.dylib`, and ELF or Mach-O files with no extension) | The file's signature confirms the format | Built by this project: releases. Read by a build: keep it | Cleanliness | Review |
| Docs named like work logs | The name | The record of one session belongs in its pull request | Cleanliness | Review |
| Scripts named like one-offs that nothing mentions | The name, and that no file refers to it | Delete it once it has run | Cleanliness | Review |
| Files named like logs (`*.log`) | The name | A program's logs are not committed; test input can stay | Cleanliness | Review |
| A backup without its original | The name | It may be a backup, or not | Cleanliness | Review |
| A series of per-version release notes, a pile of work records | At least 5 in one directory | History lives in the changelog and pull requests | Cleanliness | Review |

Test fixtures (`fixtures/`, `testdata/`, `__snapshots__/`) are data, and `vendor/`, `third_party/` and `upstream/` hold someone else's code; neither is checked. `tests/`, `examples/` and `playground/` are your own code and are checked like the rest.
