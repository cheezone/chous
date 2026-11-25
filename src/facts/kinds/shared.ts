import type { Examples, Source, Text, Value } from "./types";

/** What every kind asks for: an id, the tool's words, and examples both ways. */
export type Common<Id extends string> = {
  id: Id;
  sources: Source[];
  examples: Examples;
  value?: Value;
  groupBy?(rel: string): string;
};

export const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Files with one of these names, anywhere, or only inside `dir` (e.g. `.cargo`). */
export function named(names: readonly string[], dir?: string): RegExp {
  return new RegExp(`(^|/)${dir ? `${escape(dir)}/` : ""}(${names.map(escape).join("|")})$`);
}

export type { Text };
