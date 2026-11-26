/**
 * Every source chous cites, by message key: the tools' words come from their
 * files in src/facts/; below are the words behind chous's own rules. Each
 * quote is checked on its page by `pnpm run sources`.
 *
 * Reasons that need no source are facts about the machine itself: a
 * case-insensitive file system keeps one of `README.md` / `Readme.md`.
 */
import type { MessageKey } from "../i18n";
import type { Source } from "../facts/define";
import { EOL } from "./eol";
import { DEP_SOURCES, FACT_SOURCES } from "../facts";

export type { Source };

const GH = "https://raw.githubusercontent.com";

export const SOURCES: Partial<Record<MessageKey, Source[]>> = {
  ...FACT_SOURCES,
  ...DEP_SOURCES,
  // Framework directories (taste/frameworks.ts).
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
  // Two workspace lists (taste/js.ts, monorepo).
  "issue.workspace.listsDiffer": [
    { url: "https://pnpm.io/workspaces", check: `${GH}/pnpm/pnpm.io/main/docs/workspaces.md`, quote: "If the workspaces field later lists different patterns than packages in pnpm-workspace.yaml, pnpm prints a warning, since only pnpm-workspace.yaml is read." },
  ],
  // Bun runs TypeScript itself (taste/js.ts, bun).
  "reason.bunRunsTs": [{ url: "https://bun.com/docs/runtime", check: `${GH}/oven-sh/bun/main/docs/runtime/index.mdx`, quote: "Bun supports TypeScript and JSX with no configuration." }],
  // Files with a claim to the root, and where releases belong (taste/hygiene.ts). Build output is
  // known by the marker its tool writes: a fact, not someone's word.
  "issue.leftover.rootDocs": [
    {
      url: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes",
      check: `${GH}/github/docs/main/content/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes.md`,
      quote: "If you put your README file in your repository's hidden .github, root, or docs directory",
    },
    {
      url: "https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file",
      check: `${GH}/github/docs/main/content/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file.md`,
      quote: "The root of the repository",
    },
    { url: "https://docs.npmjs.com/cli/configuring-npm/package-json#files", check: `${GH}/npm/cli/latest/docs/lib/content/configuring-npm/package-json.md`, quote: "Certain files are always included, regardless of settings" },
    { url: "https://github.com/unjs/changelogen#cli-usage", check: `${GH}/unjs/changelogen/main/README.md`, quote: "Defaults to CHANGELOG.md and resolved relative to dir" },
    { url: "https://code.claude.com/docs/en/memory", check: "https://code.claude.com/docs/en/memory.md", quote: "./CLAUDE.md or ./.claude/CLAUDE.md" },
    { url: "https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md", check: `${GH}/google-gemini/gemini-cli/main/docs/cli/gemini-md.md`, quote: "Context files, which use the default name GEMINI.md" },
  ],
  "issue.leftover.installer": [
    {
      url: "https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github#distributing-large-binaries",
      check: `${GH}/github/docs/main/content/repositories/working-with-files/managing-large-files/about-large-files-on-github.md`,
      quote: "If you need to distribute large files within your repository, you can create releases",
    },
  ],
  // CLAUDE.md can import AGENTS.md instead of copying it (the twins rule).
  "issue.twins.copy": [
    { url: "https://code.claude.com/docs/en/memory#agents-md", check: "https://code.claude.com/docs/en/memory.md", quote: "imports AGENTS.md" },
  ],
};

// End-of-life dates: each product's own schedule (checked by `pnpm run sync --check`).
for (const [product, { source }] of Object.entries(EOL)) {
  SOURCES[`eol.${product}` as MessageKey] = [{ url: source }];
}

/** Sources for an issue: of its reason, its message, or a message inside the message. */
export function sourcesFor(keys: Array<MessageKey | undefined>): Source[] {
  return keys.flatMap((key) => (key && SOURCES[key]) || []);
}
