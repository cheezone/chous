import type { Rule, RuleBase, Value } from "../types";
import type { MessageKey } from "../i18n";
import type { Scope } from "../facts/define";
import { absentIn } from "../facts";

type Extra = Pick<RuleBase, "reason" | "verdict" | "value">;

/** A rule without its source — the builder fills that in. */
type RuleInput = Rule extends infer R ? (R extends Rule ? Omit<R, "source"> : never) : never;

/**
 * Rule builder bound to one taste. Every rule records which taste produced it,
 * so reports can say where an opinion comes from.
 */
export function taste(id: string) {
  const rules: Rule[] = [];
  const source = { taste: id };
  const push = (rule: RuleInput) => {
    rules.push({ ...rule, source } as Rule);
  };

  return {
    id,
    rules,

    /** Paths that must not exist. */
    no(names: string[], extra: Extra & { reason: MessageKey; value: Value }) {
      push({ kind: "no", names, ...extra });
    },

    /** Paths the tools of this kind of project say should not be there (src/facts/tools/, `absent`). */
    absent(scope: Scope) {
      for (const a of absentIn(scope)) push({ kind: "no", names: [...a.names], reason: `reason.${a.id}` as MessageKey, value: a.value });
    },

    /** A package.json field must not exist. */
    noField(field: string, why: MessageKey, value: Value = "order") {
      push({ kind: "manifest", field, reason: why, value });
    },

    /** Cross-package checks for a monorepo root. */
    workspace() {
      push({ kind: "workspace", value: "order" });
    },

    /** Direct dependencies their authors deprecated on the npm registry, read from the lockfile. */
    deprecations() {
      push({ kind: "deprecated", value: "modernity" });
    },

    /** Dependencies their authors ended. */
    obsolete(names: string[], use: string, why: MessageKey) {
      push({ kind: "deps", names, use, reason: why, value: "modernity" });
    },

    /** Runtimes and frameworks past their published end of life. */
    lifecycle(opts: { workflows?: boolean } = {}) {
      push({ kind: "lifecycle", value: "modernity", ...(opts.workflows ? { workflows: true } : {}) });
    },

    /** Build output that is not gitignored. */
    artifacts() {
      push({ kind: "artifacts", value: "cleanliness" });
    },

    /** Sizes and counts any repository has: long files, flat directories, copies, a crowded root. */
    measures() {
      push({ kind: "measures", value: "order" });
    },

    /** OS junk, installers, binaries and a crowded root, known by content. */
    leftovers(opts: { rootDocs: boolean }) {
      push({ kind: "leftover", value: "cleanliness", ...opts });
    },

    /** What tools state about the files they read (src/facts/): places, names, sizes, legacy formats. */
    contracts() {
      push({ kind: "contracts", value: "convention" });
    },

    /** One thing twice: names that differ only by case or Unicode form, mixed naming styles, two identical instruction files. */
    twins() {
      push({ kind: "twins", value: "order" });
    },
  };
}
