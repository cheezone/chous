import { tool } from "../../define";
import { custom, legacy, unread } from "../../kinds";
import { parseJsonc, sibling } from "../../kit";

const DOCS = "https://raw.githubusercontent.com/npm/cli/latest/docs/lib/content/configuring-npm";
const PACKAGE_JSON = { url: "https://docs.npmjs.com/cli/configuring-npm/package-json", check: `${DOCS}/package-json.md` };

export default tool({
  id: "npm",
  name: "npm",
  researched: "2026-11",
  facts: [
    legacy({
      id: "npmShrinkwrap",
      files: ["npm-shrinkwrap.json"],
      message: {
        en: "npm 12 no longer reads or writes npm-shrinkwrap.json; rename it to package-lock.json",
        zh: "npm 12 起不再读写 npm-shrinkwrap.json；改名为 package-lock.json",
      },
      sources: [
        { url: "https://docs.npmjs.com/cli/configuring-npm/package-lock-json", check: `${DOCS}/package-lock-json.md`, quote: "As of npm v12, npm-shrinkwrap.json is no longer read or written by npm." },
      ],
      examples: { smell: [{ "npm-shrinkwrap.json": "{}" }], clean: [{ "package-lock.json": "{}" }] },
    }),
    unread({
      id: "npmignoreWithFiles",
      files: [".npmignore"],
      when: (f) => {
        const pkg = parseJsonc(f.read(sibling(f, "package.json")));
        return pkg && Array.isArray(pkg.files) ? {} : undefined;
      },
      message: {
        en: "package.json sets files, and npm's docs say a root .npmignore will not override it",
        zh: "package.json 已经设置了 files，npm 文档说根目录的 .npmignore 不会覆盖它",
      },
      sources: [{ url: `${PACKAGE_JSON.url}#files`, check: PACKAGE_JSON.check, quote: "At the root of your package it will not override the \"files\" field" }],
      examples: {
        smell: [{ "package.json": JSON.stringify({ name: "lib", files: ["dist"] }), ".npmignore": "src" }],
        clean: [{ "package.json": JSON.stringify({ name: "lib" }), ".npmignore": "src" }],
      },
    }),
    custom({
      id: "npmName",
      value: "convention",
      files: ["package.json"],
      check: (f) => {
        const pkg = parseJsonc(f.text());
        const name = pkg?.name;
        if (!pkg || pkg.private === true || typeof name !== "string") return undefined;
        const scoped = name.startsWith("@");
        const bad = name.length > 214 || name !== name.toLowerCase() || (!scoped && /^[._]/.test(name)) || /[^a-z0-9@/._~-]/.test(name.toLowerCase());
        return bad ? { name } : undefined;
      },
      message: {
        en: "\"{{name}}\" breaks npm's name rules: at most 214 characters, no uppercase in new packages, no leading dot or underscore unscoped, URL-safe",
        zh: "「{{name}}」不符合 npm 的包名规则：最多 214 个字符，新包不能有大写字母，不带 scope 时不能以点或下划线开头，必须能放进 URL",
      },
      sources: [
        { url: `${PACKAGE_JSON.url}#name`, check: PACKAGE_JSON.check, quote: "The name must be less than or equal to 214 characters." },
        { url: `${PACKAGE_JSON.url}#name`, check: PACKAGE_JSON.check, quote: "New packages must not have uppercase letters in the name." },
      ],
      examples: {
        smell: [{ "package.json": JSON.stringify({ name: "MyLib" }) }, { "package.json": JSON.stringify({ name: "_lib" }) }],
        clean: [{ "package.json": JSON.stringify({ name: "App", private: true }) }, { "package.json": JSON.stringify({ name: "@scope/_lib" }) }],
      },
    }),
  ],
});
