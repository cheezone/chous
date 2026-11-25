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

/** Message key of a role's human label: `role.test-runner`. */
export function roleLabel(role: RoleId): `role.${RoleId}` {
  return `role.${role}`;
}
