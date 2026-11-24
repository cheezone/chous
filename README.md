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
├── ✖ .DS_Store                                 → not allowed: OS junk, delete it and gitignore it
├── ✖ .prettierrc                               → not in allow list (1)
├── ✖ eslint.config.js                          → not allowed: config for a tool this taste does not use
├── ✖ jest.config.ts                            → not allowed: config for a tool this taste does not use
├── ✖ notes.txt                                 → not in allow list (1)
├── ✖ package.json (moment)                     → dependency moment is obsolete → dayjs / date-fns / Temporal
├── ✖ package.json (pnpm)                       → package manager should be pnpm (found yarn)
├── ✖ package.json (type)                       → "type" should be "module"
├── ✖ package.json (uuid)                       → dependency uuid is obsolete → crypto.randomUUID()
├── ✖ stack (git hooks: husky→simple-git-hooks) → git hooks should be simple-git-hooks (found husky)
├── ✖ stack (linter: eslint→oxlint)             → linter should be oxlint (found eslint)
├── ✖ stack (test runner: jest→vitest)          → test runner should be vitest (found jest)
└── ✖ yarn.lock                                 → not allowed: config for a tool this taste does not use

Taste: base · git · github · js
```

### The taste

Chous looks at the project and stacks the tastes that apply. They live in [`src/taste/`](src/taste):

| Taste | Applies when |
| --- | --- |
| `base` | always |
| `git` · `github` · `cnb` | a git repo; the host comes from the `origin` remote, `.github/` or `.cnb.yml` |
| `js` · `monorepo` · `bun` | `package.json`; workspace packages; Bun as runtime |
| `cloudflare` | a `wrangler` config |
| `go` · `python` | `go.mod`; `pyproject.toml` and friends |
| `nextjs` · `nuxt3` · `nuxt4` | the framework's config file |

- **Root is a whitelist, dotfiles included.** Anything at the root that no taste allows is an error — `.prettierrc` and `.idea` too.
- **Git hygiene.** A `.gitignore`; no `.DS_Store`, `.env` or `*.log` that would get committed; one CI — GitHub Actions or CNB (`.cnb.yml`), not Travis / CircleCI / Jenkins.
- **GitHub.** `.github/` holds only what GitHub reads; workflows are kebab-case `.yml`.
- **One name per concept.** `test/`, not `tests/`, `__tests__/` or `spec/`. `scripts/`, not `script/`.
- **One tool per role.** pnpm, TypeScript, oxlint, Vitest, simple-git-hooks. Published packages also get tsdown and changelogen. Anything else in the same role is an error, with migration notes from the built-in knowledge base.
- **No obsolete dependencies.** A hand-kept list in [`src/taste/deps.ts`](src/taste/deps.ts): packages the platform already replaced (`uuid` → `crypto.randomUUID()`, `node-fetch` → `fetch`, `chalk` → `util.styleText`, `rimraf` → `fs.rm`, …) and dead ones (`moment`, `request`, `node-sass`, `tslint`, `ts-node`, …). Each error says what to use instead.
- **ESM only.** `"type": "module"` in every package.json.
- **Monorepos.** Every workspace package is linted as its own project with its own taste — a Nuxt app in `apps/web` gets the Nuxt layout. The root is private and holds tooling only; one lockfile; one version per dependency (or a pnpm catalog); internal deps use `workspace:*`.
- **Bun.** Bun projects use Bun as package manager (`bun.lock`, not `bun.lockb`), `@types/bun`, `bun:sqlite`, and no `tsx`.
- **Cloudflare.** `wrangler.jsonc`, `wrangler types` instead of `@cloudflare/workers-types`, and `.dev.vars` never committed.
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
