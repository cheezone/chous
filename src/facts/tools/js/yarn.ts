import { tool } from "../../define";
import { exclusive, unread } from "../../kinds";
import { pinnedManager, sibling } from "../../kit";

export default tool({
  id: "yarn",
  name: "Yarn",
  researched: "2026-11",
  legacy: [".yarnrc"],
  facts: [
    exclusive({
      id: "yarnNpmLock",
      files: ["yarn.lock", "package-lock.json"],
      message: {
        en: "two lockfiles that do not sync ({{files}}): Yarn itself advises not to mix package managers",
        zh: "两份互不同步的 lockfile（{{files}}）：Yarn 自己建议不要混用包管理器",
      },
      sources: [
        {
          url: "https://github.com/yarnpkg/yarn/blob/master/src/reporters/lang/en.js",
          check: "https://raw.githubusercontent.com/yarnpkg/yarn/master/src/reporters/lang/en.js",
          quote: "It is advised not to mix package managers in order to avoid resolution inconsistencies caused by unsynchronized lock files.",
        },
      ],
      examples: {
        smell: [{ "package.json": "{}", "yarn.lock": "", "package-lock.json": "{}" }],
        clean: [{ "package.json": "{}", "yarn.lock": "" }, { "a/yarn.lock": "", "b/package-lock.json": "{}" }],
      },
    }),
    unread({
      id: "yarnrc",
      files: [".yarnrc"],
      when: (f) => ((pinnedManager(f, "yarn") ?? 0) >= 2 || f.all.has(sibling(f, ".yarnrc.yml")) ? {} : undefined),
      message: { en: "Yarn 2 and later read only .yarnrc.yml; this file is ignored", zh: "Yarn 2 起只读 .yarnrc.yml；这个文件会被忽略" },
      sources: [
        {
          url: "https://yarnpkg.com/getting-started/migration",
          check: "https://raw.githubusercontent.com/yarnpkg/berry/master/packages/docusaurus/docs/getting-started/migrating/steps.mdx",
          quote: "Yarn Modern now uses .yarnrc.yml. Any other file is now ignored",
        },
      ],
      examples: {
        smell: [{ ".yarnrc": "registry x", ".yarnrc.yml": "nodeLinker: node-modules" }, { "package.json": JSON.stringify({ name: "a", private: true, packageManager: "yarn@4.5.0" }), ".yarnrc": "registry x" }],
        clean: [{ "package.json": JSON.stringify({ name: "a", private: true, packageManager: "yarn@1.22.22" }), ".yarnrc": "registry x" }],
      },
    }),
  ],
});
