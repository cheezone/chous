# AGENTS.md

面向 AI 编程助手的项目说明。改动仓库前先读完。

## chous 是什么

一个**没有配置**的品味检查 CLI，像 `gofmt`：品味就是工具本身。**能跑，但还是臭。**

- **最高设计依据是 [`docs/manifesto.zh.md`](docs/manifesto.zh.md)**（英文版 `docs/manifesto.md`，`chous manifesto` 输出它）：长期稳定、简洁的审美宪法，不放具体数值和名单。改规则前先读；规则和宣言冲突时，改规则或先改宣言。具体查什么、立场值、作用域、规则表在 [`docs/rules.zh.md`](docs/rules.zh.md)，改规则时同步改它。
- chous 对具体软件知道的那一点（停止维护、废弃、语言命名），见生成的 [`docs/facts.zh.md`](docs/facts.zh.md)。

## 什么规则能进来

新规则先归类，再问有没有官方证据：

- **A 通用事实**（优先做）：文件大小、行数、目录分布、重复内容、命名一致性、git 跟踪状态、文件签名。不依赖具体框架，几年后依然成立，没被适配过的语言也受益。
- **B 已发生的事件**（有限收录）：停止维护、作者明确宣布的废弃。可以积累，日期由程序同步，不手写。
- **C 易变的生态知识**（不收）：配置优先级、版本特定字段、文件位置变化、平台默认上限、原生替代关系。工具自己会诊断，agent 能读最新文档。
- **D 语义判断**（交给 agent）：代码职责、架构、依赖用途、历史残留。写进宣言「交给 agent 的部分」。

**首要问题：如果三年没人维护 chous，这条规则是否仍然成立？** 漏报可以接受，持续产生错误事实不可接受。其余要回答的：必须懂某个具体工具吗？别的工具已经在查了吗？能用通用算法替代吗？能交给 agent 吗？**除停止维护和明确废弃外，需要知道具体软件的名字和版本才成立的规则，默认不收。** 不以支持的工具数量、知识条目数量作为进展。

## 做规则时最容易犯的错

- **不读名字里的词。** `FIXES_SUMMARY.md`、`index.ts.bak`、`src copy/`、`plugin/` 和 `plugins/`、`test/` 和 `tests/`、`报告-最终版.md`、`백업.ts`：靠英文单词、词形、同义词推断含义的规则，换一种语言就得再猜一遍，不是事实，一律不写（备份、工作日志、一次性脚本、单复数、同义目录、`*.log` 都已删除）。名字只在两种情况下算证据：工具或操作系统规定的确切名字（`eslint.config.js`、`.DS_Store`），并且有内容佐证；或者名字本身就是事实（只差大小写、语言规定的命名风格）。其余证据只能来自内容：文件头签名、工具写下的标记文件、OS 写的内容、git 索引与 .gitignore 的矛盾。
- **事实错了才是误报，审美不同不是。** 知名项目被报不是误报。事实错了就改证据标准（例如 Deno 手写的 `dist/` 要求有构建脚本才算构建产物），不是加豁免。
- 收进来的事实只认官方文档写明的。官方没写的不推断（Angular 只说「不再支持」，就只报这句，不编日期）。引用以原文为准，例如 `.env` 可以提交，只有 `.env*.local` 不行。
- 「作者宣布废弃」只认作者原话（npm `deprecated` 字段、README、安全公告）。npm 的 `deprecated` 不维护名单：pnpm、npm 安装时把它原样记进 `pnpm-lock.yaml`、`package-lock.json`，chous 从那里读（`src/vfs/lockfile.ts`），只报 `package.json` 直接写的依赖；`src/facts/packages/npm.ts` 只放 lockfile 读不到的（README、安全公告、带替代品的）。Bower（README 说仍在维护）和 JSHint（从未宣布废弃）不算。
- 版本只取实际运行环境（`.nvmrc`、`.node-version`、`.python-version`、`.tool-versions`、项目里任何 Dockerfile 的 `FROM`（展开 `ARG`、允许任意镜像仓库）、workflow 里 `actions/setup-node`/`setup-python` 的单个版本和 `container`/`image`、devcontainer 的镜像和 features、`volta.node`、框架依赖；CI 矩阵是兼容测试，不读；Node 代号按 `schedule.json` 的 `codename` 换算）。`engines.node` 是兼容承诺，只有声明的范围全部停止维护才报。
- 不按职责数工具（「一件事两个工具」已删除）：用几个工具是用户的事。
- 命名：语言规定了风格的（`src/facts/kinds/naming.ts`：Python、Go、Rust、Dart、Kotlin、Elixir、PSR-4）**规模冻结**：不再加新语言，框架的不收，尤其不再加需要读源码声明的规则（PSR-4、Kotlin、Rust `#[path]`、Go 包名已经是上限）。这些规则由它的工具文件管，通用的「同一目录一种风格」（`mixedStyles`）不再重复报这些文件。官方说「unclear」「unopinionated」的不报。名字本身不合法、不可能是模块的（带连字符的 Python 脚本、`lib.miri.rs`）不归模块命名管；被 `#[path]` 改名的 Rust 文件，模块名以 `mod` 声明为准。
- 体积和数量（`MEASURES`，`src/taste/hygiene.ts`）是 chous 的立场：源文件 1000 行或 100 KiB（长行不跳过，压缩代码交给 agent）、目录 50 个源文件、根目录 30 个文件、指令文件 300 行、4 KiB 以上的重复文件，只进入 review，每个仓库合并成一条；50 MiB 以上的文件是 chous 自己的政策（smell），不引用平台限制。人看的消息只列前几项，`details` 里给 agent 完整数据（JSON 不截断）。是否职责过度集中交给 agent，不机械拆分。阈值按语料分布选在尾部；「知名项目也这样」不是放弃检测的理由。
- 语义判断（注释掉的旧代码、无人调用的兼容层、过度抽象、文件到底有没有用）不写成启发式规则，写进宣言「交给 agent 的部分」。
- AI 工具的格式和上限属于 C 类，不收（全部已删除）。agent 指令文件只按 chous 自己的立场看行数和重复。
- 作用域（`snapshot.notOurs`）：名单只收工具规定的名字（`NOT_OURS`：npm 的 `node_modules/`、Go 和 Linguist 的 `vendor/`、Go 的 `testdata/`、Jest/Vitest 写的 `__snapshots__/`、Linguist 的 `tests/fixtures/`、`specs/fixtures/`），其余由仓库在 `.gitattributes` 里用 `linguist-vendored` / `linguist-generated` 声明（`src/vfs/gitattributes.ts`，按 git 的属性规则：后写的赢，深层文件赢，`-linguist-vendored` 要回）。`third_party/`、`upstream/`、`__fixtures__` 这类没有出处的名字不收。测试目录里的子项目只认测试工具读的目录：Node 的 `test/`、Jest 的 `__tests__/`。`tests/`、`examples/`、`playground/` 照常检查。
- **不要**重新引入 `.chous` 配置、DSL、预设、开关规则的选项或任何让用户自定义规则的入口。运行时离线：不联网、不调用 AI、不需要 key。

## 代码在哪

- **`src/facts/`：chous 对具体软件知道的那一点，故意保持很小。** 一个工具一个文件 `tools/<生态>/<工具>.ts`，在 `index.ts` 登记：停止维护时间表（`eol`）、语言的命名规定、工具宣布废弃的字段、工具说不能提交的文件（`absent`），每条带原话（`sources`）、中英文案和正反例。npm 包在 `packages/npm.ts`，只放 lockfile 读不到的作者废弃（没有「被作者破坏」类：历史上的破坏事件不能证明所有版本永久腐烂，安全审计不归 chous）。
  - 事实按「种类」写（`kinds/`：命名、TOML 废弃字段、`custom`）。
  - 停止维护日期不手写：`eol.parse` 读官方数据，`pnpm run sync` 只追加已经过去的日期，写进 `data/eol/`（禁止手改）。已记录的和官方数据不一致时只报告、不覆盖。
- **`src/taste/`：chous 自己的规则**，以及按项目形态叠加规则（`resolveTaste`）：`base` 总是生效，`js`、`monorepo` 按项目叠加。`hygiene.ts` 是构建产物、残留文件、根目录的名单和体积立场（`MEASURES`）；`sources.ts` 是这些规则的原话。
- `src/rules/validators/measures.ts`：通用的体积、数量、重复检测，只在仓库根目录跑一次。
- 检查的范围：`.git/index` 里被跟踪的文件就是已提交的，`.gitignore` 和 `node_modules/`、`dist/`、`build/` 都藏不住它（`src/vfs/git-index.ts`，离线读取）。工作区包、以及有自己 lockfile 的子项目（`frontend/`、`backend/`）各自当项目检查；`test/`、`__tests__/` 里的子项目是测试输入，不检查。
- 读文件一律用 `readText` / `readBytes`（`src/fsutil.ts`）：只读普通文件，最多 16 MiB，非阻塞打开。仓库是不可信的输入：软链接可以指向 `/dev/zero`、`/`、`../secret`，文件名可以带 `..\\`、`#`、终端控制字符，manifest 可以是 `null` 或嵌套上万层。遍历不跟随软链接，只有 git 跟踪的、指向仓库内部的软链接才跟随。多行正则不要用 `^\\s*`（在空行上是平方复杂度），用 `^[ \\t]*`。`.gitignore` 规则按词建索引（`src/vfs/gitignore.ts`），两万行规则也不会让每个路径都试一遍；结果和 `ignore` 库逐条比对一致（`test/code/gitignore.test.ts`）。`test/code/robustness.test.ts` 锁住了这些攻击。
- `src/rules/validators/`：每种规则的执行。
- 文案：i18next，只有 `en` 和 `zh`，在 `src/locales/{en,zh}.ts`（TS 模块，tsdown 的 dts 不支持 JSON）。工具的文案写在工具文件里，由注册表并入。不要再引入 typesafe-i18n（不支持 TS 7）。

## 怎么验证

- `pnpm run test`：包括 `test/code/facts.test.ts`，对每个工具跑同一套检查（每条事实有原话、中英文齐全且占位符一致、正例必报、反例必不报），加工具不用另写测试；`docs.test.ts` 在 `docs/facts*.md` 过期时失败（`pnpm run docs` 重新生成）。
- `pnpm run sources`：逐条去页面核对原话（沙箱里需 `NODE_USE_ENV_PROXY=1`）。新增或修改来源后必须跑。
- `pnpm run sync --check`：停止维护日期和官方数据比对。
- **没有真实实例，就不算支持。** 新规则（尤其是新语言、新框架）要找到真实项目里的违例和守规的例子，锁定 commit 加进 `test/corpus.json`，逐条核对。`docs/facts*.md` 的「真实命中」一列由语料结论生成，「尚未见到」的规则要如实标出。
- `pnpm run corpus`（联网，不在 CI 里，缓存目录用 `CHOUS_CORPUS_DIR`）：`test/corpus.json` 锁定 85 个仓库的 commit，结论记录在 `test/corpus.claims.txt`。改规则后必须跑；有差异时逐行核对事实，确认正确才 `pnpm run corpus --update`。
- `.github/workflows/eol.yml` 每周只跑 `sync --check`（停止维护日期）。原话只在新增来源时用 `pnpm run sources` 核对一次：官方改个措辞不是新闻，不值得每周维护。
- `node dist/cli.mjs`：用 chous 检查本仓库，必须没有臭味。

## 常用命令

```bash
pnpm install --frozen-lockfile
pnpm run lint        # oxlint
pnpm run typecheck   # tsc --noEmit
pnpm run build       # tsdown
pnpm run test        # vitest run
pnpm run docs        # 从注册表重新生成 docs/facts*.md
pnpm run sync        # 从官方数据追加停止维护日期（需联网）
node dist/cli.mjs    # 用 chous 检查本仓库（CI 也会跑）
```

## 工程约定

- 包管理：**pnpm**（不是 bun）。`package.json` 的 `packageManager`（`pnpm@12.x`）是 pnpm 版本的唯一来源。
- Node：`engines.node >= 22`；CI 矩阵 `ubuntu-latest` / `macos-latest` / `windows-latest` × node `22` / `24`。
- 构建 tsdown，测试 vitest。运行时依赖尽量少：小依赖放 devDependencies，由 tsdown `deps.onlyBundle` 打进 `dist`（目前是 i18next）。
- commit：commitlint（conventional commits）+ `tsc --noEmit`。subject **不超过 30 字符**，首字母大写，不含中文；细节放 body。
- CI 踩坑（不要重犯）：
  - **不要用 bun**：windows 上 `bun install` 装不上 rolldown 的 `win32-x64` 原生二进制。
  - `pnpm/action-setup` **不要写死 `version`**，否则报 `Multiple versions of pnpm specified`。
  - Windows checkout 会把换行变成 `\r\n`：按文件内容比较时先统一换行。

## 发版（重要，别再犯蠢）

- 机制：**npm OIDC Trusted Publishing**。`.github/workflows/release.yml` 用 `permissions: id-token: write` + `npm publish --access public`，**不需要 `NPM_TOKEN` secret**，所以 `gh secret list` 为空是正常的。**不要**引入 `NPM_TOKEN` 相关逻辑。
- 流程：打 `v*` tag 并 push → `release.yml` 自动 `npm publish` + 创建 GitHub Release。
- 发版命令（先本地验证，再打 tag）：
  ```bash
  pnpm run test && pnpm run build && pnpm exec changelogen --bump <version> --release --push --no-output --no-changelog
  ```
  - `--bump <version>` 强制指定版本；`--no-changelog` / `--no-output` 是既定选项（不维护 CHANGELOG 文件）。
- 版本号处于 `0.x`。不要手动改 `package.json` 版本，交给 changelogen（不是 semantic-release）。
