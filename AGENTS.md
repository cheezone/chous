# AGENTS.md

面向 AI 编程助手的项目说明。改动仓库前请先读此文件，避免重复踩坑。

## 项目概览
- 仓库：`chous`，一个**没有配置**的品味检查 CLI，像 `gofmt`：品味就是工具本身。**能跑，但还是臭。**
- **最高设计依据是 [`docs/manifesto.zh.md`](docs/manifesto.zh.md)**（英文版 `docs/manifesto.md`，`chous manifesto` 输出它）。改规则前先读；规则和宣言冲突时改规则，或者先改宣言。宣言附录逐条写了「chous 知道什么、主张什么」，加规则时同步加一行。
- chous 检查品味，不检查正确性、安全、性能、测试。**不惩罚缺失**（没有测试、CI、许可证、`"type"` 字段都不报）。
- 四种品味：现代（modernity）、秩序（order）、约定（convention）、洁净（cleanliness）。每条规则必须属于其中一种（`RuleBase.value`），报告按它分组。
- **两种结果，没有 error/warning/info、没有分数**：
  - `smell`：事实确定，违反品味，不需要判断。有 smell 时退出码为 1。
  - `review`：事实确定，含义需要上下文（用途、意图）。交给人或 agent 判断，不影响退出码。
  - 这是「chous 知道多少」，不是严重程度。**只凭文件名的猜测永远只能是 review**（工作日志、一次性脚本、找不到原件的备份）；要成为 smell 必须有事实（原件就在旁边、文件内容是 OS 写的、工具写下的标记文件）。
- **事实错了才是误报，审美不同不是。** 知名项目也会被报，那不是误报；**不为迁就任何项目加豁免**。只维护两种名单：官方位置约定（`ROOT_CONTRACT_DOCS`、框架约定、`NAME_EXEMPT` 里工具起的名字），和已经发生、可核实的历史事实（`eol.ts`、`deps.ts`）。
- 腐烂没有宽限期：停止维护那天起就是 smell（`hasEnded`）。停止维护日期只收官方数据里写着的版本（各工具文件的 `eol`：Node `schedule.json`、PEP `release-cycle.json`、Vue EOL 页、Nuxt 路线图、ESLint version-support、Electron 发布时间表、Django 下载页、Angular 发布页；Angular 只说「不再支持」不给日期，`date: ""` 报 `issue.lifecycle.unsupported`），**表里没有的版本不报，从不推断日期**。`pnpm run sources` 逐个比对每个日期。
- 版本只取实际运行环境（`.nvmrc`、`.node-version`、`.python-version`、`.tool-versions`、Dockerfile `FROM`、`volta.node`、框架依赖）。`engines.node` 是兼容承诺：只有声明的范围全部停止维护才报（`issue.lifecycle.declared`），`>=16` 这种开放范围不报。
- 「平台已自带」（`NATIVE`）是 review：平台自带了什么是事实，能否完全替代要看项目怎么用。
- 根目录克制：除位置约定文档外最多 `ROOT_DOCS_LIMIT`（3）份文档。这是立场，不是测量。
- **不按行数、体积、文件数量判**（实测：知名仓库的大文件比 vibe 项目还多，行数证明不了职责过多）。只有官方文档给了具体限制才写规则，例如 `CLAUDE.md` 200 行（Claude Code 文档原话）。巨型文件、平铺目录、多语言混用写进宣言交给 agent，并要求 agent 不得为了行数机械拆分文件。
- 文件身份靠内容确认：OS 垃圾、`local.properties` 看文件内容（`KNOWN_BY_CONTENT`）；安装包（apk/ipa/msi/deb/rpm/AppImage，smell）和可执行文件/库（exe/dll/so/dylib，review，可能是构建输入，如 Android `jniLibs`）看文件头签名；构建产物目录必须有工具写下的标记文件。
- 「作者宣布废弃」只认作者的原话（npm `deprecated` 字段、README、安全公告），登记在 `sources.ts`。Bower（README 说仍在维护）和 JSHint（从未宣布废弃）不算。
- **优先级：生态约定先于 AI 工具约定。** npm、Node、pnpm、Yarn、TypeScript、ESLint、Prettier、Python 工具的规定多年不变，最符合「三年后依然对」；AI 工具一年内就会改名、被收购、换格式，收录前必须重新调研。
- **工具契约**（`src/taste/contracts.ts`）：一张声明式的表，每条写明看哪些文件、检查什么、属于哪种品味；文案在 `issue.contract.<id>`，原话在 `sources.ts` 同名 key。只收工具官方文档里写明的位置、命名、上限和旧格式。覆盖哪些工具要先调研再定（用户量、是否还在维护、是否改名）：2026 年 Windsurf 已改名 Devin（`.windsurf*` 是 legacy）、Gemini CLI 只服务企业版（`GEMINI.md` 仍被读，不报）、Cursor 已被 SpaceX 收购（产品照常）。文件大小要现读（`statSync`），快照里的 `size` 恒为 0。调研过但没有可报的：Deno 仍在维护、配置没有废弃格式；esbuild 没有配置文件；Tauri v1 没有官方停止维护声明；Babel 的项目级和文件级配置会合并，同一目录两份同类配置 Babel 自己会报错，没有「静默只读一份」可报。一个仓库里每个包都重复的写法（Cargo 的 `authors`）用 `groupBy` 合并成一条并报数量。
- 工具并存只说「一件事两个工具」，不声称它们会互相破坏（没验证过行为）。
- `package.json` 的 `workspaces` 和 `pnpm-workspace.yaml` 一致时是必要的兼容重复，不报；不一致才是 smell。
- 作用域：只有测试数据（`fixtures/`、`testdata/`、`__snapshots__/`）和 `vendor/`/`third_party/` 跳过（`NOT_OURS`）；`tests/`、`examples/`、`playground/` 是项目自己的代码，照常检查。工作区里位于这些目录的包不检查。
- 语义判断（注释掉的旧代码、无人调用的兼容层、过度抽象、文件到底有没有用）不写成启发式规则，写进宣言「交给 agent 的部分」。
- **事实注册表**（`src/facts/`）：新工具一律写在这里，一个工具一个文件 `src/facts/tools/<生态>/<工具>.ts`，在 `src/facts/index.ts` 登记。
  - 一个文件里放这个工具的全部知识：配置文件及优先级（`configs`）、旧配置（`legacy`）、事实（`facts`）、原话（`sources`）、中英文案（`message`）、正反例（`examples`）、停止维护时间表（`eol`）、调研日期（`researched`）。
  - 事实按「种类」写（`src/facts/kinds/`：`precedence`、`exclusive`、`searchOrder`、`legacy`、`unread`、`misplaced`、`limit`、`deprecatedKeys`、`deprecatedTable`；`custom` 是逃生口，两个工具用到同一种检查时就把它提成新种类）。新工具应该只填数据、不写检查代码；需要新种类是一个设计决定，先想清楚再加。
  - 共用的读取函数在 `src/facts/kit.ts`。别处需要这个工具的文件列表（如 `knowledge/tools/eslint.ts`）时从工具文件引用，不要再抄一份。
  - `test/code/facts.test.ts` 对每个工具跑同一套检查：每条事实有原话、中英文都有且占位符一致、正例必报、反例必不报。加工具不用另写测试。
  - 停止维护日期不手写：工具的 `eol.parse` 读官方数据，`pnpm run sync` 只追加已经过去的日期，写进 `src/facts/data/eol/`（禁止手改）。已记录的日期和官方数据不一致时只报告、不覆盖，交给人判断。
  - `.github/workflows/sources.yml` 每周跑 `pnpm run sync --check` 和 `pnpm run sources`，失败就说明官方文档变了。
  - 迁移进行中：已迁 JS 生态（npm、pnpm、Yarn、TypeScript、ESLint、Oxlint、Prettier、Vite、Vitest、Tailwind）、Rust（Cargo、rustup）、Python（Poetry、pytest、Ruff、mypy）、GitHub、Docker Compose、AI 工具（Agent Skills、Codex、Claude Code、Copilot、Cursor、Devin、Cline）。`contracts.ts` 只剩 chous 自己的观察 `nodeVersions`（同一事实写两遍且不一致，不需要别人的原话）。停止维护时间表已全部迁入（Node、Python、Vue、Nuxt、Angular、Electron、Django、ESLint，各自带读取官方数据的 `parse`，`eol.ts` 只剩查询函数）。其余仍在 `deps.ts`、`sources.ts`，逐个迁过来，每批迁完 `pnpm run corpus` 必须零差异。
- 品味规则在 `src/taste/*.ts`（`base` / `js`（含 monorepo、bun、cloudflare）/ `frameworks`（next、nuxt）/ `deps` / `eol` / `hygiene` / `sources`）。`resolveTaste(root)` 按项目形态叠加。
- **来源**：凡是引用别人说法的原因，都登记在 `src/taste/sources.ts`（页面 URL + 原话 + 可校验的原始文件），`--verbose` 显示。文案里不写 URL。`pnpm run sources` 逐条核对原话（沙箱里需 `NODE_USE_ENV_PROXY=1`）；新增或修改来源后必须跑一遍。
- 引用官方文档以原文为准：例如 `.env` 可以提交，只有 `.env*.local` 不行（Vite、Next.js 官方文档）。
- 校准：在真实仓库上跑一遍，**逐条核对事实**，事实错了就改证据标准（例如 Deno 手写的 `dist/` 要求有构建脚本才算构建产物），不是加豁免。
  - 自动回归（`pnpm run test`）：`test/fixtures/samples` 的 4 个真实项目，快照锁定每一句结论。
  - 语料回归（`pnpm run corpus`，需要联网，不在 CI 里）：`test/corpus.json` 锁定 57 个仓库的 commit，结论记录在 `test/corpus.claims.txt`。改规则后必须跑；有差异时逐行读，确认是事实正确的变化才 `pnpm run corpus --update`。缓存目录用 `CHOUS_CORPUS_DIR`。
  - 两者不要混为一谈：手动校准不等于自动覆盖。
- Monorepo：`lintWorkspace` 先查根目录，再把每个工作区包当成独立项目查（`subSnapshot` 复用根快照，根 `.gitignore` 照样生效）。
- `no` 规则必须带 `reason` 和 `value`。
- **不要**重新引入 `.chous` 配置、DSL、预设、人设、开关规则的选项（`--ignore-warnings` 这类也已删除）或任何让用户自定义规则的入口。
- 运行时离线：不联网、不调用 AI、不需要 key。
- i18n 用 i18next，只有 `en` 和 `zh`。文案在 `src/locales/{en,zh}.ts`（TS 模块，不是 JSON：tsdown 的 dts 不支持 JSON）；`zh` 用 `satisfies Messages` 对齐 `en`，key 由 `ParseKeys` 推导。品味里的原因只存 key，不要在 `src/taste/` 里写文案。不要再引入 typesafe-i18n（它不支持 TS 7）。
- 运行时依赖尽量少：小依赖放 devDependencies，由 tsdown `deps.onlyBundle` 打进 `dist`（目前是 i18next）。
- 包管理：**pnpm**（不是 bun）。`package.json` 中的 `packageManager` 字段（`pnpm@12.x`）是 pnpm 版本的唯一来源。
- Node 要求：`engines.node >= 22`；CI 矩阵测试 node 22 与 24。
- 构建：tsdown（基于 rolldown）；测试：vitest。

## 常用命令
```bash
pnpm install --frozen-lockfile
pnpm run lint        # oxlint
pnpm run typecheck   # tsc --noEmit
pnpm run build       # tsdown
node dist/cli.mjs    # 用 chous 检查本仓库（CI 也会跑）
pnpm run test        # vitest run
pnpm run sync        # 从官方数据追加停止维护日期（需联网）
```

## CI（.github/workflows/ci.yml）
- 触发：`push` 到 `main`、以及 `pull_request`。
- 矩阵：`ubuntu-latest` / `macos-latest` / `windows-latest` × node `22` / `24`。
- 踩坑记录（不要重犯）：
  - **不要用 bun**。迁移前 windows 的 Build 因 `bun install` 装不上 rolldown 的 `win32-x64` 原生二进制而失败；迁移到 pnpm 后正常。
  - `pnpm/action-setup` **不要写死 `version`**，必须让它读取 `package.json` 的 `packageManager`，否则报 `Multiple versions of pnpm specified` 直接失败。

## 发版（重要，别再犯蠢）
- 机制：**npm OIDC Trusted Publishing**。`.github/workflows/release.yml` 用 `permissions: id-token: write` + `npm publish --access public`，**不需要 `NPM_TOKEN` secret**。
- 因此 `gh secret list` 为空是**正常现象**——**不要**据此判断“无法发版”或让用户去配 NPM_TOKEN。
- 流程：发版命令打 `v*` tag 并 push → 触发 `release.yml` 自动 `npm publish`（OIDC）+ 创建 GitHub Release（`softprops/action-gh-release`）。
- 发版命令（先本地验证，再打 tag）：
  ```bash
  pnpm run test && pnpm run build && pnpm exec changelogen --bump <version> --release --push --no-output --no-changelog
  ```
  - `--bump <version>` 强制指定版本（否则 changelogen 按 conventional commits 自动 bump）。
  - `--no-changelog` / `--no-output` 是本项目既定选项（不维护独立 CHANGELOG 文件）。
- 版本号：当前处于 `0.x` 阶段（如 `0.1.5`）。不要手动改 `package.json` 版本，交给 changelogen。
- **不要**引入 `NPM_TOKEN` 相关逻辑或 secret。

## 其他约定
- Release 用 **changelogen**，不是 semantic-release（历史上两者都试过，最终用 changelogen）。
- commit 需通过 commitlint（conventional commits）+ `tsc --noEmit`。
- commit subject **不超过 30 字符**（subject-max-length 规则）；超长会被 commit-msg hook 拒绝。请用简短 subject，细节放 body。
- 历史遗留：仓库曾在 bun 与 pnpm 间迁移，CI 已全部迁到 pnpm。
