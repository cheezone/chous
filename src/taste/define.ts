import type {
  InDirOnlyRule,
  NamingStyle,
  Rule,
  RuleBase,
} from "../types";
import type { Text } from "../i18n/text";

type Extra = Pick<RuleBase, "reason" | "severity">;

/** A rule without its source — the builder fills that in. */
type RuleInput = Rule extends infer R ? (R extends Rule ? Omit<R, "source"> : never) : never;

type NamingOptions = Extra & {
  /** Check directory names (`<dir>/*`) instead of files. */
  dirs?: boolean;
  prefix?: string;
  suffix?: string;
  except?: string[];
  ifContains?: string;
  ifParentStyle?: NamingStyle;
};

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

    /** Root-level names that may exist. */
    allow(names: string[], extra?: Extra) {
      push({ kind: "allow", names, ...extra });
    },

    /** Root-level names that must exist. */
    must(names: string[], extra?: Extra) {
      push({ kind: "has", names, ...extra });
    },

    /** Paths that must not exist. */
    no(names: string[], extra?: Extra) {
      push({ kind: "no", names, ...extra });
    },

    /** Everything matching `pattern` must also match one of `only`. */
    only(pattern: string, only: string[], extra?: Extra) {
      push({ kind: "thoseOnly", pattern, only, ...extra });
    },

    /** Whitelist the direct children of `dir`. */
    dir(
      dir: string,
      only: string[],
      opts?: Extra & { strict?: boolean; fileType?: InDirOnlyRule["fileType"]; dotfiles?: boolean },
    ) {
      const { strict, ...rest } = opts ?? {};
      push({ kind: "inDirOnly", dir, only, mode: strict ? "strict" : "permissive", ...rest });
    },

    /** Names under `pattern` must match any of `styles`. */
    naming(pattern: string, styles: NamingStyle[], opts?: NamingOptions) {
      const { dirs, ...rest } = opts ?? {};
      for (const style of styles) {
        push({
          kind: "naming",
          target: dirs ? "in" : "those",
          pattern,
          style,
          fileType: dirs ? "dirs" : "files",
          ...rest,
        });
      }
    },

    move(from: string, toDir: string, extra?: Extra) {
      push({ kind: "move", from, toDir, ...extra });
    },

    rename(fromNames: string[], toName: string, extra?: Extra) {
      push({ kind: "renameDir", fromNames, toName, ...extra });
    },

    /** In these roles, a second tool is a bug. */
    oneToolPer(roles: string[]) {
      push({ kind: "stack", roles });
    },

    /** A package.json field must equal `value`. */
    field(field: string, value: string | boolean, extra?: Extra) {
      push({ kind: "manifest", field, equals: value, ...extra });
    },

    /** A package.json field must not exist. */
    noField(field: string, why: Text) {
      push({ kind: "manifest", field, absent: true, reason: why });
    },

    /** Cross-package checks for a monorepo root. */
    workspace() {
      push({ kind: "workspace" });
    },

    /** Ban deps that have a better replacement. */
    obsolete(names: string[], use: string, why: Text) {
      push({ kind: "deps", mode: "no", names, use, reason: why });
    },
  };
}

export type TasteBuilder = ReturnType<typeof taste>;
