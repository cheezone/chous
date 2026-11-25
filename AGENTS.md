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
- 腐烂没有宽限期：停止维护那天起就是 smell（`hasEnded`）。`eol.ts` 只收已经过去并查证过的日期，附官方来源。
- 「平台已自带」（`NATIVE`）是 review：平台自带了什么是事实，能否完全替代要看项目怎么用。
- 根目录克制：除位置约定文档外最多 `ROOT_DOCS_LIMIT`（3）份文档。这是立场，不是测量。
- 作用域：只有测试数据（`fixtures/`、`testdata/`、`__snapshots__/`）和 `vendor/`/`third_party/` 跳过（`NOT_OURS`）；`tests/`、`examples/`、`playground/` 是项目自己的代码，照常检查。工作区里位于这些目录的包不检查。
- 语义判断（注释掉的旧代码、无人调用的兼容层、过度抽象、文件到底有没有用）不写成启发式规则，写进宣言「交给 agent 的部分」。
- 品味规则在 `src/taste/*.ts`（`base` / `js`（含 monorepo、bun、cloudflare）/ `frameworks`（next、nuxt）/ `deps` / `eol` / `hygiene` / `sources`）。`resolveTaste(root)` 按项目形态叠加。
- **来源**：凡是引用别人说法的原因，都登记在 `src/taste/sources.ts`（页面 URL + 原话 + 可校验的原始文件），`--verbose` 显示。文案里不写 URL。`pnpm run sources` 逐条核对原话（沙箱里需 `NODE_USE_ENV_PROXY=1`）；新增或修改来源后必须跑一遍。
- 引用官方文档以原文为准：例如 `.env` 可以提交，只有 `.env*.local` 不行（Vite、Next.js 官方文档）。
- 校准：在 Vue/Vite/React/Oxc/SQLite、antfu/sindresorhus/Bun/Deno/Zig/Rust 等仓库和 vibe 项目上跑一遍，**逐条核对事实**，事实错了就改证据标准（例如 Deno 手写的 `dist/` 要求有构建脚本才算构建产物），不是加豁免。`test/fixtures/samples` 里的真实项目用快照锁定 chous 对它们说的每一句话，快照变化必须人工读过再更新。
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
