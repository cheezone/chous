import type { ContractFile } from "../kit";
import type { Examples, Fact, Params, Source, Text, Value } from "./types";

/** What every kind asks for: an id, the tool's words, and examples both ways. */
export type Common<Id extends string> = {
  id: Id;
  sources: Source[];
  examples: Examples;
  value?: Value;
  groupBy?(rel: string): string;
  /** Also look inside fixtures and vendored code (a platform limit applies to every file). */
  everywhere?: boolean;
};

/** Which files a fact looks at: by name, anywhere or only in `dir`, or only at the project root. */
export type Where = { files: readonly string[]; dir?: string; root?: boolean };
/** Or by a pattern over the relative path, when names vary (`compose.override.yaml`). */
export type Target = Where | { match: RegExp };

export const target = (spec: Target): RegExp => ("match" in spec ? spec.match : named(spec.files, spec.dir, spec.root));

export const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Files with one of these names, anywhere, inside `dir` (e.g. `.cargo`), or at the root only. */
export function named(names: readonly string[], dir?: string, root = false): RegExp {
  return new RegExp(`${root ? "^" : "(^|/)"}${dir ? `${escape(dir)}/` : ""}(${names.map(escape).join("|")})$`);
}

export function build<Id extends string>(
  spec: Common<Id>,
  value: Value,
  match: RegExp,
  check: (file: ContractFile) => Params | undefined,
  message: Text,
): Fact<Id> {
  return {
    id: spec.id,
    value: spec.value ?? value,
    match,
    check,
    groupBy: spec.groupBy,
    everywhere: spec.everywhere,
    message,
    sources: spec.sources,
    examples: spec.examples,
  };
}

export type { Text };
