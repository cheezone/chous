/**
 * The kinds of fact chous knows. Each is written once — its check and, where
 * the words are the same for every tool, its message — and every tool uses it
 * as data. A new tool should need no new code; a new kind is a decision.
 */
export { exclusive, precedence } from "./precedence";
export { custom, legacy, misplaced, unread } from "./legacy";
export { limit, measure } from "./limit";
export { byDirectory, folder, naming, oneStyle, stem, STYLE } from "./naming";
export { searchOrder } from "./search";
export { deprecatedKeys, deprecatedTable } from "./toml";
