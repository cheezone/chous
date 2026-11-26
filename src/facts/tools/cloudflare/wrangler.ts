import { absent, tool } from "../../define";

const DOCS = "https://raw.githubusercontent.com/cloudflare/cloudflare-docs/production/src/content";
const WRANGLER = { "wrangler.toml": 'name = "w"\n' };

export default tool({
  id: "wrangler",
  name: "Cloudflare Wrangler",
  researched: "2026-11",
  facts: [],
  absent: [
    absent({
      id: "devVars",
      scope: "cloudflare",
      names: ["**/.dev.vars", "**/.dev.vars.!(example)"],
      value: "cleanliness",
      message: { en: "Worker secrets, gitignore it and commit .dev.vars.example instead", zh: "Worker 密钥，加进 .gitignore，改为提交 .dev.vars.example" },
      sources: [
        { url: "https://developers.cloudflare.com/workers/configuration/secrets/", check: `${DOCS}/partials/workers/secrets-in-dev.mdx`, quote: "The .dev.vars and .env files should not be committed to git." },
        { url: "https://developers.cloudflare.com/workers/platform/deploy-buttons/", check: `${DOCS}/docs/workers/platform/deploy-buttons.mdx`, quote: "can be defined in a .dev.vars.example or .env.example file" },
      ],
      examples: { smell: [{ ...WRANGLER, ".dev.vars": "KEY=x" }, { ...WRANGLER, ".dev.vars.staging": "KEY=x" }], clean: [{ ...WRANGLER, ".dev.vars.example": "KEY=" }] },
    }),
    absent({
      id: "wranglerState",
      scope: "cloudflare",
      names: [".wrangler"],
      value: "cleanliness",
      message: { en: "local Wrangler state, gitignore it", zh: "Wrangler 本地状态，加进 .gitignore" },
      sources: [
        { url: "https://developers.cloudflare.com/workers/vite-plugin/", check: `${DOCS}/partials/workers/vite-plugin/update-gitignore.mdx`, quote: "additional files are used and/or generated that should not be stored in Git" },
      ],
      examples: { smell: [{ ...WRANGLER, ".wrangler/state/v3/d1.sqlite": "" }], clean: [{ ...WRANGLER, "src/index.ts": "export default {}" }] },
    }),
  ],
});
