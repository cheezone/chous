import { tool } from "../../define";
import { limit, measure, misplaced, searchOrder } from "../../kinds";

const DOCS = "https://raw.githubusercontent.com/github/docs/main";
const PAGE = "https://docs.github.com/en";
const KiB = 1024;
const MiB = 1024 * KiB;
const LARGE = { url: `${PAGE}/repositories/working-with-files/managing-large-files/about-large-files-on-github`, check: `${DOCS}/data/variables/large_files.yml` };
const CODEOWNERS = {
  url: `${PAGE}/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners`,
  check: `${DOCS}/content/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners.md`,
};

export default tool({
  id: "github",
  name: "GitHub",
  researched: "2026-11",
  facts: [
    limit({
      id: "largeFile",
      match: /./,
      everywhere: true,
      measure: measure.bytes,
      max: 50 * MiB,
      params: (bytes) => ({ mib: Math.round(bytes / MiB) }),
      message: {
        en: "{{mib}} MiB: GitHub warns above 50 MiB and refuses files above 100 MiB; use Git LFS or a release",
        zh: "{{mib}} MiB：GitHub 对超过 50 MiB 的文件发警告，超过 100 MiB 直接拒收；改用 Git LFS 或 Releases",
      },
      sources: [
        { ...LARGE, quote: "warning_size: '50 MiB'" },
        { ...LARGE, quote: "max_github_size: '100 MiB'" },
      ],
      examples: { smell: [{ "data.bin": "x".repeat(51 * MiB) }], clean: [{ "data.bin": "x".repeat(MiB) }] },
    }),
    limit({
      id: "readmeSize",
      match: /^(\.github\/|docs\/)?readme(\.[\w]+)?$/i,
      measure: measure.bytes,
      max: 500 * KiB,
      params: (bytes) => ({ kib: Math.round(bytes / KiB), limit: 500 }),
      message: { en: "{{kib}} KiB: GitHub stops showing a README after {{limit}} KiB", zh: "{{kib}} KiB：GitHub 只显示 README 的前 {{limit}} KiB" },
      sources: [
        {
          url: `${PAGE}/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes`,
          check: `${DOCS}/content/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes.md`,
          quote: "any content beyond 500 KiB will be truncated.",
        },
      ],
      examples: { smell: [{ "README.md": "x".repeat(501 * KiB) }], clean: [{ "README.md": "x".repeat(400 * KiB) }, { "src/README.md": "x".repeat(501 * KiB) }] },
    }),
    searchOrder({
      id: "codeownersShadowed",
      // GitHub looks in .github/, the root, then docs/, "and use[s] the first one it finds".
      paths: [".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS"],
      message: { en: "never read: GitHub uses the first CODEOWNERS it finds, here {{used}}", zh: "永远不会被读：GitHub 只用找到的第一个 CODEOWNERS，这里是 {{used}}" },
      sources: [{ ...CODEOWNERS, quote: "will search for them in that order and use the first one it finds." }],
      examples: {
        smell: [{ ".github/CODEOWNERS": "* @a", "docs/CODEOWNERS": "* @b" }],
        clean: [{ "docs/CODEOWNERS": "* @b" }, { ".github/CODEOWNERS": "* @a", "src/CODEOWNERS": "* @b" }],
      },
    }),
    limit({
      id: "codeownersSize",
      match: /^(\.github\/|docs\/)?CODEOWNERS$/,
      measure: measure.bytes,
      // "must be under 3 MB": 3 MB itself is too large.
      max: 3 * 1000 * 1000,
      inclusive: true,
      params: (bytes) => ({ mb: Math.round(bytes / 1e6) }),
      message: { en: "{{mb}} MB: GitHub does not load a CODEOWNERS file of 3 MB or more", zh: "{{mb}} MB：GitHub 不加载 3 MB 及以上的 CODEOWNERS" },
      sources: [{ ...CODEOWNERS, quote: "CODEOWNERS files must be under 3 MB in size." }],
      examples: { smell: [{ ".github/CODEOWNERS": "x".repeat(3 * 1000 * 1000) }], clean: [{ ".github/CODEOWNERS": "* @a\n" }] },
    }),
    misplaced({
      id: "dependabotPlace",
      files: ["dependabot.yml", "dependabot.yaml"],
      allowed: [".github/dependabot.yml", ".github/dependabot.yaml"],
      message: { en: "never read: Dependabot reads only .github/dependabot.yml", zh: "永远不会被读：Dependabot 只读 .github/dependabot.yml" },
      sources: [
        {
          url: `${PAGE}/code-security/concepts/supply-chain-security/about-the-dependabot-yml-file`,
          check: `${DOCS}/content/code-security/concepts/supply-chain-security/about-the-dependabot-yml-file.md`,
          quote: "You must store this file in the .github directory of your repository",
        },
      ],
      examples: { smell: [{ "dependabot.yml": "version: 2" }], clean: [{ ".github/dependabot.yml": "version: 2" }] },
    }),
    misplaced({
      id: "workflowPlace",
      // YAML under .github/ that is a workflow (on: and jobs:), outside workflows/ and the template folders.
      match: /^\.github\/(?!workflows\/|ISSUE_TEMPLATE\/|DISCUSSION_TEMPLATE\/).+\.ya?ml$/,
      when: (f) => {
        const text = f.text();
        return /^on:/m.test(text) && /^jobs:/m.test(text) ? {} : undefined;
      },
      message: { en: "never run: GitHub Actions only reads workflows from .github/workflows/", zh: "永远不会运行：GitHub Actions 只读 .github/workflows/ 里的工作流" },
      sources: [
        {
          url: `${PAGE}/actions/reference/workflows-and-actions/workflow-syntax`,
          check: `${DOCS}/content/actions/reference/workflows-and-actions/workflow-syntax.md`,
          quote: "You must store workflow files in the .github/workflows directory of your repository.",
        },
      ],
      examples: {
        smell: [{ ".github/workflow/ci.yml": "on: push\njobs:\n  test: {}\n" }],
        clean: [{ ".github/workflows/ok.yml": "on: push\njobs:\n  test: {}\n" }, { ".github/labeler.yml": "area: ['src/**']\n" }],
      },
    }),
  ],
});
