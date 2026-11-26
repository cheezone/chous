# What chous knows

> Generated from `src/facts/` by `pnpm run docs`. Do not edit: change the tool's file and run it again.

Each line is something a tool, platform or package author states about itself, with their own words behind it (`chous --verbose` shows them). chous reports it when a project goes against it.

17 tools · 10 facts about files · 2 paths that should not be committed · 8 end-of-life schedules · 6 npm package entries.

“Seen in real projects” counts findings in the regression corpus (`test/corpus.json`: real repositories at pinned commits, every finding checked by hand). “not yet” means no repository there breaks it: the fact is checked against the tool's own words and examples, not yet against the wild.

## Tools

### Node.js

Researched 2026-11.

End of life: 20 versions of Node, from 4 to 25; the latest ended on 2026-06-01. Source: github.com · Seen in real projects: ruvnet/ruflo, facebook/react, Neve77/comandaflow +10

### ESLint

Researched 2026-11.

End of life: 9 versions of ESLint, from 1 to 9; the latest ended on 2026-08-06. Source: eslint.org · Seen in real projects: facebook/react, ruvnet/ruflo, dennislee928/Carbon_Trading_For_Individuals +24

### .env files

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Cleanliness | Should not be committed: `**/.env*.local` — local env file that may hold secrets; Vite and Next.js say to gitignore *.local | vite.dev, nextjs.org | not yet |

### Vue

Researched 2026-11.

End of life: 1 versions of Vue, from 2 to 2; the latest ended on 2023-12-31. Source: v2.vuejs.org · Seen in real projects: not yet

### Nuxt

Researched 2026-11.

End of life: 3 versions of Nuxt, from 1 to 3; the latest ended on 2026-07-31. Source: nuxt.com · Seen in real projects: not yet

### Angular

Researched 2026-11.

End of life: Angular 2 to 19 are no longer supported (no date given). Source: angular.dev · Seen in real projects: not yet

### Electron

Researched 2026-11.

End of life: 41 versions of Electron, from 2 to 42; the latest ended on 2026-10-20. Source: releases.electronjs.org · Seen in real projects: facebook/react

### Rust

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | Rust module files not in snake_case (…, e.g. …): Rust's API guidelines name modules in snake_case | rust-lang.github.io | oven-sh/bun |

### Cargo

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Modernity | Cargo.toml files that set authors in [package]: …; Cargo has deprecated the field | doc.rust-lang.org | oxc-project/oxc, astral-sh/uv, BurntSushi/ripgrep +3 |

### Python

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | Python files with capitals in their names (…, e.g. …): PEP 8 gives modules all-lowercase names | peps.python.org | zopefoundation/ZODB, wilsonzlin/fastrender |
| Convention | package … has capitals in its name: PEP 8 gives packages all-lowercase names | peps.python.org | zopefoundation/ZODB, Ayato-kosaka/nanitabeyo |

End of life: 13 versions of Python, from 2.6 to 3.10; the latest ended on 2026-10-01. Source: peps.python.org · Seen in real projects: comfyanonymous/ComfyUI, astral-sh/uv, MUKUL-PRASAD-SIGH/AetherSentrix

### Django

Researched 2026-11.

End of life: 20 versions of Django, from 1.3 to 5.1; the latest ended on 2026-04-07. Source: djangoproject.com · Seen in real projects: not yet

### Go

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | package …: Go package names are lower case and single words, with no underscores or mixedCaps | go.dev | QuantumNous/new-api, ollama/ollama |

### Dart

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | Dart files not in lowercase_with_underscores (…, e.g. …): Effective Dart names source files that way | dart.dev | TheAlphamerc/flutter_twitter_clone, nisrulz/flutter-examples, CarGuo/gsy_github_app_flutter +1 |
| Convention | directory … holds Dart files and is not in lowercase_with_underscores: Effective Dart names directories that way | dart.dev | TheAlphamerc/flutter_twitter_clone, nisrulz/flutter-examples |

### Kotlin

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | Kotlin files not in upper camel case (…, e.g. …): Kotlin's coding conventions name files like ProcessDeclarations.kt | kotlinlang.org | ktorio/ktor, longbridge/gpui-component |

### Elixir

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | Elixir files not in snake_case (…, e.g. …): Elixir's naming conventions say file names follow the module in snake_case | hexdocs.pm | plausible/analytics |

### Composer (PSR-4)

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | files named unlike the class they declare (…, e.g. ….php declares …): PSR-4 says the file name matches the class name, case included | php-fig.org | filamentphp/filament, matomo-org/matomo, laravel/framework |

### JetBrains IDEs

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Cleanliness | Should not be committed: `**/.idea/workspace.xml` — personal IDE state; JetBrains says workspace.xml should not be shared, the rest of .idea may be | jetbrains.com | Beeta-inc/nbheditor.apps.beeta.com |

## npm packages

| Package | Verdict | Use instead | Why |
|---|---|---|---|
| `moment` | smell | dayjs / date-fns / Temporal | Its maintainers call it a legacy project in maintenance mode. |
| `babel-polyfill`, `@babel/polyfill` | smell | a modern runtime target | Deprecated by Babel as of 7.4.0, in favor of core-js/stable. |
| `karma` | smell | a browser-mode test runner (Vitest, Playwright) | Deprecated by its authors. |
| `react-scripts` | smell | a framework, or Vite / Parcel / Rsbuild | Create React App was deprecated in 2025. |
| `@vue/cli-service` | smell | create-vue (Vite) | Its authors: Vue CLI is now in maintenance mode. |
| `react-test-renderer` | smell | @testing-library/react | Deprecated by React and no longer maintained. |
