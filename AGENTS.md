# AGENTS.md

面向 AI 编程助手的项目说明。改动仓库前先读完。

## chous 是什么

一个**没有配置**的品味检查 CLI，像 `gofmt`：品味就是工具本身。**能跑，但还是臭。**

- **最高设计依据是 [`docs/manifesto.zh.md`](docs/manifesto.zh.md)**（英文版 `docs/manifesto.md`，`chous manifesto` 输出它）。改规则前先读；规则和宣言冲突时，改规则或先改宣言。四种品味、两种结果（smell / review）、不惩罚缺失、不按行数判、不为任何项目加豁免，都写在那里，这里不重复。
- chous 知道的每个工具、每句原话，见生成的 [`docs/facts.zh.md`](docs/facts.zh.md)。

## 做规则时最容易犯的错

- **不读名字里的词。** `FIXES_SUMMARY.md`、`index.ts.bak`、`src copy/`、`plugin/` 和 `plugins/`、`test/` 和 `tests/`、`报告-最终版.md`、`백업.ts`：靠英文单词、词形、同义词推断含义的规则，换一种语言就得再猜一遍，不是事实，一律不写（备份、工作日志、一次性脚本、单复数、同义目录、`*.log` 都已删除）。名字只在两种情况下算证据：工具或操作系统规定的确切名字（`eslint.config.js`、`.DS_Store`），并且有内容佐证；或者名字本身就是事实（只差大小写、语言规定的命名风格）。其余证据只能来自内容：文件头签名、工具写下的标记文件、OS 写的内容、git 索引与 .gitignore 的矛盾。
- **事实错了才是误报，审美不同不是。** 知名项目被报不是误报。事实错了就改证据标准（例如 Deno 手写的 `dist/` 要求有构建脚本才算构建产物），不是加豁免。
- 只收官方文档里写明的东西：位置、命名、上限、旧格式、停止维护日期。官方没写的不推断（Angular 只说「不再支持」，就只报这句，不编日期）。引用以原文为准，例如 `.env` 可以提交，只有 `.env*.local` 不行。
- 「作者宣布废弃」只认作者原话（npm `deprecated` 字段、README、安全公告）。Bower（README 说仍在维护）和 JSHint（从未宣布废弃）不算。
- 版本只取实际运行环境（`.nvmrc`、`.node-version`、`.python-version`、`.tool-versions`、项目里任何 Dockerfile 的 `FROM`（展开 `ARG`、允许任意镜像仓库）、workflow 里 `actions/setup-node`/`setup-python` 的单个版本和 `container`/`image`、devcontainer 的镜像和 features、`volta.node`、框架依赖；CI 矩阵是兼容测试，不读；Node 代号按 `schedule.json` 的 `codename` 换算）。`engines.node` 是兼容承诺，只有声明的范围全部停止维护才报。
- 不按职责数工具（「一件事两个工具」已删除）：用几个工具是用户的事。只有工具自己说不该并存的才报（Yarn 对 `package-lock.json` 的警告）。
- 命名：语言或框架规定了风格的（`src/facts/kinds/naming.ts`），由它的工具文件管，通用的「同一目录一种风格」（`mixedStyles`）不再重复报这些文件。官方说「unclear」「unopinionated」的不报。名字本身不合法、不可能是模块的（带连字符的 Python 脚本、`lib.miri.rs`）不归模块命名管；被 `#[path]` 改名的 Rust 文件，模块名以 `mod` 声明为准。
- 语义判断（注释掉的旧代码、无人调用的兼容层、过度抽象、文件到底有没有用、巨型文件）不写成启发式规则，写进宣言「交给 agent 的部分」。
- **优先级：生态约定先于 AI 工具约定。** AI 工具一年内就会改名、被收购、换格式，收录前必须重新调研（用户量、是否还在维护、是否改名）。
- 作用域：只有测试数据（`fixtures/`、`components-fixture/` 这类命名的夹具目录、`testdata/`、`__snapshots__/`）和别人的代码 `vendor/`、`third_party/`、`upstream/` 跳过（`NOT_OURS`）；`tests/`、`examples/`、`playground/` 照常检查。
- **不要**重新引入 `.chous` 配置、DSL、预设、开关规则的选项或任何让用户自定义规则的入口。运行时离线：不联网、不调用 AI、不需要 key。

## 代码在哪

- **`src/facts/`：chous 知道的一切。** 一个工具一个文件 `tools/<生态>/<工具>.ts`，在 `index.ts` 登记。文件里放这个工具的全部知识：配置文件（`configs`、`legacy`）、事实（`facts`）、不该提交的路径（`absent`）、停止维护时间表（`eol`）、原话（`sources`）、中英文案（`message`）、正反例（`examples`）、调研日期（`researched`）。npm 包在 `packages/npm.ts`。
  - 事实按「种类」写（`kinds/`）。新工具应该只填数据；`custom` 是逃生口，两个工具用到同一种检查时就把它提成新种类。
  - 别处需要工具的文件列表时从工具文件引用（`configs`），不要抄一份。
  - 停止维护日期不手写：`eol.parse` 读官方数据，`pnpm run sync` 只追加已经过去的日期，写进 `data/eol/`（禁止手改）。已记录的和官方数据不一致时只报告、不覆盖。
- **`src/taste/`：chous 自己的规则**，以及按项目形态叠加规则（`resolveTaste`）：`base` 总是生效，`js`、`monorepo`、`bun`、`cloudflare`、`next`、`nuxt` 按项目叠加。`hygiene.ts` 是构建产物、残留文件、根目录的名单；`frameworks.ts` 是 Next.js、Nuxt 的目录规则；`sources.ts` 是这些规则的原话。`contracts.ts` 只剩 `nodeVersions`（同一事实写两遍且不一致，不需要别人的原话）。
- 检查的范围：`.git/index` 里被跟踪的文件就是已提交的，`.gitignore` 和 `node_modules/`、`dist/`、`build/` 都藏不住它（`src/vfs/git-index.ts`，离线读取）。工作区包、以及有自己 lockfile 的子项目（`frontend/`、`backend/`）各自当项目检查；测试目录里的子项目是测试输入，不检查。
- 读文件一律用 `readText` / `readBytes`（`src/fsutil.ts`）：只读普通文件，最多 16 MiB，非阻塞打开。仓库是不可信的输入：软链接可以指向 `/dev/zero`、`/`、`../secret`，文件名可以带 `..\\`、`#`、终端控制字符，manifest 可以是 `null` 或嵌套上万层。遍历不跟随软链接，只有 git 跟踪的、指向仓库内部的软链接才跟随。多行正则不要用 `^\\s*`（在空行上是平方复杂度），用 `^[ \\t]*`。`.gitignore` 规则按词建索引（`src/vfs/gitignore.ts`），两万行规则也不会让每个路径都试一遍；结果和 `ignore` 库逐条比对一致（`test/code/gitignore.test.ts`）。`test/code/robustness.test.ts` 锁住了这些攻击。
- `src/rules/validators/`：每种规则的执行。
- 文案：i18next，只有 `en` 和 `zh`，在 `src/locales/{en,zh}.ts`（TS 模块，tsdown 的 dts 不支持 JSON）。工具的文案写在工具文件里，由注册表并入。不要再引入 typesafe-i18n（不支持 TS 7）。

## 怎么验证

- `pnpm run test`：包括 `test/code/facts.test.ts`，对每个工具跑同一套检查（每条事实有原话、中英文齐全且占位符一致、正例必报、反例必不报），加工具不用另写测试；`docs.test.ts` 在 `docs/facts*.md` 过期时失败（`pnpm run docs` 重新生成）。
- `pnpm run sources`：逐条去页面核对原话（沙箱里需 `NODE_USE_ENV_PROXY=1`）。新增或修改来源后必须跑。
- `pnpm run sync --check`：停止维护日期和官方数据比对。
- **没有真实实例，就不算支持。** 新规则（尤其是新语言、新框架）要找到真实项目里的违例和守规的例子，锁定 commit 加进 `test/corpus.json`，逐条核对。`docs/facts*.md` 的「真实命中」一列由语料结论生成，「尚未见到」的规则要如实标出。
- `pnpm run corpus`（联网，不在 CI 里，缓存目录用 `CHOUS_CORPUS_DIR`）：`test/corpus.json` 锁定 85 个仓库的 commit，结论记录在 `test/corpus.claims.txt`。改规则后必须跑；有差异时逐行核对事实，确认正确才 `pnpm run corpus --update`。
- `.github/workflows/sources.yml` 每周跑 `sync --check` 和 `sources`，失败说明官方文档变了。
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
