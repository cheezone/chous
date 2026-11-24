import type { Text } from "../i18n/text";

/** Public role IDs — treated as stable API once shipped. */
export const ROLE_IDS = [
  "package-manager",
  "runtime",
  "linter",
  "formatter",
  "typechecker",
  "test-runner",
  "e2e",
  "bundler",
  "framework",
  "git-hooks",
  "monorepo",
  "release",
] as const;

export type RoleId = (typeof ROLE_IDS)[number];

const LABELS: Record<RoleId, Text> = {
  "package-manager": { en: "package manager", zh: "包管理器" },
  runtime: { en: "runtime", zh: "运行时" },
  linter: { en: "linter", zh: "代码检查" },
  formatter: { en: "formatter", zh: "格式化" },
  typechecker: { en: "type checker", zh: "类型检查" },
  "test-runner": { en: "test runner", zh: "测试框架" },
  e2e: { en: "e2e tests", zh: "端到端测试" },
  bundler: { en: "bundler", zh: "打包工具" },
  framework: { en: "framework", zh: "框架" },
  "git-hooks": { en: "git hooks", zh: "Git 钩子" },
  monorepo: { en: "monorepo", zh: "monorepo" },
  release: { en: "release", zh: "发版工具" },
};

/** Human label for a role, in every language. */
export function roleLabel(role: RoleId): Text {
  return LABELS[role];
}
