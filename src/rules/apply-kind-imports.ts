import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseFsLintConfig } from "../config/parser";
import { detectKinds } from "../knowledge";
import type { FsLintConfig, Rule } from "../types";
import type { WorkspaceSnapshot } from "../vfs/snapshot";

/**
 * Merge kind-scoped preset rules into the config when the workspace matches.
 * Rules from matching `for <kind> import …` presets are appended.
 */
export function applyKindImports(
  config: FsLintConfig,
  snapshot: WorkspaceSnapshot,
): FsLintConfig {
  if (!config.kindImports?.length) return config;

  const kinds = new Set(detectKinds(snapshot));
  const extraRules: Rule[] = [];
  const extraImports: string[] = [];
  let persona = config.persona;

  for (const ki of config.kindImports) {
    if (!kinds.has(ki.kind)) continue;
    const path = ki.resolvedPath;
    if (!path || !existsSync(path)) continue;
    const raw = readFileSync(path, "utf8");
    const imported = parseFsLintConfig(raw, path);
    for (const rule of imported.rules) {
      if (rule.kind === "thoseOnly" && rule.only.length > 0) {
        rule.only = [];
      }
      extraRules.push(rule);
    }
    if (imported.imports) extraImports.push(...imported.imports);
    if (!persona && imported.persona) persona = imported.persona;
    extraImports.push(resolve(path));
  }

  if (extraRules.length === 0) return config;

  return {
    ...config,
    rules: [...config.rules, ...extraRules],
    imports: [...(config.imports ?? []), ...extraImports],
    ...(persona ? { persona } : {}),
  };
}
