# The chous manifesto

> It works. It still stinks.

chous checks a repository's taste: whether it is clean, whether it has order, whether what it is built on has rotted. It does not check correctness, security, performance, features or tests. A repository full of bugs can be elegant; one that is entirely correct can be ugly.

There is one taste. It cannot be configured or switched off. chous has the right to point out ugliness; you have the right to keep it.

## Four tastes

### Modernity

- What has reached end of life stinks, from the day it ends. There is no grace period. That it still runs has nothing to do with it.
- What its authors deprecated, broke on purpose, or call legacy or in maintenance mode themselves: all of it stinks — a package its authors deprecated on npm, Vue CLI in maintenance mode, Cargo's deprecated `authors` field.
- A healthy old technology does not stink. No chasing the new, no pecking order: slow, old or unfashionable is not a smell, and neither is silence nobody announced.

### Order

- One thing, one name. What chous can see is spelling: two names that differ only in case or Unicode form. Whether `test/` and `tests/` are one thing takes reading the words; that is for the agent.
- One directory, one way of naming. Where the language prescribes none, kebab, snake or camel is yours to pick; just one.
- The root is an entrance, not a heap. Besides the files with a claim to the root (README, LICENSE, CONTRIBUTING and the like, AGENTS.md, CLAUDE.md), it holds at most 3 more docs. That is a stance, not a measurement.
- Hidden files count like any others: a directory starting with `.` does not make what is in it smell any less.
- Configuration as gathered as it can be without crossing responsibilities: one tool's config in one place, each tool its own.
- Nothing laid out flat, nothing piled up. Hundreds of files in one directory, every responsibility in one file: neither is organised. chous points out what passes its stance (see "What chous does not do"); whether responsibilities have piled up is for the agent.
- Which tools you use, and how many, is yours to decide; chous does not count tools by job.
- One fact, said once: a dependency on two major versions, or two workspace lists that disagree, stinks; files with identical content should be one, or have a reason to be several.
- How many dependencies a project has is not a smell.

### Convention

- Where a language says how names are written, follow it: Python modules are all lowercase, a Go package name is one lowercase word, Dart files are lowercase_with_underscores. Where the makers call it "unclear" (Rust crate names) or stay unopinionated, chous prescribes nothing either. Frameworks' conventions change with their versions; chous does not collect them.
- Supporting several runtimes is fine, and so is the duplication it needs: `workspaces` in package.json alongside `pnpm-workspace.yaml` lets npm, Yarn and Bun read the workspace too. Only when the two disagree does it stink.
- The convention is what the official docs say, word for word, and every rule cites them.
- chous collects only conventions that hold for years without upkeep. A tool's config fields, read order, default limits and behaviour from some version on all change; they are not collected. The tool diagnoses them itself, and an agent can read its current docs.

### Cleanliness

- No build output, OS junk or personal settings in the repository.
- No leftovers of the work: hand-made backups, one-off scripts, the record of one session. History belongs to version control, the story of a change to its pull request.
- No installers in the source tree. What a build hands to users belongs in releases.
- An empty file created for what comes next is fine. Empty is not useless.

## What chous knows

chous only states facts it is sure of, so every finding is one of two:

- **Smell**: the fact is certain and it goes against the taste above. There is nothing to decide. "Node 16 reached end of life on 2023-09-11." "`dist/` is ignored by .gitignore, yet committed." "The root holds 9 docs."
- **To review**: the fact is certain, but what it means needs context chous does not have. An executable: chous knows its format from its header, not whether a build made it or reads it. You or your agent decide.

These are not degrees of badness but degrees of knowledge. There are no errors, warnings or hints, and no score. Smells make chous exit non-zero; things to review never do.

**A wrong fact is a false positive; a different taste is not.** Saying Node 16 has reached end of life when it has not is a false positive. Saying it stinks when you find it still useful is not. Famous projects compromise too, and chous makes no exception for any of them.

How chous makes sure of a fact:

- End-of-life dates exist only for the versions the official data lists. A version missing from it is not reported, and no date is ever inferred.
- Versions come from what actually runs: `.nvmrc`, `.node-version`, `.python-version`, `.tool-versions`, `FROM` in any Dockerfile of the project (through any registry, with `ARG` defaults filled in), the version a GitHub workflow job sets up or the container it runs in, a dev container's image and features, `volta.node`, framework dependencies. A CI matrix tests a promise of compatibility, like `engines`, and is not read. Node codenames (`lts/gallium`) are read through the official schedule. `engines.node` is a promise of compatibility, not a runtime; it is reported only when every version it allows has ended, as with `^16`.
- A file is known by its content, not its name: `Bud1` in a `.DS_Store`, the "must NOT be checked in" Android writes into `local.properties`, the signature at the start of an installer or executable, the marker files a build tool leaves.
- When chous quotes someone, the quote lives with its tool (`src/facts/tools/`) and is checked once, when it is added: a page rewording a sentence is not news. End-of-life dates are written from the makers' data by a program, and compared every week.

## What chous does not do

- It does not punish what is missing: no tests, no CI, no TypeScript, no license. chous looks only at the choices you made.
- Line counts, sizes and file counts settle nothing. Past chous's stance they are put up for review: a source file over 1000 lines, a directory with more than 50 source files laid out flat, more than 30 files at the root, agent instructions over 300 lines, and files with identical content. Whether responsibilities have piled up is for the agent, which **must not split files mechanically**. The numbers are a stance, not a measure of quality: in 85 real repositories they pick out the tail of the distribution. Well-known projects are not the standard of taste. What GitHub refuses (it warns from 50 MiB and rejects 100 MiB) is the platform's hard limit, and a smell.
- It does not read the words in a name: `FIXES_SUMMARY.md`, `index.ts.bak`, `报告-最终版.md` and `백업.ts` all say nothing to chous. A rule that has to guess again in every language is not a fact. Only names a tool or the operating system defines count, and only with content to confirm them.
- It adds no exceptions to suit a project. It keeps two kinds of lists only: history that has happened and can be checked (end-of-life dates, deprecations announced by their authors), and a few conventions that have not changed in decades (a language's naming rules, the exact file names a tool defines).
- It does not collect ecosystem knowledge that moves: apart from end of life and declared deprecation, a rule that needs a particular software's name and version to hold is not collected. chous's worth is in checks that work everywhere, for a language it has never heard of too; how many tools it supports is not progress.
- It does not go online, call an AI or need a key.

## What the agent judges

Some taste needs the code read and understood. That is not written into chous's rules; an agent judges it by this manifesto:

- Whether a long file chous lists carries too many responsibilities. Its line count is only a reason to look; a compiler's code generator is large for good reason. **Do not split a file mechanically to bring its line count down**: one file per responsibility, not one file per thousand lines.
- Whether a flat directory chous lists should be grouped by responsibility.
- Which of the identical files chous lists are needed (an icon per screen density) and which were pasted.
- Whether a tool's config is out of date, misplaced or shadowed by another: read the tool's current docs, or run its own diagnostics.
- Languages mixed without reason: one responsibility written in two languages, or a new language brought in for a sliver of functionality.
- Old implementations kept in comments: history belongs to version control.
- Compatibility, adapter and forwarding layers that nothing calls any more.
- Duplicated implementations and needless abstraction.
- Generated code committed without the means to generate it.
- Dispatch records, task reports, delivery notes and per-version release notes piled up in the source and docs: once the work is done, its story is in pull requests and the changelog. The agent can read them and decide which still belong.
- Whether a file is still of use: a work log, a hand-made backup, a one-off script, whether `plugin/` and `plugins/` are one thing. chous does not read the words in names; an agent can read the files and decide whether they go in docs/, in a pull request, or away.

`chous manifesto` prints this document and `chous --json` prints every finding as data, so an agent can read the taste first and then review the whole repository, not only what chous listed.

## Appendix: what each rule knows, and what it claims

What each tool says, and which files chous checks for it: [what chous knows](facts.md), generated from the registry. The table below lists the kinds of rule.

| Rule | What chous knows | What chous claims | Taste | Finding |
|---|---|---|---|---|
| Runtimes and frameworks past end of life | The version that runs, and the end-of-life date in its makers' data; where they say only "no longer supported" (Angular), chous says just that | Past end of life stinks | Modernity | Smell |
| `engines.node` that allows only ended versions | The declared range, and each of its versions' end-of-life date | Promise nothing only to the dead | Modernity | Smell |
| Dependencies deprecated, called legacy or sabotaged by their authors | The name, and the authors' public words: npm's deprecated field (copied into the lockfile by pnpm and npm at install time; chous reads it there, for the dependencies package.json names), the README, a security advisory | Build nothing on what is dead | Modernity | Smell |
| A manifest field its tool deprecated (Cargo's `authors`) | The field, and the tool's own words | Use what the tool recommends | Modernity | Smell |
| Names that differ only in case or Unicode form | Both names exist | One thing, one name | Order | Smell |
| Naming styles mixed in one directory | The style of each file name | One directory, one style | Order | Smell |
| Too many docs at the root | How many docs without a claim to the root sit there | The root is an entrance | Order | Smell |
| In a monorepo: a dependency on several majors, nested lockfiles, workspace lists that disagree | Versions, file locations, the two lists | One fact, said once | Order | Smell |
| Source files over 1000 lines (not generated, minified or someone else's) | The line count | Whether one does too much is the agent's call; never split mechanically | Order | Review |
| A directory with more than 50 source files laid out flat | The count | Whether to group by responsibility is the agent's call | Order | Review |
| More than 30 files at the root | The count | The root is an entrance | Order | Review |
| Files with identical content (4 KiB and up; agent instructions at any size) | The same bytes; one file reached through a symlink counts once | Keep one, or have a reason for several | Order | Review |
| Agent instructions (AGENTS.md, CLAUDE.md, GEMINI.md, Copilot's) over 300 lines | The line count | Keep what applies every time | Order | Review |
| Names against a language's naming rules (file and directory names, or a package declared inside) | The name, and the language's style guide | Name things the language's way | Convention | Smell |
| Build output, caches and virtual environments, whatever the directory is called | A marker file its tool writes (`CACHEDIR.TAG`, `pyvenv.cfg`, `CMakeCache.txt`, a `.tsbuildinfo`), or a build script | Build output is not committed | Cleanliness | Smell |
| OS junk, core dumps (ELF core files), `local.properties` | The content the OS or Android Studio wrote | No OS junk or machine settings | Cleanliness | Smell |
| Files their own tools say not to commit (`.env*.local`, `.idea/workspace.xml`) | The name, and the tool's "do not commit" | Nothing personal or local | Cleanliness | Smell |
| Files committed although .gitignore ignores them (not empty placeholders, nor a directory's own .gitignore) | The git index and .gitignore say opposite things | Untrack it, or write the exception with `!` | Cleanliness | Smell |
| Files of 50 MiB and more | The size; GitHub warns from 50 MiB and rejects 100 MiB | Use Git LFS or releases | Cleanliness | Smell |
| Installers (`.apk`, `.ipa`, `.msi`, `.deb`, `.dmg`, …) | The file's signature confirms the format | What users get belongs in releases | Cleanliness | Smell |
| Executables and libraries (`.exe`, `.dll`, `.so`, `.dylib`, and ELF or Mach-O without an extension) | The file's header confirms the format | Releases if this project builds it; keep it if a build reads it | Cleanliness | Review |

Only two kinds of things go unchecked, under the names the tools that put them there define: npm's `node_modules/`; `vendor/` (the name Go requires, and `vendors?/` in GitHub Linguist's vendor.yml); Go's `testdata/` ("The go tool will ignore a directory named "testdata""); the `__snapshots__/` Jest and Vitest write; the test fixtures Linguist knows, `tests/fixtures/` and `specs/fixtures/`. Any other name chous does not guess: the repository declares it in `.gitattributes`, the way GitHub reads it (`upstream/** linguist-vendored`; `linguist-generated` counts too, and `-linguist-vendored` takes a path back). `tests/`, `examples/` and `playground/` are your own code and are checked like the rest.
