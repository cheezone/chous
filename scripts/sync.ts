/**
 * Writes each tool's end-of-life lines, read from its makers' own data, into
 * src/facts/data/eol/. Only lines that have already ended are written, and
 * lines are only ever added: one already recorded that the data now dates
 * differently is reported for a person to look at, never rewritten.
 *
 *   pnpm run sync           write what is new
 *   pnpm run sync --check   write nothing; fail when there is news (CI)
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { FACT_EOL } from "../src/facts";
import type { EolLine } from "../src/facts/define";

const check = process.argv.includes("--check");
const today = new Date().toISOString().slice(0, 10);
const order = (a: EolLine, b: EolLine) => {
  const [x, y] = [a.version.split(".").map(Number), b.version.split(".").map(Number)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};

let news = 0;
let wrong = 0;
for (const e of FACT_EOL) {
  const res = await fetch(e.data).catch((error: unknown) => ({ ok: false, status: String(error) }) as const);
  if (!res.ok) {
    wrong++;
    console.log(`✗ eol.${e.product}: ${e.data} → ${res.status}`);
    continue;
  }
  const published = e.parse(await res.text());
  if (!published.length) {
    wrong++;
    console.log(`✗ eol.${e.product}: nothing read from ${e.data}; the page changed shape`);
    continue;
  }
  const recorded = new Map(e.versions.map((l) => [l.version, l.date]));
  const lines: EolLine[] = [...e.versions];
  for (const line of published) {
    if (line.date !== "" && line.date > today) continue; // not ended yet
    const mine = recorded.get(line.version);
    const index = lines.findIndex((l) => l.version === line.version);
    if (mine === undefined) {
      news++;
      lines.push(line);
      console.log(`+ eol.${e.product} ${line.version} ${line.date || "(no longer supported, no date)"}`);
    } else if (mine !== line.date) {
      wrong++;
      console.log(`✗ eol.${e.product} ${line.version}: recorded ${mine}, the data now says ${line.date}`);
    } else if (line.name && lines[index]!.name !== line.name) {
      // A codename added to a line already recorded: more of the makers' data, not a change to it.
      if (lines[index]!.name) {
        wrong++;
        console.log(`✗ eol.${e.product} ${line.version}: recorded codename ${lines[index]!.name}, the data now says ${line.name}`);
      } else {
        news++;
        lines[index] = { ...lines[index]!, name: line.name };
        console.log(`+ eol.${e.product} ${line.version} codename ${line.name}`);
      }
    }
  }
  for (const line of e.versions) {
    if (!published.some((p) => p.version === line.version)) console.log(`? eol.${e.product} ${line.version}: gone from the data; kept, since it ended`);
  }
  if (!check && news) {
    const body = lines.sort(order).map((l) => `  { version: "${l.version}", date: "${l.date}"${l.name ? `, name: "${l.name}"` : ""} },`).join("\n");
    writeFileSync(
      resolve(import.meta.dirname, `../src/facts/data/eol/${e.product}.ts`),
      `// Written by \`pnpm run sync\` from ${e.data} — do not edit.\nexport default [\n${body}\n] as const;\n`,
    );
  }
  console.log(`✓ eol.${e.product}: ${lines.length} ended`);
}

if (wrong || (check && news)) {
  console.log(wrong ? `\n${wrong} problem(s): look at the data before changing anything.` : `\n${news} new end-of-life line(s): run pnpm run sync.`);
  process.exit(1);
}
