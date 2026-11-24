/**
 * End-of-life dates, as published by each project — and only dates that have
 * already passed. A planned date can move (Node 16 ended five months early);
 * a passed one cannot. Entries are only ever added, never edited.
 *
 * Expired: past end of life, no more security fixes → warning.
 * Rotten: more than ROT_AFTER_YEARS past end of life → error.
 */
import type { Text } from "../i18n/text";

export const ROT_AFTER_YEARS = 2;

export type Product = "node" | "python" | "vue" | "nuxt";

export type Eol = {
  /** Version as it appears in a version file, e.g. `18`, `3.8`, `2.7`. */
  version: string;
  /** YYYY-MM-DD, already passed when added. */
  date: string;
};

/** Every version older than the oldest entry ended no later than that entry. */
export const EOL: Record<Product, { label: string; use: Text; source: string; versions: Eol[] }> = {
  node: {
    label: "Node",
    use: { en: "a supported LTS release", zh: "仍在维护的 LTS 版本" },
    source: "https://github.com/nodejs/Release",
    versions: [
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
    use: { en: "a supported Python 3 release", zh: "仍在维护的 Python 3 版本" },
    source: "https://devguide.python.org/versions/",
    versions: [
      { version: "2.7", date: "2020-01-01" },
      { version: "3.7", date: "2023-06-27" },
      { version: "3.8", date: "2024-10-07" },
      { version: "3.9", date: "2025-10-31" },
    ],
  },
  vue: {
    label: "Vue",
    use: { en: "Vue 3", zh: "Vue 3" },
    source: "https://v2.vuejs.org/eol/",
    versions: [{ version: "2", date: "2023-12-31" }],
  },
  nuxt: {
    label: "Nuxt",
    use: { en: "Nuxt 4", zh: "Nuxt 4" },
    source: "https://nuxt.com/docs/3.x/migration/overview",
    versions: [
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

/**
 * End-of-life date for a version, or undefined while it is supported (or unknown).
 * Versions older than every listed one take the oldest listed date as an upper bound.
 */
export function eolDate(product: Product, version: string): string | undefined {
  const { versions } = EOL[product];
  const depth = parts(versions[0]!.version).length;
  const wanted = parts(version).slice(0, depth);
  if (wanted.length < depth || wanted.some(Number.isNaN)) return undefined;

  const exact = versions.find((v) => compare(parts(v.version), wanted) === 0);
  if (exact) return exact.date;

  // Older than everything listed in its own line (same major for Python, any for the rest).
  const sameLine = versions.filter((v) => depth === 1 || parts(v.version)[0] === wanted[0]);
  const oldest = sameLine.reduce<Eol | undefined>(
    (min, v) => (!min || compare(parts(v.version), parts(min.version)) < 0 ? v : min),
    undefined,
  );
  if (oldest && compare(wanted, parts(oldest.version)) < 0) return oldest.date;
  return undefined;
}

export type LifecycleStatus = "supported" | "expired" | "rotten";

export function lifecycleStatus(date: string | undefined, today: string): LifecycleStatus {
  if (!date || date > today) return "supported";
  const [y, m, d] = date.split("-");
  const rotAt = `${Number(y) + ROT_AFTER_YEARS}-${m}-${d}`;
  return rotAt <= today ? "rotten" : "expired";
}
