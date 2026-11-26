# What chous knows

> Generated from `src/facts/` by `pnpm run docs`. Do not edit: change the tool's file and run it again.

Each line is something a tool, platform or package author states about itself, with their own words behind it (`chous --verbose` shows them). chous reports it when a project goes against it.

37 tools · 46 facts about files · 8 paths that should not be committed · 8 end-of-life schedules · 41 npm package entries.

## Tools

### Node.js

Researched 2026-11.

End of life: 20 versions of Node, from 4 to 25; the latest ended on 2026-06-01. Source: github.com

### Bun

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Modernity | Should not be committed: `bun.lockb` — binary lockfile, run `bun install --save-text-lockfile` and commit bun.lock | bun.com |

### npm

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Modernity | npm 12 no longer reads or writes npm-shrinkwrap.json; rename it to package-lock.json | docs.npmjs.com |
| Convention | package.json sets files, and npm's docs say a root .npmignore will not override it | docs.npmjs.com |
| Convention | "…" breaks npm's name rules: at most 214 characters, no uppercase in new packages, no leading dot or underscore unscoped, URL-safe | docs.npmjs.com |

### pnpm

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Convention | pnpm 11 reads only registry and auth settings from .npmrc; these do nothing: …. Move them to pnpm-workspace.yaml | pnpm.io |
| Convention | pnpm 11 no longer reads the pnpm field in package.json; move it to pnpm-workspace.yaml | pnpm.io |

### Yarn

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Convention | Yarn 2 and later read only .yarnrc.yml; this file is ignored | yarnpkg.com |

### TypeScript

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Modernity | deprecated in TypeScript 6 and unsupported in 7: … | typescriptlang.org |

### ESLint

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Order | never read: ESLint takes one config per directory, here … | eslint.org |
| Modernity | eslintrc with ESLint …: deprecated since ESLint 9, no longer looked for, and gone in 10; use eslint.config.js | eslint.org |

End of life: 9 versions of ESLint, from 1 to 9; the latest ended on 2026-08-06. Source: eslint.org

### TSLint, JSCS

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Modernity | Should not be committed: `.jscsrc`, `tslint.json` — leftover config of a dead tool | github.com, npmjs.com |

### Oxlint

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Order | Oxlint allows one config per directory, and this one has several: … | oxc.rs |

### Prettier

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Order | never read: Prettier takes one config per directory, here … | prettier.io |

### .env files

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Cleanliness | Should not be committed: `**/.env*.local` — local env file that may hold secrets; Vite and Next.js say to gitignore *.local | vite.dev, nextjs.org |

### Vite

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Order | never read: Vite takes the first config it finds, here … | github.com |

### Vitest

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Modernity | a Vitest workspace file: deprecated since Vitest 3.2, replaced by the projects option | vitest.dev |

### Tailwind CSS

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Convention | Tailwind … no longer loads tailwind.config by itself, and no stylesheet loads it with @config | tailwindcss.com |

### Vue

Researched 2026-11.

End of life: 1 versions of Vue, from 2 to 2; the latest ended on 2023-12-31. Source: v2.vuejs.org

### Nuxt

Researched 2026-11.

End of life: 3 versions of Nuxt, from 1 to 3; the latest ended on 2026-07-31. Source: nuxt.com

### Angular

Researched 2026-11.

End of life: Angular 2 to 19 are no longer supported (no date given). Source: angular.dev

### Electron

Researched 2026-11.

End of life: 41 versions of Electron, from 2 to 42; the latest ended on 2026-10-20. Source: releases.electronjs.org

### Cargo

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Order | never read: with … beside it, Cargo uses the file without the extension | doc.rust-lang.org |
| Modernity | … Cargo.toml files set authors in [package], a field Cargo has deprecated | doc.rust-lang.org |
| Modernity | [replace] is deprecated in Cargo; use [patch] | doc.rust-lang.org |

### rustup

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Modernity | the legacy rust-toolchain format: rustup reads rust-toolchain.toml with a [toolchain] table | rust-lang.github.io |

### Python

Researched 2026-11.

End of life: 13 versions of Python, from 2.6 to 3.10; the latest ended on 2026-10-01. Source: peps.python.org

### Django

Researched 2026-11.

End of life: 20 versions of Django, from 1.3 to 5.1; the latest ended on 2026-04-07. Source: djangoproject.com

### Poetry

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Modernity | fields Poetry deprecated in [tool.poetry]: …; move them to the standard [project] table | python-poetry.org |

### pytest

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Order | never read: pytest takes one config per directory, here … | docs.pytest.org |

### Ruff

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Order | never read: Ruff takes one config per directory, here … | docs.astral.sh |

### mypy

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Order | never read: mypy takes one config per directory, here …, and does not merge | mypy.readthedocs.io |

### GitHub

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Convention | … MiB: GitHub warns above 50 MiB and refuses files above 100 MiB; use Git LFS or a release | docs.github.com |
| Convention | … KiB: GitHub stops showing a README after … KiB | docs.github.com |
| Convention | never read: GitHub uses the first CODEOWNERS it finds, here … | docs.github.com |
| Convention | … MB: GitHub does not load a CODEOWNERS file of 3 MB or more | docs.github.com |
| Convention | never read: Dependabot reads only .github/dependabot.yml | docs.github.com |
| Convention | never run: GitHub Actions only reads workflows from .github/workflows/ | docs.github.com |

### Docker Compose

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Modernity | a top-level version: Docker calls it obsolete and warns about it; delete the line | docs.docker.com |
| Modernity | the old name: Docker prefers compose.yaml and keeps docker-compose.yml for earlier versions | docs.docker.com |

### Cloudflare Wrangler

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Cleanliness | Should not be committed: `**/.dev.vars`, `**/.dev.vars.!(example)` — Worker secrets, gitignore it and commit .dev.vars.example instead | developers.cloudflare.com |
| Cleanliness | Should not be committed: `.wrangler` — local Wrangler state, gitignore it | developers.cloudflare.com |

### JetBrains IDEs

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Cleanliness | Should not be committed: `**/.idea/workspace.xml` — personal IDE state; JetBrains says workspace.xml should not be shared, the rest of .idea may be | jetbrains.com |

### Agent Skills

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Convention | … lines: Claude Code and the Agent Skills spec say to keep SKILL.md under … | code.claude.com, agentskills.io |
| Convention | name "…" breaks the Agent Skills spec: lowercase letters, digits and hyphens, at most 64, the same as its folder (…) | agentskills.io |
| Convention | description of … characters: the Agent Skills spec allows … | agentskills.io |
| Convention | compatibility of … characters: the Agent Skills spec allows … | agentskills.io |

### Codex

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Convention | … KiB: Codex reads at most … KiB of AGENTS.md by default and cuts the rest | developers.openai.com |

### Claude Code

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Convention | … lines: Claude Code's docs target under … per CLAUDE.md; longer files consume more context and reduce adherence | code.claude.com |
| Modernity | … commands in the older format: Claude Code merged custom commands into skills (.claude/skills/<name>/SKILL.md) | code.claude.com |
| Convention | a skill named … exists too, and the skill wins: Claude Code never runs this command | code.claude.com |
| Cleanliness | Should not be committed: `**/CLAUDE.local.md`, `**/.claude/settings.local.json` — personal Claude Code file; its docs say to keep it out of git | code.claude.com |

### GitHub Copilot

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Convention | a prompt of … characters: GitHub Copilot allows … | docs.github.com |
| Modernity | uses infer, which GitHub retired: use disable-model-invocation and user-invocable | docs.github.com |
| Modernity | a custom chat mode: VS Code renamed them to custom agents; rename it to .agent.md | github.com |
| Convention | Copilot reads only *.instructions.md from .github/instructions/; this name is never read | docs.github.com |

### Cursor

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Convention | … files that are not .mdc: Cursor says project rules must use the .mdc extension, so it never reads them as rules | cursor.com |
| Convention | … lines: Cursor says to keep rules under … | cursor.com |
| Modernity | Should not be committed: `**/.cursorrules` — legacy: Cursor says .cursorrules will be deprecated, move it to .cursor/rules or AGENTS.md | cursor.com |

### Devin

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Modernity | a legacy Windsurf location (… files): Devin, Windsurf's successor, reads … first | docs.devin.ai |

### Cline

Researched 2026-11.

| Taste | chous says | Source |
|---|---|---|
| Modernity | the older .clinerules layout (… files): Cline's project home is .cline/ | github.com |

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
