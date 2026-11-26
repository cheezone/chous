import { absent, tool } from "../../define";

const GH = "https://raw.githubusercontent.com";

/** The `.env` file convention, as Vite and Next.js document it. `.env` itself may be committed; `.env*.local` may not. */
export default tool({
  id: "env-files",
  name: ".env files",
  researched: "2026-11",
  facts: [],
  absent: [
    absent({
      id: "envLocal",
      scope: "base",
      names: ["**/.env*.local"],
      value: "cleanliness",
      message: {
        en: "a local env file that may hold secrets: Vite and Next.js say to gitignore *.local → gitignore it",
        zh: "本地环境变量文件，可能含密钥：Vite 和 Next.js 官方都要求把 *.local 加进 .gitignore → 加进 .gitignore",
      },
      sources: [
        { url: "https://vite.dev/guide/env-and-mode", check: `${GH}/vitejs/vite/main/docs/guide/env-and-mode.md`, quote: "loaded in all cases, ignored by git" },
        {
          url: "https://nextjs.org/docs/app/guides/environment-variables",
          check: `${GH}/vercel/next.js/canary/docs/01-app/02-guides/environment-variables.mdx`,
          quote: ".env*.local are intended to be ignored through .gitignore",
        },
      ],
      examples: { smell: [{ ".env.local": "KEY=x" }, { "apps/web/.env.production.local": "KEY=x" }], clean: [{ ".env": "PUBLIC=x", ".env.example": "KEY=" }] },
    }),
  ],
});
