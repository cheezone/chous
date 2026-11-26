/**
 * Checks that every quote chous cites (tool files and chous's own rules) is
 * still on its page. End-of-life dates are `pnpm run sync --check`'s job.
 */
import { SOURCES } from "../src/taste/sources";

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
if (failed) {
  console.log(`\n${failed} quote(s) not found: the page moved or changed its words.`);
  process.exit(1);
}
