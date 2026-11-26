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
  // Two workspace lists (taste/js.ts, monorepo).
  "issue.workspace.listsDiffer": [
    { url: "https://pnpm.io/workspaces", check: `${GH}/pnpm/pnpm.io/main/docs/workspaces.md`, quote: "If the workspaces field later lists different patterns than packages in pnpm-workspace.yaml, pnpm prints a warning, since only pnpm-workspace.yaml is read." },
  ],
  // Files with a claim to the root, and where releases belong (taste/hygiene.ts). Build output is
  // known by the marker its tool writes: a fact, not someone's word.
  "issue.leak.venv": [
    { url: "https://docs.python.org/3/library/venv.html", check: `${GH}/python/cpython/main/Doc/library/venv.rst`, quote: "Not checked into source control systems such as Git." },
  ],
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
