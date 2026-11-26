/**
 * What a lockfile recorded about a project's direct dependencies: the version
 * installed, and the deprecation its authors set on the npm registry, copied
 * in at install time (`npm deprecate`: "a deprecation warning to all who
 * attempt to install it"). pnpm and npm keep that sentence; Yarn and Bun do not.
 *
 * Read line by line, without a YAML parser: the lockfile is untrusted input,
 * and only a few known keys matter.
 */

export type Locked = { version: string; deprecated?: string };

const SECTIONS = new Set(["dependencies", "devDependencies", "optionalDependencies"]);

/** `'@scope/name'` → `@scope/name`; YAML doubles a quote inside single quotes. */
function unquote(value: string): string {
  const v = value.trim();
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replaceAll("''", "'");
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    try {
      return JSON.parse(v) as string;
    } catch {
      return v.slice(1, -1);
    }
  }
  return v;
}

/** `/vue-i18n@9.14.5(vue@3.5.12)` (lockfile 6) or `vue-i18n@9.14.5` (9) → `vue-i18n@9.14.5`. */
function packageKey(key: string): string {
  const k = key.startsWith("/") ? key.slice(1) : key;
  const peers = k.indexOf("(");
  return peers > 0 ? k.slice(0, peers) : k;
}

/**
 * pnpm-lock.yaml, versions 6 and 9, one or several documents (pnpm 10 puts
 * its own install in a first one). `importer` is the project's directory
 * relative to the lockfile, `.` for its own: the lockfile must list it.
 */
export function pnpmLocked(text: string, importer: string): Map<string, Locked> | undefined {
  const versions = new Map<string, string>();
  const deprecated = new Map<string, string>();
  let listed = false;
  let section = "";
  let project: string | undefined;
  let inDeps = false;
  let dep: string | undefined;
  let pkg: string | undefined;
  for (const raw of text.split("\n")) {
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    if (!line.trim()) continue;
    if (!line.startsWith(" ")) {
      section = line === "---" ? "" : line;
      project = pkg = dep = undefined;
      continue;
    }
    if (section === "importers:") {
      let m = /^  (\S.*):$/.exec(line);
      if (m) {
        project = unquote(m[1]!);
        if (project === importer) listed = true;
        inDeps = false;
        dep = undefined;
        continue;
      }
      if (project !== importer) continue;
      m = /^    (\w+):/.exec(line);
      if (m) {
        inDeps = SECTIONS.has(m[1]!);
        dep = undefined;
        continue;
      }
      if (!inDeps) continue;
      m = /^      (\S.*?):$/.exec(line);
      if (m) {
        dep = unquote(m[1]!);
        continue;
      }
      m = /^        version:[ \t]+(.+)$/.exec(line);
      if (dep && m) versions.set(dep, unquote(m[1]!));
    } else if (section === "packages:") {
      const m = /^  (\S.*):$/.exec(line);
      if (m) {
        pkg = packageKey(unquote(m[1]!));
        continue;
      }
      const d = /^    deprecated:[ \t]+(.+)$/.exec(line);
      if (pkg && d) deprecated.set(pkg, unquote(d[1]!));
    }
  }
  if (!listed) return undefined;

  const locked = new Map<string, Locked>();
  for (const [name, resolved] of versions) {
    // `link:` and `file:` are the project's own; an npm alias resolves to `other@1.0.0`.
    if (/^(link|file|workspace):/.test(resolved)) continue;
    const plain = packageKey(resolved);
    const key = plain.lastIndexOf("@") > 0 ? plain : `${name}@${plain}`;
    const version = key.slice(key.lastIndexOf("@") + 1);
    locked.set(name, { version, ...(deprecated.has(key) ? { deprecated: deprecated.get(key) } : {}) });
  }
  return locked;
}

/**
 * package-lock.json and npm-shrinkwrap.json, lockfile versions 2 and 3:
 * `packages` keyed by install path. `importer` as for pnpm.
 */
export function npmLocked(text: string, importer: string): Map<string, Locked> | undefined {
  let lock: unknown;
  try {
    lock = JSON.parse(text);
  } catch {
    return undefined;
  }
  const packages = (lock as { packages?: unknown } | null)?.packages;
  if (!packages || typeof packages !== "object") return undefined;
  const entries = packages as Record<string, Record<string, unknown> | undefined>;
  const base = importer === "." ? "" : importer;
  const own = entries[base];
  if (!own || typeof own !== "object") return undefined;

  const locked = new Map<string, Locked>();
  for (const section of SECTIONS) {
    const deps = own[section];
    if (!deps || typeof deps !== "object") continue;
    for (const name of Object.keys(deps)) {
      // Installed beside the project, or hoisted to the root.
      const entry = entries[`${base ? `${base}/` : ""}node_modules/${name}`] ?? entries[`node_modules/${name}`];
      if (!entry || typeof entry.version !== "string") continue;
      locked.set(name, {
        version: entry.version,
        ...(typeof entry.deprecated === "string" ? { deprecated: entry.deprecated } : {}),
      });
    }
  }
  return locked;
}
