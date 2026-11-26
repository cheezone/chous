import { tool } from "../../define";
import { naming, oneStyle, stem } from "../../kinds";
import versions from "../../data/eol/vue";

/** Single-file components: not route files, whose names are URLs (Nuxt and Vue Router's `pages/`, Nuxt's `layouts/`). */
const COMPONENT = /^(?!(.*\/)?(pages|layouts)\/).*\.vue$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
/** Two or more words; one lowercase word (`app.vue`) could be either style. */
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)+$/;
const STYLE_GUIDE = {
  url: "https://vuejs.org/style-guide/rules-strongly-recommended.html#single-file-component-filename-casing",
  check: "https://raw.githubusercontent.com/vuejs/docs/main/src/style-guide/rules-strongly-recommended.md",
  quote: "should either be always PascalCase or always kebab-case.",
};

const pkg = (vue: string) => JSON.stringify({ name: "a", private: true, dependencies: { vue } });

export default tool({
  id: "vue",
  name: "Vue",
  researched: "2026-11",
  facts: [
    naming({
      id: "vueFileName",
      match: COMPONENT,
      name: stem,
      style: /^([A-Z][A-Za-z0-9]*|[a-z0-9]+(-[a-z0-9]+)*)$/,
      message: {
        en: "components named in neither PascalCase nor kebab-case ({{count}}, e.g. {{name}}): Vue's style guide allows only those two",
        zh: "既不是 PascalCase 也不是 kebab-case 的组件（{{count}} 个，如 {{name}}）：Vue 风格指南只允许这两种",
      },
      sources: [STYLE_GUIDE],
      examples: {
        smell: [{ "src/components/myComponent.vue": "" }, { "src/components/my_component.vue": "" }],
        clean: [{ "src/components/MyComponent.vue": "", "src/components/my-component.vue": "", "src/pages/user_profile.vue": "" }],
      },
    }),
    oneStyle({
      id: "vueFileStyles",
      match: COMPONENT,
      label: "**/*.vue",
      style: (name) => {
        const s = name.split(".")[0]!;
        return PASCAL.test(s) ? "PascalCase" : KEBAB.test(s) ? "kebab-case" : undefined;
      },
      message: {
        en: "components named in {{style}} ({{count}}), while the rest use {{majority}}: Vue's style guide says always one or the other",
        zh: "用 {{style}} 命名的组件（{{count}} 个），其余都用 {{majority}}：Vue 风格指南要求始终只用一种",
      },
      sources: [STYLE_GUIDE],
      examples: {
        smell: [{ "src/components/MyButton.vue": "", "src/components/MyCard.vue": "", "src/components/user-menu.vue": "" }],
        clean: [{ "src/components/MyButton.vue": "", "src/components/MyCard.vue": "", "src/app.vue": "", "src/pages/user-profile.vue": "" }],
      },
    }),
  ],
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
