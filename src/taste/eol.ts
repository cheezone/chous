/**
 * End-of-life dates, as published by each project — and only dates that have
 * already passed. A planned date can move (Node 16 ended five months early);
 * a passed one cannot. Entries are only ever added, never edited.
 *
 * Past end of life is a smell the day it happens: no grace period. It may
 * still run; it is still rotten.
 */

import { FACT_SCHEDULES, type FactProduct } from "../facts";

export type Product = FactProduct;

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
export const EOL: Record<Product, { label: string; source: string; versions: readonly Eol[] }> = FACT_SCHEDULES;

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
