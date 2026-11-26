import { tool } from "../../define";
import { unread } from "../../kinds";
import { depMajor } from "../../kit";

const CONFIGS = ["tailwind.config.js", "tailwind.config.cjs", "tailwind.config.mjs", "tailwind.config.ts", "tailwind.config.cts", "tailwind.config.mts"];
const dep = (version: string) => JSON.stringify({ name: "a", private: true, devDependencies: { tailwindcss: version } });

export default tool({
  id: "tailwind",
  name: "Tailwind CSS",
  researched: "2026-11",
  facts: [
    unread({
      id: "tailwindConfig",
      files: CONFIGS,
      when: (f) => {
        const version = depMajor(f, "tailwindcss");
        if (version === undefined || version < 4) return undefined;
        return f.cssLoadsConfig() ? undefined : { version };
      },
      message: {
        en: "Tailwind {{version}} no longer loads tailwind.config by itself, and no stylesheet loads it with @config",
        zh: "Tailwind {{version}} 不再自动加载 tailwind.config，也没有任何样式表用 @config 加载它",
      },
      sources: [
        {
          url: "https://tailwindcss.com/docs/upgrade-guide#using-a-javascript-config-file",
          check: "https://raw.githubusercontent.com/tailwindlabs/tailwindcss.com/main/src/docs/upgrade-guide.mdx",
          quote: "JavaScript config files are still supported for backward compatibility, but they are no longer detected automatically in v4.",
        },
      ],
      examples: {
        smell: [{ "package.json": dep("^4.1.0"), "tailwind.config.js": "export default {}" }],
        clean: [
          { "package.json": dep("^3.4.0"), "tailwind.config.js": "module.exports = {}" },
          { "package.json": dep("^4.1.0"), "tailwind.config.ts": "export default {}", "src/app.css": '@import "tailwindcss";\n@config "../tailwind.config.ts";\n' },
        ],
      },
    }),
  ],
});
