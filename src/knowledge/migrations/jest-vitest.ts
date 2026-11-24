import { defineMigration } from "../types";

export default defineMigration({
  role: "test-runner",
  from: "jest",
  to: "vitest",
  resolution: "agent",
  see: "https://vitest.dev/guide/migration.html",
  notes: { en: "Globals and timers APIs differ — update imports and fake timers.\njest.mock / moduleNameMapper need Vitest aliases.\nSnapshot serializers and custom environments may need rewrites.", zh: "全局变量和计时器 API 不同，要更新导入和 fake timers。\njest.mock / moduleNameMapper 要换成 Vitest 的别名。\n快照序列化器和自定义环境可能需要重写。" },
});
