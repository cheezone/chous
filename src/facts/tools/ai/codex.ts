import { tool } from "../../define";
import { limit, measure } from "../../kinds";

const KiB = 1024;

export default tool({
  id: "codex",
  name: "Codex",
  researched: "2026-11",
  facts: [
    limit({
      id: "agentsMdBytes",
      files: ["AGENTS.md"],
      measure: measure.bytes,
      max: 32 * KiB,
      params: (bytes) => ({ kib: Math.round(bytes / KiB), limit: 32 }),
      message: {
        en: "{{kib}} KiB: Codex reads at most {{limit}} KiB of AGENTS.md by default and cuts the rest",
        zh: "{{kib}} KiB：Codex 默认最多读 AGENTS.md 的 {{limit}} KiB，剩下的会被截掉",
      },
      sources: [{ url: "https://developers.openai.com/codex/guides/agents-md", check: "https://raw.githubusercontent.com/openai/codex/main/codex-rs/config/defaults.toml", quote: "project_doc_max_bytes = 32768" }],
      examples: { smell: [{ "AGENTS.md": "x".repeat(33 * KiB) }], clean: [{ "AGENTS.md": "x".repeat(32 * KiB) }] },
    }),
  ],
});
