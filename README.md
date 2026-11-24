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

Chous is an opinionated taste linter. AI editors invent folders, formatters, and test runners your project never asked for. Chous sniffs a repository for smells — rotten dependencies, tools that fight, leaked secrets, a cluttered root — and tells the agent what to change.

There is no config, no preset and no plugin. The taste is the tool, like `gofmt`.

\* *chous* comes from Chinese「抽丝」(chōu sī): to draw out silk threads, to untangle.

```bash
npx chous
```

### Output

```
.
├── ✖ .DS_Store                      → not allowed: OS junk, delete it and gitignore it
├── ✖ .env                           → not allowed: secrets, gitignore it and commit .env.example instead
├── ✖ notes.txt                      → not in allow list (1)
├── ✖ package.json (git-hooks)       → git hooks: husky + simple-git-hooks at once, they fight over the same job, keep one
├── ✖ package.json (moment)          → dependency moment is obsolete → dayjs / date-fns / Temporal
├── ✖ package.json (node-fetch)      → dependency node-fetch is obsolete → fetch
├── ✖ package.json (package-manager) → package manager: npm + yarn at once, they fight over the same job, keep one
├── ✖ package.json (request)         → dependency request is obsolete → fetch
├── ✖ package.json (tslint)          → dependency tslint is obsolete → ESLint / oxlint
└── ✖ tslint.json                    → not allowed: leftover config of a dead tool

Taste: base · git · js
```

### The taste

Chous sniffs out smells, not fashions. A smell is something that is wrong today and will still be wrong in three years: a dead package, a file the platform made pointless, two tools fighting over the same job, a secret about to be committed. Chous never tells you which linter or bundler to pick — today's fresh tool is tomorrow's stale one.

The tastes live in [`src/taste/`](src/taste) and stack up by what the project looks like:

| Taste | Applies when |
| --- | --- |
| `base` | always |
| `git` · `github` | a git repository; `.github/workflows` |
| `js` · `monorepo` · `bun` · `cloudflare` | `package.json`; workspace packages; Bun; a `wrangler` config |
| `go` · `python` | `go.mod`; `pyproject.toml` and friends |
| `nextjs` · `nuxt3` · `nuxt4` | the framework's config file |

- **Rotten dependencies.** A hand-kept list in [`src/taste/deps.ts`](src/taste/deps.ts). Every entry meets a checkable fact: the platform ships an equivalent (`node-fetch` → `fetch`, `rimraf` → `fs.rm`, `left-pad` → `padStart`, …), its authors deprecated it (`request`, `moment`, `node-sass`, `tslint`, Create React App, …), or its author sabotaged it (`colors`, `faker`). "Old" or "there is something newer" is not rot.
- **Tools that fight.** Two package managers, two formatters, two git-hook managers or two release tools at once. Which one you keep is up to you.
- **Leaks and junk.** `.env`, `.dev.vars`, `.DS_Store`, `*.log` that are not gitignored; a git repo without `.gitignore`.
- **A tidy root.** Root files are a whitelist: docs, licenses, config files (any JSON / TOML / YAML, `*.config.*`) and the usual folders. Stray notes and scripts are errors. Dotfiles are left alone.
- **One name per concept.** `test/` or `tests/` or `spec/` — pick one, not two. Same for `scripts/` and `script/`. Workflows are kebab-case `.yml`.
- **A declared module type.** Every package.json says `"type": "module"` or `"commonjs"`, as Node's docs recommend.
- **Monorepos.** Every workspace package is linted as its own project with its own taste. The root is private and holds tooling only; one lockfile; one version per dependency; internal deps use `workspace:*`.
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
