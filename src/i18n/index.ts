import i18next, { type ParseKeys } from "i18next";
import en from "../locales/en";
import zh from "../locales/zh";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
  }
}

const resources = { en: { translation: en }, zh: { translation: zh } } as const;

export type Locale = keyof typeof resources;
export const locales = Object.keys(resources) as Locale[];

/** Any message in `src/locales/en.ts`, e.g. `"issue.deps.obsolete"`. */
export type MessageKey = ParseKeys;

/** Translate a message. Keys are checked against en.ts; params fill `{{name}}`. */
export type TFunction = (key: MessageKey, params?: Record<string, unknown>) => string;

export function isLocale(value: string): value is Locale {
  return Object.hasOwn(resources, value);
}

const cache = new Map<Locale, TFunction>();

/** A translator for `locale`, falling back to English. */
export function getT(locale?: string): { locale: Locale; t: TFunction } {
  const lng: Locale = locale && isLocale(locale) ? locale : "en";
  let t = cache.get(lng);
  if (!t) {
    const instance = i18next.createInstance();
    instance.init({ lng, fallbackLng: "en", resources, initAsync: false, interpolation: { escapeValue: false } });
    t = (key, params) => String(instance.t(key, params as never));
    cache.set(lng, t);
  }
  return { locale: lng, t };
}
