import { tool } from "../../define";
import versions from "../../data/eol/angular";

const pkg = (core: string) => JSON.stringify({ name: "a", private: true, dependencies: { "@angular/core": core } });

export default tool({
  id: "angular",
  name: "Angular",
  researched: "2026-11",
  facts: [],
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
