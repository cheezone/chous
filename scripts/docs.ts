/**
 * Writes docs/facts.md and docs/facts.zh.md from the registry.
 *
 *   pnpm run docs           write them
 *   pnpm run docs --check   write nothing; fail when they are stale
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { catalog } from "./catalog";

const check = process.argv.includes("--check");
let stale = 0;
for (const [lang, file] of [["en", "facts.md"], ["zh", "facts.zh.md"]] as const) {
  const path = resolve(import.meta.dirname, "../docs", file);
  const want = catalog(lang);
  let have = "";
  try {
    have = readFileSync(path, "utf8").replace(/\r\n/g, "\n"); // CRLF from a Windows checkout is not staleness
  } catch {
    // not written yet
  }
  if (have === want) continue;
  stale++;
  if (check) console.log(`✗ docs/${file} is stale: run pnpm run docs`);
  else {
    writeFileSync(path, want);
    console.log(`✓ wrote docs/${file}`);
  }
}
if (check && stale) process.exit(1);
