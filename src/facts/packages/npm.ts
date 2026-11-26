/**
 * npm packages with something wrong about them. Every entry meets one of
 * these checkable facts — facts that stay true once they are true:
 *
 * - native (for review): the platform ships something that does the same job
 *   (Node >= 22, evergreen browsers). That much is a fact; whether it fully
 *   replaces the package for this project is not, so a person or agent decides.
 * - deprecated (a smell): its own authors deprecated it, or call it legacy
 *   (moment). Bower is not here: its README says it is maintained.
 * - sabotaged (a smell): its author broke it on purpose.
 *
 * "Old", "slow", "written in the wrong language" or "there is something newer"
 * are not rot. Those change; facts do not. Silence is not evidence either: an
 * unmaintained project nobody declared dead is left alone.
 *
 * `why` is the reason chous gives (`dep.<first name>`); `sources` hold the
 * authors' own words, required for every entry that is not native.
 */
import { packages } from "../define";

export default packages([
  // The platform ships it (Node >= 22, evergreen browsers): for review, since whether it fully replaces the package depends on its use.
  { kind: "native", names: ["node-fetch", "cross-fetch", "isomorphic-fetch", "whatwg-fetch", "xmlhttprequest"], use: "fetch", why: { en: "fetch is global in Node 18+ and every browser.", zh: "fetch 在 Node 18+ 和所有浏览器里都是全局的。" } },
  { kind: "native", names: ["abort-controller", "node-abort-controller"], use: "AbortController", why: { en: "Global since Node 15.", zh: "Node 15 起全局可用。" } },
  { kind: "native", names: ["formdata-polyfill"], use: "FormData", why: { en: "Global since Node 18.", zh: "Node 18 起全局可用。" } },
  { kind: "native", names: ["url-parse", "url-search-params-polyfill", "querystring"], use: "URL / URLSearchParams", why: { en: "WHATWG URL is global.", zh: "WHATWG URL 是全局的。" } },
  { kind: "native", names: ["node-domexception"], use: "DOMException", why: { en: "Global since Node 17.", zh: "Node 17 起全局可用。" } },
  { kind: "native", names: ["node-uuid"], use: "crypto.randomUUID()", why: { en: "Built into Node 19+ and browsers.", zh: "Node 19+ 和浏览器都内置。" } },
  { kind: "native", names: ["buffer-equal-constant-time"], use: "crypto.timingSafeEqual", why: { en: "Built into node:crypto.", zh: "node:crypto 内置。" } },
  { kind: "native", names: ["base-64", "btoa", "atob"], use: "atob / btoa", why: { en: "Global since Node 16.", zh: "Node 16 起为全局函数。" } },
  { kind: "native", names: ["safe-buffer"], use: "Buffer", why: { en: "Buffer.from / Buffer.alloc, added in Node 5.10.", zh: "Buffer.from / Buffer.alloc，Node 5.10 加入。" } },
  { kind: "native", names: ["mkdirp", "make-dir"], use: "fs.mkdir(path, { recursive: true })", why: { en: "Recursive mkdir is built in.", zh: "递归创建目录已内置。" } },
  { kind: "native", names: ["rimraf"], use: "fs.rm(path, { recursive: true, force: true })", why: { en: "Recursive rm is built in.", zh: "递归删除已内置。" } },
  { kind: "native", names: ["ncp"], use: "fs.cp(src, dest, { recursive: true })", why: { en: "Recursive copy is built in.", zh: "递归复制已内置。" } },
  { kind: "native", names: ["path-exists"], use: "fs.existsSync / fs.access", why: { en: "One line with node:fs.", zh: "node:fs 一行搞定。" } },
  { kind: "native", names: ["path-is-absolute"], use: "path.isAbsolute", why: { en: "Built into node:path.", zh: "node:path 内置。" } },
  { kind: "native", names: ["os-tmpdir", "os-homedir"], use: "os.tmpdir() / os.homedir()", why: { en: "Built into node:os.", zh: "node:os 内置。" } },
  { kind: "native", names: ["is-windows"], use: "process.platform === \"win32\"", why: { en: "One comparison.", zh: "一个比较就够了。" } },
  { kind: "native", names: ["dotenv"], use: "process.loadEnvFile() / node --env-file", why: { en: "process.loadEnvFile() is built into Node 20.12+, --env-file into 20.6+.", zh: "Node 20.12+ 内置 process.loadEnvFile()，20.6+ 内置 --env-file。" } },
  { kind: "native", names: ["strip-ansi"], use: "util.stripVTControlCharacters", why: { en: "Built into node:util.", zh: "node:util 内置。" } },
  { kind: "native", names: ["bluebird", "q", "es6-promise", "promise-polyfill"], use: "Promise", why: { en: "Native promises are in every runtime (ES2015).", zh: "原生 Promise 在所有运行时里都有（ES2015）。" } },
  { kind: "native", names: ["pify", "es6-promisify"], use: "util.promisify / node:*/promises", why: { en: "util.promisify (Node 8) and the node:*/promises modules.", zh: "util.promisify（Node 8）和 node:*/promises 模块。" } },
  { kind: "native", names: ["regenerator-runtime"], use: "native async / generators", why: { en: "Every supported runtime has them.", zh: "所有支持的运行时都有。" } },
  { kind: "native", names: ["object-assign"], use: "Object.assign / spread", why: { en: "ES2015.", zh: "ES2015 起内置。" } },
  { kind: "native", names: ["object-keys", "object.entries", "object.values", "object.fromentries"], use: "Object.keys / entries / values / fromEntries", why: { en: "ES2017+.", zh: "ES2017 起内置。" } },
  { kind: "native", names: ["has", "hasown"], use: "Object.hasOwn", why: { en: "ES2022.", zh: "ES2022 起内置。" } },
  { kind: "native", names: ["array-includes", "array.prototype.flat", "array.prototype.flatmap", "array-flatten", "array.prototype.at"], use: "Array.prototype methods", why: { en: "ES2016+.", zh: "ES2016 起内置。" } },
  { kind: "native", names: ["left-pad", "pad-left", "string.prototype.padstart", "string.prototype.padend"], use: "String.prototype.padStart / padEnd", why: { en: "ES2017.", zh: "ES2017 起内置。" } },
  { kind: "native", names: ["string.prototype.replaceall", "string.prototype.matchall", "string.prototype.trimstart", "string.prototype.trimend", "string.prototype.at"], use: "String.prototype methods", why: { en: "ES2019 to ES2022.", zh: "ES2019 到 ES2022。" } },
  { kind: "native", names: ["globalthis", "global"], use: "globalThis", why: { en: "ES2020.", zh: "ES2020 起内置。" } },
  { kind: "native", names: ["es6-symbol", "es6-map", "es6-set", "es6-weak-map"], use: "Symbol / Map / Set / WeakMap", why: { en: "ES2015.", zh: "ES2015 起内置。" } },
  // Deprecated, or called legacy, by its own authors.
  { kind: "deprecated", names: ["request", "request-promise", "request-promise-native"], use: "fetch", why: { en: "Deprecated by its authors in 2020.", zh: "作者已于 2020 年宣布废弃。" }, sources: [{ url: "https://github.com/request/request/issues/3142", check: "https://registry.npmjs.org/request", quote: "request has been deprecated" }] },
  { kind: "deprecated", names: ["moment"], use: "dayjs / date-fns / Temporal", why: { en: "Its maintainers call it a legacy project in maintenance mode.", zh: "维护者称它为处于维护模式的遗留项目。" }, sources: [{ url: "https://momentjs.com/docs/#/-project-status/", check: "https://raw.githubusercontent.com/moment/moment/develop/README.md", quote: "Moment.js is a legacy project, now in maintenance mode" }] },
  { kind: "deprecated", names: ["node-sass"], use: "sass", why: { en: "Its authors: Node Sass is no longer supported.", zh: "作者原话：Node Sass 已不再受支持。" }, sources: [{ url: "https://www.npmjs.com/package/node-sass", check: "https://registry.npmjs.org/node-sass", quote: "Node Sass is no longer supported" }] },
  { kind: "deprecated", names: ["babel-eslint"], use: "@babel/eslint-parser", why: { en: "Renamed by its authors; the old name gets no more updates.", zh: "作者已改名，旧包不再更新。" }, sources: [{ url: "https://www.npmjs.com/package/babel-eslint", check: "https://registry.npmjs.org/babel-eslint", quote: "babel-eslint is now @babel/eslint-parser. This package will no longer receive updates." }] },
  { kind: "deprecated", names: ["tslint"], use: "ESLint / oxlint", why: { en: "Deprecated by its authors in favor of ESLint (2019).", zh: "作者已于 2019 年宣布废弃，改用 ESLint。" }, sources: [{ url: "https://github.com/palantir/tslint/issues/4534", check: "https://registry.npmjs.org/tslint", quote: "TSLint has been deprecated in favor of ESLint" }] },
  { kind: "deprecated", names: ["babel-polyfill", "@babel/polyfill"], use: "a modern runtime target", why: { en: "Deprecated by Babel as of 7.4.0, in favor of core-js/stable.", zh: "Babel 自 7.4.0 起宣布废弃，改用 core-js/stable。" }, sources: [{ url: "https://babeljs.io/docs/babel-polyfill", check: "https://raw.githubusercontent.com/babel/website/main/docs/polyfill.md", quote: "As of Babel 7.4.0, this package has been deprecated" }] },
  { kind: "deprecated", names: ["karma"], use: "a browser-mode test runner (Vitest, Playwright)", why: { en: "Deprecated by its authors.", zh: "作者已宣布废弃。" }, sources: [{ url: "https://github.com/karma-runner/karma#readme", check: "https://raw.githubusercontent.com/karma-runner/karma/master/README.md", quote: "Karma is deprecated and is not accepting new features or general bug fixes." }] },
  { kind: "deprecated", names: ["react-scripts"], use: "a framework, or Vite / Parcel / Rsbuild", why: { en: "Create React App was deprecated in 2025.", zh: "Create React App 已于 2025 年废弃。" }, sources: [{ url: "https://github.com/facebook/create-react-app#readme", check: "https://raw.githubusercontent.com/facebook/create-react-app/main/README.md", quote: "## Deprecated" }] },
  { kind: "deprecated", names: ["@vue/cli-service"], use: "create-vue (Vite)", why: { en: "Its authors: Vue CLI is now in maintenance mode.", zh: "作者原话：Vue CLI 已进入维护模式。" }, sources: [{ url: "https://github.com/vuejs/vue-cli#readme", check: "https://raw.githubusercontent.com/vuejs/vue-cli/dev/README.md", quote: "Vue CLI is now in maintenance mode." }] },
  { kind: "deprecated", names: ["react-test-renderer"], use: "@testing-library/react", why: { en: "Deprecated by React and no longer maintained.", zh: "React 官方已宣布废弃，不再维护。" }, sources: [{ url: "https://www.npmjs.com/package/react-test-renderer", check: "https://raw.githubusercontent.com/facebook/react/main/packages/react-test-renderer/README.md", quote: "react-test-renderer is deprecated and no longer maintained." }] },
  // Broken on purpose by its own author.
  { kind: "sabotaged", names: ["colors"], use: "util.styleText", why: { en: "Its author published an infinite loop in January 2022 (GHSA-5rqg-jm4f-cqx7).", zh: "作者在 2022 年 1 月发布了死循环（GHSA-5rqg-jm4f-cqx7）。" }, sources: [{ url: "https://github.com/advisories/GHSA-5rqg-jm4f-cqx7", check: "https://raw.githubusercontent.com/github/advisory-database/main/advisories/github-reviewed/2022/01/GHSA-5rqg-jm4f-cqx7/GHSA-5rqg-jm4f-cqx7.json", quote: "were published including malicious code that caused a Denial of Service due to an infinite loop" }] },
  { kind: "sabotaged", names: ["faker"], use: "@faker-js/faker", why: { en: "Its author deleted the package in January 2022; the community fork lives on.", zh: "作者在 2022 年 1 月删掉了这个包；社区分支还在维护。" }, sources: [{ url: "https://fakerjs.dev/about/announcements/2022-01-14", check: "https://raw.githubusercontent.com/faker-js/faker/next/docs/about/announcements/2022-01-14.md", quote: "when the main package was deleted" }] },

]);
