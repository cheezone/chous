# AGENTS.md

面向 AI 编程助手的项目说明。改动仓库前请先读此文件，避免重复踩坑。

## 项目概览
- 仓库：`chous`，一个代码规范/结构检查 CLI 工具。
- 包管理：**pnpm**（不是 bun）。`package.json` 中的 `packageManager` 字段（`pnpm@12.x`）是 pnpm 版本的唯一来源。
- Node 要求：`engines.node >= 22`；CI 矩阵测试 node 22 与 24。
- 构建：tsdown（基于 rolldown）；测试：vitest。

## 常用命令
```bash
pnpm install --frozen-lockfile
pnpm run lint        # oxlint
pnpm run typecheck   # tsc --noEmit
pnpm run build       # tsdown
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
