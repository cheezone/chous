/**
 * The few things chous knows about named software, and what the rest of chous
 * reads from them. Only what holds for years without upkeep: end-of-life
 * schedules, deprecations that happened, a language's own naming rules, files
 * a tool says never to commit. Version-specific config, read orders, defaults
 * and limits are not collected (AGENTS.md: what gets in).
 */
import type { AbsentFact, EolDef, Fact, PackageFact, Scope, Source, Tool } from "./define";
import npmPackages from "./packages/npm";
import angular from "./tools/js/angular";
import electron from "./tools/js/electron";
import envFiles from "./tools/js/env-files";
import eslint from "./tools/js/eslint";
import node from "./tools/js/node";
import nuxt from "./tools/js/nuxt";
import vue from "./tools/js/vue";
import cargo from "./tools/rust/cargo";
import rust from "./tools/rust/rust";
import django from "./tools/python/django";
import python from "./tools/python/python";
import go from "./tools/go/go";
import dart from "./tools/dart/dart";
import kotlin from "./tools/kotlin/kotlin";
import elixir from "./tools/elixir/elixir";
import composer from "./tools/php/composer";
import jetbrains from "./tools/ide/jetbrains";

export const TOOLS = [
  // JavaScript and TypeScript
  node,
  eslint,
  envFiles,
  vue,
  nuxt,
  angular,
  electron,
  // Rust
  rust,
  cargo,
  // Python
  python,
  django,
  // Go, Dart, Kotlin, Elixir
  go,
  dart,
  kotlin,
  elixir,
  // PHP
  composer,
  // Editors
  jetbrains,
] as const satisfies readonly Tool[];

type Facts = (typeof TOOLS)[number]["facts"][number];
/** The id of every fact, so `issue.contract.<id>` stays a typed message key. */
export type FactId = Facts["id"];

type Eols = NonNullable<Extract<(typeof TOOLS)[number], { eol: EolDef }>["eol"]>;
/** Products whose end-of-life schedule a tool file declares. */
export type FactProduct = Eols["product"];

export const FACTS: readonly Fact<FactId>[] = TOOLS.flatMap((t) => t.facts as readonly Fact<FactId>[]);
export const FACT_EOL: readonly EolDef<FactProduct>[] = TOOLS.flatMap((t) => ("eol" in t ? [t.eol as EolDef<FactProduct>] : []));

type Absents = NonNullable<Extract<(typeof TOOLS)[number], { absent: readonly AbsentFact[] }>["absent"]>[number];
/** The id of every absent fact, so `reason.<id>` stays a typed message key. */
export type AbsentId = Absents["id"];
export const ABSENT: readonly AbsentFact<AbsentId>[] = TOOLS.flatMap((t) => ("absent" in t ? (t.absent as readonly AbsentFact<AbsentId>[]) : []));
/** Absent facts for one kind of project. */
export const absentIn = (scope: Scope) => ABSENT.filter((a) => a.scope === scope);

type Lang = "en" | "zh";
const byLang = <K extends string>(entries: ReadonlyArray<[K, { en: string; zh: string }]>, lang: Lang) =>
  Object.fromEntries(entries.map(([k, text]) => [k, text[lang]])) as Record<K, string>;

/** `issue.contract.<id>` messages, per language. */
export const factMessages = (lang: Lang) => byLang(FACTS.map((f) => [f.id, f.message]), lang);
/** `eol.<product>`: what to move to, per language. */
export const eolMessages = (lang: Lang) => byLang(FACT_EOL.map((e) => [e.product, e.use]), lang);

/** `reason.<id>` of absent facts, per language. */
export const absentMessages = (lang: Lang) => byLang(ABSENT.map((a) => [a.id, a.message]), lang);

/** `issue.contract.<id>` → the tool's own words. */
export const FACT_SOURCES = {
  ...Object.fromEntries(FACTS.map((f) => [`issue.contract.${f.id}`, f.sources])),
  ...Object.fromEntries(ABSENT.map((a) => [`reason.${a.id}`, a.sources])),
} as Record<`issue.contract.${FactId}` | `reason.${AbsentId}`, Source[]>;

/** Each declared end-of-life schedule, by product. */
export const FACT_SCHEDULES = {} as Record<FactProduct, EolDef<FactProduct>>;
for (const e of FACT_EOL) FACT_SCHEDULES[e.product] = e;

/** npm packages the platform replaced, or their authors deprecated or broke. */
export const PACKAGES: readonly PackageFact[] = npmPackages;
type DepKey = (typeof npmPackages)[number]["names"][0];

/** `dep.<first name>`: why a package is listed, per language. */
export const depMessages = (lang: Lang) => byLang(npmPackages.map((p) => [p.names[0], p.why] as [DepKey, PackageFact["why"]]), lang);

/** `dep.<first name>` → the authors' own words. */
export const DEP_SOURCES = Object.fromEntries(npmPackages.flatMap((p) => ("sources" in p && p.sources ? [[`dep.${p.names[0]}`, p.sources]] : []))) as Partial<Record<`dep.${DepKey}`, Source[]>>;
