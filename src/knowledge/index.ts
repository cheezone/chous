export { ROLE_IDS, roleLabel, type RoleId } from "./roles";
export {
  defineTool,
  defineKind,
  type ToolDef,
  type KindDef,
  type Signal,
  type RolePresence,
} from "./types";
export { knowledge, getKnowledge, knowledgeToJSON, type KnowledgeBundle } from "./registry";
export {
  detectRoleOccupancy,
  detectKinds,
  evalSignals,
  type Occupancy,
  type RoleOccupancy,
} from "./detect";
