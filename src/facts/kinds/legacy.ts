import type { ContractFile } from "../kit";
import type { Fact, Params, Text } from "./types";
import { type Common, named } from "./shared";

/**
 * A file the tool itself calls deprecated, obsolete or legacy. `when` narrows
 * it to what the tool's words cover: a version from which it applies, or what
 * the file contains.
 */
export function legacy<const Id extends string>(
  spec: Common<Id> & {
    files: readonly string[];
    dir?: string;
    when?(file: ContractFile): Params | undefined;
    message: Text;
  },
): Fact<Id> {
  return {
    id: spec.id,
    value: spec.value ?? "modernity",
    match: named(spec.files, spec.dir),
    check: spec.when ?? (() => ({})),
    groupBy: spec.groupBy,
    message: spec.message,
    sources: spec.sources,
    examples: spec.examples,
  };
}
