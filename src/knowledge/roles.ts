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

/** Human label for a role: `test-runner` → `test runner`. */
export function roleLabel(role: RoleId): string {
  return role.replace(/-/g, " ");
}
