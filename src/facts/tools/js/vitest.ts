import { tool } from "../../define";
import { legacy } from "../../kinds";

const WORKSPACE = ["vitest.workspace.js", "vitest.workspace.mjs", "vitest.workspace.cjs", "vitest.workspace.ts", "vitest.workspace.mts", "vitest.workspace.cts", "vitest.workspace.json"];

export default tool({
  id: "vitest",
  name: "Vitest",
  researched: "2026-11",
  legacy: WORKSPACE,
  facts: [
    legacy({
      id: "vitestWorkspace",
      files: WORKSPACE,
      message: {
        en: "a Vitest workspace file: deprecated since Vitest 3.2, replaced by the projects option",
        zh: "Vitest 的 workspace 文件：自 Vitest 3.2 起已废弃，改用 projects 配置",
      },
      sources: [
        { url: "https://vitest.dev/guide/projects", check: "https://raw.githubusercontent.com/vitest-dev/vitest/main/docs/guide/projects.md", quote: "The workspace is deprecated since 3.2 and replaced with the projects configuration." },
      ],
      examples: {
        smell: [{ "vitest.workspace.ts": "export default []" }],
        clean: [{ "vitest.config.ts": "export default {}" }],
      },
    }),
  ],
});
