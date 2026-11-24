import type {
  InDirOnlyRule,
  NamingStyle,
  PackageManagerName,
  Rule,
  RuleBase,
} from "../types";

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
      opts?: Extra & { strict?: boolean; fileType?: InDirOnlyRule["fileType"] },
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

    packageManager(manager: PackageManagerName) {
      push({ kind: "packageManager", manager });
    },

    /** Declare which tool owns a stack role. The first tool is the migration target. */
    role(role: string, tools: string[], extra?: Extra) {
      push({ kind: "role", role, tools, ...extra });
    },

    banDeps(names: string[], extra?: Extra) {
      push({ kind: "deps", mode: "no", names, ...extra });
    },

    /** Ban deps that have a better replacement. */
    obsolete(names: string[], use: string, why: string) {
      push({ kind: "deps", mode: "no", names, use, reason: why });
    },

    replaceDep(from: string, to: string, extra?: Extra) {
      push({ kind: "replaceDep", from, to, ...extra });
    },
  };
}

export type TasteBuilder = ReturnType<typeof taste>;
