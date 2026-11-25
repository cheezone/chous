import type { Rule, RuleBase } from "../types";
import type { MessageKey } from "../i18n";

type Extra = Pick<RuleBase, "reason" | "severity">;

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
    no(names: string[], extra: Extra & { reason: MessageKey }) {
      push({ kind: "no", names, ...extra });
    },

    /** At most one of these root-level names may exist. */
    oneOf(names: string[]) {
      push({ kind: "exclusive", names });
    },

    /** In these roles, a second tool is a bug. */
    oneToolPer(roles: string[]) {
      push({ kind: "stack", roles });
    },

    /** A package.json field must equal `value`. */
    field(field: string, value: string | boolean, extra?: Extra) {
      push({ kind: "manifest", field, equals: value, ...extra });
    },

    /** A package.json field must be present, whatever its value. */
    requireField(field: string, why: MessageKey, extra?: Pick<RuleBase, "severity">) {
      push({ kind: "manifest", field, present: true, reason: why, ...extra });
    },

    /** A package.json field must not exist. */
    noField(field: string, why: MessageKey) {
      push({ kind: "manifest", field, absent: true, reason: why });
    },

    /** Cross-package checks for a monorepo root. */
    workspace() {
      push({ kind: "workspace" });
    },

    /** Rotten deps (an error), or with `native` redundant ones the platform now ships (a warning). */
    obsolete(names: string[], use: string, why: MessageKey, opts?: { native?: boolean }) {
      push({ kind: "deps", mode: "no", names, use, reason: why, ...opts });
    },

    /** Runtimes and frameworks past their published end of life. */
    lifecycle() {
      push({ kind: "lifecycle" });
    },

    /** Build output that is not gitignored. */
    artifacts() {
      push({ kind: "artifacts" });
    },

    /** Agent work logs left at the root. */
    worklogs() {
      push({ kind: "worklog" });
    },

    /** Two paths that differ only in case. */
    caseCollisions() {
      push({ kind: "case" });
    },
  };
}

export type TasteBuilder = ReturnType<typeof taste>;
