import { tool } from "../../define";
import { legacy, precedence } from "../../kinds";
import { depMajor } from "../../kit";
import versions from "../../data/eol/eslint";

const GH = "https://raw.githubusercontent.com/eslint";
const dep = (version: string) => JSON.stringify({ devDependencies: { eslint: version } });

// "The order of precedence is as follows" — JavaScript before TypeScript.
const CONFIGS = ["eslint.config.js", "eslint.config.mjs", "eslint.config.cjs", "eslint.config.ts", "eslint.config.mts", "eslint.config.cts"];
const ESLINTRC = [".eslintrc", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.yaml", ".eslintrc.yml", ".eslintrc.json"];

export default tool({
  id: "eslint",
  name: "ESLint",
  researched: "2026-11",
  configs: CONFIGS,
  legacy: ESLINTRC,
  facts: [
    precedence({
      id: "eslintConfigs",
      tool: "ESLint",
      order: CONFIGS,
      sources: [
        {
          url: "https://eslint.org/docs/latest/use/configure/configuration-files#configuration-file-precedence",
          check: `${GH}/eslint/main/docs/src/use/configure/configuration-files.md`,
          quote: "If you have multiple ESLint configuration files, ESLint prioritizes JavaScript files over TypeScript files.",
        },
      ],
      examples: {
        smell: [{ "eslint.config.js": "export default []", "eslint.config.ts": "export default []" }],
        clean: [{ "eslint.config.ts": "export default []" }, { "a/eslint.config.js": "export default []", "b/eslint.config.ts": "export default []" }],
      },
    }),
    legacy({
      id: "eslintrc",
      files: ESLINTRC,
      when: (f) => {
        const version = depMajor(f, "eslint");
        return version !== undefined && version >= 9 ? { version } : undefined;
      },
      message: {
        en: "eslintrc with ESLint {{version}}: deprecated since ESLint 9, no longer looked for, and gone in 10; use eslint.config.js",
        zh: "ESLint {{version}} 下的 eslintrc：ESLint 9 起已废弃、默认不再查找，10 起彻底移除；改用 eslint.config.js",
      },
      sources: [
        {
          url: "https://eslint.org/docs/latest/use/migrate-to-9.0.0",
          check: `${GH}/eslint/main/docs/src/use/migrate-to-9.0.0.md`,
          quote: "The previous format, eslintrc, is now deprecated and will not automatically be searched for.",
        },
        { url: "https://eslint.org/docs/latest/use/migrate-to-10.0.0", check: `${GH}/eslint/main/docs/src/use/migrate-to-10.0.0.md`, quote: "Old config format no longer supported" },
      ],
      examples: {
        smell: [{ "package.json": dep("^9.0.0"), ".eslintrc.json": "{}" }],
        clean: [{ "package.json": dep("^8.57.0"), ".eslintrc.json": "{}" }, { ".eslintrc.json": "{}" }],
      },
    }),
  ],
  eol: {
    product: "eslint",
    label: "ESLint",
    dep: "eslint",
    source: "https://eslint.org/version-support/",
    data: `${GH}/eslint.org/main/src/content/pages/version-support.md`,
    // | v8.0.0-v8.57.1   | EOL        | 2021-10-09        | 2024-09-16       | 2024-10-05 | …
    parse: (raw) =>
      [...raw.matchAll(/^\| v(\d+)\.0\.0-v\1\.[\d.]+ +\| EOL +\|[^|]*\|[^|]*\| (\d{4}-\d{2}-\d{2}) /gm)].map((m) => ({ version: m[1]!, date: m[2]! })),
    use: { en: "a supported ESLint release", zh: "仍在维护的 ESLint 版本" },
    versions,
    examples: {
      smell: [{ "package.json": JSON.stringify({ name: "t", private: true, devDependencies: { eslint: "^8.57.0" } }) }],
      clean: [{ "package.json": JSON.stringify({ name: "t", private: true, devDependencies: { eslint: "^10.0.0" } }) }],
    },
  },
});
