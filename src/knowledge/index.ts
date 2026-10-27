export { ROLE_IDS, ROLE_DSL_NAMES, parseRoleDslName, roleDslName, type RoleId } from "./roles";
export {
  defineTool,
  defineKind,
  defineMigration,
  type ToolDef,
  type KindDef,
  type MigrationDef,
  type Resolution,
  type Signal,
  type ToolStatus,
  type RolePresence,
} from "./types";
export { knowledge, getKnowledge, knowledgeToJSON, type KnowledgeBundle } from "./registry";
export {
  detectRoleOccupancy,
  detectKinds,
  lookupMigration,
  defaultResolution,
  toolFileEffects,
  evalSignals,
  type Occupancy,
  type RoleOccupancy,
} from "./detect";
