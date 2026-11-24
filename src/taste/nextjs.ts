import { taste } from "./define";

const SCRIPT = "{ts,js,mjs,cjs}";
const PAGE = "{tsx,ts,jsx,js}";
const ICON = "{ico,jpg,jpeg,png,svg,js,ts,tsx}";
const META = "{xml,txt,json,webmanifest,js,ts}";

const APP_FILES = [
  ...["layout", "page", "loading", "not-found", "error", "global-error", "route", "template", "default", "forbidden", "unauthorized"]
    .map((n) => `${n}.${PAGE}`),
  ...["favicon", "icon", "apple-icon", "opengraph-image", "twitter-image"].map((n) => `${n}.${ICON}`),
  ...["sitemap", "robots", "manifest"].map((n) => `${n}.${META}`),
  "globals.css",
  "readme.{mdx,md}",
];

const COMPONENT_FILE = { suffix: "/(\\.(test|spec|stories))?$/i" };
const COMPONENT_DIR = { dirs: true, prefix: "/^(_)?/" };

/** Next.js App Router. */
export function nextjs() {
  const t = taste("nextjs");

  t.must(["next.config.{js,mjs,ts}"]);
  t.must(["app"]);
  t.allow([
    "app", "pages", "public", "src",
    "components", "lib", "utils", "hooks", "types", "styles",
    `instrumentation.${SCRIPT}`,
    `instrumentation-client.${SCRIPT}`,
    `instrumentation.node.${SCRIPT}`,
    `middleware.${SCRIPT}`,
    `proxy.${SCRIPT}`,
    "mdx-components.{tsx,jsx,js}",
    `polyfills.${SCRIPT}`,
    "next-env.d.ts",
    "readme*.md",
    "license.md",
  ]);

  t.dir("app", APP_FILES, { strict: true, fileType: "files", reason: { en: "Only route files live directly in app/", zh: "app/ 下只直接放路由文件" } });
  t.naming(`app/**/{layout,page,loading,not-found,error,global-error,route,template,default,forbidden,unauthorized}.${PAGE}`, ["kebab-case"]);
  t.naming(`app/**/{favicon,icon,apple-icon,opengraph-image,twitter-image}.${ICON}`, ["kebab-case"]);
  t.naming(`app/**/{sitemap,robots,manifest}.${META}`, ["kebab-case"]);

  for (const dir of ["app/components", "app/_components", "app/_ui", "components"]) {
    t.naming(`${dir}/**/*.{tsx,ts,jsx,js}`, ["kebab-case", "PascalCase"], COMPONENT_FILE);
    t.naming(`${dir}/*`, ["kebab-case", "PascalCase"], COMPONENT_DIR);
  }

  t.naming("app/api/**/*.{ts,js,mjs}", ["kebab-case"], { suffix: "/\\.(get|post|put|delete|patch|head|options|route)$/i" });
  t.naming("app/api/*", ["kebab-case"], { dirs: true });

  for (const dir of ["lib", "utils", "hooks"]) {
    t.naming(`${dir}/**/*.{tsx,ts,jsx,js,mjs}`, ["camelCase", "kebab-case"]);
    t.naming(`${dir}/*`, ["kebab-case"], { dirs: true });
  }
  t.naming("types/**/*.{ts,js,mjs}", ["kebab-case"]);
  t.naming("types/*", ["kebab-case"], { dirs: true });
  t.naming("styles/*", ["kebab-case"], { dirs: true });

  return t.rules;
}
