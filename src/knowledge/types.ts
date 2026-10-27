import type { RoleId } from "./roles";

/** How an agent / CI should treat a finding. */
export type Resolution = "auto" | "agent" | "info";

export type ToolStatus = "active" | "deprecated" | "beta";

/** Detection signals — filenames, deps, package.json fields, scripts. No source parsing. */
export type Signal =
  | { type: "files"; patterns: string[] }
  | { type: "deps"; names: string[] }
  | { type: "pkgField"; field: string; equals?: string | string[]; exists?: boolean }
  | { type: "scripts"; commands: string[] };

export type RolePresence = {
  /** Any matching signal marks the tool as occupying this role. */
  signals: Signal[];
  /**
   * Config / lock / marker files owned by this tool in this role.
   * Declared tools auto-allow these; siblings in the same role auto-forbid theirs.
   */
  files?: string[];
};

export type ToolDef = {
  id: string;
  name: string;
  status?: ToolStatus;
  roles: Partial<Record<RoleId, RolePresence>>;
};

export type KindDef = {
  id: string;
  name: string;
  signals: Signal[];
};

export type MigrationDef = {
  role: RoleId;
  from: string;
  to: string;
  resolution: Resolution;
  see?: string;
  /** Pitfall notes for agents. */
  notes?: string;
};

export function defineTool(def: ToolDef): ToolDef {
  return def;
}

export function defineKind(def: KindDef): KindDef {
  return def;
}

export function defineMigration(def: MigrationDef): MigrationDef {
  return def;
}
