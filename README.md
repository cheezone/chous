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
  ✗ package.json (request) → request: Deprecated by its authors in 2020. → fetch
  ✗ package.json (Vue 2)   → Vue 2 reached end of life on 2023-12-31 → Vue 3

Order
  ✗ ./                             → 4 docs at the root besides README, LICENSE and the like (ARCHITECTURE.md, DEPLOYMENT.md, FIXES_SUMMARY.md, IMPLEMENTATION_COMPLETE.md): the root is an entrance, keep at most 3 and move the rest into docs/
  ✗ package.json (package-manager) → package manager: npm + pnpm, two tools for one job; keep one
  ✗ src/composables/               → mixes camelCase ×1 + kebab-case ×1 names (asyncData.ts, lazy-hydration.ts); one directory, one way of naming
  ✗ test/ + tests/                 → one thing under two names, keep one

Cleanliness
  ✗ .DS_Store        → not allowed: OS junk, delete it and gitignore it
  ✗ package.json.bak → a copy of package.json: git already keeps the old version

To review: chous knows the fact, not the purpose. You or your agent decide.
  ? ./                        → 2 docs named like work logs (FIXES_SUMMARY.md, IMPLEMENTATION_COMPLETE.md): if they record single sessions, they belong in pull requests, not the repository
  ? package.json (node-fetch) → the platform ships fetch: whether it fully replaces node-fetch depends on how you use it

Smells: 9 · to review: 2
Taste only: correctness, security and tests are not checked.
```

### Two kinds of finding

- **Smell**: a fact chous is sure of that goes against its taste. Nothing to decide. Grouped by the four tastes: modernity, order, convention, cleanliness.
- **To review**: the fact is certain, its meaning needs context. A file named like a work log: chous knows its name, not what it says. You or your agent decide.

There are no errors, warnings or hints, and no score. Smells make chous exit non-zero; things to review never do. A wrong fact is a false positive; a different taste is not.

### What it checks

| Taste | Smell | To review |
| --- | --- | --- |
| Modernity | Runtimes and frameworks past end of life (from that day, no grace period; `engines.node` only when every version it allows has ended); dependencies deprecated, called legacy or sabotaged by their authors; config of dead tools; legacy formats (`.cursorrules`, `bun.lockb`, `middleware.ts` on Next.js 16) | Dependencies the platform now ships |
| Order | One thing, two names (`test/` and `tests/`, singular and plural, case only); mixed naming styles in one directory; a crowded root; one job, two tools; major-version drift, nested lockfiles and workspace lists that disagree in a monorepo; `CLAUDE.md` identical to `AGENTS.md` | |
| Convention | Files a framework never reads (`src/app` in Next.js, `pages/` outside `app/` in Nuxt 4); capitalised directories it cannot find; a `CLAUDE.md` over the 200 lines Claude Code's docs target | |
| Cleanliness | Build output (known by the markers its tools write); OS junk and `local.properties` (known by their content); `.env*.local`, personal IDE and agent settings; a backup next to its original; installers (known by their signature) | Executables and libraries; docs named like work logs; one-off scripts nothing mentions; backups without an original; series of per-version notes and piles of work records |

Nothing missing is reported (no tests, no CI, no license), nothing is judged by line count, size or file count unless official docs set the limit, and neither correctness nor security is checked. Test fixtures and `vendor/` are skipped; `tests/` and `examples/` are your own code and are checked.

Every reason that rests on someone else's word links to it: run with `--verbose` to see the source under each finding, or `--json` to get them as data. The quotes live in [`src/taste/sources.ts`](src/taste/sources.ts); `pnpm run sources` checks each one is still on its page and every end-of-life date against the official data. `pnpm run corpus` checks every claim chous makes about 57 real repositories, pinned in [`test/corpus.json`](test/corpus.json), against [the recorded claims](test/corpus.claims.txt).

The rules live in [`src/taste/`](src/taste): `base` always applies; `js`, `monorepo`, `bun`, `cloudflare`, `next` and `nuxt` add up by the shape of the project.

### Commands

```bash
npx chous                 # check the current directory
npx chous --json          # every finding as data, for agents
npx chous manifesto       # print the manifesto, for an agent to read before reviewing the repo
npx chous claude install  # run chous in Claude Code hooks
npx chous cursor install  # run chous in Cursor hooks
npx chous scan .          # find git repos, detect project kinds / stack roles
npx chous knowledge       # dump built-in tool / kind / migration knowledge as JSON
```

Output is in English or Chinese (`-l en` / `-l zh`; default follows the system).

## License

[MIT](LICENSE)
