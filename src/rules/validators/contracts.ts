import { statSync } from "node:fs";
import { readText } from "../../fsutil";
import { resolve } from "node:path";
import type { ContractsRule, Rule } from "../../types";
import type { MessageKey } from "../../i18n";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { BaseRuleValidator } from "./base";
import { CONTRACTS, type ContractFile } from "../../taste/contracts";
import { NOT_OURS } from "../../taste/hygiene";

const read = (path: string) => readText(path);

function statSize(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

/** Runs every contract over each file: the facts in src/facts/ and chous's own (taste/contracts.ts). */
export class ContractsRuleValidator extends BaseRuleValidator<ContractsRule> {
  canHandle(rule: Rule): rule is ContractsRule {
    return rule.kind === "contracts";
  }

  protected async validateInternal(rule: ContractsRule, context: RuleValidatorContext) {
    const { snapshot, root } = context;
    const files = [...snapshot.byRel.values()].filter((e) => !e.isDir);
    const all = new Set(files.map((e) => e.relPath));

    const pkgs = new Map<string, Record<string, any> | undefined>();
    const pkgFor = (dir: string): Record<string, any> | undefined => {
      for (let d = dir; ; d = d.includes("/") ? d.slice(0, d.lastIndexOf("/")) : "") {
        if (!pkgs.has(d)) {
          const path = d ? `${d}/package.json` : "package.json";
          let pkg: Record<string, any> | undefined;
          try {
            pkg = all.has(path) ? JSON.parse(read(resolve(root, path))) : undefined;
          } catch {
            pkg = undefined;
          }
          pkgs.set(d, pkg);
        }
        if (pkgs.get(d)) return pkgs.get(d);
        if (!d) return undefined;
      }
    };
    let cssConfig: boolean | undefined;
    const cssLoadsConfig = () =>
      (cssConfig ??= files.some((e) => /\.(css|pcss|postcss)$/.test(e.name) && !NOT_OURS.test(e.relPath) && /@config\b/.test(read(e.absPath))));

    const groups = new Map<string, { contract: (typeof CONTRACTS)[number]; count: number; first: string; params: Record<string, string | number> }>();
    let hitCount = 0;

    for (const entry of files) {
      const rel = entry.relPath;
      const ours = !NOT_OURS.test(rel);
      let text: string | undefined;
      let size: number | undefined;
      const file: ContractFile = {
        rel,
        name: entry.name,
        dir: rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "",
        bytes: () => (size ??= statSize(entry.absPath)),
        text: () => (text ??= read(entry.absPath)),
        all,
        pkg: () => pkgFor(rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : ""),
        cssLoadsConfig,
        read: (other) => (all.has(other) ? read(resolve(root, other)) : ""),
        rootPkg: () => pkgFor(""),
      };
      for (const contract of CONTRACTS) {
        if ((!ours && !contract.everywhere) || !contract.match.test(rel)) continue;
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
          if (group) group.count++;
          else groups.set(key, { contract, count: 1, first: rel, params });
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

    for (const [key, { contract, count, first, params }] of groups) {
      hitCount++;
      // One file names itself; several are named by what they share.
      const where = count === 1 && !contract.aboutGroup ? first : key.slice(contract.id.length + 1);
      context.rawIssues.push(issueFromRule(rule, {
        path: `${resolve(root, where)}#${contract.id}`,
        displayPath: where,
        message: { key: `issue.contract.${contract.id}` as MessageKey, params: { ...params, count } },
        value: contract.value,
      }));
    }
    return { hitCount };
  }
}
