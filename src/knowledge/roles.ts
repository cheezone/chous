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

/** DSL surface names (spaces) → RoleId. */
export const ROLE_DSL_NAMES: Record<string, RoleId> = {
  "package manager": "package-manager",
  runtime: "runtime",
  linter: "linter",
  formatter: "formatter",
  typechecker: "typechecker",
  "test runner": "test-runner",
  e2e: "e2e",
  bundler: "bundler",
  framework: "framework",
  "git hooks": "git-hooks",
  monorepo: "monorepo",
  release: "release",
};

export function roleDslName(role: RoleId): string {
  for (const [name, id] of Object.entries(ROLE_DSL_NAMES)) {
    if (id === role) return name;
  }
  return role;
}

export function parseRoleDslName(name: string): RoleId | undefined {
  return ROLE_DSL_NAMES[name.trim().toLowerCase()];
}
