import { tool } from "../../define";
import { exclusive } from "../../kinds";

/** The files Oxlint "automatically looks for". */
const CONFIGS = [".oxlintrc.json", ".oxlintrc.jsonc", "oxlint.config.ts", "oxlint.config.mts"];

export default tool({
  id: "oxlint",
  name: "Oxlint",
  researched: "2026-11",
  configs: CONFIGS,
  facts: [
    exclusive({
      id: "oxlintConfigs",
      files: CONFIGS,
      message: { en: "Oxlint allows one config per directory, and this one has several: {{files}}", zh: "Oxlint 规定每个目录只能有一份配置，这里有好几份：{{files}}" },
      sources: [{ url: "https://oxc.rs/docs/guide/usage/linter/config.html", quote: "You can use only one config file per directory: JSON and TypeScript configs cannot coexist" }],
      examples: {
        smell: [{ ".oxlintrc.json": "{}", "oxlint.config.ts": "export default {}" }],
        clean: [{ ".oxlintrc.json": "{}" }, { "a/.oxlintrc.json": "{}", "b/oxlint.config.ts": "export default {}" }],
      },
    }),
  ],
});
