/**
 * End-of-life dates, as published by each project — and only dates that have
 * already passed. A planned date can move (Node 16 ended five months early);
 * a passed one cannot. Entries are only ever added, never edited.
 *
 * Past end of life is a smell the day it happens: no grace period. It may
 * still run; it is still rotten.
 */

export type Product = "node" | "python" | "vue" | "nuxt" | "eslint" | "electron" | "django" | "angular";

export type Eol = {
  /** Version as it appears in a version file, e.g. `18`, `3.8`, `2.7`. */
  version: string;
  /**
   * YYYY-MM-DD, already passed when added. Empty when the project says the
   * version is no longer supported without publishing a date (Angular v2-v19):
   * chous then says exactly that, and no date.
   */
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
  eslint: {
    label: "ESLint",
    source: "https://eslint.org/version-support/",
    versions: [
      { version: "1", date: "2016-08-12" },
      { version: "2", date: "2017-01-01" },
      { version: "3", date: "2017-12-11" },
      { version: "4", date: "2018-12-22" },
      { version: "5", date: "2019-12-21" },
      { version: "6", date: "2020-11-08" },
      { version: "7", date: "2022-04-09" },
      { version: "8", date: "2024-10-05" },
      { version: "9", date: "2026-08-06" },
    ],
  },
  electron: {
    label: "Electron",
    source: "https://releases.electronjs.org/schedule",
    versions: [
      { version: "2", date: "2019-04-23" },
      { version: "3", date: "2019-07-30" },
      { version: "4", date: "2019-10-21" },
      { version: "5", date: "2020-02-03" },
      { version: "6", date: "2020-05-18" },
      { version: "7", date: "2020-08-25" },
      { version: "8", date: "2020-11-18" },
      { version: "9", date: "2021-03-03" },
      { version: "10", date: "2021-05-24" },
      { version: "11", date: "2021-08-31" },
      { version: "12", date: "2021-11-15" },
      { version: "13", date: "2022-02-01" },
      { version: "14", date: "2022-03-29" },
      { version: "15", date: "2022-05-24" },
      { version: "16", date: "2022-05-24" },
      { version: "17", date: "2022-08-01" },
      { version: "18", date: "2022-09-27" },
      { version: "19", date: "2022-11-30" },
      { version: "20", date: "2023-02-08" },
      { version: "21", date: "2023-04-04" },
      { version: "22", date: "2023-10-09" },
      { version: "23", date: "2023-08-16" },
      { version: "24", date: "2023-10-11" },
      { version: "25", date: "2023-12-05" },
      { version: "26", date: "2024-02-19" },
      { version: "27", date: "2024-04-16" },
      { version: "28", date: "2024-06-10" },
      { version: "29", date: "2024-08-19" },
      { version: "30", date: "2024-10-14" },
      { version: "31", date: "2025-01-14" },
      { version: "32", date: "2025-03-03" },
      { version: "33", date: "2025-04-28" },
      { version: "34", date: "2025-06-23" },
      { version: "35", date: "2025-09-02" },
      { version: "36", date: "2025-10-27" },
      { version: "37", date: "2026-01-15" },
      { version: "38", date: "2026-03-10" },
      { version: "39", date: "2026-05-05" },
      { version: "40", date: "2026-07-01" },
      { version: "41", date: "2026-08-24" },
      { version: "42", date: "2026-10-20" },
    ],
  },
  django: {
    label: "Django",
    source: "https://www.djangoproject.com/download/#unsupported-versions",
    versions: [
      { version: "1.3", date: "2013-02-26" },
      { version: "1.4", date: "2015-10-01" },
      { version: "1.5", date: "2014-09-02" },
      { version: "1.6", date: "2015-04-01" },
      { version: "1.7", date: "2015-12-01" },
      { version: "1.8", date: "2018-04-01" },
      { version: "1.9", date: "2017-04-04" },
      { version: "1.10", date: "2017-12-02" },
      { version: "1.11", date: "2020-04-01" },
      { version: "2.0", date: "2019-04-01" },
      { version: "2.1", date: "2019-12-02" },
      { version: "2.2", date: "2022-04-11" },
      { version: "3.0", date: "2021-04-06" },
      { version: "3.1", date: "2021-12-07" },
      { version: "3.2", date: "2024-04-01" },
      { version: "4.0", date: "2023-04-01" },
      { version: "4.1", date: "2023-12-01" },
      { version: "4.2", date: "2026-04-07" },
      { version: "5.0", date: "2025-04-02" },
      { version: "5.1", date: "2025-12-03" },
    ],
  },
  angular: {
    label: "Angular",
    source: "https://angular.dev/reference/releases",
    // "Angular versions v2 to v19 are no longer supported." No dates are published.
    versions: [
      { version: "2", date: "" },
      { version: "3", date: "" },
      { version: "4", date: "" },
      { version: "5", date: "" },
      { version: "6", date: "" },
      { version: "7", date: "" },
      { version: "8", date: "" },
      { version: "9", date: "" },
      { version: "10", date: "" },
      { version: "11", date: "" },
      { version: "12", date: "" },
      { version: "13", date: "" },
      { version: "14", date: "" },
      { version: "15", date: "" },
      { version: "16", date: "" },
      { version: "17", date: "" },
      { version: "18", date: "" },
      { version: "19", date: "" },
    ],
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
  return date === "" || Boolean(date && date <= today);
}
