import { tool } from "../../define";
import versions from "../../data/eol/eslint";

const GH = "https://raw.githubusercontent.com/eslint";

export default tool({
  id: "eslint",
  name: "ESLint",
  researched: "2026-11",
  facts: [],
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
