import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ArtifactsRule, LeftoverRule, Rule, TwinsRule } from "../../types";
import type { MessageKey } from "../../i18n";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { BaseRuleValidator } from "./base";
import { ARTIFACT_DIRS, BACKUP, DECISION_RECORD, NOT_OURS, ONE_OFF_SCRIPT, RELEASE_BINARY, ROOT_DOCS_LIMIT, STANDARD_DOCS, SYNONYM_DIRS, WORKLOG } from "../../taste/hygiene";

/** Build output that is not gitignored, so it gets committed. */
export class ArtifactsRuleValidator extends BaseRuleValidator<ArtifactsRule> {
  canHandle(rule: Rule): rule is ArtifactsRule {
    return rule.kind === "artifacts";
  }

  protected async validateInternal(rule: ArtifactsRule, context: RuleValidatorContext) {
    const { root, snapshot, rawIssues } = context;
    const parents = ["", ...[...snapshot.byRel.values()].filter((e) => e.isDir).map((e) => e.relPath)];
    const ignored = (rel: string) => snapshot.ig.ignores(rel) || snapshot.ig.ignores(`${rel}/`);
    let hitCount = 0;

    for (const parent of parents) {
      if (NOT_OURS.test(`${parent}/`)) continue;
      // An artifact's own contents are not candidates for more artifacts.
      if (ARTIFACT_DIRS.some(({ dir }) => parent === dir || parent.endsWith(`/${dir}`) || parent.includes(`/${dir}/`) || parent.startsWith(`${dir}/`))) continue;
      const parentAbs = resolve(root, parent);
      for (const { dir, when, unless, marker } of ARTIFACT_DIRS) {
        const rel = parent ? `${parent}/${dir}` : dir;
        if (!existsSync(join(parentAbs, dir)) || ignored(rel)) continue;
        if (when && !when.some((f) => existsSync(join(parentAbs, f)))) continue;
        if (unless?.some((f) => existsSync(join(parentAbs, f)))) continue;
        if (marker && !marker.some((f) => existsSync(join(parentAbs, dir, f)))) continue;
        hitCount++;
        rawIssues.push(issueFromRule(rule, {
          path: resolve(root, rel),
          displayPath: `${rel}/`,
          message: { key: "issue.leak.artifact" },
        }));
      }
    }
    return { hitCount };
  }
}

/** Text of the root's own files (package.json, configs, scripts), small ones only. */
function rootText(snapshot: RuleValidatorContext["snapshot"]): string {
  return snapshot.listDir(".")
    .filter((e) => !e.isDir && !/\.md$/i.test(e.name) && !ONE_OFF_SCRIPT.test(e.name))
    .map((e) => {
      try {
        return statSync(e.absPath).size < 256_000 ? readFileSync(e.absPath, "utf8") : "";
      } catch {
        return "";
      }
    })
    .join("\n");
}

/** Work logs, one-off scripts, hand-made backups and release binaries. */
export class LeftoverRuleValidator extends BaseRuleValidator<LeftoverRule> {
  canHandle(rule: Rule): rule is LeftoverRule {
    return rule.kind === "leftover";
  }

  protected async validateInternal(rule: LeftoverRule, context: RuleValidatorContext) {
    const { snapshot, rawIssues } = context;
    let hitCount = 0;
    const report = (rel: string, key: MessageKey, params?: Record<string, number>, severity?: "warn") => {
      hitCount++;
      rawIssues.push(issueFromRule(rule, { path: resolve(context.root, rel), displayPath: rel, message: { key, params }, severity }));
    };
    let rootDocs = 0;
    // A script that package.json or a config file names is part of the build, not a leftover.
    const referenced = rule.scripts ? rootText(snapshot) : "";

    for (const [rel, entry] of snapshot.byRel) {
      if (entry.isDir || NOT_OURS.test(rel)) continue;
      const atRoot = !rel.includes("/");
      const name = entry.name;
      const doc = /\.md$/i.exec(name) ? name.slice(0, -3) : undefined;

      // `src/SUMMARY.md` is mdBook's table of contents.
      const bookToc = !atRoot && doc === "SUMMARY";
      if (doc !== undefined && !bookToc && !STANDARD_DOCS.test(doc) && !DECISION_RECORD.test(rel) && (atRoot || /^[A-Z0-9_-]+$/.test(doc)) && WORKLOG.test(doc)) {
        report(rel, "issue.leftover.worklog");
      } else if (doc !== undefined && atRoot && !STANDARD_DOCS.test(doc)) {
        rootDocs++;
      } else if (rule.scripts && atRoot && ONE_OFF_SCRIPT.test(name) && !referenced.includes(name)) {
        report(rel, "issue.leftover.script");
      } else if (BACKUP.test(name)) {
        report(rel, "issue.leftover.backup");
      } else if (RELEASE_BINARY.test(name)) {
        report(rel, "issue.leftover.binary");
      }
    }
    if (rootDocs > ROOT_DOCS_LIMIT) report("*.md", "issue.leftover.docs", { count: rootDocs }, "warn");
    return { hitCount };
  }
}

/**
 * One concept, two names: `README.md` next to `Readme.md` (case-insensitive
 * file systems keep one), `test/` next to `tests/`, `plugin/` next to `plugins/`.
 */
export class TwinsRuleValidator extends BaseRuleValidator<TwinsRule> {
  canHandle(rule: Rule): rule is TwinsRule {
    return rule.kind === "twins";
  }

  protected async validateInternal(rule: TwinsRule, context: RuleValidatorContext) {
    const { snapshot } = context;
    let hitCount = 0;
    const report = (rel: string, key: MessageKey, other: string) => {
      hitCount++;
      context.rawIssues.push(issueFromRule(rule, {
        path: resolve(context.root, rel),
        displayPath: rel,
        message: { key, params: other ? { other } : undefined },
      }));
    };

    const seen = new Map<string, string>();
    for (const rel of [...snapshot.byRel.keys()].sort()) {
      if (NOT_OURS.test(rel)) continue;
      // Compare within one directory: children of `Docs/` vs `docs/` are the same finding.
      const slash = rel.lastIndexOf("/");
      const key = `${rel.slice(0, slash + 1)}${rel.slice(slash + 1).toLowerCase()}`;
      const other = seen.get(key);
      if (other === undefined) seen.set(key, rel);
      else report(rel, "issue.twins.case", other);
    }

    const rootDirs = new Set(snapshot.listDir(".").filter((e) => e.isDir).map((e) => e.name));
    for (const group of SYNONYM_DIRS) {
      const present = group.filter((d) => rootDirs.has(d));
      if (present.length > 1) report(present.map((d) => `${d}/`).join(" + "), "issue.twins.synonyms", "");
    }
    for (const dir of rootDirs) {
      if (SYNONYM_DIRS.some((g) => g.includes(dir))) continue;
      if (rootDirs.has(`${dir}s`)) report(`${dir}/`, "issue.twins.plural", `${dir}s/`);
    }
    return { hitCount };
  }
}
