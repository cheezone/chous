import { tool } from "../../define";
import { legacy } from "../../kinds";

/** Devin, formerly Windsurf: it still reads Windsurf's files, as legacy. */
export default tool({
  id: "devin",
  name: "Devin",
  researched: "2026-11",
  legacy: [".windsurfrules", ".codeiumignore", ".windsurfignore"],
  facts: [
    legacy({
      id: "windsurfLegacy",
      match: /(^|\/)(\.windsurfrules|\.codeiumignore|\.windsurfignore|\.windsurf\/(rules|workflows|skills|plans)\/.+)$/,
      groupBy: (rel) => /^(.*?\.windsurf\/(rules|workflows|skills|plans)\/)/.exec(rel)?.[1] ?? rel,
      when: (f) => {
        if (f.name === ".windsurfrules") return { use: ".devin/rules/" };
        if (f.name === ".codeiumignore" || f.name === ".windsurfignore") return { use: ".devinignore" };
        const kind = /\.windsurf\/(rules|workflows|skills|plans)\//.exec(f.rel)![1];
        return { use: `.devin/${kind}/` };
      },
      message: {
        en: "a legacy Windsurf location ({{count}} files): Devin, Windsurf's successor, reads {{use}} first",
        zh: "Windsurf 的旧位置（{{count}} 个文件）：Windsurf 的继任者 Devin 优先读 {{use}}",
      },
      sources: [
        {
          url: "https://docs.devin.ai/desktop/cascade/memories",
          check: "https://docs.devin.ai/desktop/cascade/memories.md",
          quote: "The legacy .windsurf/rules/*.md, .windsurf/global_rules.md, and .windsurfrules files are imported by default.",
        },
        { url: "https://docs.devin.ai/desktop/devin-desktop-faq", check: "https://docs.devin.ai/desktop/devin-desktop-faq.md", quote: "Legacy (read, fallback)" },
      ],
      examples: {
        smell: [{ ".windsurfrules": "Old." }, { ".windsurf/rules/a.md": "A.", ".windsurf/rules/b.md": "B." }],
        clean: [{ ".devin/rules/c.md": "C." }],
      },
    }),
  ],
});
