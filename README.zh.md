<p align="center">
  <img src="public/logo.png" alt="chous" width="160" height="160" />
</p>

<h1 align="center">chous</h1>

<p align="center">
  <b>有主见的品味检查器</b>
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
  <a href="./README.md">English</a>
</p>

---

## chous

_/tʃoʊs/_

Chous 是一个有主见的品味检查器。AI 编辑器会自己发明目录、格式化工具和测试框架，项目从没要求过这些。Chous 按一个人的品味检查仓库：目录、技术栈、命名、依赖，然后告诉 AI 该改成什么。

没有配置，没有预设，也没有插件。品味就是工具本身，像 `gofmt` 一样。

\* *chous* 来自中文「抽丝」：抽丝剥茧，理清头绪。

```bash
npx chous
```

### 输出

```
.
├── ✖ tests/                                    → 应重命名为 test/
├── ✖ .DS_Store                                 → 不允许：OS junk, delete it and gitignore it
├── ✖ .prettierrc                               → 不在白名单（1）
├── ✖ eslint.config.js                          → 不允许：config for a tool this taste does not use
├── ✖ jest.config.ts                            → 不允许：config for a tool this taste does not use
├── ✖ notes.txt                                 → 不在白名单（1）
├── ✖ package.json (moment)                     → 依赖 moment 已过时 → dayjs / date-fns / Temporal
├── ✖ package.json (pnpm)                       → 包管理器应为 pnpm（当前是 yarn）
├── ✖ package.json (type)                       → "type" 应为 "module"
├── ✖ package.json (uuid)                       → 依赖 uuid 已过时 → crypto.randomUUID()
├── ✖ stack (git hooks: husky→simple-git-hooks) → git hooks 应为 simple-git-hooks（当前是 husky）
├── ✖ stack (linter: eslint→oxlint)             → linter 应为 oxlint（当前是 eslint）
├── ✖ stack (test runner: jest→vitest)          → test runner 应为 vitest（当前是 jest）
└── ✖ yarn.lock                                 → 不允许：config for a tool this taste does not use

品味：base · git · github · js
```

### 品味

Chous 看项目长什么样，叠加适用的品味。规则都在 [`src/taste/`](src/taste)：

| 品味 | 什么时候生效 |
| --- | --- |
| `base` | 总是 |
| `git` · `github` · `cnb` | git 仓库；托管平台看 `origin` 远程地址、`.github/` 或 `.cnb.yml` |
| `js` · `monorepo` · `bun` | 有 `package.json`；有工作区包；运行时是 Bun |
| `cloudflare` | 有 `wrangler` 配置 |
| `go` · `python` | 有 `go.mod`；有 `pyproject.toml` 等 |
| `nextjs` · `nuxt3` · `nuxt4` | 有对应框架的配置文件 |

- **根目录是白名单，点文件也算。** 根目录里任何没被允许的东西都报错，`.prettierrc`、`.idea` 也一样。
- **Git 卫生。** 必须有 `.gitignore`；不会被提交的 `.DS_Store`、`.env`、`*.log` 都不许出现；只用一个 CI：GitHub Actions 或 CNB（`.cnb.yml`），不要 Travis、CircleCI、Jenkins。
- **GitHub。** `.github/` 里只放 GitHub 认的东西；workflow 文件用 kebab-case 的 `.yml`。
- **一个概念一个名字。** 用 `test/`，不用 `tests/`、`__tests__/`、`spec/`；用 `scripts/`，不用 `script/`。
- **一个角色一个工具。** pnpm、TypeScript、oxlint、Vitest、simple-git-hooks。要发包的项目还要用 tsdown 和 changelogen。同一角色出现别的工具就报错，并附上内置知识库里的迁移说明。
- **不要过时依赖。** 清单手工维护在 [`src/taste/deps.ts`](src/taste/deps.ts)：平台已经自带替代的包（`uuid` → `crypto.randomUUID()`、`node-fetch` → `fetch`、`chalk` → `util.styleText`、`rimraf` → `fs.rm` 等），以及已经死掉的包（`moment`、`request`、`node-sass`、`tslint`、`ts-node` 等）。每条报错都会说明该换成什么。
- **只用 ESM。** 每个 package.json 都要 `"type": "module"`。
- **Monorepo。** 每个工作区包都当成独立项目、按它自己的品味检查，比如 `apps/web` 里的 Nuxt 应用会套用 Nuxt 的目录规则。根目录必须 private、只放工具；只能有一个 lockfile；同一个依赖只能有一个版本（或用 pnpm catalog）；内部依赖用 `workspace:*`。
- **Bun。** Bun 项目用 Bun 管包（`bun.lock`，不要 `bun.lockb`）、用 `@types/bun`、`bun:sqlite`，不需要 `tsx`。
- **Cloudflare。** 用 `wrangler.jsonc`；用 `wrangler types` 代替 `@cloudflare/workers-types`；`.dev.vars` 永远不提交。
- **框架目录。** Next.js App Router、Nuxt 3 / 4 的目录和命名约定。

不同意？fork 一份。本来就该这样。

### 命令

```bash
npx chous                 # 检查当前目录
npx chous --fix           # 应用安全修复（重命名、改 package.json）
npx chous claude install  # 在 Claude Code hooks 里运行 chous
npx chous cursor install  # 在 Cursor hooks 里运行 chous
npx chous scan .          # 找 git 仓库，识别项目类型 / 技术栈角色
npx chous knowledge       # 导出内置工具 / 类型 / 迁移知识 JSON
```

输出支持英文和中文（`-l en` / `-l zh`，默认跟随系统）。

## 许可证

[MIT](LICENSE)
