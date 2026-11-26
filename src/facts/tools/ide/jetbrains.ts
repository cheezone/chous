import { absent, tool } from "../../define";

export default tool({
  id: "jetbrains",
  name: "JetBrains IDEs",
  researched: "2026-11",
  facts: [],
  absent: [
    absent({
      id: "ideaWorkspace",
      scope: "base",
      names: ["**/.idea/workspace.xml"],
      value: "cleanliness",
      message: {
        en: "personal IDE state; JetBrains says workspace.xml should not be shared, the rest of .idea may be",
        zh: "个人的 IDE 状态；JetBrains 说 workspace.xml 不应共享，.idea 里其余文件可以提交",
      },
      sources: [{ url: "https://www.jetbrains.com/help/webstorm/configure-project-settings.html", quote: "The workspace.xml file stores user-specific settings that should not be shared." }],
      examples: { smell: [{ ".idea/workspace.xml": "<project/>" }], clean: [{ ".idea/codeStyles/Project.xml": "<component/>" }] },
    }),
  ],
});
