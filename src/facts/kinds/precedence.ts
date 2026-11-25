import type { Fact, Text } from "./types";
import { type Counts, shadowed } from "../kit";
import { type Common, named } from "./shared";

/**
 * Several configs of one tool in one directory, and the tool reads only the
 * first present by its documented order. The rest are never read.
 */
export function precedence<const Id extends string>(
  spec: Common<Id> & {
    /** The tool's name, for the message. */
    tool: string;
    /** Its order of precedence. A name may carry a test of the file's text (a pyproject.toml counts only with its section). */
    order: ReadonlyArray<string | readonly [string, Counts]>;
    /** Only inside this directory, e.g. `.cargo`. */
    dir?: string;
    message?: Text;
  },
): Fact<Id> {
  const order = spec.order.map((entry): [string, Counts?] => (typeof entry === "string" ? [entry] : [entry[0], entry[1]]));
  return {
    id: spec.id,
    value: spec.value ?? "order",
    match: named(order.map(([name]) => name), spec.dir),
    check: (f) => {
      const found = shadowed(f, order);
      return found && spec.dir ? { used: `${spec.dir}/${found.used}` } : found;
    },
    groupBy: spec.groupBy,
    message: spec.message ?? {
      en: `never read: ${spec.tool} takes one config per directory, here {{used}}`,
      zh: `永远不会被读：${spec.tool} 每个目录只用一份配置，这里是 {{used}}`,
    },
    sources: spec.sources,
    examples: spec.examples,
  };
}
