export { lintWorkspace } from "./rules/lint";
export { applySafeFixes } from "./rules/autofix";
export { renderReport } from "./rules/report";
export { resolveTaste, type Taste } from "./taste";
export { buildWorkspaceSnapshot, createMemorySnapshot } from "./vfs/snapshot";
export { getKnowledge, knowledgeToJSON, detectKinds, detectRoleOccupancy } from "./knowledge";
export { scanDirectory, findGitRepos, formatScanText } from "./scan";
export type { Issue, LintResult, Rule, SafeFix, Severity, Resolution, RoleRule } from "./types";
