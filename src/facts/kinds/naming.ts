import { type ContractFile, projectOf } from "../kit";
import { NOT_OURS } from "../../taste/hygiene";
import type { Fact, Text } from "./types";
import { build, type Common, target, type Target } from "./shared";

/** Name styles languages and frameworks prescribe, as the whole name must match them. */
export const STYLE = {
  /** No capitals: what PEP 8 asks of modules and packages (a hyphen makes a script, not a module). */
  lowercase: /^[^A-Z]+$/,
  /** `file_system`: Rust modules, Dart files and directories, Elixir files. */
  snake: /^[a-z0-9_]+$/,
  /** `user-profile`: Angular files. One word fits. */
  kebab: /^[a-z0-9]+(-[a-z0-9]+)*$/,
  /** `ProcessDeclarations`: Kotlin files. */
  upperCamel: /^[A-Z][A-Za-z0-9]*$/,
  /** `bytes`: Go packages. */
  oneWord: /^[a-z][a-z0-9]*$/,
};

/** What comes before the first dot: `user-profile` of `user-profile.spec.ts`, `Platform` of `Platform.jvm.kt`. */
export const stem = (f: ContractFile) => f.name.split(".")[0]!;
/** The directory a file sits in, by its own name. */
export const folder = (f: ContractFile) => f.dir.split("/").at(-1) ?? "";
/** One finding per directory, counting its files. */
export const byDirectory = (rel: string) => (rel.includes("/") ? `${rel.slice(0, rel.lastIndexOf("/"))}/` : "./");

/**
 * A name a language or framework prescribes a style for: a file, its
 * directory, or a name declared inside it (Go's `package`). Reported once per
 * directory, with the count and a name as an example.
 */
export function naming<const Id extends string>(
  spec: Common<Id> &
    Target & {
      /** The name to hold to the style, or undefined when the file has none to check. */
      name(file: ContractFile): string | undefined;
      style: RegExp;
      /** Narrows it to the projects the convention is for (an Angular app). */
      when?(file: ContractFile): boolean;
      message: Text;
    },
): Fact<Id> {
  return build(
    { groupBy: byDirectory, ...spec },
    "convention",
    target(spec),
    (f) => {
      if (spec.when && !spec.when(f)) return undefined;
      const name = spec.name(f);
      return name !== undefined && name !== "" && !spec.style.test(name) ? { name } : undefined;
    },
    spec.message,
  );
}

/**
 * Names that must keep to one of several styles throughout a project (Vue:
 * "always PascalCase or always kebab-case"). A project is the directory of the
 * nearest package.json. The style most of its names use is the project's; the
 * names in another one are reported together, under `label`.
 */
export function oneStyle<const Id extends string>(
  spec: Common<Id> &
    Target & {
      /** How the finding names the files, such as a glob for every `.vue` file. */
      label: string;
      /** The style of a file name, or undefined when it fits any (one word). */
      style(name: string): string | undefined;
      message: Text;
    },
): Fact<Id> {
  const match = target(spec);
  const named = (rel: string) => spec.style(rel.split("/").at(-1)!);
  // Each project's styles, counted once per snapshot. Fixtures and vendored code are not the project's.
  const counted = new WeakMap<Set<string>, Map<string, Map<string, number>>>();
  const styles = (f: ContractFile, project: string) => {
    const byProject = counted.get(f.all) ?? new Map<string, Map<string, number>>();
    counted.set(f.all, byProject);
    let counts = byProject.get(project);
    if (!counts) {
      counts = new Map();
      for (const rel of f.all) {
        if (!rel.startsWith(project) || NOT_OURS.test(rel) || !match.test(rel)) continue;
        const dir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
        if (projectOf({ ...f, dir }) !== project) continue; // a nested project counts for itself
        const style = named(rel);
        if (style) counts.set(style, (counts.get(style) ?? 0) + 1);
      }
      byProject.set(project, counts);
    }
    return counts;
  };
  return build(
    { groupBy: (_rel, f) => `${projectOf(f)}${spec.label}`, ...spec },
    "order",
    match,
    (f) => {
      const mine = named(f.rel);
      const counts = styles(f, projectOf(f));
      if (!mine || counts.size < 2) return undefined;
      const [majority] = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]!;
      return mine === majority ? undefined : { style: mine, majority };
    },
    spec.message,
  );
}
