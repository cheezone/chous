/**
 * The one shape every piece of chous's knowledge takes: a fact about a tool,
 * with the tool's own words behind it, the text chous says in each language,
 * and projects where it must and must not be reported.
 *
 * A tool is one file under `tools/<ecosystem>/`. Adding a tool is adding that
 * file to `index.ts`; removing it is deleting the file. Nothing else needs to
 * change: the registry hands the rules, sources, messages and end-of-life
 * data to the rest of chous, and `test/code/facts.test.ts` holds every tool
 * to the same checks.
 */
import type { Value } from "../types";
import type { ContractFile } from "./kit";

/** Where a claim comes from. */
export type Source = {
  /** The page a person reads. */
  url: string;
  /** Words from that page, verbatim (markup removed). Absent where the data itself is checked (end-of-life dates). */
  quote?: string;
  /** Raw text to verify against, when `url` is rendered client-side or blocked. */
  check?: string;
};

/** What chous says, in every language it speaks. `{{name}}` takes a param of the finding. */
export type Text = { en: string; zh: string };

export type Params = Record<string, string | number>;

/** A project as files and their contents, by path relative to its root. */
export type Example = Record<string, string>;

export type Examples = {
  /** Projects where the fact must be reported. */
  smell: Example[];
  /** Projects where it must not be. */
  clean: Example[];
};

/** A fact about files a tool reads. Reported as `issue.contract.<id>`. */
export type Fact<Id extends string = string> = {
  id: Id;
  value: Value;
  /** The files it looks at, by relative path. */
  match: RegExp;
  /** Params of the finding, or undefined when the file keeps to the tool's word. */
  check(file: ContractFile): Params | undefined;
  /**
   * Report each group once, counted, not each file in it: the group a file
   * belongs to, as a path from the root. A group inside a workspace package
   * resolves to the same path whether the root or the package is linted, so
   * it is reported once.
   */
  groupBy?(rel: string, file: ContractFile): string;
  /** The group itself is what the fact is about (a directory's name): name it even when it holds one file. */
  aboutGroup?: boolean;
  /** Also look inside fixtures and vendored code. */
  everywhere?: boolean;
  message: Text;
  /** The tool's own words. Every fact has at least one. */
  sources: Source[];
  examples: Examples;
};

/** A published end-of-life line: `date` is YYYY-MM-DD, or "" when the makers say "no longer supported" without one. */
export type EolLine = {
  version: string;
  date: string;
  /** The line's codename, lowercased, where its makers give one: Node 16 is `gallium` (`lts/gallium`, `node:gallium`). */
  name?: string;
};

/** A tool's own end-of-life schedule. */
export type EolDef<P extends string = string> = {
  product: P;
  /** How a version is named in a finding: `ESLint 8`. */
  label: string;
  /** The package whose major version is the one in use. */
  dep?: string;
  /** The page a person reads. */
  source: string;
  /** The raw data `pnpm run sync` reads. */
  data: string;
  /** Every line with a published end in that data. */
  parse(raw: string): EolLine[];
  /** What to move to. */
  use: Text;
  /** Lines already ended, written by `pnpm run sync` into `data/eol/`. Never typed by hand. */
  versions: readonly EolLine[];
  examples: Examples;
};

/** Which projects an absent fact applies to: every one, JavaScript ones, those on Bun, or on Cloudflare Workers. */
export type Scope = "base" | "js" | "bun" | "cloudflare";

/**
 * A path the tool says should not be in the repository: personal, local or
 * legacy. Reported as `issue.no.because` with `reason.<id>`.
 */
export type AbsentFact<Id extends string = string> = {
  id: Id;
  scope: Scope;
  /** Globs, relative to the project root; a leading `**` matches anywhere. */
  names: readonly string[];
  value: Value;
  message: Text;
  sources: Source[];
  examples: Examples;
};

export type Tool = {
  id: string;
  name: string;
  /** YYYY-MM: when its users, maintenance and name were last checked. A renamed or abandoned tool changes what its files mean. */
  researched: string;
  /** Config files it reads today, in its own order of precedence. */
  configs?: readonly string[];
  /** Config files it used to read. */
  legacy?: readonly string[];
  facts: readonly Fact[];
  /** Paths it says should not be committed. */
  absent?: readonly AbsentFact[];
  eol?: EolDef;
};

/** A path that should not be there; `const` keeps the id literal. */
export function absent<const Id extends string>(fact: AbsentFact<Id>): AbsentFact<Id> {
  return fact;
}

/** Declare a tool. `const` keeps fact ids and product names literal, so message keys stay typed. */
export function tool<const T extends Tool>(def: T): T {
  return def;
}

/** An npm package, and what is wrong with it. Reported as `issue.deps.*`, with `dep.<first name>` as the reason. */
export type PackageFact = {
  kind: "native" | "deprecated" | "sabotaged";
  /** One package, or several doing the same job; the first names the reason. */
  names: readonly string[];
  /** What to use instead. */
  use: string;
  why: Text;
  /** The authors' own words: required, except for what the platform ships. */
  sources?: Source[];
};

/** Declare packages; `const` keeps the first names literal, so `dep.<name>` stays a typed key. */
export function packages<const T extends readonly PackageFact[]>(list: T): T {
  return list;
}
