# chous 知道什么

> 由 `pnpm run docs` 从 `src/facts/` 生成。不要手改：改工具文件，再运行一次。

每一行都是工具、平台或包作者对自己的说法，背后有他们的原话（`chous --verbose` 会显示）。项目违背它时，chous 就报出来。

17 个工具 · 10 条关于文件的事实 · 2 条不该提交的路径 · 8 份停止维护时间表 · 6 条 npm 包。

「真实命中」统计回归语料（`test/corpus.json`：锁定 commit 的真实仓库，每条结论都人工核对过）里的结论。「尚未见到」表示那里还没有仓库违反它：这条事实已对照工具原话和正反例检验，还没有在真实项目里遇到过。

## 工具

### Node.js

调研于 2026-11。

停止维护：Node 的 20 个版本，从 4 到 25；最近一个在 2026-06-01 停止维护。来源：github.com；真实命中：ruvnet/ruflo, facebook/react, Neve77/comandaflow +10

### ESLint

调研于 2026-11。

停止维护：ESLint 的 9 个版本，从 1 到 9；最近一个在 2026-08-06 停止维护。来源：eslint.org；真实命中：facebook/react, ruvnet/ruflo, dennislee928/Carbon_Trading_For_Individuals +24

### .env files

调研于 2026-11。

| 品味 | chous 说 | 来源 | 真实命中 |
|---|---|---|---|
| 洁净 | 不该提交：`**/.env*.local` — 本地环境变量文件，可能含密钥：Vite 和 Next.js 官方都要求把 *.local 加进 .gitignore → 加进 .gitignore | vite.dev, nextjs.org | 尚未见到 |

### Vue

调研于 2026-11。

停止维护：Vue 的 1 个版本，从 2 到 2；最近一个在 2023-12-31 停止维护。来源：v2.vuejs.org；真实命中：尚未见到

### Nuxt

调研于 2026-11。

停止维护：Nuxt 的 3 个版本，从 1 到 3；最近一个在 2026-07-31 停止维护。来源：nuxt.com；真实命中：尚未见到

### Angular

调研于 2026-11。

停止维护：Angular 2 到 19 官方已不再支持（没有给出日期）。来源：angular.dev；真实命中：尚未见到

### Electron

调研于 2026-11。

停止维护：Electron 的 41 个版本，从 2 到 42；最近一个在 2026-10-20 停止维护。来源：releases.electronjs.org；真实命中：facebook/react

### Rust

调研于 2026-11。

| 品味 | chous 说 | 来源 | 真实命中 |
|---|---|---|---|
| 约定 | 不是 snake_case 的 Rust 模块文件（… 个，如 …）：Rust API 指南规定模块用 snake_case | rust-lang.github.io | oven-sh/bun |

### Cargo

调研于 2026-11。

| 品味 | chous 说 | 来源 | 真实命中 |
|---|---|---|---|
| 现代 | … 个 Cargo.toml 在 [package] 里写了 authors：这个字段 Cargo 已废弃 | doc.rust-lang.org | oxc-project/oxc, astral-sh/uv, BurntSushi/ripgrep +3 |

### Python

调研于 2026-11。

| 品味 | chous 说 | 来源 | 真实命中 |
|---|---|---|---|
| 约定 | 名字带大写字母的 Python 文件（… 个，如 …）：PEP 8 规定模块名全小写 | peps.python.org | abdur75648/Deep-Learning-Specialization-Coursera, zopefoundation/ZODB, wilsonzlin/fastrender |
| 约定 | 包 … 的名字带大写字母：PEP 8 规定包名全小写 | peps.python.org | zopefoundation/ZODB, Ayato-kosaka/nanitabeyo |

停止维护：Python 的 13 个版本，从 2.6 到 3.10；最近一个在 2026-10-01 停止维护。来源：peps.python.org；真实命中：comfyanonymous/ComfyUI, astral-sh/uv, MUKUL-PRASAD-SIGH/AetherSentrix

### Django

调研于 2026-11。

停止维护：Django 的 20 个版本，从 1.3 到 5.1；最近一个在 2026-04-07 停止维护。来源：djangoproject.com；真实命中：尚未见到

### Go

调研于 2026-11。

| 品味 | chous 说 | 来源 | 真实命中 |
|---|---|---|---|
| 约定 | package …：Go 的包名是一个小写单词，不用下划线，也不用驼峰 | go.dev | QuantumNous/new-api, ollama/ollama |

### Dart

调研于 2026-11。

| 品味 | chous 说 | 来源 | 真实命中 |
|---|---|---|---|
| 约定 | 不是 lowercase_with_underscores 的 Dart 文件（… 个，如 …）：Effective Dart 规定源文件这样命名 | dart.dev | TheAlphamerc/flutter_twitter_clone, nisrulz/flutter-examples, CarGuo/gsy_github_app_flutter +1 |
| 约定 | 目录 … 放着 Dart 文件，但不是 lowercase_with_underscores：Effective Dart 规定目录这样命名 | dart.dev | TheAlphamerc/flutter_twitter_clone, nisrulz/flutter-examples |

### Kotlin

调研于 2026-11。

| 品味 | chous 说 | 来源 | 真实命中 |
|---|---|---|---|
| 约定 | 不是大驼峰的 Kotlin 文件（… 个，如 …）：Kotlin 编码规范要求文件名像 ProcessDeclarations.kt 这样 | kotlinlang.org | ktorio/ktor, longbridge/gpui-component |

### Elixir

调研于 2026-11。

| 品味 | chous 说 | 来源 | 真实命中 |
|---|---|---|---|
| 约定 | 不是 snake_case 的 Elixir 文件（… 个，如 …）：Elixir 命名约定规定文件名按模块名的 snake_case 来写 | hexdocs.pm | plausible/analytics |

### Composer (PSR-4)

调研于 2026-11。

| 品味 | chous 说 | 来源 | 真实命中 |
|---|---|---|---|
| 约定 | 文件名和所声明的类名不一致（… 个，如 ….php 声明的是 …）：PSR-4 规定文件名与类名一致，大小写也要一致 | php-fig.org | filamentphp/filament, matomo-org/matomo, laravel/framework |

### JetBrains IDEs

调研于 2026-11。

| 品味 | chous 说 | 来源 | 真实命中 |
|---|---|---|---|
| 洁净 | 不该提交：`**/.idea/workspace.xml` — 个人的 IDE 状态：JetBrains 说 workspace.xml 不应共享，.idea 里其余文件可以提交 → 加进 .gitignore | jetbrains.com | Beeta-inc/nbheditor.apps.beeta.com |

## npm 包

| 包 | 结论 | 改用 | 原因 |
|---|---|---|---|
| `moment` | 臭味 | dayjs / date-fns / Temporal | 维护者称它为处于维护模式的遗留项目。 |
| `babel-polyfill`, `@babel/polyfill` | 臭味 | a modern runtime target | Babel 自 7.4.0 起宣布废弃，改用 core-js/stable。 |
| `karma` | 臭味 | a browser-mode test runner (Vitest, Playwright) | 作者已宣布废弃。 |
| `react-scripts` | 臭味 | a framework, or Vite / Parcel / Rsbuild | Create React App 已于 2025 年废弃。 |
| `@vue/cli-service` | 臭味 | create-vue (Vite) | 作者原话：Vue CLI 已进入维护模式。 |
| `react-test-renderer` | 臭味 | @testing-library/react | React 官方已宣布废弃，不再维护。 |
