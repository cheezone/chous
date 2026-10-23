import type { Locales } from "./i18n/i18n-types";

// Supported languages are exactly the locales provided by the i18n dictionaries.
// Deriving the type from the generated `Locales` keeps a single source of truth.
type SupportedLang = Locales;

export type SystemLangInput = {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  /** Intl.DateTimeFormat().resolvedOptions().locale, when available. */
  intlLocale?: string;
};

function normalizeLocaleTag(input: string): string {
  return input.trim().replace(/_/g, "-");
}

function mapToSupportedLang(localeTag: string): SupportedLang | undefined {
  const tag = normalizeLocaleTag(localeTag).toLowerCase();

  if (tag.startsWith("zh")) return "zh";
  if (tag.startsWith("en")) return "en";
  if (tag.startsWith("es")) return "es";
  if (tag.startsWith("de")) return "de";
  if (tag.startsWith("fr")) return "fr";
  if (tag.startsWith("ja")) return "ja";
  if (tag.startsWith("ko")) return "ko";

  if (tag.startsWith("pt")) return "pt-BR"; // Currently only supports pt-BR

  return undefined;
}

function localeFromPosixValue(value: string | undefined): SupportedLang | undefined {
  if (!value || value.startsWith("{")) return undefined;
  // LANGUAGE can be "es_ES:es:en" — take the first candidate.
  const first = normalizeLocaleTag(value).split(":")[0] ?? value;
  const tag = first.split(".")[0] ?? first;
  return mapToSupportedLang(tag);
}

function localeFromVscodeNls(
  raw: string | undefined,
  field: "osLocale" | "locale",
): SupportedLang | undefined {
  if (!raw?.startsWith("{")) return undefined;
  try {
    const parsed = JSON.parse(raw) as { osLocale?: unknown; locale?: unknown };
    const value = parsed[field];
    if (typeof value === "string") return mapToSupportedLang(value);
  } catch {
    // ignore
  }
  return undefined;
}

/**
 * Pick a UI language.
 *
 * On Windows, `LANG` is not a system setting. Cursor and VS Code write
 * `LANG=en_US.UTF-8` into the integrated terminal from the editor's resolved
 * UI language (`terminal.integrated.detectLocale`, default `auto`). That value
 * stays `en` when the requested language pack is not loaded, even if Windows
 * itself is zh-CN. `Intl` still follows the Windows user locale, so it wins
 * over `LANG`. `LC_ALL` / `LC_MESSAGES` stay explicit overrides. `--lang` is
 * applied by the CLI before this function runs.
 */
export function resolveSystemLang(input: SystemLangInput): SupportedLang {
  const { platform, env, intlLocale } = input;
  const intl = intlLocale ? mapToSupportedLang(intlLocale) : undefined;

  if (platform === "win32") {
    const explicit = localeFromPosixValue(env.LC_ALL) ?? localeFromPosixValue(env.LC_MESSAGES);
    if (explicit) return explicit;
    if (intl) return intl;
    const osLocale = localeFromVscodeNls(env.VSCODE_NLS_CONFIG, "osLocale");
    if (osLocale) return osLocale;
    const fromLang = localeFromPosixValue(env.LANG) ?? localeFromPosixValue(env.LANGUAGE);
    if (fromLang) return fromLang;
    return "en";
  }

  const posix =
    localeFromPosixValue(env.LC_ALL) ??
    localeFromPosixValue(env.LC_MESSAGES) ??
    localeFromPosixValue(env.LANG) ??
    localeFromPosixValue(env.LANGUAGE);
  if (posix) return posix;

  const vscode =
    localeFromVscodeNls(env.VSCODE_NLS_CONFIG, "locale") ??
    localeFromVscodeNls(env.VSCODE_NLS_CONFIG, "osLocale");
  if (vscode) return vscode;
  if (intl) return intl;
  return "en";
}

export function detectSystemLang(): SupportedLang {
  let intlLocale: string | undefined;
  try {
    intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    intlLocale = undefined;
  }
  return resolveSystemLang({
    platform: process.platform,
    env: process.env,
    intlLocale,
  });
}
