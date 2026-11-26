import { tool } from "../../define";
import { precedence } from "../../kinds";
import { parseJsonc } from "../../kit";

const GH = "https://raw.githubusercontent.com";

/** Config files, "in order of precedence", after a "prettier" key in package.json. */
const CONFIGS = [
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.yml",
  ".prettierrc.yaml",
  ".prettierrc.json5",
  ".prettierrc.js",
  "prettier.config.js",
  ".prettierrc.ts",
  "prettier.config.ts",
  ".prettierrc.mjs",
  "prettier.config.mjs",
  ".prettierrc.mts",
  "prettier.config.mts",
  ".prettierrc.cjs",
  "prettier.config.cjs",
  ".prettierrc.cts",
  "prettier.config.cts",
  ".prettierrc.toml",
];

export default tool({
  id: "prettier",
  name: "Prettier",
  researched: "2026-11",
  configs: CONFIGS,
  facts: [
    precedence({
      id: "prettierConfigs",
      tool: "Prettier",
      // A top-level "prettier" key counts, not the devDependency of that name.
      order: [["package.json", (text) => parseJsonc(text)?.prettier !== undefined], ...CONFIGS],
      sources: [{ url: "https://prettier.io/docs/configuration", check: `${GH}/prettier/prettier/main/docs/configuration.md`, quote: "You can configure Prettier via (in order of precedence):" }],
      examples: {
        smell: [{ "package.json": JSON.stringify({ name: "a", private: true, prettier: {} }), ".prettierrc.json": "{}" }, { ".prettierrc": "{}", "prettier.config.js": "export default {}" }],
        clean: [{ "package.json": JSON.stringify({ name: "s", private: true, devDependencies: { prettier: "^3.0.0" } }), ".prettierrc": "{}" }],
      },
    }),
  ],
});
