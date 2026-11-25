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

Chous 是一个有主见的品味检查器。AI 编辑器会自己发明目录、格式化工具和测试框架，项目从没要求过这些。Chous 嗅仓库里的臭味：腐烂的依赖、停止维护的运行时、互相打架的工具、根目录的垃圾，然后告诉 AI 该改成什么。

没有配置，没有预设，也没有插件。品味就是工具本身，像 `gofmt` 一样。

\* *chous* 来自中文「抽丝」：抽丝剥茧，理清头绪。

```bash
npx chous
```

### 输出

```
✖ .env.local                     → 不允许：本地环境变量文件，可能含密钥；Vite 和 Next.js 官方都要求把 *.local 加进 .gitignore
✖ package.json (git-hooks)       → Git 钩子同时用了 husky + simple-git-hooks，它们会互相打架，只留一个
✖ package.json (package-manager) → 包管理器同时用了 npm + yarn，它们会互相打架，只留一个
✖ package.json (request)         → 依赖 request 已过时 → fetch
✖ package.json (Vue 2)           → Vue 2 已于 2023-12-31 停止维护，超过两年了 → Vue 3
✖ test/ + tests/                 → 同一个意思用了两个名字，只留一个
⚠ .nvmrc (Node 20)               → Node 20 已于 2026-04-30 停止维护，不再有安全修复 → 仍在维护的 LTS 版本
⚠ package.json (rimraf)          → 依赖 rimraf 平台已经自带 → fs.rm(path, { recursive: true, force: true })
⚠ package.json (type)            → 加上 "type"："module" 或 "commonjs"，Node 官方建议显式声明

发现 6 个错误，3 个警告

品味：base · js
```

### 检查什么

Chous 只嗅臭味，不追时髦。它只看项目的作者或平台自己说过的话，而且必须是已经发生的事。年龄、速度、实现语言、流行度都不算，没人说话（沉默）也不算。文件放在哪儿是各个生态自己的事：SQLite、React、Vue 的根目录各不相同，它们都没错。

规则都在 [`src/taste/`](src/taste)：

| 品味 | 什么时候生效 |
| --- | --- |
| `base` | 总是 |
| `js` · `monorepo` · `bun` · `cloudflare` | 有 `package.json`；有工作区包；用 Bun；有 `wrangler` 配置 |

- **只凭事实判断腐烂。**

  | 状态 | 事实 | 例子 | 级别 |
  | --- | --- | --- | --- |
  | 鸡肋 | 平台已经自带等价能力 | `node-fetch` → `fetch`、`rimraf` → `fs.rm` | 警告 |
  | 过期 | 官方公布的停止维护日期已过 | Node 20、Nuxt 3、Python 3.10 | 警告 |
  | 腐烂 | 停止维护超过两年；作者宣布废弃；作者故意破坏 | Node 16、Python 2.7、Vue 2、`request`、`babel-eslint`、`colors` | 错误 |

  停止维护日期写在 [`src/taste/eol.ts`](src/taste/eol.ts)，抄自各项目的官方时间表，只收已经过去的日期。版本取自项目实际运行的：`.nvmrc`、`.node-version`、`.python-version`、`.tool-versions`、Dockerfile 的 `FROM`、锁定版本的 `engines.node`、`vue` / `nuxt` 依赖。满两年后，"过期"会自己变成"腐烂"。
- **互相打架的工具。** 同时用两个包管理器、两个格式化工具、两套 git hook、两个发版工具。留哪个你自己定。
- **重复。** monorepo 里同一个依赖用了两个大版本（会装两份）；`test/` 和 `tests/` 同时存在；工作区包里有自己的 lockfile。
- **不该提交的东西。** 没被 gitignore 的构建产物（`node_modules`、`.next`、`dist`、Cargo/Maven 的 `target`、`__pycache__` 等，靠工具写下的标记识别，不只看目录名）。以及 `.env*.local`、`.dev.vars`、`.DS_Store`、`*.log`。规则在 [`src/taste/hygiene.ts`](src/taste/leaks.ts)。
- **AI 工作日志。** 根目录里以事件或状态命名的 Markdown，比如 `IMPLEMENTATION_COMPLETE.md`、`FIXES_SUMMARY.md`。它只描述某个时刻，提交当天就开始过时（错误：它属于 PR 描述，不属于根目录）。实测：Vue、Vite、React、Oxc、SQLite 一个都没有，抽样的 vibe coding 项目里一半都有。
- **声明模块类型。** 每个 package.json 都写 `"type": "module"` 或 `"commonjs"`，这是 Node 官方文档的建议（警告）。

Chous 在 Vite 和 SQLite 上没有任何报错，在 React、Vue、Oxc 上只报出真问题。

### 命令

```bash
npx chous                 # 检查当前目录
npx chous claude install  # 在 Claude Code hooks 里运行 chous
npx chous cursor install  # 在 Cursor hooks 里运行 chous
npx chous scan .          # 找 git 仓库，识别项目类型 / 技术栈角色
npx chous knowledge       # 导出内置工具 / 类型 / 迁移知识 JSON
```

输出支持英文和中文（`-l en` / `-l zh`，默认跟随系统）。

## 许可证

[MIT](LICENSE)
