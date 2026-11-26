import { tool } from "../../define";
import { naming, stem, STYLE } from "../../kinds";
import { hasDep } from "../../kit";
import versions from "../../data/eol/angular";

const pkg = (core: string) => JSON.stringify({ name: "a", private: true, dependencies: { "@angular/core": core } });

export default tool({
  id: "angular",
  name: "Angular",
  researched: "2026-11",
  facts: [
    naming({
      id: "angularFileName",
      match: /(^|\/)src\/.+\.ts$/,
      when: (f) => hasDep(f, "@angular/core"),
      name: stem,
      style: STYLE.kebab,
      message: {
        en: "files whose words are not separated by hyphens ({{count}}, e.g. {{name}}): Angular's style guide names files like user-profile.ts",
        zh: "单词之间没用连字符分隔的文件（{{count}} 个，如 {{name}}）：Angular 风格指南要求文件名像 user-profile.ts 这样",
      },
      sources: [
        {
          url: "https://angular.dev/style-guide#separate-words-in-file-names-with-hyphens",
          check: "https://raw.githubusercontent.com/angular/angular/main/adev/src/content/best-practices/style-guide.md",
          quote: "Separate words within a file name with hyphens (`-`).",
        },
      ],
      examples: {
        smell: [{ "package.json": pkg("^21.0.0"), "src/app/userProfile.ts": "" }, { "package.json": pkg("^21.0.0"), "src/app/UserProfile.component.ts": "" }],
        clean: [
          { "package.json": pkg("^21.0.0"), "src/app/user-profile.ts": "", "src/app/user-profile.spec.ts": "", "src/main.ts": "" },
          { "package.json": JSON.stringify({ name: "a", private: true }), "src/app/userProfile.ts": "" },
        ],
      },
    }),
  ],
  eol: {
    product: "angular",
    label: "Angular",
    dep: "@angular/core",
    source: "https://angular.dev/reference/releases",
    data: "https://raw.githubusercontent.com/angular/angular/main/adev/src/content/reference/releases.md",
    // "Angular versions v2 to v19 are no longer supported." — no dates, so none are given.
    parse: (raw) => {
      const m = /Angular versions v(\d+) to v(\d+) are no longer supported\./.exec(raw);
      return m ? Array.from({ length: Number(m[2]) - Number(m[1]) + 1 }, (_, i) => ({ version: String(Number(m[1]) + i), date: "" })) : [];
    },
    use: { en: "a supported Angular release", zh: "仍受支持的 Angular 版本" },
    versions,
    examples: { smell: [{ "package.json": pkg("^17.3.0") }], clean: [{ "package.json": pkg("^21.0.0") }] },
  },
});
