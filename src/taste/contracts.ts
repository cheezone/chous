/**
 * Contracts: the checks run over each file of a project, declared by tool
 * files in src/facts/tools/, with the tool's own words.
 *
 * A contract never infers. It reads names, sizes, frontmatter and package
 * versions — nothing that needs the code to be understood.
 */
import type { Value } from "../types";
import { FACTS, type FactId } from "../facts";
import type { ContractFile } from "../facts/kit";

export type { ContractFile };

export type Contract = {
  id: ContractId;
  value: Value;
  /** The files it looks at, by relative path. */
  match: RegExp;
  /** Params of the finding, or undefined when the file keeps the contract. */
  check(file: ContractFile): Record<string, string | number> | undefined;
  /** Report each group once, not each file in it (`.claude/commands/` can hold hundreds): the group a file belongs to. */
  groupBy?(rel: string, file: ContractFile): string;
  /** Name the group even when it holds one file: the group is the subject. */
  aboutGroup?: boolean;
};

export type ContractId = FactId;

export const CONTRACTS: Contract[] = [
  // Tools declared as facts: src/facts/tools/.
  ...FACTS,
];
