import { tool } from "../../define";
import { legacy, limit, measure, unread } from "../../kinds";
import { frontmatter } from "../../kit";

const DOCS = "https://raw.githubusercontent.com/github/docs/main/content/copilot";
const AGENTS = { url: "https://docs.github.com/en/copilot/reference/custom-agents-configuration", check: `${DOCS}/reference/custom-agents-configuration.md` };
const AGENT = /(^|\/)\.github\/agents\/.+\.agent\.md$/;

/** GitHub Copilot, and VS Code, which reads the same files. */
export default tool({
  id: "copilot",
  name: "GitHub Copilot",
  researched: "2026-11",
  facts: [
    limit({
      id: "copilotAgentPrompt",
      match: AGENT,
      measure: measure.body,
      max: 30_000,
      params: (length) => ({ length, limit: 30_000 }),
      message: { en: "a prompt of {{length}} characters: GitHub Copilot allows {{limit}}", zh: "提示词有 {{length}} 个字符：GitHub Copilot 最多 {{limit}}" },
      sources: [{ ...AGENTS, quote: "The prompt can be a maximum of 30,000 characters." }],
      examples: {
        smell: [{ ".github/agents/long.agent.md": `---\nname: long\n---\n${"x".repeat(30_001)}` }],
        clean: [{ ".github/agents/short.agent.md": "---\nname: short\n---\nReview." }],
      },
    }),
    legacy({
      id: "copilotAgentInfer",
      match: AGENT,
      when: (f) => (/^infer:/m.test(frontmatter(f.text()).front) ? {} : undefined),
      message: {
        en: "uses infer, which GitHub retired: use disable-model-invocation and user-invocable",
        zh: "用了 infer：GitHub 已停用这个字段，改用 disable-model-invocation 和 user-invocable",
      },
      sources: [{ ...AGENTS, quote: "Use disable-model-invocation and user-invocable instead." }],
      examples: {
        smell: [{ ".github/agents/review.agent.md": "---\nname: review\ninfer: true\n---\nReview." }],
        clean: [{ ".github/agents/review.agent.md": "---\nname: review\n---\ninfer: this line is the prompt, not frontmatter." }],
      },
    }),
    legacy({
      id: "chatmode",
      match: /\.chatmode\.md$/,
      message: {
        en: "a custom chat mode: VS Code renamed them to custom agents; rename it to .agent.md",
        zh: "自定义聊天模式：VS Code 已改名为自定义 agent，把它改名为 .agent.md",
      },
      sources: [
        {
          url: "https://github.com/microsoft/vscode-docs/blob/main/docs/agents/reference/custom-agent-file-reference.md",
          check: "https://raw.githubusercontent.com/microsoft/vscode-docs/main/docs/agents/reference/custom-agent-file-reference.md",
          quote: "Custom agents were previously known as custom chat modes. If you have .chatmode.md files, rename them to .agent.md",
        },
      ],
      examples: { smell: [{ ".github/chatmodes/plan.chatmode.md": "Plan." }], clean: [{ ".github/agents/plan.agent.md": "Plan." }] },
    }),
    unread({
      id: "copilotInstructionsName",
      match: /(^|\/)\.github\/instructions\/.+\.md$/,
      when: (f) => (f.name.endsWith(".instructions.md") ? undefined : {}),
      message: {
        en: "Copilot reads only *.instructions.md from .github/instructions/; this name is never read",
        zh: "Copilot 只读 .github/instructions/ 里的 *.instructions.md；这个名字永远不会被读",
      },
      sources: [
        {
          url: "https://docs.github.com/en/copilot/tutorials/cloud-agent/get-the-best-results",
          check: `${DOCS}/tutorials/cloud-agent/get-the-best-results.md`,
          quote: "create one or more .github/instructions/**/*.instructions.md files",
        },
      ],
      examples: { smell: [{ ".github/instructions/vue.md": "Vue." }], clean: [{ ".github/instructions/react.instructions.md": "React." }] },
    }),
  ],
});
