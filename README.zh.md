<p align="center">
  <img src="public/logo.png" alt="chous Logo" width="160" height="160"/>
</p>

<h1 align="center">chous</h1>

<p align="center" style="margin-top: -10px; color: #666; font-size: 1em;">
  /tʃoʊs/
</p>

<p align="center">
  <b>全网首个专门的文件结构校验工具</b>
  <br />
  使用富有表现力的 <code>.chous</code> 规则文件，强制执行整洁的仓库布局。
  <br />
  <br />
  作者：<b><a href="https://cheez.tech">Cheez Lin</a></b>
</p>

<p align="center">
  <a href="https://github.com/cheezone/chous">GitHub</a> ·
  <a href="./README.md">English Documents</a>
</p>

---

## 🚀 全网首创

`chous` 是 **全网首个** 专门针对"文件结构"设计的校验工具。市面上已有的 Linter 大多关注文件 *内部* 的格式，而 `chous` 关注的是文件 *在哪里* 以及它们 *叫什么*。

> **chous** /tʃoʊs/ - 来自中文"抽丝"（chōu sī），意为"抽丝剥茧、理清头绪"。正如这个工具帮助你理清复杂的文件结构问题一样。

无论是大型 Monorepo 还是敏捷的小型项目，它都能确保你的项目架构保持高度一致。

## ⚡ Vibe Coder 快速上手 (Prompt)

你是使用 AI 编辑器的 **Vibe Coder** 吗？推荐使用以下 **5 步工作流**，让 AI 帮你打理架构。

> [!NOTE]
> **Cursor 用户**可以通过 Hook 自动化第 5 步。对于 **Windsurf** 或其他编辑器，只需依靠第 4 步进行校验即可。

> "我想使用 `chous` 来规范我的项目文件结构。请按以下步骤操作：
> 1. 运行 `npx chous init` 来生成配置模板。
> 2. 运行 `npx chous` 查看当前项目中有哪些不符合规范的地方。
> 3. 根据校验结果和我的项目目标，**详细编辑并优化 `.chous` 文件**（或帮我移动文件），以实现整洁的架构。
> 4. 持续运行 `npx chous` 并修复问题，直到**所有校验通过**。
> 5. (可选 - 仅限 Cursor) 验证通过后，运行 `npx chous cursor install` 来开启实时架构保护。"

---

## ✨ 核心特性

- **表现力强的 DSL**：专为文件系统设计的类自然语言，易读易写。
- **内置预设 (Presets)**：即时支持 **Next.js**, **Nuxt 4**, **Go**, **Python** 等主流框架。
- **嵌套块语法**：使用 `in <dir>: ...` 自然地组织规则，告别路径重复。
- **AI 编辑器集成**：原生集成 **Cursor** 钩子，在 AI 生成代码后即时提供反馈。
- **优雅的报告**：精美的树状终端报告，精准定位每一个不规范的角落。

## 📦 安装

```bash
# 无需安装，直接运行
npx chous

# 或者全局安装
npm install -g chous
```

## 🛠️ 开始使用

1. **初始化**:
   ```bash
   chous init
   ```
   它会自动检测你的项目类型，并根据你的技术栈创建一个带有合理默认值的 `.chous` 文件。

2. **执行校验**:
   ```bash
   chous
   ```

## 🧰 命令行参考

```bash
chous                    # 校验当前项目
chous init               # 根据检测到的技术栈创建 .chous 规则文件
chous cursor install     # 安装 Cursor 钩子以自动校验
chous --help             # 查看所有命令与选项
```

| 选项 | 说明 |
| --- | --- |
| `-c, --config <path>` | 指定规则文件（默认：`./.chous`） |
| `-v, --verbose` | 显示更完整的文件结构（信息模式：详细） |
| `-l, --lang <code>` | 设置输出语言 —— `de` / `en` / `es` / `fr` / `ja` / `ko` / `pt-BR` / `zh`，或使用 `auto` 跟随系统语言 |
| `-s, --strict` | 为所有目录规则启用严格模式 |
| `--stats-output <path>` | 将规则性能统计输出到 JSON 文件 |
| `--no-color` | 禁用彩色输出 |
| `-h, --help` | 显示帮助 |

> [!TIP]
> `chous --verbose` 正是 Cursor 钩子要求 AI 执行的命令，也是查看每条问题及其修复建议最快的方式。

## 🎯 编辑器集成 (Cursor Hooks)

如果你在使用 **Cursor**，可以安装自动化钩子，在每次 AI 生成/修改代码后自动运行 `chous`：

```bash
chous cursor install
```

> [!IMPORTANT]
> 强烈建议在**配置好 `chous` 且手动校验全部通过后**再执行此命令。这样可以确保 AI 有一份清晰且正确的"架构真相"可以遵循。

---

## 📝 配置指南

`.chous` 文件使用简单而强大的语法。以下是来自 **Nuxt 4** 预设的一些真实写法示例：

### 1. 基础约束
```chous
# 确保特定路径存在
must have [nuxt.config.ts, app]

# 全局命名规范
use kebab-case for files **/*.ts
```

### 2. "优雅"的嵌套语法
通过逻辑分组避免路径重复，让规则一目了然：

```chous
in app:
  # 允许标准的 Nuxt 目录
  allow [assets, components, composables, pages]
  
  # 深度嵌套规则
  in components:
    # 所有的组件文件必须使用 PascalCase
    use PascalCase for files **/*.vue
    # 除非它们位于 PascalCase 的目录中，则使用 kebab-case
    use kebab-case for files **/*.vue if-parent-matches PascalCase
    
  strict
```

### 3. 自动化移动建议
自动保持 assets 目录整洁：

```chous
in assets:
  move *.{css,scss} to css
  move *.{png,jpg,svg} to images
```

## 📖 规则速查表

| 关键字 | 作用 |
| --- | --- |
| `import <preset>` | 导入内置预设。 |
| `must have <paths>` / `has <paths>` | 要求指定的文件或目录必须存在。 |
| `optional <paths>` | 取消预设继承来的 `must have` 要求。 |
| `no <globs>` | 禁止匹配的文件或目录（`deny` / `reject` 为别名）。 |
| `allow [...]` | 为目录建立白名单（与 `strict` 配合才有意义）。 |
| `use <style> for files\|dirs <glob>` | 强制命名风格：`PascalCase`、`camelCase`、`kebab-case`、`snake_case`、`SCREAMING_SNAKE_CASE`、`flatcase`。 |
| `strict` | 该层级只允许白名单中的条目存在。 |
| `strict files in <dir>` | 仅对某目录下的文件应用白名单。 |
| `in <dir>: ...` | 嵌套块 —— 块内所有规则都作用于 `<dir>`。 |
| `move <glob> to <dir>` | 建议把匹配文件移动到 `<dir>`。 |
| `rename <glob> to <newglob>` | 建议重命名匹配文件。 |
| `[where: <glob>]` | 将整个配置（或配置组）限定到指定路径。 |
| `---` | 在单个文件中分隔多个配置组。 |

**修饰符**（追加在 `use` 规则之后）：

| 修饰符 | 作用 |
| --- | --- |
| `except <glob>` | 跳过匹配的条目。 |
| `prefix: /re/` | 检查名称前先忽略开头匹配的部分。 |
| `suffix: /re/` | 检查名称前先忽略结尾匹配的部分。 |
| `if-contains <name>` | 仅当目录包含 `<name>` 时生效。 |
| `if-parent-matches <style>` | 仅当父目录符合 `<style>` 时生效。 |
| `if empty` / `if exists <path>` / `if file-size > <n>` | 按条件生效。 |

可通过 `.chousignore` 文件（gitignore 语法）全局排除路径。

## 📂 可用预设 (Presets)

- `basic`: 标准的忽略规则和根目录文件。
- `js`: 常见的 JavaScript/TypeScript 模式。
- `nextjs`: 支持 App router 和 Page router 规范。
- `nuxt3`: Nuxt 3 目录结构及动态路由支持。
- `nuxt4`: Nuxt 4 目录结构及动态路由支持。
- `go`: 标准的 Go 工作区布局。
- `python`: PEP 8 及常见的 Python 项目结构。

## 📜 许可证

本项目采用 [MIT 许可证](LICENSE)。
