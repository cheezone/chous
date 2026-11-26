/**
 * Looking up end-of-life dates. The schedules live with their tools in
 * src/facts/ (`eol`), written from the makers' own data by `pnpm run sync`.
 *
 * Exact versions only: a version missing from a schedule is not reported, and
 * no date is ever inferred. Past end of life is a smell the day it happens: no
 * grace period. It may still run; it is still rotten.
 */
import { FACT_SCHEDULES, type FactProduct } from "../facts";
import type { EolLine } from "../facts/define";

export type Product = FactProduct;

/** `date` is empty when the makers say "no longer supported" without a date (Angular v2-v19): chous says just that. */
export type Eol = EolLine;

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
