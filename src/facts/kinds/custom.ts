import type { ContractFile } from "../kit";
import type { Fact, Params, Text } from "./types";
import { build, type Common, target, type Target } from "./shared";

/**
 * Anything the other kinds cannot say. Every use is a kind not yet named:
 * when two tools need the same check, it becomes a kind.
 */
export function custom<const Id extends string>(
  spec: Common<Id> & Target & { value: NonNullable<Common<Id>["value"]>; check(file: ContractFile): Params | undefined; message: Text },
): Fact<Id> {
  return build(spec, spec.value, target(spec), spec.check, spec.message);
}
