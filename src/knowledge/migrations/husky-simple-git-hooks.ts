import { defineMigration } from "../types";

export default defineMigration({
  role: "git-hooks",
  from: "husky",
  to: "simple-git-hooks",
  resolution: "agent",
  notes: { en: "Move hook scripts into package.json simple-git-hooks field and rename .husky → .githooks.", zh: "把 hook 脚本移到 package.json 的 simple-git-hooks 字段，并把 .husky 改名为 .githooks。" },
});
