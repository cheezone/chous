import { tool } from "../../define";
import versions from "../../data/eol/nuxt";

const pkg = (nuxt: string) => JSON.stringify({ name: "a", private: true, dependencies: { nuxt } });

export default tool({
  id: "nuxt",
  name: "Nuxt",
  researched: "2026-11",
  facts: [],
  eol: {
    product: "nuxt",
    label: "Nuxt",
    dep: "nuxt",
    source: "https://nuxt.com/docs/community/roadmap",
    data: "https://raw.githubusercontent.com/nuxt/nuxt/main/docs/5.community/6.roadmap.md",
    // | **3.x** (stable) | … | … | 2026-07-31 |
    parse: (raw) => [...raw.matchAll(/\*\*(\d+)\.x\*\* \(\w+\) \|[^|]*\|[^|]*\| (\d{4}-\d{2}-\d{2}) /g)].map((m) => ({ version: m[1]!, date: m[2]! })),
    use: { en: "Nuxt 4", zh: "Nuxt 4" },
    versions,
    examples: { smell: [{ "package.json": pkg("^2.18.1") }], clean: [{ "package.json": pkg("^4.2.0") }] },
  },
});
