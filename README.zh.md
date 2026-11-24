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

Chous 是一个有主见的品味检查器。AI 编辑器会自己发明目录、格式化工具和测试框架，项目从没要求过这些。Chous 嗅仓库里的臭味：腐烂的依赖、互相打架的工具、要泄露的密钥、乱糟糟的根目录，然后告诉 AI 该改成什么。

没有配置，没有预设，也没有插件。品味就是工具本身，像 `gofmt` 一样。

\* *chous* 来自中文「抽丝」：抽丝剥茧，理清头绪。

```bash
npx chous
```

### 输出

```
.
├── ✖ .DS_Store                      → 不允许：系统垃圾文件，删掉并加进 .gitignore
├── ✖ .env                           → 不允许：密钥文件，加进 .gitignore，改为提交 .env.example
├── ✖ notes.txt                      → 不在白名单（1）
├── ✖ package.json (git-hooks)       → Git 钩子同时用了 husky + simple-git-hooks，它们会互相打架，只留一个
├── ✖ package.json (moment)          → 依赖 moment 已过时 → dayjs / date-fns / Temporal
├── ✖ package.json (node-fetch)      → 依赖 node-fetch 已过时 → fetch
├── ✖ package.json (package-manager) → 包管理器同时用了 npm + yarn，它们会互相打架，只留一个
├── ✖ package.json (request)         → 依赖 request 已过时 → fetch
├── ✖ package.json (tslint)          → 依赖 tslint 已过时 → ESLint / oxlint
└── ✖ tslint.json                    → 不允许：已死工具的残留配置

品味：base · git · js
```

### 品味

Chous 只嗅臭味，不追时髦。臭味是指今天是错的、三年后仍然是错的东西：已经死掉的包、平台已经自带的轮子、两个工具抢同一份活、马上要被提交的密钥。Chous 从不规定你用哪个 linter、哪个打包工具：今天新鲜的工具，明天就可能不新鲜了。

规则都在 [`src/taste/`](src/taste)，按项目长什么样叠加：

| 品味 | 什么时候生效 |
| --- | --- |
| `base` | 总是 |
| `git` · `github` | git 仓库；有 `.github/workflows` |
| `js` · `monorepo` · `bun` · `cloudflare` | 有 `package.json`；有工作区包；用 Bun；有 `wrangler` 配置 |
| `go` · `python` | 有 `go.mod`；有 `pyproject.toml` 等 |
| `nextjs` · `nuxt3` · `nuxt4` | 有对应框架的配置文件 |

- **只凭事实判断腐烂。** 只看作者或平台自己说过的话，而且必须是已经发生的事。年龄、速度、实现语言、流行度都不算，没人说话（沉默）也不算：

  | 状态 | 事实 | 例子 | 级别 |
  | --- | --- | --- | --- |
  | 鸡肋 | 平台已经自带等价能力 | `node-fetch` → `fetch`、`rimraf` → `fs.rm` | 警告 |
  | 过期 | 官方公布的停止维护日期已过 | Node 20、Nuxt 3 | 警告 |
  | 腐烂 | 停止维护超过两年；作者宣布废弃；作者故意破坏 | Node 16、Python 2.7、Vue 2、`request`、`tslint`、`colors` | 错误 |

  停止维护日期写在 [`src/taste/eol.ts`](src/taste/eol.ts)，只收已经过去的日期。版本取自项目实际运行的：`.nvmrc`、`.node-version`、`.python-version`、`.tool-versions`、Dockerfile 的 `FROM`、锁定版本的 `engines.node`、`vue` / `nuxt` 依赖。满两年后，"过期"会自己变成"腐烂"，chous 不需要为此更新。
- **互相打架的工具。** 同时用两个包管理器、两个格式化工具、两套 git hook、两个发版工具。留哪个你自己定。
- **泄露和垃圾。** 没被 gitignore 的 `.env`、`.dev.vars`、`.DS_Store`、`*.log`；git 仓库没有 `.gitignore`。
- **干净的根目录。** 根目录的文件是白名单：文档、许可证、配置文件（任意 JSON / TOML / YAML、`*.config.*`）和常见目录。随手丢的笔记和脚本报错。点文件不管。
- **一个概念一个名字。** `test/`、`tests/`、`spec/` 选一个，不要同时有两个；`scripts/` 和 `script/` 也一样。workflow 用 kebab-case 的 `.yml`。
- **声明模块类型。** 每个 package.json 都要写 `"type": "module"` 或 `"commonjs"`，这是 Node 官方文档的建议。
- **Monorepo。** 每个工作区包都当成独立项目、按它自己的品味检查。根目录必须 private、只放工具；只能有一个 lockfile；同一个依赖只能有一个版本；内部依赖用 `workspace:*`。
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
