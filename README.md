<p align="center">
  <img src="public/logo.png" alt="chous" width="160" height="160" />
</p>

<h1 align="center">chous</h1>

<p align="center">
  <b>Opinionated Taste Linter</b>
</p>

<p align="center">
  <a href="https://github.com/cheezone/chous/actions/workflows/ci.yml"><img src="https://github.com/cheezone/chous/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/chous"><img src="https://img.shields.io/npm/v/chous.svg" alt="npm" /></a>
  <a href="https://www.npmjs.com/package/chous"><img src="https://img.shields.io/node/v/chous.svg" alt="node" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/chous.svg" alt="MIT" /></a>
</p>

<p align="center">
  <a href="https://cheez.tech">Cheez Lin</a>
  ·
  <a href="./README.zh.md">中文</a>
</p>

---

## chous

_/tʃoʊs/_

Chous is an opinionated taste checker: **it works, it still stinks.** It does not care whether your code is correct, only whether your repository is clean, orderly, and built on things that have not rotted. AI is good at making things and bad at cleaning up: it migrates a tool and leaves the old config, finishes a task and leaves five summaries, fixes a bug and leaves three scratch scripts. Chous points the smells out, for you or your agent to clean up.

There is no config, no preset and no plugin. The taste is the tool, like `gofmt`. The whole stance is in [the manifesto](docs/manifesto.md).

\* *chous* comes from Chinese「抽丝」(chōu sī): to draw out silk threads, to untangle.

```bash
npx chous
```

### Output

```
Modernity 3

  × Node 16 reached end of life on 2023-09-11
   ╭─[.nvmrc]
   ╰────
  help: a supported LTS release

  × request 2.88.2, deprecated by its authors on npm
    “request has been deprecated, see https://github.com/request/request/issues/3142”
   ╭─[package.json]
   ╰────

  × Vue 2 reached end of life on 2023-12-31
   ╭─[package.json]
   ╰────
  help: Vue 3

Order 3

  × 4 docs at the root besides README, LICENSE and the like
    the root is an entrance
   ╭─[ARCHITECTURE.md]
   ├─[DEPLOYMENT.md]
   ├─[FIXES_SUMMARY.md]
   ├─[IMPLEMENTATION_COMPLETE.md]
   ╰────
  help: keep at most 3, move the rest into docs/

  × same name as README.md except for case
    macOS and Windows keep only one of them on checkout
   ╭─[Readme.md]
   ╰────
  help: keep one name

  × mixes camelCase ×1 + kebab-case ×1 names (asyncData.ts, lazy-hydration.ts)
   ╭─[src/composables/]
   ╰────
  help: one directory, one way of naming

Cleanliness 2

  × OS junk
   ╭─[.DS_Store]
   ╰────
  help: delete it and gitignore it

  × committed although .gitignore ignores it
   ╭─[dist/]  3 files
   ╰────
  help: untrack it with `git rm --cached`, or unignore it with a `!` pattern

To review 2  chous knows the fact, not the purpose. You or your agent decide.

  ⚠ 2 source files over 1000 lines or 100 KiB
   ╭─[src/api.ts]    6763 lines · 132 KiB
   ├─[src/board.ts]  1840 lines · 36 KiB
   ╰────
  help: whether one holds too many jobs is for you or your agent to judge; never split mechanically

  ⚠ a compiled executable or library
   ╭─[bin/server]
   ╰────
  help: if this project builds it, put it in releases; if a build reads it, keep it

Smells: 8 · to review: 2
Taste only: correctness, security and tests are not checked.
Hand it to an agent: `chous claude install`, or have it run `chous manifesto` and `chous --json`.
```

### With an agent

chous lists facts; deciding what to do about them, and doing it, is an agent's job. Two ways to hand it over:

- **Hooks**: `npx chous claude install` (or `cursor install`). Whenever the agent stops, chous runs and hands it every smell and every item to review, with the full lists.
- **A prompt**, in any agent:

  ```text
  Run `npx chous manifesto` and read the taste it describes. Then run `npx chous --json` and clean up the repository:
  fix every smell, and for each item to review, look at it, decide whether it stays, and say why.
  Do not split files mechanically. Run `npx chous` again at the end.
  ```

`--json` holds every fact in full (`details`: every long file, flat directory, set of copies); the report above shows the first few.

### Two kinds of finding

- **Smell**: a fact chous is sure of that goes against its taste. Nothing to decide. Grouped by the four tastes: modernity, order, convention, cleanliness.
- **To review**: the fact is certain, its meaning needs context. An executable: chous knows its format from its header, not whether a build made it or reads it. You or your agent decide.

There are no errors, warnings or hints, and no score. Smells make chous exit non-zero; things to review never do. A wrong fact is a false positive; a different taste is not.

### What it checks

| Taste | Smell | To review |
| --- | --- | --- |
| Modernity | Runtimes and frameworks past their published end of life (from that day, no grace period; `engines.node` only when every version it allows has ended); dependencies deprecated or called legacy by their authors (npm's own words, read from the lockfile); a manifest field its tool deprecated | |
| Order | Names that differ only in case or Unicode form; mixed naming styles in one directory; too many docs at the root; major-version drift, nested lockfiles and workspace lists that disagree in a monorepo | Source files over 1000 lines or 100 KiB; directories with more than 50 source files laid out flat; more than 30 files at the root; files with identical content; agent instructions over 300 lines |
| Convention | Names that break a language's naming rules (Python, Go, Rust, Dart, Kotlin, Elixir, PHP's PSR-4) | |
| Cleanliness | Build output (known by the markers its tools write); OS junk and `local.properties` (known by their content); files their own tools say not to commit (`.env*.local`, `.idea/workspace.xml`); files committed although .gitignore ignores them; files of 50 MiB and more; installers (known by their signature) | Executables and libraries |

What each check looks at, its numbers and its evidence: [chous's rules](docs/rules.md). The few named tools it knows: [what chous knows](docs/facts.md), generated from the registry.

Nothing missing is reported (no tests, no CI, no license); a line count, size or file count only ever puts something up for review, never settles it; neither correctness nor security is checked; and the words in a name are never read: `FIXES_SUMMARY.md` or `index.ts.bak` is for your agent to judge. Other people's code and test data are skipped under the names their tools define (`node_modules/`, `vendor/`, `testdata/`, `__snapshots__/`, `tests/fixtures/`) or wherever `.gitattributes` says `linguist-vendored` or `linguist-generated`, in any language; `tests/` and `examples/` are your own code and are checked.

Every reason that rests on someone else's word links to it: `--verbose` shows the source under each finding, `--json` gives them as data. A weekly job checks that every end-of-life date still matches its makers' data, and `pnpm run corpus` checks every claim chous makes about 85 real repositories against [the recorded claims](test/corpus.claims.txt).

The little chous knows about named software (end-of-life schedules, deprecations, a language's naming rules) lives in [`src/facts/tools/`](src/facts/tools/). It stays little on purpose: a tool's config fields, read order and version-specific behaviour change, and the tool diagnoses them itself.

### Commands

```bash
npx chous                 # check the current directory
npx chous --json          # every finding as data, for agents
npx chous manifesto       # print the manifesto, for an agent to read before reviewing the repo
npx chous claude install  # run chous in Claude Code hooks
npx chous cursor install  # run chous in Cursor hooks
npx chous scan .          # find git repos below a directory and lint each
```

Output is in English or Chinese (`-l en` / `-l zh`; default follows the system).

## License

[MIT](LICENSE)
