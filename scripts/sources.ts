/**
 * Checks that every quote in src/taste/sources.ts is still on its page.
 * Run it when a source might have moved: `pnpm run sources`.
 */
import { SOURCES } from "../src/taste/sources";
import { FACT_EOL } from "../src/facts";

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
// Every end-of-life date, against the makers' own data, read by each schedule's own parser.
for (const e of FACT_EOL) {
  const published = new Map(e.parse(await (await fetch(e.data)).text()).map((l) => [l.version, l.date]));
  for (const { version, date } of e.versions) {
    const theirs = published.get(version);
    const ok = theirs === date;
    if (!ok) failed++;
    console.log(`${ok ? "✓" : "✗"} eol.${e.product} ${version} ${date}${ok ? "" : `  official: ${theirs}`}`);
  }
}

if (failed) {
  console.log(`\n${failed} quote(s) not found: the page moved or changed its words.`);
  process.exit(1);
}
