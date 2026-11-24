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

/** Deployment / hosting configs that platforms require at the repo root. */
const DEPLOY = [
  "renovate.json",
  "Dockerfile*",
  "docker-compose.{yml,yaml}",
  "nginx.conf",
  "wrangler.{toml,json,jsonc}",
  "wrangler.example.{toml,json,jsonc}",
  "_redirects",
  "_headers",
  "edgeone.json",
  "vercel.json",
  "vercel.yaml",
  "netlify.toml",
  "fly.toml",
  "CNAME",
  "railway.json",
  "railway.toml",
  "render.yaml",
  "amplify.yml",
  "apprunner.yaml",
  "Dockerrun.aws.json",
  "template.yaml",
  "captain-definition",
  "coolify.yml",
  "firebase.json",
  "app.yaml",
  "cron.yaml",
  "dispatch.yaml",
  "index.yaml",
  "Chart.yaml",
  "values.yaml",
  "Procfile",
  "kustomization.yaml",
  "nixpacks.toml",
  "serverless.yml",
];

/** Applies to every repository. */
export function base() {
  const t = taste("base");

  // The root is a whitelist — dotfiles included: anything no taste allows is an error.
  t.dir(".", [], { strict: true, dotfiles: true });
  t.allow([".gitignore", ".gitattributes", ".gitmodules", ".mailmap", ".git-blame-ignore-revs"]);
  t.allow([".editorconfig", ".vscode", ".devcontainer", ".dockerignore", ".env.example"]);
  t.allow([".claude", ".cursor", ".mcp.json"], { reason: { en: "Coding agent settings", zh: "AI 编程助手的配置" } });

  t.allow([...LICENSES, "CODEOWNERS"]);
  t.allow([`*.config.${CONFIG_EXT}`, `*.config.*.${CONFIG_EXT}`], { reason: { en: "Tool configs", zh: "工具配置文件" } });
  t.allow(["docs", "examples", "docker", "charts"]);
  t.allow(DOCS);
  t.allow(DEPLOY, { reason: { en: "Hosting platforms read these from the repo root", zh: "托管平台从仓库根目录读取这些文件" } });

  t.only("./*.md", [...DOCS, ...LICENSES], {
    reason: { en: "Root Markdown is for project docs only; put the rest in docs/", zh: "根目录的 Markdown 只放项目文档，其余放进 docs/" },
  });

  t.no([".chous", ".chousignore"], { reason: { en: "chous has no config, delete it", zh: "chous 没有配置，删掉它" } });

  // Anything still visible here is not gitignored, so it would be committed.
  t.no(["**/.DS_Store", "**/Thumbs.db", "**/desktop.ini"], { reason: { en: "OS junk, delete it and gitignore it", zh: "系统垃圾文件，删掉并加进 .gitignore" } });
  t.no(["**/.env", "**/.env.local", "**/.env.*.local"], {
    reason: { en: "secrets, gitignore it and commit .env.example instead", zh: "密钥文件，加进 .gitignore，改为提交 .env.example" },
  });
  t.no(["**/*.log"], { reason: { en: "logs, gitignore them", zh: "日志文件，加进 .gitignore" } });

  return t.rules;
}
