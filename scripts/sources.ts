/**
 * Checks that every quote in src/taste/sources.ts is still on its page.
 * Run it when a source might have moved: `pnpm run sources`.
 */
import { SOURCES } from "../src/taste/sources";
import { EOL } from "../src/taste/eol";

/** Text of a page; tags are stripped only from HTML — Markdown keeps a literal `<name>`. */
const normalize = (text: string) => {
  const html = /^\s*(<!doctype|<html)/i.test(text);
  const plain = html ? text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ") : text;
  return plain
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ");
};

const pages = new Map<string, Promise<string>>();
const fetchText = (url: string) => {
  if (!pages.has(url)) pages.set(url, fetch(url).then((r) => (r.ok ? r.text().then(normalize) : `HTTP ${r.status}`), (e) => `ERROR ${e}`));
  return pages.get(url)!;
};

let failed = 0;
for (const [key, sources] of Object.entries(SOURCES)) {
  for (const source of sources ?? []) {
    if (!source.quote) continue; // checked below, date by date
    const text = await fetchText(source.check ?? source.url);
    const ok = text.includes(normalize(source.quote));
    if (!ok) failed++;
    const why = /^(HTTP \d+|ERROR)/.test(text) ? ` (${text.slice(0, 60)})` : "";
    console.log(`${ok ? "✓" : "✗"} ${key}  ${source.url}${ok ? "" : `\n    missing: "${source.quote}"${why}`}`);
  }
}
// Every end-of-life date, against the project's own data.
const json = async (url: string) => (await fetch(url)).json() as Promise<Record<string, any>>;
const node = await json("https://raw.githubusercontent.com/nodejs/Release/main/schedule.json");
const python = await json("https://peps.python.org/api/release-cycle.json");
// Raw text: the patterns below match the markup itself.
const raw = async (url: string) => (await fetch(url)).text();
const vue = await raw("https://raw.githubusercontent.com/vuejs/v2.vuejs.org/master/src/eol/index.md");
const nuxt = await raw("https://raw.githubusercontent.com/nuxt/nuxt/main/docs/5.community/6.roadmap.md");
const eslint = await raw("https://raw.githubusercontent.com/eslint/eslint.org/main/src/content/pages/version-support.md");
const official: Record<string, (version: string) => string | undefined> = {
  node: (v) => node[`v${v}`]?.end,
  python: (v) => python[v]?.end_of_life,
  vue: (v) => (v === "2" && vue.includes("Vue 2 has reached End of Life on December 31st, 2023") ? "2023-12-31" : undefined),
  eslint: (v) => new RegExp(`^\\| v${v}\\.0\\.0-v${v}\\.[\\d.]+ +\\| EOL +\\|[^|]*\\|[^|]*\\| (\\d{4}-\\d{2}-\\d{2}) `, "m").exec(eslint)?.[1],
  nuxt: (v) => new RegExp(`\\*\\*${v}\\.x\\*\\* \\(\\w+\\) \\|[^|]*\\|[^|]*\\| (\\d{4}-\\d{2}-\\d{2}) `).exec(nuxt)?.[1],
};
for (const [product, { versions }] of Object.entries(EOL)) {
  for (const { version, date } of versions) {
    const theirs = official[product]!(version);
    const ok = theirs === date;
    if (!ok) failed++;
    console.log(`${ok ? "✓" : "✗"} eol.${product} ${version} ${date}${ok ? "" : `  official: ${theirs}`}`);
  }
}

if (failed) {
  console.log(`\n${failed} quote(s) not found: the page moved or changed its words.`);
  process.exit(1);
}
