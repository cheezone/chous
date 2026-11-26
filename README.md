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
Modernity
  ✗ .nvmrc (Node 16)       → Node 16 reached end of life on 2023-09-11 → a supported LTS release
  ✗ package.json (request) → request 2.88.2, deprecated by its authors on npm: “request has been deprecated, see https://github.com/request/request/issues/3142”
  ✗ package.json (Vue 2)   → Vue 2 reached end of life on 2023-12-31 → Vue 3

Order
  ✗ ./                             → 4 docs at the root besides README, LICENSE and the like (ARCHITECTURE.md, DEPLOYMENT.md, FIXES_SUMMARY.md, IMPLEMENTATION_COMPLETE.md): the root is an entrance, keep at most 3 and move the rest into docs/
  ✗ src/composables/               → mixes camelCase ×1 + kebab-case ×1 names (asyncData.ts, lazy-hydration.ts); one directory, one way of naming
  ✗ Readme.md                      → same name as README.md except for case; macOS and Windows keep only one of them on checkout

Cleanliness
  ✗ .DS_Store        → not allowed: OS junk, delete it and gitignore it
  ✗ dist/            → 3 committed file(s) that .gitignore ignores: untrack them with `git rm --cached`, or unignore them with a `!` pattern

To review: chous knows the fact, not the purpose. You or your agent decide.
  ? bin/server                → a compiled executable or library: if this project builds it, it belongs in releases; if a build reads it, keep it
  ? ./                        → 2 source files over 1000 lines (src/api.ts 6763, src/board.ts 1840): whether one holds too many jobs is for you or your agent to judge; never split mechanically

Smells: 9 · to review: 2
Taste only: correctness, security and tests are not checked.
```

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
