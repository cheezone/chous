import picomatch from "picomatch";
import type { WorkspaceSnapshot } from "../vfs/snapshot";
import type { KindDef, Signal, ToolDef } from "./types";
import type { RoleId } from "./roles";
import { getKnowledge } from "./registry";

export type Occupancy = {
  toolId: string;
  /** true when matched via files / scripts / pkgField (not deps-only). */
  strong: boolean;
};

export type RoleOccupancy = Map<RoleId, Occupancy[]>;

function matchFiles(snapshot: WorkspaceSnapshot, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // Root-level name match first (cheap)
    if (!pattern.includes("/") && !pattern.includes("**")) {
      const isMatch = picomatch(pattern, { dot: true });
      for (const entry of snapshot.listDir(".")) {
        if (isMatch(entry.name)) return true;
      }
      continue;
    }
    if (snapshot.match(pattern, { onlyFiles: false }).length > 0) return true;
  }
  return false;
}

function matchDeps(snapshot: WorkspaceSnapshot, names: string[]): boolean {
  const deps = snapshot.manifest.deps;
  return names.some((n) => deps.has(n));
}

function matchPkgField(snapshot: WorkspaceSnapshot, signal: Extract<Signal, { type: "pkgField" }>): boolean {
  const fields = snapshot.manifest.fields;
  if (!fields) return false;
  const value = fields[signal.field];
  if (signal.exists) return value !== undefined && value !== null && value !== false;
  if (signal.equals !== undefined) {
    if (value == null) return false;
    const str = String(value);
    const expected = Array.isArray(signal.equals) ? signal.equals : [signal.equals];
    // packageManager field is "pnpm@x.y.z"
    return expected.some((e) => str === e || str.startsWith(`${e}@`));
  }
  return value != null;
}

function matchScripts(snapshot: WorkspaceSnapshot, commands: string[]): boolean {
  const scripts = snapshot.manifest.scripts;
  if (!scripts) return false;
  const values = Object.values(scripts);
  return commands.some((cmd) => values.some((v) => v.includes(cmd)));
}

export function evalSignals(
  snapshot: WorkspaceSnapshot,
  signals: Signal[],
): { hit: boolean; strong: boolean } {
  let hit = false;
  let strong = false;
  for (const signal of signals) {
    let ok = false;
    if (signal.type === "files") ok = matchFiles(snapshot, signal.patterns);
    else if (signal.type === "deps") ok = matchDeps(snapshot, signal.names);
    else if (signal.type === "pkgField") ok = matchPkgField(snapshot, signal);
    else if (signal.type === "scripts") ok = matchScripts(snapshot, signal.commands);
    if (!ok) continue;
    hit = true;
    if (signal.type !== "deps") strong = true;
  }
  return { hit, strong };
}

export function detectRoleOccupancy(
  snapshot: WorkspaceSnapshot,
  tools: ToolDef[] = getKnowledge().tools,
): RoleOccupancy {
  const result: RoleOccupancy = new Map();
  for (const tool of tools) {
    for (const [role, presence] of Object.entries(tool.roles) as Array<[RoleId, NonNullable<ToolDef["roles"][RoleId]>]>) {
      if (!presence) continue;
      const { hit, strong } = evalSignals(snapshot, presence.signals);
      if (!hit) continue;
      const list = result.get(role) ?? [];
      list.push({ toolId: tool.id, strong });
      result.set(role, list);
    }
  }
  return result;
}

export function detectKinds(
  snapshot: WorkspaceSnapshot,
  kinds: KindDef[] = getKnowledge().kinds,
): string[] {
  const found: string[] = [];
  for (const kind of kinds) {
    const { hit } = evalSignals(snapshot, kind.signals);
    if (hit) found.push(kind.id);
  }
  return found;
}
