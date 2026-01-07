type SupportedLang = "zh" | "en" | "es" | "pt-BR" | "de" | "fr" | "ja" | "ko";

function getEnv(name: string): string | undefined {
  return process.env[name];
}

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

export function detectSystemLang(): SupportedLang {
  const env =
    getEnv("LC_ALL") ??
    getEnv("LC_MESSAGES") ??
    getEnv("LANG") ??
    getEnv("LANGUAGE") ??
    getEnv("VSCODE_NLS_CONFIG"); // VS Code (JSON) — best effort

  // 1) POSIX locale env: zh_CN.UTF-8 / en_US / zh-Hans / etc.
  if (env) {
    // VSCode: {"locale":"zh-cn",...}
    if (env.startsWith("{")) {
      try {
        const parsed = JSON.parse(env) as { locale?: unknown };
        if (typeof parsed.locale === "string") {
          const hit = mapToSupportedLang(parsed.locale);
          if (hit) return hit;
        }
      } catch {
        // ignore
      }
    }

    // LANGUAGE can be "es_ES:es:en" — take the first candidate
    const first = normalizeLocaleTag(env).split(":")[0] ?? env;
    const tag = first.split(".")[0] ?? first;
    const hit = mapToSupportedLang(tag);
    if (hit) return hit;
  }

  // 2) Intl fallback
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale;
    const hit = mapToSupportedLang(loc);
    if (hit) return hit;
  } catch {
    // ignore
  }

  // Only these locales are supported: other languages default to English (closer to the expectation of "non-Chinese users")
  return "en";
}

