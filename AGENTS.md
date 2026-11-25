# AGENTS.md

面向 AI 编程助手的项目说明。改动仓库前请先读此文件，避免重复踩坑。

## 项目概览
- 仓库：`chous`，一个**没有配置**的品味检查 CLI（taste linter），像 `gofmt`：品味就是工具本身。
- 品味规则全部写在 `src/taste/*.ts`（`base` / `js`（含 monorepo、bun、cloudflare）/ `frameworks`（next、nuxt）/ `deps` / `eol` / `hygiene`）。`resolveTaste(root)` 按项目形态叠加适用的品味。
- **只管「框架根本不读」的文件，不管喜好。** 根目录白名单、workflow 命名这类偏好删掉了：在 React、Vue、Oxc、SQLite、Vite 的官方仓库上实测全是误报。框架目录约定（`src/taste/frameworks.ts`）只收官方文档写明「会被忽略」的情况，比如 Next.js 根目录有 `app/` 时忽略 `src/app`、Nuxt 4 有 `app/` 时不再读根目录的 `pages/`；能被手动 import 的目录（`components/`、`utils/`）不报（nuxt.com 自己就这么用）。每条规则在注释和文案里写明来源链接。大小写只查「同目录下只差大小写」（macOS/Windows 检出会丢一个）。`test/samples` 里的真实项目一旦被报出错误，测试就失败。
- **只嗅臭味，不追时髦。** 加规则前先问：三年后它报出来的错还对吗？只收录腐烂的东西（死掉的包、停止维护的运行时、平台已原样自带的轮子、互相打架的工具、重复、泄露）。**不要**规定用哪个工具（「linter 必须是 oxlint」这种），也不要收录需要跟着外部生态频繁更新的名单。
- 判定只认**作者/平台亲口说过、而且已经发生的事实**；年龄、速度、实现语言（Rust/Go/Zig 重写）、流行度都不算，沉默（没人维护但没人宣布）也不算，实验/玩具项目不判。四种状态：
  - 不判：还在维护的（不新鲜也行）、实验项目。
  - 鸡肋（警告）：平台已自带等价能力（`deps.ts` 的 `NATIVE`）。
  - 过期（警告）：官方停止维护日期已过，不满两年（`eol.ts`）。
  - 腐烂（错误）：停止维护满两年（`ROT_AFTER_YEARS`）；作者宣布废弃（`DEPRECATED`）；作者故意破坏（`SABOTAGED`）。
- `src/taste/eol.ts` 只收**已经过去**并查证过的日期（计划中的日期会变，Node 16 就提前了五个月），条目只增不改；附上官方来源链接。
- 命名类规则只管「同一概念出现两个名字」（`twins`：只差大小写、`SYNONYM_DIRS` 里的同义目录、根目录单复数并存），不规定叫哪个名字。
- 引用官方文档时以原文为准：例如 `.env` 可以提交，只有 `.env*.local` 不行（Vite、Next.js 官方文档）。
- Monorepo：`lintWorkspace` 先查根目录，再把每个工作区包当成独立项目查（`subSnapshot` 复用根快照，根 `.gitignore` 照样生效）。
- `no` 规则必须带 `reason`，报错就是这个原因。
- 卫生检查（`src/taste/hygiene.ts`）：**不查明文密钥**，那是安全扫描器的事，不是品味。构建产物要靠旁边的文件（`when`）或工具写入的标记文件（`marker`）确认，不能只看目录名（Vite 有手写的 `node_modules` 夹具，Oxc 有叫 `coverage` 的 crate）。
- 结构类规则要靠数据：只收「在官方仓库里一个没有、在 vibe 项目里很常见」的模式（例如根目录的 AI 工作日志），先在 Vue/Vite/React/Oxc/SQLite 和 `test/samples` 上验证零命中。
- 工具冲突（`stack` 规则）只查会互相覆盖的角色：包管理器、格式化、git hooks、发版；只看强信号（配置文件、lockfile、package.json 字段、scripts）。
- **不要**重新引入 `.chous` 配置、DSL、预设（preset）、人设（persona）或任何让用户自定义规则的入口。改品味就改 `src/taste/`。
- i18n 用 i18next，只有 `en` 和 `zh`。文案在 `src/locales/{en,zh}.ts`（TS 模块，不是 JSON：tsdown 的 dts 不支持 JSON）；`zh` 用 `satisfies Messages` 对齐 `en`，key 由 `ParseKeys` 推导，写错就是类型错误。品味里的原因只存 key（`reason: "reason.xxx"`、`dep.<包名>`、`eol.<产品>`、`role.<角色>`），不要在 `src/taste/` 里写文案。不要再引入 typesafe-i18n（它不支持 TS 7）。
- 残留物（`leftover`）都是错误：工作日志、根目录没被引用的一次性脚本、手动备份、发布二进制；测试输入、示例、`vendor` 目录（`NOT_OURS`）、ADR、mdBook 的 `SUMMARY.md` 不查；`.exe` 不算（uv 有意提交预编译 trampoline）。验证集还包括 antfu、sindresorhus、Hono、Bun、Deno、Zig、Rust、ripgrep、tokio、uv。根目录手写文档超过 `ROOT_DOCS_LIMIT` 份是警告。
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
