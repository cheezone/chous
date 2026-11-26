import { absent, tool } from "../../define";

export default tool({
  id: "bun",
  name: "Bun",
  researched: "2026-11",
  facts: [],
  absent: [
    absent({
      id: "bunLockb",
      scope: "bun",
      names: ["bun.lockb"],
      value: "modernity",
      message: { en: "binary lockfile, run `bun install --save-text-lockfile` and commit bun.lock", zh: "二进制 lockfile，运行 `bun install --save-text-lockfile`，改为提交 bun.lock" },
      sources: [{ url: "https://bun.com/docs/pm/lockfile", check: "https://raw.githubusercontent.com/oven-sh/bun/main/docs/pm/lockfile.mdx", quote: "To migrate an existing binary bun.lockb, run bun install --save-text-lockfile" }],
      examples: { smell: [{ "package.json": JSON.stringify({ name: "a", private: true }), "bun.lockb": "" }], clean: [{ "package.json": JSON.stringify({ name: "a", private: true }), "bun.lock": "{}" }] },
    }),
  ],
});
