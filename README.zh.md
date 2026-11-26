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

Chous 是一个有主见的品味检查器：**能跑，但还是臭。** 它不管你的代码对不对，只管你的仓库干不干净、有没有秩序、用的东西烂没烂。AI 很会创造东西，却不负责收拾：迁移工具后留下旧配置，做完一件事留下五份总结，修一个 bug 留下三个临时脚本。Chous 把这些臭味指出来，交给你或你的 agent 去收拾。

没有配置，没有预设，也没有插件。品味就是工具本身，像 `gofmt` 一样。完整的立场写在 [宣言](docs/manifesto.zh.md) 里。

\* *chous* 来自中文「抽丝」：抽丝剥茧，理清头绪。

```bash
npx chous
```

### 输出

```
现代
  ✗ .nvmrc (Node 16)       → Node 16 已于 2023-09-11 停止维护 → 仍在维护的 LTS 版本
  ✗ package.json (request) → request：作者已于 2020 年宣布废弃。 → fetch
  ✗ package.json (Vue 2)   → Vue 2 已于 2023-12-31 停止维护 → Vue 3

秩序
  ✗ ./                             → 根目录除 README、LICENSE 这类之外还有 4 份文档（ARCHITECTURE.md, DEPLOYMENT.md, FIXES_SUMMARY.md, IMPLEMENTATION_COMPLETE.md）：根目录是入口，最多留 3 份，其余移进 docs/
  ✗ src/composables/               → 命名风格混用：camelCase ×1 + kebab-case ×1（asyncData.ts, lazy-hydration.ts）；同一个目录只用一种起名方式
  ✗ test/ + tests/                 → 同一个意思用了两个名字，只留一个

洁净
  ✗ .DS_Store        → 不允许：系统垃圾文件，删掉并加进 .gitignore
  ✗ package.json.bak → package.json 的拷贝：git 本来就保留了旧版本

待审视：chous 知道事实，不知道用途。由你或你的 agent 判断。
  ? ./                        → 2 份文档名字像工作日志（FIXES_SUMMARY.md, IMPLEMENTATION_COMPLETE.md）：如果记录的是某一次工作，应该写进 PR，而不是留在仓库里
  ? package.json (node-fetch) → 平台已经自带 fetch：能否完全替代 node-fetch，取决于你怎么用它

臭味 9 处 · 待审视 2 处
只看品味：不检查正确性、安全和测试。
```

### 两种结果

- **臭味**：chous 确定的事实，违反了它的品味，不需要再判断。按四种品味分组：现代、秩序、约定、洁净。
- **待审视**：事实确定，但含义需要上下文。比如一个名字像工作日志的文件，chous 知道它叫什么，不知道它写了什么，交给你或你的 agent 判断。

没有错误、警告、提示之分，也没有分数。有臭味时 chous 以非零状态退出，待审视的不影响退出码。事实错了才是误报，审美不同不是。

### 检查什么

| 品味 | 臭味 | 待审视 |
| --- | --- | --- |
| 现代 | 已过官方停止维护日期的运行时和框架（从停止那天起，没有宽限期；`engines.node` 只在它允许的版本全部停止维护时才报）；工具自己称为废弃、过时或旧格式的文件、字段和选项；作者废弃、称为遗留或故意破坏的依赖；死掉的工具留下的配置 | 平台已经自带同类能力的依赖 |
| 秩序 | 同一目录里同一个工具的第二份配置，工具永远不会读它；写了两遍又不一样的 Node 版本；一个东西两个名字（`test/` 和 `tests/`、单复数、只差大小写）；同一目录命名风格混用；根目录文档太多；`yarn.lock` 旁边的 `package-lock.json`；monorepo 里跨大版本的依赖、嵌套 lockfile、两份不一致的 workspace 列表；内容一模一样的 `CLAUDE.md` 和 `AGENTS.md` | |
| 约定 | 工具不再读、或只在某个位置某个名字下才读的文件和字段；不符合语言、框架命名规定的名字（Python、Go、Rust、Dart、Kotlin、Elixir、PHP 的 PSR-4、Angular、Vue）；npm 不接受的包名；工具和平台在文档里给出的上限（GitHub 的文件大小、Codex 的 AGENTS.md 大小、agent 指令的行数）；不符合 Agent Skills 规范的 skill；Next.js、Nuxt 不读的目录 | |
| 洁净 | 构建产物（靠工具写下的标记识别）；系统垃圾和 `local.properties`（靠文件内容识别）；工具自己说不要提交的文件（`.env*.local`、个人 IDE 和 agent 配置、Worker 本地密钥）；旁边就有原件的备份；安装包（靠文件头识别） | 可执行文件和库；名字像工作日志的文档；没人提到的一次性脚本；找不到原件的备份；成批的版本说明和工作记录 |

具体哪些工具、哪些文件、哪句原话：见 [chous 知道什么](docs/facts.zh.md)，由注册表生成，不会列出 chous 实际不查的工具。

不检查缺失（没有测试、没有 CI、没有许可证都不报）；不按行数、体积、文件数量判，除非官方文档给了具体限制；也不检查正确性和安全。测试夹具和别人的代码（`vendor/`、`third_party/`、`upstream/`）不查，`tests/`、`examples/` 是你自己的代码，照常检查。

每一条引用别人说法的原因都附有来源：加 `--verbose` 会在每条结果下面显示出处，加 `--json` 会以数据形式给出。每周有一个任务核对每句原话还在不在页面上、每个停止维护日期和官方数据是否一致；`pnpm run corpus` 会把 chous 对 85 个真实仓库说的每一句话和[已记录的结论](test/corpus.claims.txt)比对。

chous 对一个工具的全部知识都在 [`src/facts/tools/`](src/facts/tools/) 下的一个文件里：它的文件、它的原话、chous 用各语言怎么说，以及必须报和必须不报的例子。

### 命令

```bash
npx chous                 # 检查当前目录
npx chous --json          # 以数据形式输出所有结果，给 agent 用
npx chous manifesto       # 输出品味宣言，给 agent 读完再审视整个仓库
npx chous claude install  # 在 Claude Code hooks 里运行 chous
npx chous cursor install  # 在 Cursor hooks 里运行 chous
npx chous scan .          # 找出目录下的 git 仓库，逐个检查
```

输出支持英文和中文（`-l en` / `-l zh`，默认跟随系统）。

## 许可证

[MIT](LICENSE)
