# What chous knows

> Generated from `src/facts/` by `pnpm run docs`. Do not edit: change the tool's file and run it again.

Each line is something a tool, platform or package author states about itself, with their own words behind it (`chous --verbose` shows them). chous reports it when a project goes against it.

43 tools · 58 facts about files · 8 paths that should not be committed · 8 end-of-life schedules · 41 npm package entries.

“Seen in real projects” counts findings in the regression corpus (`test/corpus.json`: real repositories at pinned commits, every finding checked by hand). “not yet” means no repository there breaks it: the fact is checked against the tool's own words and examples, not yet against the wild.

## Tools

### Node.js

Researched 2026-11.

End of life: 20 versions of Node, from 4 to 25; the latest ended on 2026-06-01. Source: github.com · Seen in real projects: Neve77/comandaflow, ruvnet/symbolic-scribe, shadcn-ui/taxonomy

### Bun

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Modernity | Should not be committed: `bun.lockb` — binary lockfile, run `bun install --save-text-lockfile` and commit bun.lock | bun.com | eryngordon/quiz-lead-magnet-maker, ruvnet/symbolic-scribe, SankrityaT/InstaCare +2 |

### npm

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Modernity | npm 12 no longer reads or writes npm-shrinkwrap.json; rename it to package-lock.json | docs.npmjs.com | not yet |
| Convention | package.json sets files, and npm's docs say a root .npmignore will not override it | docs.npmjs.com | ruvnet/ruflo, immich-app/immich |
| Convention | "…" breaks npm's name rules: at most 214 characters, no uppercase in new packages, no leading dot or underscore unscoped, URL-safe | docs.npmjs.com | denoland/deno, oven-sh/bun |

### pnpm

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | pnpm 11 reads only registry and auth settings from .npmrc; these do nothing: …. Move them to pnpm-workspace.yaml | pnpm.io | not yet |
| Convention | pnpm 11 no longer reads the pnpm field in package.json; move it to pnpm-workspace.yaml | pnpm.io | not yet |

### Yarn

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | Yarn 2 and later read only .yarnrc.yml; this file is ignored | yarnpkg.com | not yet |

### TypeScript

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Modernity | deprecated in TypeScript 6 and unsupported in 7: … | typescriptlang.org | calcom/cal.com, oven-sh/bun, ruvnet/ruflo +19 |

### ESLint

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Order | never read: ESLint takes one config per directory, here … | eslint.org | not yet |
| Modernity | eslintrc with ESLint …: deprecated since ESLint 9, no longer looked for, and gone in 10; use eslint.config.js | eslint.org | oven-sh/bun |

End of life: 9 versions of ESLint, from 1 to 9; the latest ended on 2026-08-06. Source: eslint.org · Seen in real projects: Ayato-kosaka/nanitabeyo, ruvnet/ruflo, AdekunleBamz/stackhub +20

### TSLint, JSCS

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Modernity | Should not be committed: `.jscsrc`, `tslint.json` — leftover config of a dead tool | github.com, npmjs.com | not yet |

### Oxlint

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Order | Oxlint allows one config per directory, and this one has several: … | oxc.rs | not yet |

### Prettier

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Order | never read: Prettier takes one config per directory, here … | prettier.io | not yet |

### .env files

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Cleanliness | Should not be committed: `**/.env*.local` — local env file that may hold secrets; Vite and Next.js say to gitignore *.local | vite.dev, nextjs.org | not yet |

### Vite

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Order | never read: Vite takes the first config it finds, here … | github.com | not yet |

### Vitest

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Modernity | a Vitest workspace file: deprecated since Vitest 3.2, replaced by the projects option | vitest.dev | calcom/cal.com |

### Tailwind CSS

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | Tailwind … no longer loads tailwind.config by itself, and no stylesheet loads it with @config | tailwindcss.com | ollama/ollama |

### Vue

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | components named in neither PascalCase nor kebab-case (…, e.g. …): Vue's style guide allows only those two | vuejs.org | chatwoot/chatwoot, element-plus/element-plus |
| Order | components named in … (…), while the rest use …: Vue's style guide says always one or the other | vuejs.org | vbenjs/vue-vben-admin |

End of life: 1 versions of Vue, from 2 to 2; the latest ended on 2023-12-31. Source: v2.vuejs.org · Seen in real projects: not yet

### Nuxt

Researched 2026-11.

End of life: 3 versions of Nuxt, from 1 to 3; the latest ended on 2026-07-31. Source: nuxt.com · Seen in real projects: not yet

### Angular

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | files whose words are not separated by hyphens (…, e.g. …): Angular's style guide names files like user-profile.ts | angular.dev | ghostfolio/ghostfolio |

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
| Order | never read: with … beside it, Cargo uses the file without the extension | doc.rust-lang.org | not yet |
| Modernity | … Cargo.toml files set authors in [package], a field Cargo has deprecated | doc.rust-lang.org | oxc-project/oxc, astral-sh/uv, BurntSushi/ripgrep +3 |
| Modernity | [replace] is deprecated in Cargo; use [patch] | doc.rust-lang.org | not yet |

### rustup

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Modernity | the legacy rust-toolchain format: rustup reads rust-toolchain.toml with a [toolchain] table | rust-lang.github.io | not yet |

### Python

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | Python files with capitals in their names (…, e.g. …): PEP 8 gives modules all-lowercase names | peps.python.org | zopefoundation/ZODB |
| Convention | package … has capitals in its name: PEP 8 gives packages all-lowercase names | peps.python.org | zopefoundation/ZODB, Ayato-kosaka/nanitabeyo |

End of life: 13 versions of Python, from 2.6 to 3.10; the latest ended on 2026-10-01. Source: peps.python.org · Seen in real projects: not yet

### Django

Researched 2026-11.

End of life: 20 versions of Django, from 1.3 to 5.1; the latest ended on 2026-04-07. Source: djangoproject.com · Seen in real projects: not yet

### Poetry

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Modernity | fields Poetry deprecated in [tool.poetry]: …; move them to the standard [project] table | python-poetry.org | astral-sh/uv |

### pytest

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Order | never read: pytest takes one config per directory, here … | docs.pytest.org | not yet |

### Ruff

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Order | never read: Ruff takes one config per directory, here … | docs.astral.sh | not yet |

### mypy

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Order | never read: mypy takes one config per directory, here …, and does not merge | mypy.readthedocs.io | not yet |

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
| Convention | Kotlin files not in upper camel case (…, e.g. …): Kotlin's coding conventions name files like ProcessDeclarations.kt | kotlinlang.org | ktorio/ktor |

### Elixir

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | Elixir files not in snake_case (…, e.g. …): Elixir's naming conventions say file names follow the module in snake_case | hexdocs.pm | plausible/analytics |

### Composer (PSR-4)

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | files named unlike the class they declare (…, e.g. ….php declares …): PSR-4 says the file name matches the class name, case included | php-fig.org | filamentphp/filament, matomo-org/matomo |

### GitHub

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | … MiB: GitHub warns above 50 MiB and refuses files above 100 MiB; use Git LFS or a release | docs.github.com | chatwoot/chatwoot, M-ElSibaii/pdtspt, mitesh77/Best-Flutter-UI-Templates |
| Convention | … KiB: GitHub stops showing a README after … KiB | docs.github.com | not yet |
| Convention | never read: GitHub uses the first CODEOWNERS it finds, here … | docs.github.com | not yet |
| Convention | … MB: GitHub does not load a CODEOWNERS file of 3 MB or more | docs.github.com | not yet |
| Convention | never read: Dependabot reads only .github/dependabot.yml | docs.github.com | AppFlowy-IO/AppFlowy |
| Convention | never run: GitHub Actions only reads workflows from .github/workflows/ | docs.github.com | not yet |

### Docker Compose

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Modernity | a top-level version: Docker calls it obsolete and warns about it; delete the line | docs.docker.com | chatwoot/chatwoot, ruvnet/ruflo, AppFlowy-IO/AppFlowy +3 |
| Modernity | the old name: Docker prefers compose.yaml and keeps docker-compose.yml for earlier versions | docs.docker.com | open-webui/open-webui, ruvnet/ruflo, immich-app/immich +10 |

### Cloudflare Wrangler

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Cleanliness | Should not be committed: `**/.dev.vars`, `**/.dev.vars.!(example)` — Worker secrets, gitignore it and commit .dev.vars.example instead | developers.cloudflare.com | not yet |
| Cleanliness | Should not be committed: `.wrangler` — local Wrangler state, gitignore it | developers.cloudflare.com | not yet |

### JetBrains IDEs

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Cleanliness | Should not be committed: `**/.idea/workspace.xml` — personal IDE state; JetBrains says workspace.xml should not be shared, the rest of .idea may be | jetbrains.com | not yet |

### Agent Skills

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | … lines: Claude Code and the Agent Skills spec say to keep SKILL.md under … | code.claude.com, agentskills.io | ruvnet/ruflo, anomalyco/opencode |
| Convention | name "…" breaks the Agent Skills spec: lowercase letters, digits and hyphens, at most 64, the same as its folder (…) | agentskills.io | ruvnet/ruflo |
| Convention | description of … characters: the Agent Skills spec allows … | agentskills.io | not yet |
| Convention | compatibility of … characters: the Agent Skills spec allows … | agentskills.io | not yet |

### Codex

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | … KiB: Codex reads at most … KiB of AGENTS.md by default and cuts the rest | developers.openai.com | calcom/cal.com, ghostfolio/ghostfolio, v833/q-code |

### Claude Code

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | … lines: Claude Code's docs target under … per CLAUDE.md; longer files consume more context and reduce adherence | code.claude.com | oven-sh/bun, ruvnet/ruflo, Ayato-kosaka/nanitabeyo +5 |
| Modernity | … commands in the older format: Claude Code merged custom commands into skills (.claude/skills/<name>/SKILL.md) | code.claude.com | ruvnet/ruflo, longbridge/gpui-component, oven-sh/bun +1 |
| Convention | a skill named … exists too, and the skill wins: Claude Code never runs this command | code.claude.com | not yet |
| Cleanliness | Should not be committed: `**/CLAUDE.local.md`, `**/.claude/settings.local.json` — personal Claude Code file; its docs say to keep it out of git | code.claude.com | FouadMagdy01/RNCopilot, MohammadShamchi/ai-bookmark-enhancer, ruvnet/ruflo |

### GitHub Copilot

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | a prompt of … characters: GitHub Copilot allows … | docs.github.com | not yet |
| Modernity | uses infer, which GitHub retired: use disable-model-invocation and user-invocable | docs.github.com | not yet |
| Modernity | a custom chat mode: VS Code renamed them to custom agents; rename it to .agent.md | github.com | not yet |
| Convention | Copilot reads only *.instructions.md from .github/instructions/; this name is never read | docs.github.com | not yet |

### Cursor

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Convention | … files that are not .mdc: Cursor says project rules must use the .mdc extension, so it never reads them as rules | cursor.com | calcom/cal.com, MohammadShamchi/ai-bookmark-enhancer |
| Convention | … lines: Cursor says to keep rules under … | cursor.com | not yet |
| Modernity | Should not be committed: `**/.cursorrules` — legacy: Cursor says .cursorrules will be deprecated, move it to .cursor/rules or AGENTS.md | cursor.com | Albertsun6/ontology-builder, coyvalyss1/model-matchmaker, curtmorgan3/quest-bound +2 |

### Devin

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Modernity | a legacy Windsurf location (… files): Devin, Windsurf's successor, reads … first | docs.devin.ai | chatwoot/chatwoot, FouadMagdy01/RNCopilot |

### Cline

Researched 2026-11.

| Taste | chous says | Source | Seen in real projects |
|---|---|---|---|
| Modernity | the older .clinerules layout (… files): Cline's project home is .cline/ | github.com | FouadMagdy01/RNCopilot |

## npm packages

| Package | Verdict | Use instead | Why |
|---|---|---|---|
| `node-fetch`, `cross-fetch`, `isomorphic-fetch`, `whatwg-fetch`, `xmlhttprequest` | review | fetch | fetch is global in Node 18+ and every browser. |
| `abort-controller`, `node-abort-controller` | review | AbortController | Global since Node 15. |
| `formdata-polyfill` | review | FormData | Global since Node 18. |
| `url-parse`, `url-search-params-polyfill`, `querystring` | review | URL / URLSearchParams | WHATWG URL is global. |
| `node-domexception` | review | DOMException | Global since Node 17. |
| `node-uuid` | review | crypto.randomUUID() | Built into Node 19+ and browsers. |
| `buffer-equal-constant-time` | review | crypto.timingSafeEqual | Built into node:crypto. |
| `base-64`, `btoa`, `atob` | review | atob / btoa | Global since Node 16. |
| `safe-buffer` | review | Buffer | Buffer.from / Buffer.alloc, added in Node 5.10. |
| `mkdirp`, `make-dir` | review | fs.mkdir(path, { recursive: true }) | Recursive mkdir is built in. |
| `rimraf` | review | fs.rm(path, { recursive: true, force: true }) | Recursive rm is built in. |
| `ncp` | review | fs.cp(src, dest, { recursive: true }) | Recursive copy is built in. |
| `path-exists` | review | fs.existsSync / fs.access | One line with node:fs. |
| `path-is-absolute` | review | path.isAbsolute | Built into node:path. |
| `os-tmpdir`, `os-homedir` | review | os.tmpdir() / os.homedir() | Built into node:os. |
| `is-windows` | review | process.platform === "win32" | One comparison. |
| `dotenv` | review | process.loadEnvFile() / node --env-file | process.loadEnvFile() is built into Node 20.12+, --env-file into 20.6+. |
| `strip-ansi` | review | util.stripVTControlCharacters | Built into node:util. |
| `bluebird`, `q`, `es6-promise`, `promise-polyfill` | review | Promise | Native promises are in every runtime (ES2015). |
| `pify`, `es6-promisify` | review | util.promisify / node:*/promises | util.promisify (Node 8) and the node:*/promises modules. |
| `regenerator-runtime` | review | native async / generators | Every supported runtime has them. |
| `object-assign` | review | Object.assign / spread | ES2015. |
| `object-keys`, `object.entries`, `object.values`, `object.fromentries` | review | Object.keys / entries / values / fromEntries | ES2017+. |
| `has`, `hasown` | review | Object.hasOwn | ES2022. |
| `array-includes`, `array.prototype.flat`, `array.prototype.flatmap`, `array-flatten`, `array.prototype.at` | review | Array.prototype methods | ES2016+. |
| `left-pad`, `pad-left`, `string.prototype.padstart`, `string.prototype.padend` | review | String.prototype.padStart / padEnd | ES2017. |
| `string.prototype.replaceall`, `string.prototype.matchall`, `string.prototype.trimstart`, `string.prototype.trimend`, `string.prototype.at` | review | String.prototype methods | ES2019 to ES2022. |
| `globalthis`, `global` | review | globalThis | ES2020. |
| `es6-symbol`, `es6-map`, `es6-set`, `es6-weak-map` | review | Symbol / Map / Set / WeakMap | ES2015. |
| `request`, `request-promise`, `request-promise-native` | smell | fetch | Deprecated by its authors in 2020. |
| `moment` | smell | dayjs / date-fns / Temporal | Its maintainers call it a legacy project in maintenance mode. |
| `node-sass` | smell | sass | Its authors: Node Sass is no longer supported. |
| `babel-eslint` | smell | @babel/eslint-parser | Renamed by its authors; the old name gets no more updates. |
| `tslint` | smell | ESLint / oxlint | Deprecated by its authors in favor of ESLint (2019). |
| `babel-polyfill`, `@babel/polyfill` | smell | a modern runtime target | Deprecated by Babel as of 7.4.0, in favor of core-js/stable. |
| `karma` | smell | a browser-mode test runner (Vitest, Playwright) | Deprecated by its authors. |
| `react-scripts` | smell | a framework, or Vite / Parcel / Rsbuild | Create React App was deprecated in 2025. |
| `@vue/cli-service` | smell | create-vue (Vite) | Its authors: Vue CLI is now in maintenance mode. |
| `react-test-renderer` | smell | @testing-library/react | Deprecated by React and no longer maintained. |
| `colors` | smell | util.styleText | Its author published an infinite loop in January 2022 (GHSA-5rqg-jm4f-cqx7). |
| `faker` | smell | @faker-js/faker | Its author deleted the package in January 2022; the community fork lives on. |
