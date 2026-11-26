import { tool } from "../../define";
import { unread } from "../../kinds";
import { parseJsonc, pinnedManager } from "../../kit";

const RELEASE = { url: "https://pnpm.io/blog/releases/11.0", check: "https://raw.githubusercontent.com/pnpm/pnpm.io/main/blog/releases/11.0.md" };

/** pnpm 11 reads only registry, auth, TLS and network settings from .npmrc. */
const NPMRC_READ = /^(registry|@[^:]+:registry|\/\/.*|_auth|_authToken|always-auth|ca|cafile|cert|certfile|key|keyfile|strict-ssl|proxy|http-proxy|https-proxy|no-proxy|noproxy|local-address|git-shallow-hosts|email|username|_password|tokenHelper)$/;

const pkg = (pnpm: string, extra: object = {}) => JSON.stringify({ name: "app", private: true, packageManager: `pnpm@${pnpm}`, ...extra });

export default tool({
  id: "pnpm",
  name: "pnpm",
  researched: "2026-11",
  facts: [
    unread({
      id: "pnpmNpmrc",
      files: [".npmrc"],
      root: true,
      when: (f) => {
        if ((pinnedManager(f, "pnpm") ?? 0) < 11) return undefined;
        const keys = f
          .text()
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !/^[#;]/.test(l) && l.includes("="))
          .map((l) => l.slice(0, l.indexOf("=")).trim())
          .filter((k) => !NPMRC_READ.test(k));
        return keys.length ? { keys: [...new Set(keys)].join(", ") } : undefined;
      },
      message: {
        en: "pnpm 11 reads only registry and auth settings from .npmrc; these do nothing: {{keys}}. Move them to pnpm-workspace.yaml",
        zh: "pnpm 11 只从 .npmrc 读 registry 和认证设置；这些不会生效：{{keys}}。移到 pnpm-workspace.yaml",
      },
      sources: [{ ...RELEASE, quote: "pnpm no longer reads non-auth settings from .npmrc." }],
      examples: {
        smell: [{ "package.json": pkg("11.2.0"), ".npmrc": "registry=https://registry.npmjs.org/\nshamefully-hoist=true\n" }],
        clean: [{ "package.json": pkg("10.0.0"), ".npmrc": "shamefully-hoist=true\n" }, { "package.json": pkg("11.2.0"), ".npmrc": "registry=https://registry.npmjs.org/\n" }],
      },
    }),
    unread({
      id: "pnpmField",
      files: ["package.json"],
      root: true,
      when: (f) => ((pinnedManager(f, "pnpm") ?? 0) >= 11 && parseJsonc(f.text())?.pnpm !== undefined ? {} : undefined),
      message: {
        en: "pnpm 11 no longer reads the pnpm field in package.json; move it to pnpm-workspace.yaml",
        zh: "pnpm 11 不再读 package.json 的 pnpm 字段；移到 pnpm-workspace.yaml",
      },
      sources: [{ ...RELEASE, quote: "pnpm no longer reads the pnpm field in package.json." }],
      examples: {
        smell: [{ "package.json": pkg("11.2.0", { pnpm: { overrides: {} } }) }],
        clean: [{ "package.json": pkg("10.0.0", { pnpm: {} }) }],
      },
    }),
  ],
});
