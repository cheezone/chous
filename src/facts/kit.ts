/**
 * What a fact can see of a file, and the small readers the kinds share:
 * the nearest project file, generated-file markers, TOML tables, JSON with
 * comments. Nothing here understands code; it reads names and declared values.
 */

/** What a fact can see of one file. */
export type ContractFile = {
  rel: string;
  name: string;
  dir: string;
  text(): string;
  /** Every file of the project, relative. */
  all: Set<string>;
  /** False for fixtures and vendored code: what the tools that put it there, or .gitattributes, say is not the project's. */
  ours(rel: string): boolean;
  /** Text of another file of the project, by relative path ("" when absent). */
  read(rel: string): string;
};

/**
 * The directory of the nearest file named `name` at or above this file, as a
 * prefix of relative paths: `""` for the root, `packages/a/` for a package.
 * Undefined when there is none.
 */
export function nearest(file: ContractFile, name: string): string | undefined {
  const parts = file.dir ? file.dir.split("/") : [];
  for (let i = parts.length; i >= 0; i--) {
    const prefix = parts.slice(0, i).map((p) => `${p}/`).join("");
    if (file.all.has(`${prefix}${name}`)) return prefix;
  }
  return undefined;
}

/** The project a file belongs to: the directory of its nearest package.json, or the root. */
export const projectOf = (file: ContractFile) => nearest(file, "package.json") ?? "";

/**
 * The file says a tool wrote it: Go's `Code generated … DO NOT EDIT.`,
 * `@generated`, slang's `Generated file. Do not edit.`, build_runner's
 * `GENERATED CODE - DO NOT MODIFY BY HAND`.
 * Its name is the generator's choice, not the project's.
 */
export const generated = (file: ContractFile) => GENERATED.test(file.text().slice(0, 1024));
// Markers as tools write them: case matters, so prose about "generated code" is not one.
const GENERATED = /@generated\b|\bDO NOT (EDIT|MODIFY)\b|\b[Gg]enerated\b[^\n]{0,80}\b[Dd]o not (edit|modify)\b/;

/** JSON with comments and trailing commas, as tsconfig allows. */
export function parseJsonc(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    // Comments or trailing commas: strip them in one pass, then try again.
  }
  const kept: string[] = [];
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      while (++i < text.length && text[i] !== '"') if (text[i] === "\\") i++;
    } else if (c === "/" && (text[i + 1] === "/" || text[i + 1] === "*")) {
      kept.push(text.slice(from, i));
      const end = text[i + 1] === "/" ? text.indexOf("\n", i) : text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : text[i + 1] === "/" ? end - 1 : end + 1;
      from = i + 1;
    }
  }
  kept.push(text.slice(from));
  try {
    return JSON.parse(kept.join("").replace(/,(\s*[}\]])/g, "$1"));
  } catch {
    return undefined;
  }
}

/** The keys set directly under a TOML table header, up to the next header. */
export function tomlTableKeys(text: string, table: string): string[] {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === `[${table}]`);
  if (start < 0) return [];
  const keys: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\s*\[/.test(line)) break;
    // Dotted keys name their first part: `authors.workspace = true` sets authors.
    const m = /^([A-Za-z0-9_-]+)(?:\s*\.\s*[A-Za-z0-9_-]+)*\s*=/.exec(line);
    if (m) keys.push(m[1]!);
  }
  return keys;
}
