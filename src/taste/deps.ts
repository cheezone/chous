/**
 * chous's own dependency taste. Every entry is an error.
 *
 * Kept by hand on purpose: no upstream list decides what counts as garbage here.
 * Node >= 22 and evergreen browsers are the baseline.
 */
import type { Text } from "../i18n/text";

export type ObsoleteDep = {
  names: string[];
  /** What to use instead. */
  use: string;
  why: Text;
};

/** Replaced by the platform. Nothing to install. */
export const NATIVE: ObsoleteDep[] = [
  // Network
  { names: ["node-fetch", "cross-fetch", "isomorphic-fetch", "whatwg-fetch", "xmlhttprequest"], use: "fetch", why: { en: "fetch is global in Node 18+ and every browser.", zh: "fetch 在 Node 18+ 和所有浏览器里都是全局的。" } },
  { names: ["abort-controller", "node-abort-controller"], use: "AbortController", why: { en: "Global since Node 15.", zh: "Node 15 起全局可用。" } },
  { names: ["form-data", "formdata-node", "formdata-polyfill"], use: "FormData", why: { en: "Global since Node 18.", zh: "Node 18 起全局可用。" } },
  { names: ["url-parse", "url-search-params-polyfill", "querystring"], use: "URL / URLSearchParams", why: { en: "WHATWG URL is global.", zh: "WHATWG URL 是全局的。" } },
  { names: ["node-domexception"], use: "DOMException", why: { en: "Global since Node 17.", zh: "Node 17 起全局可用。" } },

  // Crypto / ids / encoding
  { names: ["uuid", "node-uuid"], use: "crypto.randomUUID()", why: { en: "Built into Node 19+ and browsers.", zh: "Node 19+ 和浏览器都内置。" } },
  { names: ["buffer-equal-constant-time"], use: "crypto.timingSafeEqual", why: { en: "Built into node:crypto.", zh: "node:crypto 内置。" } },
  { names: ["base-64", "btoa", "atob"], use: "atob / btoa", why: { en: "Global since Node 16.", zh: "Node 16 起全局可用。" } },
  { names: ["safe-buffer"], use: "Buffer", why: { en: "Buffer.from / Buffer.alloc are safe since Node 5.", zh: "Node 5 起 Buffer.from / Buffer.alloc 就是安全的。" } },

  // File system / OS / process
  { names: ["mkdirp", "make-dir"], use: "fs.mkdir(path, { recursive: true })", why: { en: "Recursive mkdir is built in.", zh: "递归创建目录已内置。" } },
  { names: ["rimraf"], use: "fs.rm(path, { recursive: true, force: true })", why: { en: "Recursive rm is built in.", zh: "递归删除已内置。" } },
  { names: ["ncp"], use: "fs.cp(src, dest, { recursive: true })", why: { en: "Recursive copy is built in.", zh: "递归复制已内置。" } },
  { names: ["fs-extra"], use: "node:fs/promises", why: { en: "cp, rm and mkdir are recursive natively.", zh: "cp、rm、mkdir 原生就支持递归。" } },
  { names: ["path-exists"], use: "fs.existsSync / fs.access", why: { en: "One line with node:fs.", zh: "node:fs 一行搞定。" } },
  { names: ["path-is-absolute"], use: "path.isAbsolute", why: { en: "Built into node:path.", zh: "node:path 内置。" } },
  { names: ["os-tmpdir", "os-homedir"], use: "os.tmpdir() / os.homedir()", why: { en: "Built into node:os.", zh: "node:os 内置。" } },
  { names: ["is-windows"], use: 'process.platform === "win32"', why: { en: "One comparison.", zh: "一个比较就够了。" } },
  { names: ["dotenv"], use: "process.loadEnvFile() / node --env-file", why: { en: "Built into Node 20.12+.", zh: "Node 20.12+ 内置。" } },

  // CLI
  { names: ["chalk", "colors", "cli-color"], use: "util.styleText", why: { en: "Built into Node 20.12+.", zh: "Node 20.12+ 内置。" } },
  { names: ["strip-ansi"], use: "util.stripVTControlCharacters", why: { en: "Built into node:util.", zh: "node:util 内置。" } },
  { names: ["minimist", "arg"], use: "util.parseArgs", why: { en: "Built into Node 18.3+.", zh: "Node 18.3+ 内置。" } },

  // Language
  { names: ["bluebird", "q", "es6-promise", "promise-polyfill"], use: "Promise", why: { en: "Native promises are faster and everywhere.", zh: "原生 Promise 更快，而且到处都有。" } },
  { names: ["pify", "es6-promisify"], use: "util.promisify / node:*/promises", why: { en: "Built in.", zh: "已内置。" } },
  { names: ["regenerator-runtime"], use: "native async / generators", why: { en: "Every supported runtime has them.", zh: "所有支持的运行时都有。" } },
  { names: ["object-assign"], use: "Object.assign / spread", why: { en: "ES2015.", zh: "ES2015 起内置。" } },
  { names: ["object-keys", "object.entries", "object.values", "object.fromentries"], use: "Object.keys / entries / values / fromEntries", why: { en: "ES2017+.", zh: "ES2017 起内置。" } },
  { names: ["has", "hasown"], use: "Object.hasOwn", why: { en: "ES2022.", zh: "ES2022 起内置。" } },
  { names: ["array-includes", "array.prototype.flat", "array.prototype.flatmap", "array-flatten", "array.prototype.at"], use: "Array.prototype methods", why: { en: "ES2016+.", zh: "ES2016 起内置。" } },
  { names: ["left-pad", "pad-left", "string.prototype.padstart", "string.prototype.padend"], use: "String.prototype.padStart / padEnd", why: { en: "ES2017.", zh: "ES2017 起内置。" } },
  { names: ["string.prototype.replaceall", "string.prototype.matchall", "string.prototype.trimstart", "string.prototype.trimend", "string.prototype.at"], use: "String.prototype methods", why: { en: "ES2019+.", zh: "ES2019 起内置。" } },
  { names: ["globalthis", "global"], use: "globalThis", why: { en: "ES2020.", zh: "ES2020 起内置。" } },
  { names: ["es6-symbol", "es6-map", "es6-set", "es6-weak-map"], use: "Symbol / Map / Set / WeakMap", why: { en: "ES2015.", zh: "ES2015 起内置。" } },
  { names: ["clone-deep", "lodash.clonedeep"], use: "structuredClone", why: { en: "Global since Node 17.", zh: "Node 17 起全局可用。" } },
  { names: ["is-number", "is-odd", "is-even"], use: "typeof / %", why: { en: "One expression.", zh: "一个表达式就够了。" } },
];

/** Dead or superseded. Use the named replacement. */
export const DEAD: ObsoleteDep[] = [
  { names: ["request", "request-promise", "request-promise-native"], use: "fetch", why: { en: "request is deprecated since 2020.", zh: "request 2020 年起已废弃。" } },
  { names: ["moment"], use: "dayjs / date-fns / Temporal", why: { en: "moment is in maintenance mode and not tree-shakable.", zh: "moment 已进入维护模式，且无法 tree-shake。" } },
  { names: ["node-sass"], use: "sass", why: { en: "Deprecated, LibSass is dead.", zh: "已废弃，LibSass 已停止维护。" } },
  { names: ["tslint"], use: "oxlint", why: { en: "Deprecated since 2019.", zh: "2019 年起已废弃。" } },
  { names: ["babel-polyfill", "@babel/polyfill"], use: "a modern runtime target", why: { en: "Deprecated.", zh: "已废弃。" } },
  { names: ["bower"], use: "pnpm", why: { en: "Dead package manager.", zh: "已经死掉的包管理器。" } },
  { names: ["gulp", "grunt"], use: "package.json scripts", why: { en: "Task runners are obsolete.", zh: "任务运行器已经过时。" } },
  { names: ["karma"], use: "Vitest browser mode", why: { en: "Deprecated.", zh: "已废弃。" } },
  { names: ["istanbul", "nyc"], use: "vitest --coverage", why: { en: "Coverage is built into the test runner.", zh: "测试框架自带覆盖率。" } },
  { names: ["ts-node"], use: "node (type stripping) or tsx", why: { en: "Node runs TypeScript natively.", zh: "Node 能直接运行 TypeScript。" } },
  { names: ["nodemon"], use: "node --watch", why: { en: "Built into Node 18.11+.", zh: "Node 18.11+ 内置。" } },
  { names: ["enzyme"], use: "@testing-library", why: { en: "Unmaintained, no React 18 support.", zh: "无人维护，不支持 React 18。" } },
  { names: ["react-scripts"], use: "Vite", why: { en: "Create React App is deprecated.", zh: "Create React App 已废弃。" } },
];
