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
现代 3

  × Node 16 已于 2023-09-11 停止维护
   ╭─[.nvmrc]
   ╰────
  help: 仍在维护的 LTS 版本

  × request 2.88.2，作者已在 npm 上宣布废弃
    「request has been deprecated, see https://github.com/request/request/issues/3142」
   ╭─[package.json]
   ╰────

  × Vue 2 已于 2023-12-31 停止维护
   ╭─[package.json]
   ╰────
  help: Vue 3

秩序 3

  × 根目录除 README、LICENSE 这类之外还有 4 份文档
    根目录是入口
   ╭─[ARCHITECTURE.md]
   ├─[DEPLOYMENT.md]
   ├─[FIXES_SUMMARY.md]
   ├─[IMPLEMENTATION_COMPLETE.md]
   ╰────
  help: 最多留 3 份，其余移进 docs/

  × 和 README.md 只差大小写
    在 macOS 和 Windows 上检出时只会留下一个
   ╭─[Readme.md]
   ╰────
  help: 只留一个名字

  × 命名风格混用
    camelCase ×1 + kebab-case ×1（asyncData.ts, lazy-hydration.ts）
   ╭─[src/composables/]
   ╰────
  help: 同一个目录只用一种起名方式

洁净 2

  × 系统垃圾文件
   ╭─[.DS_Store]
   ╰────
  help: 删掉并加进 .gitignore

  × .gitignore 忽略了它，却仍被提交
   ╭─[dist/]  3 个文件
   ╰────
  help: 用 `git rm --cached` 取消跟踪，或者用 `!` 规则写明例外

待审视 2  chous 知道事实，不知道用途。由你或你的 agent 判断。

  ⚠ 2 个源文件超过 1000 行或 100 KiB
   ╭─[src/api.ts]    6763 行 · 132 KiB
   ├─[src/board.ts]  1840 行 · 36 KiB
   ╰────
  help: 是否承担了太多职责，由你或你的 agent 判断；不要机械拆分

  ⚠ 编译好的可执行文件或库
   ╭─[bin/server]
   ╰────
  help: 如果是本项目构建出来的，放到 Releases；如果是构建要读取的输入，就留着

臭味 8 处 · 待审视 2 处
只看品味：不检查正确性、安全和测试。
交给 agent：`chous claude install`，或让它运行 `chous manifesto` 和 `chous --json`。
```

### 交给 agent

chous 只列事实；决定怎么处理、动手处理，是 agent 的事。两种交法：

- **钩子**：`npx chous claude install`（或 `cursor install`）。agent 每次停下时 chous 自动运行，把所有臭味和待审视的完整清单交给它。
- **一句提示词**，任何 agent 都能用：

  ```text
  运行 `npx chous manifesto`，读懂它描述的品味。再运行 `npx chous --json`，整理这个仓库：
  修掉所有臭味；每一条待审视的，看过之后决定留不留，并说明理由。
  不要机械地拆文件。最后再运行一次 `npx chous`。
  ```

`--json` 里有每条结果的完整事实（`details`：所有长文件、平铺目录、重复文件组），上面的报告只列前几项。

### 两种结果

- **臭味**：chous 确定的事实，违反了它的品味，不需要再判断。按四种品味分组：现代、秩序、约定、洁净。
- **待审视**：事实确定，但含义需要上下文。比如一个可执行文件，chous 从文件头认得出格式，不知道它是构建产物还是构建要读的输入，交给你或你的 agent 判断。

没有错误、警告、提示之分，也没有分数。有臭味时 chous 以非零状态退出，待审视的不影响退出码。事实错了才是误报，审美不同不是。

### 检查什么

| 品味 | 臭味 | 待审视 |
| --- | --- | --- |
| 现代 | 已过官方停止维护日期的运行时和框架（从停止那天起，没有宽限期；`engines.node` 只在它允许的版本全部停止维护时才报）；作者废弃或称为遗留的依赖（npm 上作者的原话，从 lockfile 读）；工具宣布废弃的清单字段 | |
| 秩序 | 只差大小写或 Unicode 写法的两个名字；同一目录命名风格混用；根目录文档太多；monorepo 里跨大版本的依赖、嵌套 lockfile、两份不一致的 workspace 列表 | 超过 1000 行或 100 KiB 的源文件；平铺 50 个以上源文件的目录；根目录超过 30 个文件；内容完全相同的文件；超过 300 行的 agent 指令 |
| 约定 | 不符合语言命名规定的名字（Python、Go、Rust、Dart、Kotlin、Elixir、PHP 的 PSR-4） | |
| 洁净 | 构建产物（靠工具写下的标记识别）；系统垃圾和 `local.properties`（靠文件内容识别）；工具自己说不要提交的文件（`.env*.local`、`.idea/workspace.xml`）；被 .gitignore 忽略却仍被提交的文件；50 MiB 以上的文件；安装包（靠文件签名识别） | 可执行文件和库 |

每项检查看什么、立场值是多少、凭什么：见 [chous 的规则](docs/rules.zh.md)。chous 认识的少数具体工具：见 [chous 知道什么](docs/facts.zh.md)，由注册表生成。

不检查缺失（没有测试、没有 CI、没有许可证都不报）；行数、体积、文件数量只会让东西进入待审视，从不定性；也不检查正确性和安全；不读名字里的词，`FIXES_SUMMARY.md`、`index.ts.bak` 交给你的 agent 判断。别人的代码和测试数据不查：工具规定的名字（`node_modules/`、`vendor/`、`testdata/`、`__snapshots__/`、`tests/fixtures/`），以及 `.gitattributes` 里标了 `linguist-vendored` 或 `linguist-generated` 的路径，什么语言的目录名都行；`tests/`、`examples/` 是你自己的代码，照常检查。

每一条引用别人说法的原因都附有来源：加 `--verbose` 会在每条结果下面显示出处，加 `--json` 会以数据形式给出。每周有一个任务核对每个停止维护日期和官方数据是否一致；`pnpm run corpus` 会把 chous 对 85 个真实仓库说的每一句话和[已记录的结论](test/corpus.claims.txt)比对。

chous 对具体软件知道的那一点（停止维护时间表、废弃事件、语言的命名规定）在 [`src/facts/tools/`](src/facts/tools/)。它故意保持很小：工具的配置字段、读取顺序、版本特定行为都会变，工具自己会诊断。

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
