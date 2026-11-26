import { tool } from "../../define";
import { legacy } from "../../kinds";

export default tool({
  id: "cline",
  name: "Cline",
  researched: "2026-11",
  facts: [
    legacy({
      id: "clinerules",
      match: /(^|\/)\.clinerules(\/.+)?$/,
      groupBy: (rel) => /^(.*?\.clinerules\/?)/.exec(rel)![1]!,
      message: {
        en: "the older .clinerules layout ({{count}} files): Cline's project home is .cline/",
        zh: "旧的 .clinerules 布局（{{count}} 个文件）：Cline 的项目目录是 .cline/",
      },
      sources: [
        {
          url: "https://github.com/cline/cline/blob/main/docs/getting-started/config.mdx",
          check: "https://raw.githubusercontent.com/cline/cline/main/docs/getting-started/config.mdx",
          quote: "In a project, Cline also reads the older .clinerules/ layout",
        },
      ],
      examples: { smell: [{ ".clinerules/one.md": "One." }, { ".clinerules": "One." }], clean: [{ ".cline/rules/one.md": "One." }] },
    }),
  ],
});
