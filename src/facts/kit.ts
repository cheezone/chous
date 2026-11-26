/**
 * What a fact can see of a file, and the small readers every kind shares:
 * frontmatter, TOML tables, JSON with comments, package versions, precedence.
 * Nothing here understands code; it reads names, sizes and declared values.
 */

/** What a fact can see of one file. */
export type ContractFile = {
  rel: string;
  name: string;
  dir: string;
  /** Size on disk, read when asked. */
  bytes(): number;
  text(): string;
  /** Every file of the project, relative. */
  all: Set<string>;
  /** The nearest package.json at or above this file, parsed. */
  pkg(): Record<string, any> | undefined;
  /** Some stylesheet of the project loads a config with `@config`. */
  cssLoadsConfig(): boolean;
  /** Text of another file of the project, by relative path ("" when absent). */
  read(rel: string): string;
  /** The package.json at the root of the project, parsed. */
  rootPkg(): Record<string, any> | undefined;
};

export const lines = (text: string) => text.split(/\r?\n/).length - (text.endsWith("\n") ? 1 : 0);

/** YAML frontmatter as raw text, and the body after it. */
export function frontmatter(text: string): { front: string; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  return m ? { front: m[1]!, body: m[2]! } : { front: "", body: text };
}

/** A top-level scalar from frontmatter, folded scalars joined. Enough for name and description. */
export function field(front: string, key: string): string | undefined {
  const m = new RegExp(`^${key}:[ \\t]*(?:[>|][-+]?)?[ \\t]*(.*(?:\\r?\\n[ \\t]+.*)*)`, "m").exec(front);
  if (!m) return undefined;
  return m[1]!.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join(" ").replace(/^(['"])(.*)\1$/, "$2");
}

export function major(spec: unknown): number | undefined {
  const m = typeof spec === "string" ? /^[\^~>=v\s]*(\d+)/.exec(spec) : null;
  return m ? Number(m[1]) : undefined;
}

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

/** The nearest package.json lists this package, in dependencies or devDependencies. */
export function hasDep(file: ContractFile, name: string): boolean {
  const pkg = file.pkg();
  return name in { ...pkg?.devDependencies, ...pkg?.dependencies };
}

export function depMajor(file: ContractFile, name: string): number | undefined {
  const pkg = file.pkg();
  return major({ ...pkg?.devDependencies, ...pkg?.dependencies }[name]);
}

/** `pnpm@11.2.0` → 11, for the package manager the project pins. */
export function pinnedManager(file: ContractFile, name: string): number | undefined {
  const pm = file.rootPkg()?.packageManager;
  return typeof pm === "string" && pm.startsWith(`${name}@`) ? major(pm.slice(name.length + 1)) : undefined;
}

/** A sibling path in the same directory. */
export const sibling = (file: ContractFile, name: string) => (file.dir ? `${file.dir}/${name}` : name);

/**
 * Of several config files in one directory, the one the tool reads: the first
 * of `order` that is present. Each entry is a file name, optionally with a test
 * of its text (a pyproject.toml only counts with its tool's section).
 */
export type Counts = RegExp | ((text: string) => boolean);
const counts = (test: Counts | undefined, text: string) => !test || (typeof test === "function" ? test(text) : test.test(text));

export function winner(file: ContractFile, order: Array<[string, Counts?]>): string | undefined {
  return order.find(([name, test]) => {
    const rel = sibling(file, name);
    return file.all.has(rel) && counts(test, file.read(rel));
  })?.[0];
}

/** The findings of a precedence contract: this file is present, counts, and is not the winner. */
export function shadowed(file: ContractFile, order: Array<[string, Counts?]>): Record<string, string> | undefined {
  const mine = order.find(([name]) => name === file.name);
  if (!mine || !counts(mine[1], file.text())) return undefined;
  const used = winner(file, order);
  return used && used !== file.name ? { used } : undefined;
}

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
