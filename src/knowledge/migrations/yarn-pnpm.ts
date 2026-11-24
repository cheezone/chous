import { defineMigration } from "../types";

export default defineMigration({
  role: "package-manager",
  from: "yarn",
  to: "pnpm",
  resolution: "auto",
  see: "https://pnpm.io/installation",
  notes: { en: "Safe to set packageManager field and remove yarn.lock after reinstalling with pnpm.", zh: "用 pnpm 重新安装后，可以放心设置 packageManager 字段并删除 yarn.lock。" },
});
