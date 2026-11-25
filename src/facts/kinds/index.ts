/**
 * The kinds of fact chous knows. Each is written once — its check and, where
 * the words are the same for every tool, its message — and every tool uses it
 * as data. A new tool should need no new code; a new kind is a decision.
 */
export { precedence } from "./precedence";
export { legacy } from "./legacy";
export { deprecatedKeys, deprecatedTable } from "./toml";
