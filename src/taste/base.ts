import { taste } from "./define";

const CONFIG_EXT = "{ts,js,cjs,mjs,json,jsonc,json5,toml,ini,yaml,yml,ymlc}";

const DOCS = [
  "README*.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CODE_OF_CONDUCT.md",
  "GOVERNANCE.md",
  "SUPPORT.md",
  "AGENTS.md",
  "CLAUDE.md",
  "GUIDE.md",
];

const LICENSES = ["LICENSE*", "LICENCE*", "COPYING*", "COPYRIGHT*"];

/**
 * Config files are allowed by format, not by name: hosting platforms and tools
 * come and go, but they keep reading JSON / TOML / YAML from the repo root.
 */
const CONFIG_FORMATS = ["*.{json,jsonc,json5,toml,yaml,yml}", "*.lock", "*.lockb"];

/** Extensionless files that tools have read from the root for decades. */
const CLASSIC = ["Dockerfile*", "Containerfile*", "Makefile", "Procfile", "CNAME", "_redirects", "_headers"];

/** Applies to every repository. */
export function base() {
  const t = taste("base");

  // The root is a whitelist of visible files. Dotfiles are left alone: new tools
  // keep adding them, and the ones that rot or leak are banned explicitly below.
  t.dir(".", [], { strict: true });

  t.allow([...LICENSES, "CODEOWNERS"]);
  t.allow([`*.config.${CONFIG_EXT}`, `*.config.*.${CONFIG_EXT}`, ...CONFIG_FORMATS, ...CLASSIC], {
    reason: { en: "Tool configs", zh: "工具配置文件" },
  });
  t.allow(["docs", "examples", "docker", "charts"]);
  t.allow(DOCS);

  t.only("./*.md", [...DOCS, ...LICENSES], {
    reason: { en: "Root Markdown is for project docs only; put the rest in docs/", zh: "根目录的 Markdown 只放项目文档，其余放进 docs/" },
  });

  t.lifecycle();

  t.no([".chous", ".chousignore"], { reason: { en: "chous has no config, delete it", zh: "chous 没有配置，删掉它" } });

  // Anything still visible here is not gitignored, so it would be committed.
  t.no(["**/.DS_Store", "**/Thumbs.db", "**/desktop.ini"], { reason: { en: "OS junk, delete it and gitignore it", zh: "系统垃圾文件，删掉并加进 .gitignore" } });
  t.no(["**/.env", "**/.env.local", "**/.env.*.local"], {
    reason: { en: "secrets, gitignore it and commit .env.example instead", zh: "密钥文件，加进 .gitignore，改为提交 .env.example" },
  });
  t.no(["**/*.log"], { reason: { en: "logs, gitignore them", zh: "日志文件，加进 .gitignore" } });

  return t.rules;
}
