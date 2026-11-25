/**
 * Dependencies with something wrong about them. Every entry must meet one of
 * these checkable facts — facts that stay true once they are true:
 *
 * 1. NATIVE (for review): the platform ships something that does the same job
 *    (Node >= 22, evergreen browsers). That much is a fact; whether it fully
 *    replaces the package for this project is not, so a person or agent decides.
 * 2. DEPRECATED (a smell): its own authors deprecated it, or call it legacy
 *    (moment). Bower is not here: its README says it is maintained.
 * 3. SABOTAGED (a smell): its author broke it on purpose.
 *
 * "Old", "slow", "written in the wrong language" or "there is something newer"
 * are not rot. Those change; facts do not. Silence is not evidence either: an
 * unmaintained project nobody declared dead is left alone.
 */
import type { MessageKey } from "../i18n";

/** Why it is listed lives in the locale files, under `dep.<first name>`. */
export type ObsoleteDep = {
  names: string[];
  /** What to use instead. */
  use: string;
};

/** 1. The platform ships an equivalent. Nothing to install. */
export const NATIVE: ObsoleteDep[] = [
  // Network
  { names: ["node-fetch", "cross-fetch", "isomorphic-fetch", "whatwg-fetch", "xmlhttprequest"], use: "fetch" },
  { names: ["abort-controller", "node-abort-controller"], use: "AbortController" },
  { names: ["formdata-polyfill"], use: "FormData" },
  { names: ["url-parse", "url-search-params-polyfill", "querystring"], use: "URL / URLSearchParams" },
  { names: ["node-domexception"], use: "DOMException" },

  // Crypto / ids / encoding
  { names: ["node-uuid"], use: "crypto.randomUUID()" },
  { names: ["buffer-equal-constant-time"], use: "crypto.timingSafeEqual" },
  { names: ["base-64", "btoa", "atob"], use: "atob / btoa" },
  { names: ["safe-buffer"], use: "Buffer" },

  // File system / OS / process
  { names: ["mkdirp", "make-dir"], use: "fs.mkdir(path, { recursive: true })" },
  { names: ["rimraf"], use: "fs.rm(path, { recursive: true, force: true })" },
  { names: ["ncp"], use: "fs.cp(src, dest, { recursive: true })" },
  { names: ["path-exists"], use: "fs.existsSync / fs.access" },
  { names: ["path-is-absolute"], use: "path.isAbsolute" },
  { names: ["os-tmpdir", "os-homedir"], use: "os.tmpdir() / os.homedir()" },
  { names: ["is-windows"], use: 'process.platform === "win32"' },
  { names: ["dotenv"], use: "process.loadEnvFile() / node --env-file" },

  // CLI
  { names: ["strip-ansi"], use: "util.stripVTControlCharacters" },

  // Language
  { names: ["bluebird", "q", "es6-promise", "promise-polyfill"], use: "Promise" },
  { names: ["pify", "es6-promisify"], use: "util.promisify / node:*/promises" },
  { names: ["regenerator-runtime"], use: "native async / generators" },
  { names: ["object-assign"], use: "Object.assign / spread" },
  { names: ["object-keys", "object.entries", "object.values", "object.fromentries"], use: "Object.keys / entries / values / fromEntries" },
  { names: ["has", "hasown"], use: "Object.hasOwn" },
  { names: ["array-includes", "array.prototype.flat", "array.prototype.flatmap", "array-flatten", "array.prototype.at"], use: "Array.prototype methods" },
  { names: ["left-pad", "pad-left", "string.prototype.padstart", "string.prototype.padend"], use: "String.prototype.padStart / padEnd" },
  { names: ["string.prototype.replaceall", "string.prototype.matchall", "string.prototype.trimstart", "string.prototype.trimend", "string.prototype.at"], use: "String.prototype methods" },
  { names: ["globalthis", "global"], use: "globalThis" },
  { names: ["es6-symbol", "es6-map", "es6-set", "es6-weak-map"], use: "Symbol / Map / Set / WeakMap" },
];

/** 2. Deprecated, or called legacy, by its own authors. Each has a source in sources.ts. */
export const DEPRECATED: ObsoleteDep[] = [
  { names: ["request", "request-promise", "request-promise-native"], use: "fetch" },
  { names: ["moment"], use: "dayjs / date-fns / Temporal" },
  { names: ["node-sass"], use: "sass" },
  { names: ["babel-eslint"], use: "@babel/eslint-parser" },
  { names: ["tslint"], use: "ESLint / oxlint" },
  { names: ["babel-polyfill", "@babel/polyfill"], use: "a modern runtime target" },
  { names: ["karma"], use: "a browser-mode test runner (Vitest, Playwright)" },
  { names: ["react-scripts"], use: "a framework, or Vite / Parcel / Rsbuild" },
];

/** 3. Broken on purpose by its own author. */
export const SABOTAGED: ObsoleteDep[] = [
  { names: ["colors"], use: "util.styleText" },
  { names: ["faker"], use: "@faker-js/faker" },
];

export function depReason(dep: ObsoleteDep): MessageKey {
  return `dep.${dep.names[0]}` as MessageKey;
}
