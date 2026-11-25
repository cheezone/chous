/**
 * Checks that every quote in src/taste/sources.ts is still on its page.
 * Run it when a source might have moved: `pnpm run sources`.
 */
import { SOURCES } from "../src/taste/sources";

const normalize = (text: string) =>
  text
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ");

const pages = new Map<string, Promise<string>>();
const fetchText = (url: string) => {
  if (!pages.has(url)) pages.set(url, fetch(url).then((r) => (r.ok ? r.text() : `HTTP ${r.status}`)).then(normalize, (e) => `ERROR ${e}`));
  return pages.get(url)!;
};

let failed = 0;
for (const [key, sources] of Object.entries(SOURCES)) {
  for (const source of sources ?? []) {
    const text = await fetchText(source.check ?? source.url);
    const ok = text.includes(normalize(source.quote));
    if (!ok) failed++;
    console.log(`${ok ? "✓" : "✗"} ${key}  ${source.url}${ok ? "" : `\n    missing: "${source.quote}"`}`);
  }
}
if (failed) {
  console.log(`\n${failed} quote(s) not found: the page moved or changed its words.`);
  process.exit(1);
}
