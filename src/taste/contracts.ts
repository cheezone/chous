/**
 * Contracts: the checks run over each file of a project. Almost all of them
 * are facts declared by tool files in src/facts/tools/, with the tool's own
 * words. What is left here is chous's own observation about files, which
 * needs no one's word: one fact written twice, disagreeing.
 *
 * A contract never infers. It reads names, sizes, frontmatter and package
 * versions — nothing that needs the code to be understood.
 */
import type { Value } from "../types";
import { FACTS, type FactId } from "../facts";
import { type ContractFile, field, frontmatter, major, parseJsonc, tomlTableKeys } from "../facts/kit";

export type { ContractFile };
export { field, frontmatter, parseJsonc, tomlTableKeys };

export type Contract = {
  id: ContractId;
  value: Value;
  /** The files it looks at, by relative path. */
  match: RegExp;
  /** Params of the finding, or undefined when the file keeps the contract. */
  check(file: ContractFile): Record<string, string | number> | undefined;
  /** Report each group once, not each file in it (`.claude/commands/` can hold hundreds): the group a file belongs to. */
  groupBy?(rel: string): string;
  /** Also look inside fixtures and vendored code: GitHub's limits apply to every file. */
  everywhere?: boolean;
};

export type ContractId = "nodeVersions" | FactId;

/** Node major pinned by a version file, or undefined. */
function nodeMajorIn(file: ContractFile, rel: string): number | undefined {
  const text = file.read(rel);
  if (!text) return undefined;
  if (rel.endsWith(".tool-versions")) return major(/^(?:nodejs|node)\s+(\S+)/m.exec(text)?.[1]);
  return major(text.trim().split(/\r?\n/)[0]);
}

export const CONTRACTS: Contract[] = [
  // Tools declared as facts: src/facts/tools/.
  ...FACTS,
  {
    // Two files pinning Node to different majors: one fact said twice, and the two disagree.
    id: "nodeVersions",
    value: "order",
    match: /^(\.nvmrc|\.node-version|\.tool-versions)$/,
    check: (f) => {
      const files = [".nvmrc", ".node-version", ".tool-versions"].filter((p) => nodeMajorIn(f, p) !== undefined);
      if (files[0] !== f.rel) return undefined; // report once, on the first
      const majors = files.map((p) => `${p}: ${nodeMajorIn(f, p)}`);
      return new Set(files.map((p) => nodeMajorIn(f, p))).size > 1 ? { versions: majors.join(", ") } : undefined;
    },
  },
];
