import { tool } from "../../define";
import { unread } from "../../kinds";
import { pinnedManager, sibling } from "../../kit";

export default tool({
  id: "yarn",
  name: "Yarn",
  researched: "2026-11",
  legacy: [".yarnrc"],
  facts: [
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
