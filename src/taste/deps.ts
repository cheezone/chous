/**
 * Dependency rules read the package registry, src/facts/packages/: what is
 * listed there, and why, is decided there.
 */
import type { MessageKey } from "../i18n";
import type { PackageFact } from "../facts/define";
import { PACKAGES } from "../facts";

/** Why it is listed lives with the entry in src/facts/packages/, as `dep.<first name>`. */
export type ObsoleteDep = {
  names: string[];
  /** What to use instead. */
  use: string;
};

const of = (kind: PackageFact["kind"]): ObsoleteDep[] => PACKAGES.filter((p) => p.kind === kind).map(({ names, use }) => ({ names: [...names], use }));

/** Deprecated, or called legacy, by its own authors. */
export const DEPRECATED = of("deprecated");

export function depReason(dep: ObsoleteDep): MessageKey {
  return `dep.${dep.names[0]}` as MessageKey;
}
