import { tomlTableKeys } from "../kit";
import type { Fact, Params, Text } from "./types";
import { build, type Common, escape, named } from "./shared";

/**
 * Keys a tool deprecated in a table of its TOML manifest. Dotted keys count
 * (`authors.workspace = true` still sets authors). With several keys, the
 * ones found are the `fields` param.
 */
export function deprecatedKeys<const Id extends string>(
  spec: Common<Id> & {
    file: string;
    table: string;
    keys: readonly string[];
    /** Sub-tables that hold the same deprecated thing, e.g. `[tool.poetry.urls]`. */
    tables?: boolean;
    message: Text;
  },
): Fact<Id> {
  return build(
    spec,
    "modernity",
    named([spec.file]),
    (f): Params | undefined => {
      const text = f.text();
      const keys = tomlTableKeys(text, spec.table).filter((k) => spec.keys.includes(k));
      const tables = spec.tables ? spec.keys.filter((k) => new RegExp(`^\\[${escape(`${spec.table}.${k}`)}\\]`, "m").test(text)) : [];
      const found = [...new Set([...keys, ...tables])];
      if (!found.length) return undefined;
      return spec.keys.length > 1 ? { fields: found.join(", ") } : {};
    },
    spec.message,
  );
}
