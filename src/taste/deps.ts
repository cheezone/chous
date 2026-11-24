/**
 * chous's own dependency taste. Every entry is an error.
 *
 * Kept by hand on purpose: no upstream list decides what counts as garbage here.
 * Node >= 22 and evergreen browsers are the baseline.
 */
export type ObsoleteDep = {
  names: string[];
  /** What to use instead. */
  use: string;
  why: string;
};

/** Replaced by the platform. Nothing to install. */
export const NATIVE: ObsoleteDep[] = [
  // Network
  { names: ["node-fetch", "cross-fetch", "isomorphic-fetch", "whatwg-fetch", "xmlhttprequest"], use: "fetch", why: "fetch is global in Node 18+ and every browser." },
  { names: ["abort-controller", "node-abort-controller"], use: "AbortController", why: "Global since Node 15." },
  { names: ["form-data", "formdata-node", "formdata-polyfill"], use: "FormData", why: "Global since Node 18." },
  { names: ["url-parse", "url-search-params-polyfill", "querystring"], use: "URL / URLSearchParams", why: "WHATWG URL is global." },
  { names: ["node-domexception"], use: "DOMException", why: "Global since Node 17." },

  // Crypto / ids / encoding
  { names: ["uuid", "node-uuid"], use: "crypto.randomUUID()", why: "Built into Node 19+ and browsers." },
  { names: ["buffer-equal-constant-time"], use: "crypto.timingSafeEqual", why: "Built into node:crypto." },
  { names: ["base-64", "btoa", "atob"], use: "atob / btoa", why: "Global since Node 16." },
  { names: ["safe-buffer"], use: "Buffer", why: "Buffer.from / Buffer.alloc are safe since Node 5." },

  // File system / OS / process
  { names: ["mkdirp", "make-dir"], use: "fs.mkdir(path, { recursive: true })", why: "Recursive mkdir is built in." },
  { names: ["rimraf"], use: "fs.rm(path, { recursive: true, force: true })", why: "Recursive rm is built in." },
  { names: ["ncp"], use: "fs.cp(src, dest, { recursive: true })", why: "Recursive copy is built in." },
  { names: ["fs-extra"], use: "node:fs/promises", why: "cp, rm and mkdir are recursive natively." },
  { names: ["path-exists"], use: "fs.existsSync / fs.access", why: "One line with node:fs." },
  { names: ["path-is-absolute"], use: "path.isAbsolute", why: "Built into node:path." },
  { names: ["os-tmpdir", "os-homedir"], use: "os.tmpdir() / os.homedir()", why: "Built into node:os." },
  { names: ["is-windows"], use: 'process.platform === "win32"', why: "One comparison." },
  { names: ["dotenv"], use: "process.loadEnvFile() / node --env-file", why: "Built into Node 20.12+." },

  // CLI
  { names: ["chalk", "colors", "cli-color"], use: "util.styleText", why: "Built into Node 20.12+." },
  { names: ["strip-ansi"], use: "util.stripVTControlCharacters", why: "Built into node:util." },
  { names: ["minimist", "arg"], use: "util.parseArgs", why: "Built into Node 18.3+." },

  // Language
  { names: ["bluebird", "q", "es6-promise", "promise-polyfill"], use: "Promise", why: "Native promises are faster and everywhere." },
  { names: ["pify", "es6-promisify"], use: "util.promisify / node:*/promises", why: "Built in." },
  { names: ["regenerator-runtime"], use: "native async / generators", why: "Every supported runtime has them." },
  { names: ["object-assign"], use: "Object.assign / spread", why: "ES2015." },
  { names: ["object-keys", "object.entries", "object.values", "object.fromentries"], use: "Object.keys / entries / values / fromEntries", why: "ES2017+." },
  { names: ["has", "hasown"], use: "Object.hasOwn", why: "ES2022." },
  { names: ["array-includes", "array.prototype.flat", "array.prototype.flatmap", "array-flatten", "array.prototype.at"], use: "Array.prototype methods", why: "ES2016+." },
  { names: ["left-pad", "pad-left", "string.prototype.padstart", "string.prototype.padend"], use: "String.prototype.padStart / padEnd", why: "ES2017." },
  { names: ["string.prototype.replaceall", "string.prototype.matchall", "string.prototype.trimstart", "string.prototype.trimend", "string.prototype.at"], use: "String.prototype methods", why: "ES2019+." },
  { names: ["globalthis", "global"], use: "globalThis", why: "ES2020." },
  { names: ["es6-symbol", "es6-map", "es6-set", "es6-weak-map"], use: "Symbol / Map / Set / WeakMap", why: "ES2015." },
  { names: ["clone-deep", "lodash.clonedeep"], use: "structuredClone", why: "Global since Node 17." },
  { names: ["is-number", "is-odd", "is-even"], use: "typeof / %", why: "One expression." },
];

/** Dead or superseded. Use the named replacement. */
export const DEAD: ObsoleteDep[] = [
  { names: ["request", "request-promise", "request-promise-native"], use: "fetch", why: "request is deprecated since 2020." },
  { names: ["moment"], use: "dayjs / date-fns / Temporal", why: "moment is in maintenance mode and not tree-shakable." },
  { names: ["node-sass"], use: "sass", why: "Deprecated, LibSass is dead." },
  { names: ["tslint"], use: "oxlint", why: "Deprecated since 2019." },
  { names: ["babel-polyfill", "@babel/polyfill"], use: "a modern runtime target", why: "Deprecated." },
  { names: ["bower"], use: "pnpm", why: "Dead package manager." },
  { names: ["gulp", "grunt"], use: "package.json scripts", why: "Task runners are obsolete." },
  { names: ["karma"], use: "Vitest browser mode", why: "Deprecated." },
  { names: ["istanbul", "nyc"], use: "vitest --coverage", why: "Coverage is built into the test runner." },
  { names: ["ts-node"], use: "node (type stripping) or tsx", why: "Node runs TypeScript natively." },
  { names: ["nodemon"], use: "node --watch", why: "Built into Node 18.11+." },
  { names: ["enzyme"], use: "@testing-library", why: "Unmaintained, no React 18 support." },
  { names: ["react-scripts"], use: "Vite", why: "Create React App is deprecated." },
];
