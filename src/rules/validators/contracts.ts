import { readText } from "../../fsutil";
import { resolve } from "node:path";
import type { ContractsRule, Rule } from "../../types";
import type { MessageKey } from "../../i18n";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { BaseRuleValidator } from "./base";
import { CONTRACTS, type ContractFile } from "../../taste/contracts";

const read = (path: string) => readText(path);

/** Runs every contract over each file: the facts in src/facts/. */
export class ContractsRuleValidator extends BaseRuleValidator<ContractsRule> {
  canHandle(rule: Rule): rule is ContractsRule {
    return rule.kind === "contracts";
  }

  protected async validateInternal(rule: ContractsRule, context: RuleValidatorContext) {
    const { snapshot, root } = context;
    const files = [...snapshot.byRel.values()].filter((e) => !e.isDir);
    const all = new Set(files.map((e) => e.relPath));

    const groups = new Map<string, { contract: (typeof CONTRACTS)[number]; count: number; first: string; params: Record<string, string | number>; files: string[] }>();
    let hitCount = 0;

    for (const entry of files) {
      const rel = entry.relPath;
      const ours = !context.snapshot.notOurs.test(rel);
      let text: string | undefined;
      const file: ContractFile = {
        rel,
        name: entry.name,
        dir: rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "",
        text: () => (text ??= read(entry.absPath)),
        all,
        ours: (other) => !context.snapshot.notOurs.test(other),
        read: (other) => (all.has(other) ? read(resolve(root, other)) : ""),
      };
      for (const contract of CONTRACTS) {
        if (!ours || !contract.match.test(rel)) continue;
        let params: ReturnType<typeof contract.check>;
        try {
          params = contract.check(file);
        } catch {
          continue; // a file no fact can read (a malformed manifest) says nothing about the others
        }
        if (!params) continue;
        if (contract.groupBy) {
          const key = `${contract.id}:${contract.groupBy(rel, file)}`;
          const group = groups.get(key);
          if (group) {
            group.count++;
            group.files.push(rel);
          } else groups.set(key, { contract, count: 1, first: rel, params, files: [rel] });
          continue;
        }
        hitCount++;
        context.rawIssues.push(issueFromRule(rule, {
          path: `${entry.absPath}#${contract.id}`,
          displayPath: rel,
          message: { key: `issue.contract.${contract.id}` as MessageKey, params },
          value: contract.value,
        }));
      }
    }

    for (const [key, { contract, count, first, params, files: grouped }] of groups) {
      hitCount++;
      // One file names itself; several are named by what they share.
      const where = count === 1 && !contract.aboutGroup ? first : key.slice(contract.id.length + 1);
      context.rawIssues.push(issueFromRule(rule, {
        path: `${resolve(root, where)}#${contract.id}`,
        displayPath: where,
        message: { key: `issue.contract.${contract.id}` as MessageKey, params: { ...params, count } },
        value: contract.value,
        // The snapshot is walked concurrently: sorted, the same repository lists the same files in the same order.
        ...(count > 1 ? { details: { files: grouped.sort() } } : {}),
      }));
    }
    return { hitCount };
  }
}
