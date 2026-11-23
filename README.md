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

Chous is an opinionated taste linter. AI editors invent folders, formatters, and test runners your project never asked for. Chous checks the repository against one person's taste — layout, stack, naming, dependencies — and tells the agent what to change.

There is no config, no preset and no plugin. The taste is the tool, like `gofmt`.

\* *chous* comes from Chinese「抽丝」(chōu sī): to draw out silk threads, to untangle.

```bash
npx chous
```

### Output

```
.
├── ✖ tests/                                    → should be renamed to test/
├── ✖ eslint.config.js                          → hit blacklist (1)
├── ✖ jest.config.ts                            → hit blacklist (1)
├── ✖ notes.txt                                 → not in allow list (1)
├── ✖ package.json (moment)                     → dependency moment is replaceable → day.js
├── ✖ package.json (pnpm)                       → package manager should be pnpm (found yarn)
├── ✖ stack (git hooks: husky→simple-git-hooks) → git hooks should be simple-git-hooks (found husky)
├── ✖ stack (linter: eslint→oxlint)             → linter should be oxlint (found eslint)
├── ✖ stack (test runner: jest→vitest)          → test runner should be vitest (found jest)
└── ✖ yarn.lock                                 → not in allow list (1)

Taste: base · js
```

### The taste

Chous looks at the project and stacks the tastes that apply: `base` always, then `js` / `go` / `python`, then `nextjs` / `nuxt3` / `nuxt4`. They live in [`src/taste/`](src/taste).

- **Root is a whitelist.** Anything at the root that no taste allows is an error.
- **One name per concept.** `test/`, not `tests/`, `__tests__/` or `spec/`. `scripts/`, not `script/`.
- **One tool per role.** pnpm, TypeScript, oxlint, Vitest, simple-git-hooks. Published packages also get tsdown and changelogen. Anything else in the same role is an error, with migration notes from the built-in knowledge base.
- **No garbage dependencies.** Everything in [e18e module-replacements](https://github.com/e18e/module-replacements), plus dead packages it doesn't cover (`node-sass`, `tslint`, `ts-node`, `nodemon`, `gulp`, …).
- **Framework layouts.** Next.js App Router and Nuxt 3 / 4 directory and naming conventions.

Disagree? Fork it. That's the point.

### Commands

```bash
npx chous                 # lint the current directory
npx chous --fix           # apply safe fixes (renames, package.json edits)
npx chous claude install  # run chous in Claude Code hooks
npx chous cursor install  # run chous in Cursor hooks
npx chous scan .          # find git repos, detect kinds / roles
npx chous knowledge       # dump built-in tool / kind / migration JSON
```

Output is in English or Chinese (`-l en` / `-l zh`; default follows the system).

## License

[MIT](LICENSE)
