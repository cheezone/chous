import { tool } from "../../define";
import { htmlText, isoDate } from "../../official";
import versions from "../../data/eol/django";

export default tool({
  id: "django",
  name: "Django",
  researched: "2026-11",
  facts: [],
  eol: {
    product: "django",
    label: "Django",
    source: "https://www.djangoproject.com/download/#unsupported-versions",
    data: "https://www.djangoproject.com/download/",
    // "4.2 LTS 4.2.27 April 3, 2023 April 7, 2026": series, last release, its date, end of support.
    parse: (raw) =>
      [...htmlText(raw).matchAll(/\b(\d+\.\d+) (?:LTS (?:\d )?)?\1\.\d+ [A-Z][a-z]+ \d{1,2}, \d{4} ([A-Z][a-z]+) (\d{1,2}), (\d{4})/g)].map((m) => ({
        version: m[1]!,
        date: isoDate(m[2]!, m[3]!, m[4]!),
      })),
    use: { en: "a supported Django release", zh: "仍受支持的 Django 版本" },
    versions,
    examples: { smell: [{ "requirements.txt": "django==4.2.11\n" }], clean: [{ "requirements.txt": "django==5.2.1\n" }, { "requirements.txt": "django>=4.2\n" }] },
  },
});
