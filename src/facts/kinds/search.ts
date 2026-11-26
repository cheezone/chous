import type { Fact, Text } from "./types";
import { build, type Common, named } from "./shared";

/**
 * A file the tool searches for in several places, in order, using the first
 * it finds: every later one is never read. `paths` are relative to the root.
 */
export function searchOrder<const Id extends string>(spec: Common<Id> & { paths: readonly string[]; message: Text }): Fact<Id> {
  const names = [...new Set(spec.paths.map((p) => p.split("/").at(-1)!))];
  return build(
    spec,
    "convention",
    named(names),
    (f) => {
      if (!spec.paths.includes(f.rel)) return undefined;
      const first = spec.paths.find((p) => f.all.has(p));
      return first && first !== f.rel ? { used: first } : undefined;
    },
    spec.message,
  );
}
