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
const plain = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|\s+/g, " ");
const electron = plain(await raw("https://releases.electronjs.org/schedule"));
const django = plain(await raw("https://www.djangoproject.com/download/"));
const angular = await raw("https://raw.githubusercontent.com/angular/angular/main/adev/src/content/reference/releases.md");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Oct 20, 2026" or "October 20, 2026" → 2026-10-20 */
const isoDate = (m: string, d: string, y: string) => `${y}-${String(MONTHS.indexOf(m.slice(0, 3)) + 1).padStart(2, "0")}-${d.padStart(2, "0")}`;
const official: Record<string, (version: string) => string | undefined> = {
  node: (v) => node[`v${v}`]?.end,
  python: (v) => python[v]?.end_of_life,
  vue: (v) => (v === "2" && vue.includes("Vue 2 has reached End of Life on December 31st, 2023") ? "2023-12-31" : undefined),
  eslint: (v) => new RegExp(`^\\| v${v}\\.0\\.0-v${v}\\.[\\d.]+ +\\| EOL +\\|[^|]*\\|[^|]*\\| (\\d{4}-\\d{2}-\\d{2}) `, "m").exec(eslint)?.[1],
  electron: (v) => {
    // Release, Alpha, Beta, Stable, End of Life: the fourth date after "<v>.0.0"; dates marked † are tentative.
    const m = new RegExp(`\\b${v}\\.0\\.0 ((?:(?:[A-Z][a-z]{2} \\d{1,2}, \\d{4})(?: †)? |— ){3})([A-Z][a-z]{2}) (\\d{1,2}), (\\d{4})( †)?`).exec(electron);
    return m && !m[5] ? isoDate(m[2]!, m[3]!, m[4]!) : undefined;
  },
  django: (v) => {
    const m = new RegExp(`\\b${v.replace(".", "\\.")} (?:LTS (?:\\d )?)?${v.replace(".", "\\.")}\\.\\d+ [A-Z][a-z]+ \\d{1,2}, \\d{4} ([A-Z][a-z]+) (\\d{1,2}), (\\d{4})`).exec(django);
    return m ? isoDate(m[1]!, m[2]!, m[3]!) : undefined;
  },
  angular: (v) => {
    const m = /Angular versions v(\d+) to v(\d+) are no longer supported\./.exec(angular);
    return m && Number(v) >= Number(m[1]) && Number(v) <= Number(m[2]) ? "" : undefined;
  },
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
