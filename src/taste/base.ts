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

  // The root is a whitelist: anything no taste allows is an error.
  t.dir(".", [], { strict: true });

  t.allow([...LICENSES, "CODEOWNERS"]);
  t.allow([`*.config.${CONFIG_EXT}`, `*.config.*.${CONFIG_EXT}`], { reason: "Tool configs" });
  t.allow(["docs", "examples", "docker", "charts"]);
  t.allow(DOCS);
  t.allow(DEPLOY, { reason: "Hosting platforms read these from the repo root" });

  t.only("./*.md", [...DOCS, ...LICENSES], {
    reason: "Root Markdown is for project docs only; put the rest in docs/",
  });

  t.no([".chous", ".chousignore"], {
    reason: "chous has no config: delete it",
  });

  return t.rules;
}
