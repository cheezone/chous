/**
 * Directory conventions that frameworks document themselves. Every rule here
 * is a file the framework silently never reads — dead code that looks alive —
 * and cites the page that says so. Which framework you pick is not our call.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { taste } from "./define";

/** `^16.1.0` → 16; `latest`, `catalog:`, `workspace:*` → undefined. */
export function majorOf(range: unknown): number | undefined {
  if (typeof range !== "string") return undefined;
  const m = /^[\^~>=v\s]*(\d+)/.exec(range);
  return m ? Number(m[1]) : undefined;
}

/**
 * A path exists with exactly this spelling. `existsSync("app")` is true for
 * `App/` on macOS and Windows, whose file systems ignore case — the very case
 * these rules are about.
 */
function has(root: string, rel: string): boolean {
  let dir = root;
  for (const part of rel.split("/")) {
    try {
      if (!readdirSync(dir).includes(part)) return false;
    } catch {
      return false;
    }
    dir = resolve(dir, part);
  }
  return true;
}

/**
 * Next.js
 * - https://nextjs.org/docs/app/api-reference/file-conventions/src-folder
 *   "`src/app` or `src/pages` will be ignored if `app` or `pages` are present in the root directory."
 * - https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 *   v16.0.0: "Middleware is deprecated and renamed to Proxy."
 */
export function next(root: string, version: number | undefined) {
  const t = taste("next");
  for (const dir of ["app", "pages"]) {
    if (has(root, dir)) t.no([`src/${dir}`], { reason: "reason.nextSrcIgnored", value: "convention" });
  }
  // Routers are found by exact name: with no lowercase router, `App/` is one
  // that works on macOS and vanishes on Linux.
  if (!["app", "pages", "src/app", "src/pages"].some((d) => has(root, d))) {
    t.no(["{,src/}App", "{,src/}Pages"], { reason: "reason.nextCase", value: "convention" });
  }
  t.no(["Public"], { reason: "reason.nextCase", value: "convention" });
  if (version !== undefined && version >= 16) {
    t.no(["{,src/}middleware.{ts,js}"], { reason: "reason.nextProxy", value: "modernity" });
  }
  return t.rules;
}

/**
 * Directories Nuxt reads from its srcDir that only work by convention.
 * `components/`, `composables/` and `utils/` are left out: they can also be
 * imported by path, which keeps working wherever they live (nuxt.com does).
 * https://nuxt.com/docs/guide/directory-structure
 */
const NUXT_SRC = ["layouts", "middleware", "pages", "plugins"];
const NUXT_SRC_FILES = ["app.vue", "error.vue", "app.config.ts"];

/** Mirrors Nuxt's own srcDir resolution (packages/schema/src/config/common.ts). */
function nuxtUsesAppDir(root: string): boolean {
  for (const name of ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs"]) {
    try {
      if (readFileSync(resolve(root, name), "utf8").includes("srcDir")) return false;
    } catch {
      // no such config
    }
  }
  try {
    return has(root, "app") && readdirSync(resolve(root, "app")).some((f) => f !== "spa-loading-template.html" && !f.startsWith("router.options"));
  } catch {
    return false;
  }
}

/**
 * Nuxt
 * - https://nuxt.com/docs/4.x/getting-started/upgrade#new-directory-structure
 *   "the new Nuxt default `srcDir` is `app/`"
 *   With a non-empty `app/`, root-level `pages/`, `components/`, … are never scanned.
 */
export function nuxt(root: string, version: number | undefined) {
  const t = taste("nuxt");
  const src = version !== undefined && version >= 4 && nuxtUsesAppDir(root) ? "app/" : "";
  if (src) t.no([...NUXT_SRC, ...NUXT_SRC_FILES], { reason: "reason.nuxtSrcDir", value: "convention" });
  const capital = (d: string) => `${src}${d[0]!.toUpperCase()}${d.slice(1)}`;
  t.no([...NUXT_SRC.map(capital), "Public", "Server"], { reason: "reason.nuxtCase", value: "convention" });
  return t.rules;
}
