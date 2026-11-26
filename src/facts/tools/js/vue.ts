import { tool } from "../../define";
import versions from "../../data/eol/vue";

const pkg = (vue: string) => JSON.stringify({ name: "a", private: true, dependencies: { vue } });

export default tool({
  id: "vue",
  name: "Vue",
  researched: "2026-11",
  facts: [],
  eol: {
    product: "vue",
    label: "Vue",
    dep: "vue",
    source: "https://v2.vuejs.org/eol/",
    data: "https://raw.githubusercontent.com/vuejs/v2.vuejs.org/master/src/eol/index.md",
    // Vue publishes one end, in a sentence.
    parse: (raw) => (raw.includes("Vue 2 has reached End of Life on December 31st, 2023") ? [{ version: "2", date: "2023-12-31" }] : []),
    use: { en: "Vue 3", zh: "Vue 3" },
    versions,
    examples: { smell: [{ "package.json": pkg("^2.7.16") }], clean: [{ "package.json": pkg("^3.5.0") }] },
  },
});
