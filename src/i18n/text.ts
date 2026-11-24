import type { Locales } from "./index";

/** Text written in every supported language. Adding a locale makes every missing translation a type error. */
export type Text = Record<Locales, string>;

export function isText(value: unknown): value is Text {
  return typeof value === "object" && value !== null && "en" in value && "zh" in value;
}

/** Join several texts line by line, per language. */
export function joinText(parts: Array<Text | undefined>, separator = "\n"): Text | undefined {
  const present = parts.filter((p): p is Text => Boolean(p));
  if (present.length === 0) return undefined;
  return {
    en: present.map((p) => p.en).join(separator),
    zh: present.map((p) => p.zh).join(separator),
  };
}
