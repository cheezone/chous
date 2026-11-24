import { taste, type TasteBuilder } from "./define";

const SCRIPT = "{ts,js,mjs}";
const HTTP_SUFFIX = "/(\\.(get|post|put|delete|patch|head|options))?$/i";

/** Rules for the Vue source tree — root in Nuxt 3, `app/` in Nuxt 4. */
function appTree(t: TasteBuilder, base: string) {
  const p = (path: string) => `${base}${path}`;

  t.move(p(`assets/*.{css,scss,sass,less,styl}`), p("assets/css"));
  t.move(p(`assets/*.{svg,ico}`), p("assets/icons"));
  t.move(p(`assets/*.{woff,woff2,ttf,otf,eot}`), p("assets/fonts"));
  t.move(p(`assets/*.{png,jpg,jpeg,gif,webp,avif,bmp}`), p("assets/images"));
  t.naming(p("assets/*"), ["kebab-case"], { dirs: true });

  t.naming(p("components/**/*.vue"), ["PascalCase"], { suffix: "/(\\.(client|server))?$/i" });
  t.naming(p("components/**/*.vue"), ["kebab-case"], { ifParentStyle: "PascalCase" });
  t.naming(p("components/*"), ["kebab-case"], { dirs: true, except: ["OgImage"] });
  t.naming(p("components/*"), ["PascalCase"], { dirs: true, ifContains: "index.vue" });

  t.naming(p("composables/*.ts"), ["camelCase", "kebab-case"]);
  t.naming(p("layouts/*.vue"), ["kebab-case"]);

  t.naming(p(`middleware/**/*.${SCRIPT}`), ["kebab-case"], { prefix: "/^(\\d+\\.)?/", suffix: "/(\\.global)?$/i" });

  t.naming(p("pages/**/components/**/*.vue"), ["PascalCase"], { suffix: "/(\\.(client|server))?$/i" });
  t.naming(p("pages/**/*.{vue,js,jsx,mjs,ts,tsx}"), ["kebab-case"]);
  t.naming(p("pages/*"), ["kebab-case"], { dirs: true });

  t.naming(p(`plugins/**/*.${SCRIPT}`), ["camelCase", "kebab-case"], {
    prefix: "/^(\\d+\\.)?/",
    suffix: "/(\\.(client|server))?$/i",
  });
  t.naming(p("plugins/*"), ["kebab-case"], { dirs: true });

  t.naming(p(`utils/**/*.${SCRIPT}`), ["camelCase", "kebab-case"]);
}

/** Nitro server tree. */
function serverTree(t: TasteBuilder, only: string[]) {
  t.dir("server", only, { strict: true });
  t.naming(`server/api/**/*.${SCRIPT}`, ["kebab-case"], { suffix: HTTP_SUFFIX });
  t.naming("server/api/*", ["kebab-case"], { dirs: true });
  t.naming(`server/middleware/**/*.${SCRIPT}`, ["kebab-case"], { prefix: "/^\\d+\\./" });
  t.naming(`server/plugins/**/*.${SCRIPT}`, ["camelCase", "kebab-case"], { prefix: "/^\\d+\\./" });
  t.naming(`server/utils/**/*.${SCRIPT}`, ["camelCase", "kebab-case"]);
}

/** Nuxt 3 — source at the repo root. */
export function nuxt3() {
  const t = taste("nuxt3");

  t.must(["nuxt.config.{js,ts,mjs}"]);
  t.allow([
    "public", "server", "shared", "content", "modules", "helpers",
    "assets", "components", "composables", "layouts", "middleware", "pages", "plugins", "utils",
    "app.vue", "app.config.ts", "error.vue", ".nuxtrc", ".nuxtignore",
  ]);

  appTree(t, "");
  t.naming(`shared/**/*.${SCRIPT}`, ["camelCase", "kebab-case"]);
  t.naming("shared/*", ["kebab-case"], { dirs: true });
  serverTree(t, ["api", "routes", "middleware", "plugins", "utils"]);

  return t.rules;
}

/** Nuxt 4 — Vue source under app/. */
export function nuxt4() {
  const t = taste("nuxt4");

  t.must(["nuxt.config.{js,ts,mjs}"]);
  t.must(["app"]);
  t.allow(["public", "server", "shared", "content", "modules", "layers", "app", "helpers"]);

  t.dir("app", [
    "assets", "components", "composables", "layouts", "middleware", "pages", "plugins", "utils", "types",
    "app.config.ts", "app.vue", "error.vue", "router.options.ts",
    "constants", "styles", "i18n",
  ], { strict: true });
  appTree(t, "app/");
  t.naming(`app/types/**/*.{d.ts,ts,js,mjs}`, ["kebab-case"]);

  serverTree(t, [
    "api", "middleware", "plugins", "utils", "types", "public", "assets", "tasks", "routes",
    "tsconfig.json", "mcp", "db", "database", "services",
  ]);
  t.move("server/emails", "server/assets/emails", {
    reason: { en: "@vue-email/nuxt reads emails from server/assets/emails", zh: "@vue-email/nuxt 从 server/assets/emails 读取邮件模板" },
  });
  t.naming(`server/types/**/*.${SCRIPT}`, ["kebab-case"]);
  t.naming(`server/mcp/**/*.${SCRIPT}`, ["kebab-case"]);
  t.naming("server/mcp/*", ["kebab-case"], { dirs: true });

  return t.rules;
}
