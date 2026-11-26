import { tool } from "../../define";
import { custom } from "../../kinds";
import { parseJsonc } from "../../kit";

/** tsconfig options TypeScript 6.0 deprecated, and TypeScript 7.0 does not support. */
const TS6_DEPRECATED: Array<[string, (v: unknown) => boolean]> = [
  ["target", (v) => typeof v === "string" && v.toLowerCase() === "es5"],
  ["downlevelIteration", (v) => v !== undefined],
  ["moduleResolution", (v) => typeof v === "string" && ["node", "node10", "classic"].includes(v.toLowerCase())],
  ["module", (v) => typeof v === "string" && ["amd", "umd", "system", "systemjs"].includes(v.toLowerCase())],
  ["baseUrl", (v) => v !== undefined],
  ["esModuleInterop", (v) => v === false],
  ["allowSyntheticDefaultImports", (v) => v === false],
  ["alwaysStrict", (v) => v === false],
  ["outFile", (v) => v !== undefined],
];

export default tool({
  id: "typescript",
  name: "TypeScript",
  researched: "2026-11",
  facts: [
    custom({
      id: "tsconfigDeprecated",
      value: "modernity",
      match: /(^|\/)tsconfig(\.[\w.-]+)?\.json$/,
      check: (f) => {
        const options = parseJsonc(f.text())?.compilerOptions;
        if (!options || typeof options !== "object") return undefined;
        // A value is shown as written when it is a plain one; anything else by its kind (a nested array prints nothing useful).
        const shown = (v: unknown) => (v === null || ["string", "number", "boolean"].includes(typeof v) ? JSON.stringify(v).slice(0, 80) : Array.isArray(v) ? "[…]" : "{…}");
        const found = TS6_DEPRECATED.filter(([key, bad]) => key in options && bad(options[key])).map(([key]) => `${key}: ${shown(options[key])}`);
        return found.length ? { options: found.join(", ") } : undefined;
      },
      message: { en: "deprecated in TypeScript 6 and unsupported in 7: {{options}}", zh: "TypeScript 6 已废弃、7 不再支持：{{options}}" },
      sources: [
        {
          url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html",
          check: "https://raw.githubusercontent.com/microsoft/TypeScript-Website/v2/packages/documentation/copy/en/release-notes/TypeScript%206.0.md",
          quote: "however, note that TypeScript 7.0 will not support any of these deprecated options.",
        },
      ],
      examples: {
        smell: [{ "tsconfig.json": '{\n  // comments are fine\n  "compilerOptions": { "baseUrl": ".", "moduleResolution": "Node", "strict": true, },\n}' }],
        clean: [{ "tsconfig.build.json": '{ "compilerOptions": { "moduleResolution": "bundler" } }' }],
      },
    }),
  ],
});
