import { readText } from "../../fsutil";
import { resolve } from "node:path";
import type { LifecycleRule, Rule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { BaseRuleValidator } from "./base";
import { EOL, eolDate, hasEnded, lineOf, type Product } from "../../taste/eol";
import { NOT_OURS } from "../../taste/hygiene";
import { FACT_EOL } from "../../facts";

type Found = { product: Product; version: string; file: string };

const read = (path: string) => readText(path);

/** `18`, `v18.1.0`, `^18`, `~18.2`, `18.x`, `3.8` → the pinned version; ranges like `>=18` say nothing. */
export function pinnedVersion(spec: string): string | undefined {
  const m = spec.trim().match(/^(?:[\^~=]|v)?\s*(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?(?:-[\w.]+)?$/i);
  if (!m) return undefined;
  const minor = m[2] && /^\d+$/.test(m[2]) ? `.${m[2]}` : "";
  return `${m[1]}${minor}`;
}

/**
 * Node majors an `engines.node` range allows, or undefined when the range is
 * open-ended (`>=16` reaches versions still supported) or unreadable.
 * Handles `16`, `^16.2`, `~16`, `16.x`, `=16`, `<18`, `>=14 <18`, `14 - 16`, `a || b`.
 */
export function enginesMajors(spec: string): number[] | undefined {
  // Node majors stay far below this; a wider range reaches versions still supported, so says nothing.
  const SPAN = 100;
  const majors = new Set<number>();
  for (const alt of spec.split("||").map((s) => s.trim())) {
    if (!alt) return undefined;
    const hyphen = /^v?(\d+)(?:\.[\dx*]+)*\s+-\s+v?(\d+)(?:\.[\dx*]+)*$/.exec(alt);
    if (hyphen) {
      if (Number(hyphen[2]) - Number(hyphen[1]) > SPAN) return undefined;
      for (let m = Number(hyphen[1]); m <= Number(hyphen[2]); m++) majors.add(m);
      continue;
    }
    const pinned = pinnedVersion(alt);
    if (pinned) {
      majors.add(Number(pinned.split(".")[0]));
      continue;
    }
    let lo = 0;
    let hi: number | undefined;
    for (const part of alt.split(/\s+/)) {
      const m = /^(>=|>|<=|<)v?(\d+)(?:\.(\d+))?/.exec(part);
      if (!m) return undefined;
      const n = Number(m[2]);
      if (m[1] === ">=") lo = Math.max(lo, n);
      else if (m[1] === ">") lo = Math.max(lo, n);
      else if (m[1] === "<=") hi = n;
      else hi = m[3] && Number(m[3]) > 0 ? n : n - 1;
    }
    if (hi === undefined || hi - lo > SPAN) return undefined;
    for (let m = lo; m <= hi; m++) majors.add(m);
  }
  return majors.size ? [...majors].sort((a, b) => a - b) : undefined;
}

const DOCKERFILE = /^(Docker|Container)file(\..+)?$|\.(docker|container)file$/i;

/**
 * The node and python images a Dockerfile builds from, with their tags: through
 * any registry (`public.ecr.aws/docker/library/node:14`), with `ARG` defaults
 * filled in (`ARG V=16` then `FROM node:${V}`).
 */
function baseImages(text: string): Array<[Product, string]> {
  const args = new Map<string, string>();
  for (const m of text.matchAll(/^[ \t]*ARG[ \t]+(\w+)=["']?([^\s"']{1,128})/gim)) args.set(m[1]!, m[2]!);
  const images: Array<[Product, string]> = [];
  for (const line of text.split("\n")) {
    if (!/^[ \t]*FROM[ \t]/i.test(line)) continue;
    // ARG defaults filled into this line only, and only short ones: an image reference is never long.
    const from = line.slice(0, 1024).replace(/\$\{(\w+)(?::?-([^}]*))?\}|\$(\w+)/g, (all, braced, fallback, bare) => args.get(braced ?? bare) ?? fallback ?? all);
    const m = /^[ \t]*FROM[ \t]+(?:--\S+[ \t]+)*(?:[\w.-]+(?::\d+)?\/)*(node|python):([\w.-]+)/i.exec(from);
    if (m) images.push([m[1]!.toLowerCase() as Product, m[2]!]);
  }
  return images;
}

const WORKFLOW = /^\.github\/workflows\/[^/]+\.ya?ml$/;
const DEVCONTAINER = /(^|\/)\.devcontainer(\/[^/]+)?\/devcontainer\.json$|(^|\/)\.devcontainer\.json$/;
const IMAGE = /(?:[\w.-]+(?::\d+)?\/)*(node|python):([\w.-]+)/;

/**
 * What a workflow job runs on: the one version `actions/setup-node` or
 * `actions/setup-python` installs, and the `container` or `image` it runs in.
 * A matrix (`${{ matrix.node }}`, `[18, 20]`) tests a promise of compatibility,
 * like `engines`; it is not read.
 */
function workflowRuntimes(text: string): Array<[Product, string]> {
  const found: Array<[Product, string]> = [];
  // An image reference or a version is never long.
  const lines = text.split("\n").map((line) => line.slice(0, 1024));
  lines.forEach((line, i) => {
    const image = new RegExp(`^[ \\t]*(?:-[ \\t]+)?(?:container|image):[ \\t]*["']?${IMAGE.source}`).exec(line);
    if (image) found.push([image[1] as Product, image[2]!]);
    const setup = /^([ \t]*(?:-[ \t]+)?)uses:[ \t]*["']?actions\/setup-(node|python)@/.exec(line);
    if (!setup) return;
    // The step's own keys sit at the column of `uses`; the next step or job starts left of it, or with a dash there.
    const column = setup[1]!.length;
    for (const next of lines.slice(i + 1, i + 64)) {
      const indent = /^[ \t]*/.exec(next)![0].length;
      if (next.trim() && (indent < column || (indent === column && next.trimStart().startsWith("-")))) break;
      const version = /^[ \t]*(node|python)-version:[ \t]*["']?([^"'\s#]+)/.exec(next);
      if (version && version[1] === setup[2]) found.push([setup[2] as Product, version[2]!]);
    }
  });
  return found;
}

/**
 * What a dev container runs: its image (the Dev Containers images tag the
 * runtime after their own version, `typescript-node:1-20-bullseye`) and the
 * version its node or python feature installs.
 */
function devcontainerRuntimes(text: string): Array<[Product, string]> {
  const found: Array<[Product, string]> = [];
  const image = new RegExp(`"image"[ \\t]*:[ \\t]*"((?:[\\w.-]+(?::\\d+)?/)*)(javascript-node|typescript-node|node|python):([\\w.-]+)"`).exec(text);
  if (image) {
    const tag = image[1]!.includes("devcontainers/") ? image[3]!.replace(/^\d+-(?=\d)/, "") : image[3]!;
    found.push([image[2] === "python" ? "python" : "node", tag]);
  }
  for (const m of text.matchAll(/"ghcr\.io\/devcontainers\/features\/(node|python)(?::\d+)?"[ \t]*:[ \t]*\{[^}]{0,1000}?"version"[ \t]*:[ \t]*"([^"]+)"/g)) {
    found.push([m[1] as Product, m[2]!]);
  }
  return found;
}

/** `lts/gallium`, `gallium`, `fermium-alpine`: the version a codename stands for, from its makers' schedule. */
function byCodename(product: Product, raw: string): string | undefined {
  const name = /^(?:lts\/)?([a-z]+)(?:-[\w.]+)?$/i.exec(raw.trim())?.[1]?.toLowerCase();
  return name ? EOL[product].versions.find((v) => v.name === name)?.version : undefined;
}

/**
 * Versions the project actually runs on: version files, Dockerfiles, Volta's
 * pin and framework deps. `engines` is a promise of compatibility, not a
 * runtime, and is checked separately.
 */
function findVersions(context: RuleValidatorContext, workflows: boolean): Found[] {
  const { root, snapshot } = context;
  const found: Found[] = [];
  const at = (name: string) => resolve(root, name);
  const add = (product: Product, raw: string | undefined, file: string) => {
    const version = raw ? (pinnedVersion(raw) ?? byCodename(product, raw)) : undefined;
    if (version) found.push({ product, version, file });
  };

  for (const name of [".nvmrc", ".node-version"]) {
    if (snapshot.exists(name)) add("node", read(at(name)).split(/\r?\n/)[0], name);
  }
  if (snapshot.exists(".python-version")) add("python", read(at(".python-version")).split(/\r?\n/)[0], ".python-version");
  if (snapshot.exists(".tool-versions")) {
    for (const line of read(at(".tool-versions")).split(/\r?\n/)) {
      const [tool, version] = line.trim().split(/\s+/);
      if (tool === "nodejs" || tool === "node") add("node", version, ".tool-versions");
      if (tool === "python") add("python", version, ".tool-versions");
    }
  }
  // Every Dockerfile of the project (`docker/Dockerfile`, `api.Dockerfile`): what each image runs.
  for (const [rel, entry] of snapshot.byRel) {
    if (entry.isDir || !DOCKERFILE.test(entry.name) || NOT_OURS.test(rel)) continue;
    for (const [image, tag] of baseImages(read(entry.absPath))) add(image, tag, rel);
  }
  for (const [rel, entry] of snapshot.byRel) {
    if (entry.isDir || NOT_OURS.test(rel)) continue;
    if (workflows && WORKFLOW.test(rel)) for (const [product, version] of workflowRuntimes(read(entry.absPath))) add(product, version, rel);
    else if (DEVCONTAINER.test(rel)) for (const [product, version] of devcontainerRuntimes(read(entry.absPath))) add(product, version, rel);
  }

  const manifest = snapshot.manifest;
  if (manifest.exists) {
    let pkg: Record<string, any> = {};
    try {
      const parsed = JSON.parse(read(manifest.path));
      if (parsed && typeof parsed === "object") pkg = parsed; // `null`, `[]` and `"x"` hold nothing
    } catch {
      // not JSON
    }
    if (typeof pkg.volta?.node === "string") add("node", pkg.volta.node, "package.json (volta)");
    const deps = { ...pkg.devDependencies, ...pkg.dependencies };
    // Frameworks whose schedule names the package that carries their version.
    for (const { product, dep } of FACT_EOL) {
      if (dep && typeof deps[dep] === "string") add(product, deps[dep].split(".")[0], "package.json");
    }
  }

  // Django pinned to one release: `django==4.2.11`, `Django==4.2.*`, `django~=4.2.0` — not ranges.
  for (const entry of snapshot.listDir(".")) {
    if (entry.isDir || !/^(requirements[\w.-]*\.txt|pyproject\.toml|Pipfile)$/.test(entry.name)) continue;
    const m = /(?:^|["'\s])django[ \t]*(?:=[ \t]*["'][ \t]*)?(==|~=)[ \t]*(\d+\.\d+)(\.\d+|\.\*)?/im.exec(read(entry.absPath));
    if (m && (m[1] === "==" || m[3])) add("django", m[2], entry.name);
  }
  return found;
}

/** Runtimes and frameworks past their published end of life. */
export class LifecycleRuleValidator extends BaseRuleValidator<LifecycleRule> {
  canHandle(rule: Rule): rule is LifecycleRule {
    return rule.kind === "lifecycle";
  }

  protected async validateInternal(rule: LifecycleRule, context: RuleValidatorContext) {
    const today = context.today ?? new Date().toISOString().slice(0, 10);
    const found = findVersions(context, Boolean(rule.workflows));
    for (const { product, version, file } of found) {
      const date = eolDate(product, version);
      if (!hasEnded(date, today)) continue;
      const { label } = EOL[product];
      const name = `${label} ${lineOf(product, version)}`;
      context.rawIssues.push(issueFromRule(rule, {
        path: `${resolve(context.root, file)}#eol:${product}`,
        displayPath: `${file} (${name})`,
        message: date
          ? { key: "issue.lifecycle.ended", params: { name, date, use: { t: `eol.${product}` } } }
          : { key: "issue.lifecycle.unsupported", params: { name, use: { t: `eol.${product}` } } },
      }));
    }

    // A compatibility promise made only to versions that have all ended.
    const declared = engines(context);
    if (declared) {
      const dates = declared.map((m) => eolDate("node", String(m)));
      if (dates.every((d) => hasEnded(d, today))) {
        const last = dates.sort().at(-1)!;
        context.rawIssues.push(issueFromRule(rule, {
          path: `${context.snapshot.manifest.path}#engines`,
          displayPath: "package.json (engines.node)",
          message: { key: "issue.lifecycle.declared", params: { versions: declared.map((m) => `Node ${m}`).join(", "), date: last, use: { t: "eol.node" } } },
        }));
      }
    }
    return { hitCount: found.length };
  }
}

function engines(context: RuleValidatorContext): number[] | undefined {
  const { manifest } = context.snapshot;
  if (!manifest.exists) return undefined;
  try {
    const spec = JSON.parse(read(manifest.path))?.engines?.node;
    return typeof spec === "string" ? enginesMajors(spec) : undefined;
  } catch {
    return undefined;
  }
}
