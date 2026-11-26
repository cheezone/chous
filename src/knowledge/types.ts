import type { RoleId } from "./roles";

/** Detection signals — filenames, deps, package.json fields, scripts. No source parsing. */
export type Signal =
  | { type: "files"; patterns: string[] }
  | { type: "deps"; names: string[] }
  | { type: "pkgField"; field: string; equals?: string | string[]; exists?: boolean }
  | { type: "scripts"; commands: string[] };

export type RolePresence = {
  /** Any matching signal marks the tool as occupying this role. */
  signals: Signal[];
};

export type ToolDef = {
  id: string;
  name: string;
  roles: Partial<Record<RoleId, RolePresence>>;
};

export type KindDef = {
  id: string;
  name: string;
  signals: Signal[];
};

export function defineTool(def: ToolDef): ToolDef {
  return def;
}

export function defineKind(def: KindDef): KindDef {
  return def;
}

