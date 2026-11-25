import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ArtifactsRule, Rule, WorklogRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { BaseRuleValidator } from "./base";
import { ARTIFACT_DIRS, STANDARD_DOCS, WORKLOG } from "../../taste/hygiene";


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

/** Agent work logs at the root, e.g. `IMPLEMENTATION_COMPLETE.md`. */
export class WorklogRuleValidator extends BaseRuleValidator<WorklogRule> {
  canHandle(rule: Rule): rule is WorklogRule {
    return rule.kind === "worklog";
  }

  protected async validateInternal(rule: WorklogRule, context: RuleValidatorContext) {
    const docs = context.snapshot.listDir(".").filter((e) => !e.isDir && /\.md$/i.test(e.name));
    for (const doc of docs) {
      const stem = doc.name.replace(/\.md$/i, "");
      if (STANDARD_DOCS.test(stem) || !WORKLOG.test(stem)) continue;
      context.rawIssues.push(issueFromRule(rule, {
        path: doc.absPath,
        displayPath: doc.name,
        message: { key: "issue.worklog.found" },
      }));
    }
    return { hitCount: docs.length };
  }
}
