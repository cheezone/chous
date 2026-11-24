import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { taste } from "./define";

export type GitHost = "github" | "cnb" | "gitlab" | "other";

/** Locate the git config, following `.git` files used by worktrees and submodules. */
function gitConfigPath(root: string): string | undefined {
  const dotGit = resolve(root, ".git");
  if (!existsSync(dotGit)) return undefined;
  if (statSync(dotGit).isDirectory()) return resolve(dotGit, "config");

  const pointer = readFileSync(dotGit, "utf8").match(/^gitdir:\s*(.+)$/m)?.[1]?.trim();
  if (!pointer) return undefined;
  const gitDir = resolve(root, pointer);
  // Worktrees keep the shared config in the common dir.
  const common = resolve(gitDir, "commondir");
  const configDir = existsSync(common) ? resolve(gitDir, readFileSync(common, "utf8").trim()) : gitDir;
  return resolve(configDir, "config");
}

/** Host of `remote "origin"`, falling back to the first remote. */
export function detectGitHost(root: string): GitHost | undefined {
  const configPath = gitConfigPath(root);
  if (!configPath || !existsSync(configPath)) return undefined;
  const config = readFileSync(configPath, "utf8");
  const origin = config.match(/\[remote "origin"\][^[]*?url\s*=\s*(\S+)/)?.[1];
  const url = origin ?? config.match(/\[remote "[^"]+"\][^[]*?url\s*=\s*(\S+)/)?.[1];
  if (!url) return "other";
  if (/github\.com[:/]/.test(url)) return "github";
  if (/cnb\.cool[:/]/.test(url)) return "cnb";
  if (/gitlab\./.test(url)) return "gitlab";
  return "other";
}

/** True when `root` is the top of a git repository (not a folder inside one). */
export function isGitRoot(root: string): boolean {
  return existsSync(resolve(root, ".git"));
}

const FOREIGN_CI = [
  ".travis.yml",
  ".circleci",
  "appveyor.yml",
  ".appveyor.yml",
  "azure-pipelines.yml",
  "Jenkinsfile",
  ".drone.yml",
  "bitbucket-pipelines.yml",
];

/** Any git repository. */
export function git(host: GitHost | undefined) {
  const t = taste("git");
  t.must([".gitignore"]);
  const foreign = host === "gitlab" ? FOREIGN_CI : [...FOREIGN_CI, ".gitlab-ci.yml"];
  t.no(foreign, { reason: "one CI: GitHub Actions or CNB" });
  if (host === "gitlab") t.allow([".gitlab-ci.yml", ".gitlab"]);
  return t.rules;
}

/** GitHub: `.github/` holds only what GitHub reads. */
export function github() {
  const t = taste("github");
  t.allow([".github"]);
  t.dir(".github", [
    "workflows", "actions", "workflow-templates", "profile",
    "ISSUE_TEMPLATE", "DISCUSSION_TEMPLATE", "PULL_REQUEST_TEMPLATE",
    "pull_request_template.md", "PULL_REQUEST_TEMPLATE.md",
    "dependabot.yml", "release.yml", "labeler.yml", "labels.yml", "FUNDING.yml", "CODEOWNERS",
    "README.md", "SECURITY.md", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "SUPPORT.md",
    "copilot-instructions.md", "instructions", "prompts",
  ], { strict: true, reason: "GitHub only reads these from .github/" });
  // One extension, one naming style.
  t.dir(".github/workflows", ["*.yml"], { strict: true, reason: "Workflows end in .yml" });
  t.naming(".github/workflows/*.yml", ["kebab-case"]);
  return t.rules;
}

/** CNB (cnb.cool): `.cnb.yml` at the root, templates under `.cnb/`. */
export function cnb() {
  const t = taste("cnb");
  t.allow([".cnb.yml", ".cnb"]);
  t.no([".cnb.yaml"], { reason: "CNB pipelines live in .cnb.yml" });
  return t.rules;
}
