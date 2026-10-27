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

Chous is an opinionated taste linter. AI editors invent folders, formatters, and test runners your project never asked for. Chous checks the repository against a **persona** you choose — layout, stack, naming — and tells the agent what to change.

Stop AI slop. Follow a real person.

\* *chous* comes from Chinese「抽丝」(chōu sī): to draw out silk threads, to untangle.

### Input

```
tests/
.prettierrc
jest.config.ts
```

### Output

```
✖ tests/         → should be test/
✖ .prettierrc    → not allowed
✖ jest.config.ts → replace jest with vitest
```

```bash
npx chous
```

### Stack roles

Presets declare **roles**, not attitudes toward tools:

```
package manager pnpm
runtime         bun
linter          oxlint
test runner     vitest
bundler         tsdown
```

Chous detects what occupies each role, auto-allows the chosen tool's config files, and flags siblings (e.g. `.prettierrc` when the formatter role is `@antfu/eslint-config`). Migration difficulty comes from the built-in knowledge base — authors don't write `because` / `see` for that.

```bash
npx chous scan .          # find git repos, detect kinds / roles
npx chous knowledge       # dump built-in tool / kind / migration JSON
```

## License

[MIT](LICENSE)
