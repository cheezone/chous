import type { Fact, Text } from "./types";
import { type Counts, shadowed, sibling } from "../kit";
import { build, type Common, named } from "./shared";

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
  return build(
    spec,
    "order",
    named(order.map(([name]) => name), spec.dir),
    (f) => {
      const found = shadowed(f, order);
      return found && spec.dir ? { used: `${spec.dir}/${found.used}` } : found;
    },
    spec.message ?? {
      en: `never read: ${spec.tool} takes one config per directory, here {{used}}`,
      zh: `永远不会被读：${spec.tool} 每个目录只用一份配置，这里是 {{used}}`,
    },
  );
}

/**
 * Configs a tool allows only one of per directory, stated as a rule rather
 * than an order: reported once, on the first present, naming them all.
 */
export function exclusive<const Id extends string>(spec: Common<Id> & { files: readonly string[]; message: Text }): Fact<Id> {
  return build(
    spec,
    "order",
    named(spec.files),
    (f) => {
      const present = spec.files.filter((n) => f.all.has(sibling(f, n)));
      return present.length > 1 && present[0] === f.name ? { files: present.join(", ") } : undefined;
    },
    spec.message,
  );
}
