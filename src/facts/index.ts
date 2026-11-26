/**
 * Every tool chous knows, and what the rest of chous reads from them. To add
 * a tool: write `tools/<ecosystem>/<tool>.ts`, list it here, run the tests.
 */
import type { EolDef, Fact, PackageFact, Source, Tool } from "./define";
import npmPackages from "./packages/npm";
import angular from "./tools/js/angular";
import electron from "./tools/js/electron";
import eslint from "./tools/js/eslint";
import node from "./tools/js/node";
import nuxt from "./tools/js/nuxt";
import vue from "./tools/js/vue";
import django from "./tools/python/django";
import python from "./tools/python/python";
import npm from "./tools/js/npm";
import oxlint from "./tools/js/oxlint";
import pnpm from "./tools/js/pnpm";
import prettier from "./tools/js/prettier";
import tailwind from "./tools/js/tailwind";
import typescript from "./tools/js/typescript";
import vite from "./tools/js/vite";
import vitest from "./tools/js/vitest";
import yarn from "./tools/js/yarn";
import cargo from "./tools/rust/cargo";
import rustup from "./tools/rust/rustup";
import mypy from "./tools/python/mypy";
import poetry from "./tools/python/poetry";
import pytest from "./tools/python/pytest";
import ruff from "./tools/python/ruff";
import github from "./tools/github/github";
import compose from "./tools/docker/compose";
import agentSkills from "./tools/ai/agent-skills";
import claudeCode from "./tools/ai/claude-code";
import cline from "./tools/ai/cline";
import codex from "./tools/ai/codex";
import copilot from "./tools/ai/copilot";
import cursor from "./tools/ai/cursor";
import devin from "./tools/ai/devin";

export const TOOLS = [
  // JavaScript and TypeScript
  node,
  npm,
  pnpm,
  yarn,
  typescript,
  eslint,
  oxlint,
  prettier,
  vite,
  vitest,
  tailwind,
  vue,
  nuxt,
  angular,
  electron,
  // Rust
  cargo,
  rustup,
  // Python
  python,
  django,
  poetry,
  pytest,
  ruff,
  mypy,
  // Platforms
  github,
  compose,
  // AI tools: researched again before each change, since they rename and move fast.
  agentSkills,
  codex,
  claudeCode,
  copilot,
  cursor,
  devin,
  cline,
] as const satisfies readonly Tool[];

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

/** npm packages the platform replaced, or their authors deprecated or broke. */
export const PACKAGES: readonly PackageFact[] = npmPackages;
type DepKey = (typeof npmPackages)[number]["names"][0];

/** `dep.<first name>`: why a package is listed, per language. */
export const depMessages = (lang: Lang) => byLang(npmPackages.map((p) => [p.names[0], p.why] as [DepKey, PackageFact["why"]]), lang);

/** `dep.<first name>` → the authors' own words. */
export const DEP_SOURCES = Object.fromEntries(npmPackages.flatMap((p) => ("sources" in p && p.sources ? [[`dep.${p.names[0]}`, p.sources]] : []))) as Partial<Record<`dep.${DepKey}`, Source[]>>;
