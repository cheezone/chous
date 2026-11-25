# The chous manifesto

> It works. It still stinks.

chous checks a repository's taste: whether it is clean, whether it has order, whether what it is built on has rotted. It does not check correctness, security, performance, features or tests. A repository full of bugs can be elegant; one that is entirely correct can be ugly.

There is one taste. It cannot be configured or switched off. chous has the right to point out ugliness; you have the right to keep it.

## Four tastes

### Modernity

- What has reached end of life stinks, from the day it ends. There is no grace period. That it still runs has nothing to do with it.
- What its authors deprecated, what its author broke on purpose, what the vendor calls legacy: all of it stinks.
- A healthy old technology does not stink. No chasing the new, no pecking order: slow, old or unfashionable is not a smell, and neither is silence nobody announced.

### Order

- One thing, one name: `test/` beside `tests/`, `plugin/` beside `plugins/`, two files that differ only in case.
- One directory, one way of naming. kebab, snake or camel is yours to pick; just one.
- The root is an entrance, not a heap. Besides the files with a claim to the root (README, LICENSE, CONTRIBUTING and the like, AGENTS.md, CLAUDE.md), it holds at most 3 more docs. That is a stance, not a measurement.
- One job, one tool: two package managers, two formatters, two git-hook managers or two release tools at once stink.
- One fact, said once: a dependency on two major versions, two instruction files with the same text, a workspace listed in two places.

### Convention

- Where a framework documents a convention, follow it. A file the framework never reads (`src/app` beside a root `app/` in Next.js, `pages/` outside `app/` in Nuxt 4) is dead code that looks alive, and stinks worst.
- The convention is what the official docs say, word for word, and every rule cites them.

### Cleanliness

- No build output, OS junk, logs or personal settings in the repository.
- No leftovers of the work: hand-made backups, one-off scripts, the record of one session. History belongs to version control, the story of a change to its pull request.
- No built binaries in the source tree. Built things belong in releases.

## What chous knows

chous only states facts it is sure of, so every finding is one of two:

- **Smell**: the fact is certain and it goes against the taste above. There is nothing to decide. "Node 16 reached end of life on 2023-09-11." "`package.json.bak` is a copy of the `package.json` next to it." "The root holds 9 docs."
- **To review**: the fact is certain, but what it means needs context chous does not have. A file named like a work log: chous knows its name, not what it says. You or your agent decide.

These are not degrees of badness but degrees of knowledge. There are no errors, warnings or hints, and no score. Smells make chous exit non-zero; things to review never do.

**A wrong fact is a false positive; a different taste is not.** Saying Node 16 has reached end of life when it has not is a false positive. Saying it stinks when you find it still useful is not. Famous projects compromise too, and chous makes no exception for any of them.

## What chous does not do

- It does not punish what is missing: no tests, no CI, no TypeScript, no license. chous looks only at the choices you made.
- It does not judge a file by its name: a name can put a file up for review, never make it a smell.
- It adds no exceptions to suit a project. It keeps two kinds of lists only: where official conventions put things, and history that has happened and can be checked (end-of-life dates, deprecations announced by their authors).
- It does not go online, call an AI or need a key.

## What the agent judges

Some taste needs the code read and understood. That is not written into chous's rules; an agent judges it by this manifesto:

- Old implementations kept in comments: history belongs to version control.
- Compatibility, adapter and forwarding layers that nothing calls any more.
- Duplicated implementations and needless abstraction.
- Generated code committed without the means to generate it.
- Whether a file is still of use: chous can only say "named like a work log"; an agent can read it and decide whether it goes in docs/, in a pull request, or away.
- Whether a dependency can give way to what the platform ships: chous knows what the platform ships, the agent knows which parts of the package this project uses.

`chous manifesto` prints this document, so an agent can read it first and then review the whole repository, not only what chous listed.

## Appendix: what each rule knows, and what it claims

| Rule | What chous knows | What chous claims | Taste | Finding |
|---|---|---|---|---|
| Runtimes and frameworks past end of life | The version in version files, Dockerfiles and dependencies, and the published end-of-life date | Past end of life stinks | Modernity | Smell |
| Dependencies deprecated or sabotaged by their authors | The name, and the author's public statement | Build nothing on what is dead | Modernity | Smell |
| Config of dead tools (`.bowerrc`, `tslint.json`), legacy formats (`.cursorrules`, `bun.lockb`, `middleware.ts` on Next.js 16) | The file exists; its author called it legacy | Use what the author recommends | Modernity | Smell |
| Dependencies the platform now ships | The version from which the platform ships it | Whether it fully replaces the package depends on how the project uses it | Modernity | Review |
| Directories that differ only in case, plural, or synonym | Both names exist | One thing, one name | Order | Smell |
| Mixed naming styles in one directory | Each name's style | One directory, one style | Order | Smell |
| A crowded root | How many docs without a claim to the root it holds | The root is an entrance | Order | Smell |
| Tools that share a job | Both tools' config, lockfile or scripts | One job, one tool | Order | Smell |
| Major-version drift, nested lockfiles, double declarations in a monorepo | Versions and file locations | One fact, said once | Order | Smell |
| `CLAUDE.md` identical to `AGENTS.md` | Both files have the same text | Keep one; symlink the other or import it with `@AGENTS.md` | Order | Smell |
| Files a framework never reads; capitalised directories it cannot find | The rule as the framework's docs state it | Follow the framework's convention | Convention | Smell |
| Build output | A marker file its tool writes, or a build script | Build output is not committed | Cleanliness | Smell |
| OS junk | The OS's own content (`Bud1` in `.DS_Store`) | OS junk is not committed | Cleanliness | Smell |
| Logs, `.env*.local`, personal IDE and agent settings | The name, and the tool's own words: do not commit it | Nothing personal or local is committed | Cleanliness | Smell |
| A backup next to its original (`package.json.bak`) | The original is right there | Git already keeps the old version | Cleanliness | Smell |
| Built binaries (`.exe`, `.apk`, `.dmg`, …) | The file format | Built things belong in releases | Cleanliness | Smell |
| Docs named like work logs | The name | The record of one session belongs in its pull request | Cleanliness | Review |
| Scripts named like one-offs that nothing mentions | The name, and that no file refers to it | Delete it once it has run | Cleanliness | Review |
| A backup without its original | The name | It may be a backup, or not | Cleanliness | Review |

Test fixtures (`fixtures/`, `testdata/`, `__snapshots__/`) are data and `vendor/` is someone else's code; neither is checked. `tests/`, `examples/` and `playground/` are your own code and are checked like the rest.
