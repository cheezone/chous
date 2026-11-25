/**
 * Every tool chous knows, and what the rest of chous reads from them. To add
 * a tool: write `tools/<ecosystem>/<tool>.ts`, list it here, run the tests.
 */
import type { EolDef, Fact, Source, Tool } from "./define";
import eslint from "./tools/js/eslint";
import cargo from "./tools/rust/cargo";

export const TOOLS = [eslint, cargo] as const satisfies readonly Tool[];

type Facts = (typeof TOOLS)[number]["facts"][number];
/** The id of every fact, so `issue.contract.<id>` stays a typed message key. */
export type FactId = Facts["id"];

type Eols = NonNullable<Extract<(typeof TOOLS)[number], { eol: EolDef }>["eol"]>;
/** Products whose end-of-life schedule a tool file declares. */
export type FactProduct = Eols["product"];

export const FACTS: readonly Fact<FactId>[] = TOOLS.flatMap((t) => t.facts as readonly Fact<FactId>[]);
export const FACT_EOL: readonly EolDef<FactProduct>[] = TOOLS.flatMap((t) => ("eol" in t ? [t.eol as EolDef<FactProduct>] : []));

type Lang = "en" | "zh";
const byLang = <K extends string>(entries: ReadonlyArray<[K, { en: string; zh: string }]>, lang: Lang) =>
  Object.fromEntries(entries.map(([k, text]) => [k, text[lang]])) as Record<K, string>;

/** `issue.contract.<id>` messages, per language. */
export const factMessages = (lang: Lang) => byLang(FACTS.map((f) => [f.id, f.message]), lang);
/** `eol.<product>`: what to move to, per language. */
export const eolMessages = (lang: Lang) => byLang(FACT_EOL.map((e) => [e.product, e.use]), lang);

/** `issue.contract.<id>` → the tool's own words. */
export const FACT_SOURCES = Object.fromEntries(FACTS.map((f) => [`issue.contract.${f.id}`, f.sources])) as Record<`issue.contract.${FactId}`, Source[]>;

/** Each declared end-of-life schedule, by product. */
export const FACT_SCHEDULES = {} as Record<FactProduct, EolDef<FactProduct>>;
for (const e of FACT_EOL) FACT_SCHEDULES[e.product] = e;
