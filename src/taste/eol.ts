/**
 * End-of-life dates, as published by each project — and only dates that have
 * already passed. A planned date can move (Node 16 ended five months early);
 * a passed one cannot. Entries are only ever added, never edited.
 *
 * Past end of life is a smell the day it happens: no grace period. It may
 * still run; it is still rotten.
 */

export type Product = "node" | "python" | "vue" | "nuxt";

export type Eol = {
  /** Version as it appears in a version file, e.g. `18`, `3.8`, `2.7`. */
  version: string;
  /** YYYY-MM-DD, already passed when added. */
  date: string;
};

/**
 * Exact versions only: a version missing from the table is not reported, and
 * no date is ever inferred. `pnpm run sources` checks every date against the
 * source named here.
 */
export const EOL: Record<Product, { label: string; source: string; versions: Eol[] }> = {
  node: {
    label: "Node",
    source: "https://github.com/nodejs/Release/blob/main/schedule.json",
    versions: [
      { version: "4", date: "2018-04-30" },
      { version: "5", date: "2016-06-30" },
      { version: "6", date: "2019-04-30" },
      { version: "7", date: "2017-06-30" },
      { version: "8", date: "2019-12-31" },
      { version: "9", date: "2018-06-30" },
      { version: "10", date: "2021-04-30" },
      { version: "11", date: "2019-06-01" },
      { version: "12", date: "2022-04-30" },
      { version: "13", date: "2020-06-01" },
      { version: "14", date: "2023-04-30" },
      { version: "15", date: "2021-06-01" },
      { version: "16", date: "2023-09-11" },
      { version: "17", date: "2022-06-01" },
      { version: "18", date: "2025-04-30" },
      { version: "19", date: "2023-06-01" },
      { version: "20", date: "2026-04-30" },
      { version: "21", date: "2024-06-01" },
      { version: "23", date: "2025-06-01" },
      { version: "25", date: "2026-06-01" },
    ],
  },
  python: {
    label: "Python",
    source: "https://peps.python.org/api/release-cycle.json",
    versions: [
      { version: "2.6", date: "2013-10-29" },
      { version: "2.7", date: "2020-01-01" },
      { version: "3.0", date: "2009-06-27" },
      { version: "3.1", date: "2012-04-09" },
      { version: "3.2", date: "2016-02-20" },
      { version: "3.3", date: "2017-09-29" },
      { version: "3.4", date: "2019-03-18" },
      { version: "3.5", date: "2020-09-30" },
      { version: "3.6", date: "2021-12-23" },
      { version: "3.7", date: "2023-06-27" },
      { version: "3.8", date: "2024-10-07" },
      { version: "3.9", date: "2025-10-31" },
      { version: "3.10", date: "2026-10-01" },
    ],
  },
  vue: {
    label: "Vue",
    source: "https://v2.vuejs.org/eol/",
    versions: [{ version: "2", date: "2023-12-31" }],
  },
  nuxt: {
    label: "Nuxt",
    source: "https://nuxt.com/docs/community/roadmap",
    versions: [
      { version: "1", date: "2019-09-21" },
      { version: "2", date: "2024-06-30" },
      { version: "3", date: "2026-07-31" },
    ],
  },
};

/** `16.20.0` → `16` for Node, `3.8.18` → `3.8` for Python: the precision the table uses. */
export function lineOf(product: Product, version: string): string {
  const depth = EOL[product].versions[0]!.version.split(".").length;
  return version.split(".").slice(0, depth).join(".");
}

function parts(version: string): number[] {
  return version.split(".").map(Number);
}

function compare(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** End-of-life date for a version listed exactly in the table; undefined otherwise. */
export function eolDate(product: Product, version: string): string | undefined {
  const { versions } = EOL[product];
  const depth = parts(versions[0]!.version).length;
  const wanted = parts(version).slice(0, depth);
  if (wanted.length < depth || wanted.some(Number.isNaN)) return undefined;
  return versions.find((v) => compare(parts(v.version), wanted) === 0)?.date;
}

/** True once the published end-of-life date has come. */
export function hasEnded(date: string | undefined, today: string): boolean {
  return Boolean(date && date <= today);
}
