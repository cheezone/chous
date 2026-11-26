import type { ContractFile } from "../kit";
import type { Fact, Params, Text } from "./types";
import { build, type Common, named, type Where } from "./shared";

type FileSpec<Id extends string> = Common<Id> &
  Where & {
    /** Narrows the fact to what the tool's words cover: a version from which it applies, or what the file holds. */
    when?(file: ContractFile): Params | undefined;
    message: Text;
  };

/** A file the tool itself calls deprecated, obsolete or legacy. */
export function legacy<const Id extends string>(spec: FileSpec<Id>): Fact<Id> {
  return build(spec, "modernity", named(spec.files, spec.dir, spec.root), spec.when ?? (() => ({})), spec.message);
}

/** A file, or part of one, the tool says it does not read: present, and doing nothing. */
export function unread<const Id extends string>(spec: FileSpec<Id>): Fact<Id> {
  return build(spec, "convention", named(spec.files, spec.dir, spec.root), spec.when ?? (() => ({})), spec.message);
}

/**
 * Anything the other kinds cannot say. Every use is a kind not yet named:
 * when two tools need the same check, it becomes a kind.
 */
export function custom<const Id extends string>(
  spec: Common<Id> &
    (Where | { match: RegExp }) & { value: NonNullable<Common<Id>["value"]>; check(file: ContractFile): Params | undefined; message: Text },
): Fact<Id> {
  const match = "match" in spec ? spec.match : named(spec.files, spec.dir, spec.root);
  return build(spec, spec.value, match, spec.check, spec.message);
}
