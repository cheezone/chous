import type { Issue, RuleSource } from "../../types";
import type { WorkspaceSnapshot } from "../../vfs/snapshot";
import { syntheticSource } from "./types";

type ReplacementEntry = {
  type?: string;
  moduleName?: string;
  replacementModule?: string;
  replacements?: Array<string | { moduleName?: string; name?: string }>;
  url?: { type?: string; id?: string } | string;
  docPath?: string;
  id?: string;
};

function extractReplacement(name: string, entry: ReplacementEntry): string | undefined {
  if (entry.replacementModule && entry.replacementModule !== name) {
    return entry.replacementModule;
  }
  const first = entry.replacements?.[0];
  if (typeof first === "string") return first === name ? undefined : first;
  if (first && typeof first === "object") {
    const n = first.moduleName ?? first.name;
    return n && n !== name ? n : undefined;
  }
  return undefined;
}

/** Skip documentation-only / same-module entries that are not real replacements. */
function isActionable(name: string, entry: ReplacementEntry): boolean {
  if (entry.type === "documented" && !extractReplacement(name, entry)) return false;
  return Boolean(extractReplacement(name, entry));
}

let cachedManifest: Map<string, { replacement: string; docPath?: string }> | null = null;

function ingest(
  map: Map<string, { replacement: string; docPath?: string }>,
  bag: unknown,
): void {
  if (!bag || typeof bag !== "object") return;
  const record = bag as {
    mappings?: Record<string, ReplacementEntry>;
    replacements?: Record<string, ReplacementEntry>;
  };
  for (const source of [record.mappings, record.replacements]) {
    if (!source || typeof source !== "object") continue;
    for (const [name, entry] of Object.entries(source)) {
      if (map.has(name)) continue;
      if (!isActionable(name, entry)) continue;
      const replacement = extractReplacement(name, entry)!;
      const docPath =
        entry.docPath ??
        (typeof entry.url === "string"
          ? entry.url
          : entry.url?.id
            ? `https://replacements.fyi/#${entry.url.id}`
            : entry.id
              ? `https://replacements.fyi/#${entry.id}`
              : undefined);
      map.set(name, { replacement, docPath });
    }
  }
}

async function loadReplacementMap(): Promise<Map<string, { replacement: string; docPath?: string }>> {
  if (cachedManifest) return cachedManifest;
  const map = new Map<string, { replacement: string; docPath?: string }>();
  try {
    const mod = await import("module-replacements");
    // Prefer opinionated lists; skip `all` documented noise.
    ingest(map, mod.preferredReplacements);
    ingest(map, mod.nativeReplacements);
    ingest(map, mod.microUtilsReplacements);
  } catch {
    // optional
  }
  cachedManifest = map;
  return map;
}

/**
 * Emit warn-level findings for deps listed in e18e module-replacements.
 */
export async function collectRottenDepIssues(
  snapshot: WorkspaceSnapshot,
  source: RuleSource = syntheticSource(snapshot.manifest.path),
): Promise<Issue[]> {
  if (!snapshot.manifest.exists || snapshot.manifest.deps.size === 0) return [];
  const map = await loadReplacementMap();
  if (map.size === 0) return [];

  const issues: Issue[] = [];
  for (const name of snapshot.manifest.deps) {
    const hit = map.get(name);
    if (!hit) continue;
    issues.push({
      ruleKind: "deps",
      ruleSource: source,
      path: `${snapshot.manifest.path}#rotten:${name}`,
      displayPath: `package.json (${name})`,
      message: {
        key: "issue.rotten.dep",
        params: { name, replacement: hit.replacement },
      },
      category: "forbidden",
      severity: "warn",
      resolution: "agent",
      ...(hit.docPath ? { see: hit.docPath, reason: hit.docPath } : {}),
    });
  }
  return issues;
}
