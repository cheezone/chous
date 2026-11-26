import { tool } from "../../define";
import { precedence } from "../../kinds";

/** DEFAULT_CONFIG_FILES, in the order Vite looks for them. */
const CONFIGS = ["vite.config.js", "vite.config.mjs", "vite.config.ts", "vite.config.cjs", "vite.config.mts", "vite.config.cts"];

export default tool({
  id: "vite",
  name: "Vite",
  researched: "2026-11",
  configs: CONFIGS,
  facts: [
    precedence({
      id: "viteConfigs",
      tool: "Vite",
      order: CONFIGS,
      message: { en: "never read: Vite takes the first config it finds, here {{used}}", zh: "永远不会被读：Vite 只用找到的第一份配置，这里是 {{used}}" },
      sources: [
        {
          url: "https://github.com/vitejs/vite/blob/main/packages/vite/src/node/constants.ts",
          check: "https://raw.githubusercontent.com/vitejs/vite/main/packages/vite/src/node/constants.ts",
          quote: "'vite.config.js', 'vite.config.mjs', 'vite.config.ts', 'vite.config.cjs', 'vite.config.mts', 'vite.config.cts',",
        },
      ],
      examples: {
        smell: [{ "vite.config.js": "export default {}", "vite.config.ts": "export default {}" }],
        clean: [{ "vite.config.ts": "export default {}" }],
      },
    }),
  ],
});
