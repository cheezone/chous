import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { taste } from "./define";

/** True when `root` is the top of a git repository (a `.git` dir, or a worktree / submodule pointer). */
export function isGitRoot(root: string): boolean {
  return existsSync(resolve(root, ".git"));
}

/** Any git repository. */
export function git() {
  const t = taste("git");
  t.must([".gitignore"]);
  return t.rules;
}

/** GitHub Actions: one extension, one naming style. */
export function github() {
  const t = taste("github");
  t.dir(".github/workflows", ["*.yml"], { strict: true, reason: { en: "Workflows end in .yml", zh: "workflow 文件用 .yml 结尾" } });
  t.naming(".github/workflows/*.yml", ["kebab-case"]);
  return t.rules;
}
