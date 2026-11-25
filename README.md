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

Chous is an opinionated taste linter. AI editors invent folders, formatters, and test runners your project never asked for. Chous sniffs a repository for smells — rotten dependencies, runtimes past end of life, tools that fight, junk at the root — and tells the agent what to change.

There is no config, no preset and no plugin. The taste is the tool, like `gofmt`.

\* *chous* comes from Chinese「抽丝」(chōu sī): to draw out silk threads, to untangle.

```bash
npx chous
```

### Output

```
✖ .env.local                     → not allowed: local env file that may hold secrets; Vite and Next.js say to gitignore *.local
✖ package.json (git-hooks)       → git hooks: husky + simple-git-hooks at once, they fight over the same job, keep one
✖ package.json (package-manager) → package manager: npm + yarn at once, they fight over the same job, keep one
✖ package.json (request)         → dependency request is obsolete → fetch
✖ package.json (Vue 2)           → Vue 2 reached end of life on 2023-12-31, more than two years ago → Vue 3
✖ test/ + tests/                 → one thing under two names, keep one
⚠ .nvmrc (Node 20)               → Node 20 reached end of life on 2026-04-30, no more security fixes → a supported LTS release
⚠ package.json (rimraf)          → dependency rimraf is built in now → fs.rm(path, { recursive: true, force: true })
⚠ package.json (type)            → add "type": "module" or "commonjs", Node recommends declaring it explicitly

Found 6 errors, 3 warnings

Taste: base · js
```

### What it checks

Chous sniffs out smells, not fashions. It judges only on what a project's own authors or platform have said, and only once it has happened — never on age, speed, implementation language, popularity or silence. Where files live is each ecosystem's own business: SQLite, React and Vue lay out their roots differently, and all of them are right.

The checks live in [`src/taste/`](src/taste):

| Taste | Applies when |
| --- | --- |
| `base` | always |
| `js` · `monorepo` · `bun` · `cloudflare` | `package.json`; workspace packages; Bun; a `wrangler` config |

- **Rot, by facts only.**

  | State | Fact | Examples | Level |
  | --- | --- | --- | --- |
  | Redundant | The platform ships an equivalent | `node-fetch` → `fetch`, `rimraf` → `fs.rm` | warning |
  | Expired | Its published end-of-life date has passed | Node 20, Nuxt 3, Python 3.10 | warning |
  | Rotten | End of life over two years ago; deprecated by its authors; sabotaged | Node 16, Python 2.7, Vue 2, `request`, `babel-eslint`, `colors` | error |

  End-of-life dates live in [`src/taste/eol.ts`](src/taste/eol.ts), copied from each project's official schedule, and only ever list dates that have passed. Versions come from what the project runs on — `.nvmrc`, `.node-version`, `.python-version`, `.tool-versions`, `FROM` in a Dockerfile, a pinned `engines.node`, the `vue` / `nuxt` dependency. Expired turns into rotten on its own when two years are up.
- **Tools that fight.** Two package managers, two formatters, two git-hook managers or two release tools at once. Which one you keep is up to you.
- **Files the framework never reads.** Only where the framework's own docs say so, and each message links the page: `src/app` next to a root `app/` (Next.js ignores it); `middleware.ts` on Next.js 16 (renamed to `proxy`); `pages/` or `layouts/` outside `app/` on Nuxt 4; `App/` or `Pages/` with no lowercase router, which works on macOS and disappears on Linux. See [`src/taste/frameworks.ts`](src/taste/frameworks.ts).
- **One concept, two names.** `README.md` next to `Readme.md` (macOS and Windows keep one of them on checkout); `test/` next to `tests/`; `plugin/` next to `plugins/`.
- **Duplicates.** One dependency on two major versions across a monorepo (installed twice); a lockfile inside a workspace package.
- **Things that should not be committed.** Build output that is not gitignored (`node_modules`, `.next`, `dist`, Cargo/Maven `target`, `__pycache__`, …, recognised by markers the tools write, not by name alone). Files their own tools call personal: `.env*.local`, `.dev.vars`, `CLAUDE.local.md` and `.claude/settings.local.json` (Claude Code docs), Android's `local.properties` (its header says *must NOT be checked in*). `.DS_Store`, `*.log`.
- **Leftovers.** What a work session leaves behind: Markdown named after an event or status (`IMPLEMENTATION_COMPLETE.md`, `PHASE_4_PLAN.md` — any name at the root, SCREAMING_CASE deeper; decision records are kept); one-off scripts at the root nothing refers to (`fix_login.sh`, `test_api.py`); hand-made backups (`package.json.bak`, `logo (1).png`); installers (`.apk`, `.dmg`, `.msi`, which belong in Releases); a warning when more than five hand-written docs crowd the root. See [`src/taste/hygiene.ts`](src/taste/hygiene.ts). Measured: zero hits in Vue, Vite, React, Oxc, SQLite, cal.com, Next.js Commerce, nuxt.com, and the repos of antfu, sindresorhus, Hono, Bun, Deno, Zig, Rust, ripgrep, tokio and uv; 25 of 28 vibe-coded projects.
- **A declared module type.** Every package.json says `"type": "module"` or `"commonjs"`, as Node's docs recommend (a warning).

Chous runs clean on Vite and SQLite, and finds only real problems in React, Vue and Oxc.

### Commands

```bash
npx chous                 # lint the current directory
npx chous claude install  # run chous in Claude Code hooks
npx chous cursor install  # run chous in Cursor hooks
npx chous scan .          # find git repos, detect kinds / roles
npx chous knowledge       # dump built-in tool / kind / migration JSON
```

Output is in English or Chinese (`-l en` / `-l zh`; default follows the system).

## License

[MIT](LICENSE)
