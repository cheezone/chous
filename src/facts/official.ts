/**
 * Readers for the data projects publish about themselves: release schedules,
 * support tables. Only `pnpm run sync` and `pnpm run sources` call them; the
 * CLI itself never goes online.
 */
import type { EolLine } from "./define";

/** Text of an HTML page: scripts, styles and tags dropped, spaces collapsed. */
export const htmlText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|\s+/g, " ");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Oct 20, 2026" or "October 20, 2026", as its parts → 2026-10-20. */
export const isoDate = (month: string, day: string, year: string) =>
  `${year}-${String(MONTHS.indexOf(month.slice(0, 3)) + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;

/** A JSON object of versions, each with its end date under `key`: `{ "v18": { "end": "2025-04-30" } }`. */
export function jsonSchedule(raw: string, key: string, version: (name: string) => string | undefined): EolLine[] {
  const data = JSON.parse(raw) as Record<string, Record<string, unknown>>;
  return Object.entries(data).flatMap(([name, line]) => {
    const v = version(name);
    const date = line?.[key];
    return v && typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? [{ version: v, date }] : [];
  });
}
