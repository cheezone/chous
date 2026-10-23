<p align="center">
  <img src="public/logo.png" alt="chous Logo" width="160" height="160"/>
</p>

<h1 align="center">chous</h1>

<p align="center">
  <b>Stop AI slop. Follow a real person.</b>
  <br />
  Pick a persona preset and chous keeps the repository layout and the stack on that person's path.
  <br />
  <br />
  Created by <b><a href="https://cheez.tech">Cheez Lin</a></b>
</p>

<p align="center">
  <a href="https://github.com/cheezone/chous">GitHub</a> ·
  <a href="./README.zh.md">中文文档</a>
</p>

---

## 🚀 Follow a real person

AI editors invent folders, formatters and test runners that the project never asked for. `chous` checks the layout and the stack against a persona you choose, then tells the agent what to change.

```chous
import antfu
```

That one line follows Anthony Fu's starter: `pnpm`, `test/` instead of `tests/`, `@antfu/eslint-config` instead of Prettier. When something drifts, the report says what to replace it with.

> **chous** /tʃoʊs/ - From Chinese "抽丝" (chōu sī), meaning "to draw out silk threads, to untangle". Just as this tool helps you untangle complex file structure issues. 

It ensures your project architecture remains consistent, whether you're working in a massive monorepo or a small agile project.

## ⚡ Vibe Coder's Quick Start (Prompt)

Are you a **Vibe Coder** using AI editors? Use this 5-step workflow to let the AI handle the architecture for you.

> [!NOTE]
> **Cursor users** can automate Step 5 with hooks. For **Windsurf** or other editors, simply rely on Step 4 for verification.

> "I want to use `chous` to enforce my project's file structure. Please follow these steps:
> 1. Run `npx chous init` to generate a configuration template.
> 2. Run `npx chous` to identify current file structure inconsistencies.
> 3. Based on the lint results and my project goals, **customize the `.chous` file** (or help me move files) to achieve a clean architecture.
> 4. Keep running `npx chous` and fixing issues until **all checks pass**.
> 5. (Optional - Cursor Only) Once verified, run `npx chous cursor install` to enable real-time protection."

---

## ✨ Key Features

- **Expressive DSL**: A human-readable language designed specifically for file systems.
- **Persona presets**: Follow a real person's layout and stack. `antfu` ships in the box; anyone can publish another.
- **Built-in presets**: **Next.js**, **Nuxt 4**, **Go**, **Python**, and more.
- **Stack rules**: Require a package manager and dependencies, and tell the agent what to use instead.
- **Nested blocks**: Group rules naturally with `in <dir>: ...` syntax.
- **AI editor hooks**: **Cursor** and **Claude Code** send the issues back to the agent.
- **Elegant Reporting**: Beautiful, tree-style terminal reports that pinpoint exact inconsistencies.

## 📦 Installation

```bash
# Run without installation
npx chous

# Or install globally
npm install -g chous
```

## 🛠️ Getting Started

1. **Initialize**:
   ```bash
   chous init
   ```
   This will auto-detect your project type and create a `.chous` file with sensible defaults based on your stack.

2. **Lint**:
   ```bash
   chous
   ```

## 🧰 CLI Reference

```bash
chous                    # Lint the current project
chous --preset antfu     # Try the antfu persona without writing a .chous file
chous -p antfu -p js      # Compare several personas on the same repository
chous init               # Create a .chous rules file from the detected stack
chous update             # Download remote persona presets
chous cursor install     # Install Cursor hooks for automatic linting
chous claude install     # Install Claude Code hooks for automatic linting
chous --help             # Show all commands and options
```

| Option | Description |
| --- | --- |
| `-c, --config <path>` | Specify rules file (default: `./.chous`) |
| `-p, --preset <name>` | Try a persona on this directory without writing a `.chous` file. Repeat to compare |
| `-v, --verbose` | Show full filesystem tree (mode: verbose) |
| `-l, --lang <code>` | Set output language — `de` / `en` / `es` / `fr` / `ja` / `ko` / `pt-BR` / `zh`, or `auto` to follow the system language |
| `-s, --strict` | Enable strict mode for all directory-only rules |
| `--stats-output <path>` | Output rule performance statistics to a JSON file |
| `--no-color` | Disable colored output |
| `-h, --help` | Show help |

> [!TIP]
> `chous --verbose` is exactly what the Cursor hook asks your AI agent to run, and it is also the fastest way to see every issue together with its fix suggestion.

## 🎯 Editor Integration (Cursor Hooks)

If you are using **Cursor**, you can install an automated hook that runs `chous` after every AI-powered edit:

```bash
chous cursor install
```

> [!IMPORTANT]
> It is recommended to run this command **only after** you have successfully configured your `.chous` and all manual lint checks pass. This ensures the AI has a clear "source of truth" to follow.

## Claude Code

```bash
chous claude install
```

This merges two hooks into `.claude/settings.json` and leaves hooks you already have in place:

- `PostToolUse` on `Write`, `Edit` and `MultiEdit` feeds the issue list back to Claude as soon as a file changes.
- `Stop` blocks the turn while issues remain. A second stop in the same continuation is ignored, so the loop cannot run forever.

`chous init` installs these hooks on its own when the project already has a `.claude/` directory.

---

## 📝 Configuration Guide

The `.chous` file uses a simple, powerful syntax. Here are some real-world examples derived from the **Nuxt 4** preset:

### 1. Basic Constraints
```chous
# Ensure specific files exist
must have [nuxt.config.ts, app]

# Global naming conventions
use kebab-case for files **/*.ts
```

### 2. The "Elegant" Nested Syntax
Logical grouping prevents path repetition and makes rules readable:

```chous
in app:
  # Allow standard Nuxt directories
  allow [assets, components, composables, pages]
  
  # Deeply nested rules
  in components:
    # All components must be PascalCase
    use PascalCase for files **/*.vue
    # Except when they are inside a PascalCase directory
    use kebab-case for files **/*.vue if-parent-matches PascalCase
    
  strict
```

### 3. Automated Move Suggestions
Clean up your assets folder automatically:

```chous
in assets:
  move *.{css,scss} to css
  move *.{png,jpg,svg} to images
```

## 📖 Rule Cheatsheet

| Keyword | Purpose |
| --- | --- |
| `import <preset>` | Import a built-in preset (`antfu`, `js`, `nextjs`, ...). |
| `import npm:<pkg>` | Import a persona published on npm. The package's `chous` field points at the rules file. |
| `import github:owner/repo[/path][@ref]` | Import a persona from GitHub. `chous update` refreshes the local cache. |
| `persona <name> <url>` | Name the person these rules follow. The report prints one credit line. |
| `package manager <npm\|pnpm\|yarn\|bun>` | Require that package manager. |
| `must have deps [a, b]` | Require those dependencies. Versions are ignored. `@scope/*` matches the scope. |
| `no deps [a, b]` | Forbid those dependencies. |
| `replace dep <from> with <to>` | When `<from>` is installed, tell the agent to switch to `<to>`. |
| `must have <paths>` / `has <paths>` | Require that the given files or directories exist. |
| `optional <paths>` | Cancel a `must have` requirement inherited from a preset. |
| `no <globs>` | Forbid matching files or directories (`deny` / `reject` are aliases). |
| `allow [...]` | Whitelist entries of a directory (meaningful together with `strict`). |
| `use <style> for files\|dirs <glob>` | Enforce a naming style: `PascalCase`, `camelCase`, `kebab-case`, `snake_case`, `SCREAMING_SNAKE_CASE`, `flatcase`. |
| `strict` | Only whitelisted entries may live at that level. |
| `strict files in <dir>` | Apply the whitelist to a directory's files only. |
| `in <dir>: ...` | Nested block — every rule inside is scoped to `<dir>`. |
| `move <glob> to <dir>` | Suggest moving matching files into `<dir>`. |
| `rename <glob> to <newglob>` | Suggest renaming matching files. |
| `[where: <glob>]` | Scope a whole config (or group) to specific paths. |
| `---` | Separate multiple config groups inside one file. |

**Modifiers** (append to `use` rules):

| Modifier | Effect |
| --- | --- |
| `except <glob>` | Skip matching entries. |
| `prefix: /re/` | Ignore a leading pattern before checking the name. |
| `suffix: /re/` | Ignore a trailing pattern before checking the name. |
| `if-contains <name>` | Only apply when the directory contains `<name>`. |
| `if-parent-matches <style>` | Only apply when the parent directory matches `<style>`. |
| `if empty` / `if exists <path>` / `if file-size > <n>` | Apply the rule conditionally. |

Paths can be excluded globally with a `.chousignore` file (gitignore syntax).

## 📂 Available Presets

- `antfu`: Anthony Fu's TypeScript starter. pnpm, `test/`, `@antfu/eslint-config`, tsdown. Reference: https://github.com/antfu/starter-ts
- `basic`: Standard ignores and root files.
- `js`: Common JavaScript/TypeScript patterns.
- `nextjs`: App router and Page router conventions.
- `nuxt3`: Nuxt 3 directory structures and dynamic routes.
- `nuxt4`: Nuxt 4 directory structures and dynamic routes.
- `go`: Standard Go workspace layouts.
- `python`: PEP 8 and common Python project structures.

## Publish your own persona

A persona is a `.chous` file other people can import.

**npm.** Put the rules in the package and point `package.json` at them:

```json
{ "name": "chous-preset-you", "chous": "persona.chous" }
```

Projects then write `import npm:chous-preset-you`.

**GitHub.** Commit the rules file and import it directly:

```chous
import github:you/chous-presets/persona.chous@main
```

The first run downloads it to `~/.cache/chous`. `chous update` fetches a fresh copy. Offline runs keep the cached file.

## 📜 License

This project is licensed under the [MIT License](LICENSE).

Created by [Cheez Lin](https://cheez.tech). Source: https://github.com/cheezone/chous

