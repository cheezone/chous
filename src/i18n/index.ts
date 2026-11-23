import en from "./en";
import zh from "./zh";
import type { Translation, TranslationFunctions } from "./types";

export type { Translation, TranslationFunctions } from "./types";

const dictionaries = { en, zh } satisfies Record<string, Translation>;

export type Locales = keyof typeof dictionaries;
export const locales = Object.keys(dictionaries) as Locales[];
export const baseLocale: Locales = "en";

export function isLocale(value: string): value is Locales {
  return Object.hasOwn(dictionaries, value);
}

function interpolate(template: string, params?: Record<string, unknown>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

function bind(dict: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(dict)) {
    out[key] = typeof value === "string"
      ? (params?: Record<string, unknown>) => interpolate(value, params)
      : bind(value as Record<string, unknown>);
  }
  return out;
}

const cache = new Map<Locales, TranslationFunctions>();

export function getLL(locale?: string): { locale: Locales; LL: TranslationFunctions } {
  const l = locale && isLocale(locale) ? locale : baseLocale;
  let LL = cache.get(l);
  if (!LL) {
    LL = bind(dictionaries[l]) as TranslationFunctions;
    cache.set(l, LL);
  }
  return { locale: l, LL };
}
