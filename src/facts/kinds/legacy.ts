import type { ContractFile } from "../kit";
import type { Fact, Params, Text } from "./types";
import { build, type Common, target, type Target } from "./shared";

type FileSpec<Id extends string> = Common<Id> &
  Target & {
    /** Narrows the fact to what the tool's words cover: a version from which it applies, or what the file holds. */
    when?(file: ContractFile): Params | undefined;
    message: Text;
  };

/** A file the tool itself calls deprecated, obsolete or legacy. */
export function legacy<const Id extends string>(spec: FileSpec<Id>): Fact<Id> {
  return build(spec, "modernity", target(spec), spec.when ?? (() => ({})), spec.message);
}

/** A file, or part of one, the tool says it does not read: present, and doing nothing. */
export function unread<const Id extends string>(spec: FileSpec<Id>): Fact<Id> {
  return build(spec, "convention", target(spec), spec.when ?? (() => ({})), spec.message);
}

/**
 * A file outside the one place the tool reads it from. `allowed` lists those
 * places; without it, every match is misplaced (the pattern excludes the place).
 */
export function misplaced<const Id extends string>(spec: FileSpec<Id> & { allowed?: readonly string[] }): Fact<Id> {
  return build(
    spec,
    "convention",
    target(spec),
    (f) => (spec.allowed?.includes(f.rel) ? undefined : (spec.when ?? (() => ({})))(f)),
    spec.message,
  );
}

/**
 * Anything the other kinds cannot say. Every use is a kind not yet named:
 * when two tools need the same check, it becomes a kind.
 */
export function custom<const Id extends string>(
  spec: Common<Id> & Target & { value: NonNullable<Common<Id>["value"]>; check(file: ContractFile): Params | undefined; message: Text },
): Fact<Id> {
  return build(spec, spec.value, target(spec), spec.check, spec.message);
}
