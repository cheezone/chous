/**
 * Where each claim comes from. Every reason chous gives that rests on someone
 * else's word is listed here with the words themselves, so it can be checked
 * and kept current: `pnpm run sources` fetches every page (`check`, the raw
 * source when the page is rendered in the browser) and confirms each quote is
 * still there.
 *
 * Reasons that need no source are facts about the machine itself: a
 * case-insensitive file system keeps one of `README.md` / `Readme.md`.
 */
import type { MessageKey } from "../i18n";

export type Source = {
  /** The page a person reads. */
  url: string;
  /** Words from that page, verbatim (markup removed). */
  quote: string;
  /** Raw text to verify against, when `url` is rendered client-side or blocked. */
  check?: string;
};

const GH = "https://raw.githubusercontent.com";

export const SOURCES: Partial<Record<MessageKey, Source[]>> = {
  "reason.envLocal": [
    { url: "https://vite.dev/guide/env-and-mode", check: `${GH}/vitejs/vite/main/docs/guide/env-and-mode.md`, quote: "loaded in all cases, ignored by git" },
    {
      url: "https://nextjs.org/docs/app/guides/environment-variables",
      check: `${GH}/vercel/next.js/canary/docs/01-app/02-guides/environment-variables.mdx`,
      quote: ".env*.local are intended to be ignored through .gitignore",
    },
  ],
  "reason.claudeLocal": [
    { url: "https://code.claude.com/docs/en/memory", check: "https://code.claude.com/docs/en/memory.md", quote: "Add CLAUDE.local.md to your .gitignore so it isn't committed." },
    { url: "https://code.claude.com/docs/en/settings", check: "https://code.claude.com/docs/en/settings.md", quote: "Claude Code keeps it out of git when it creates the file" },
  ],
  "reason.ideaWorkspace": [
    { url: "https://www.jetbrains.com/help/webstorm/configure-project-settings.html", quote: "The workspace.xml file stores user-specific settings that should not be shared." },
  ],
  "reason.cursorrules": [
    { url: "https://cursor.com/help/customization/rules#how-do-i-migrate-from-cursorrules", check: "https://cursor.com/help/customization/rules", quote: "cursorrules file in your project root is legacy and will be deprecated." },
  ],
  "reason.nextSrcIgnored": [
    {
      url: "https://nextjs.org/docs/app/api-reference/file-conventions/src-folder",
      check: `${GH}/vercel/next.js/canary/docs/01-app/03-api-reference/03-file-conventions/src-folder.mdx`,
      quote: "will be ignored if app or pages are present in the root directory.",
    },
  ],
  "reason.nextProxy": [
    {
      url: "https://nextjs.org/docs/app/api-reference/file-conventions/proxy",
      check: `${GH}/vercel/next.js/canary/docs/01-app/03-api-reference/03-file-conventions/proxy.mdx`,
      quote: "Middleware is deprecated and renamed to Proxy.",
    },
  ],
  "reason.nuxtSrcDir": [
    {
      url: "https://nuxt.com/docs/4.x/getting-started/upgrade#new-directory-structure",
      check: `${GH}/nuxt/nuxt/4.x/docs/1.getting-started/20.upgrade.md`,
      quote: "the new Nuxt default srcDir is app/ by default",
    },
  ],
  "reason.pnpmWorkspaces": [
    { url: "https://pnpm.io/workspaces", check: `${GH}/pnpm/pnpm.io/main/docs/workspaces.md`, quote: "only pnpm-workspace.yaml is read" },
  ],
  "reason.bunLockb": [
    { url: "https://bun.com/docs/pm/lockfile", check: `${GH}/oven-sh/bun/main/docs/pm/lockfile.mdx`, quote: "To migrate an existing binary bun.lockb, run bun install --save-text-lockfile" },
  ],
  "reason.devVars": [
    {
      url: "https://developers.cloudflare.com/workers/configuration/secrets/",
      check: `${GH}/cloudflare/cloudflare-docs/production/src/content/partials/workers/secrets-in-dev.mdx`,
      quote: "The .dev.vars and .env files should not be committed to git.",
    },
    {
      url: "https://developers.cloudflare.com/workers/platform/deploy-buttons/",
      check: `${GH}/cloudflare/cloudflare-docs/production/src/content/docs/workers/platform/deploy-buttons.mdx`,
      quote: "can be defined in a .dev.vars.example or .env.example file",
    },
  ],
  "issue.leftover.binary": [
    {
      url: "https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github#distributing-large-binaries",
      check: `${GH}/github/docs/main/content/repositories/working-with-files/managing-large-files/about-large-files-on-github.md`,
      quote: "If you need to distribute large files within your repository, you can create releases",
    },
  ],
  "issue.leak.artifact": [
    {
      url: "https://docs.gradle.org/current/userguide/directory_layout.html",
      check: `${GH}/gradle/gradle/master/platforms/documentation/docs/src/docs/userguide/reference/runtime-configuration/directory_layout.adoc`,
      quote: "the latter are transient files Gradle uses to support features like incremental builds",
    },
  ],
  "issue.twins.copy": [
    { url: "https://code.claude.com/docs/en/memory#agents-md", check: "https://code.claude.com/docs/en/memory.md", quote: "imports AGENTS.md" },
  ],
};

/** Sources for an issue: of its reason, its message, or a message inside the message. */
export function sourcesFor(keys: Array<MessageKey | undefined>): Source[] {
  return keys.flatMap((key) => (key && SOURCES[key]) || []);
}
