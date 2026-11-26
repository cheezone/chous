import type { ContractFile } from "../kit";
import { field, frontmatter, lines } from "../kit";
import type { Fact, Params, Text } from "./types";
import { build, type Common, target, type Target } from "./shared";

/** How a limit is measured. */
export const measure = {
  bytes: (f: ContractFile) => f.bytes(),
  lines: (f: ContractFile) => lines(f.text()),
  /** Characters of a frontmatter field; 0 when absent. */
  field: (name: string) => (f: ContractFile) => field(frontmatter(f.text()).front, name)?.length ?? 0,
  /** Characters after the frontmatter. */
  body: (f: ContractFile) => frontmatter(f.text()).body.length,
};

/**
 * A size the tool or platform states as a number: past it, the file is cut,
 * refused or ignored. Only numbers from official docs; chous has none of its own.
 */
export function limit<const Id extends string>(
  spec: Common<Id> &
    Target & {
      measure(file: ContractFile): number;
      /** The stated limit, in the unit `measure` returns. */
      max: number;
      /** "Must be under": reported at the limit itself, not only past it. */
      inclusive?: boolean;
      /** The finding's params, from the measured size. */
      params(size: number): Params;
      message: Text;
    },
): Fact<Id> {
  return build(
    spec,
    "convention",
    target(spec),
    (f) => {
      const size = spec.measure(f);
      return size > spec.max || (spec.inclusive && size === spec.max) ? spec.params(size) : undefined;
    },
    spec.message,
  );
}
