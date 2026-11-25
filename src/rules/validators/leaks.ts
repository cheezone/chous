import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ArtifactsRule, Rule, SecretsRule, WorklogRule } from "../../types";
import type { RuleValidatorContext } from "./types";
import { issueFromRule } from "./types";
import { BaseRuleValidator } from "./base";
import { ARTIFACT_DIRS, SECRETS, STANDARD_DOCS, WORKLOG, looksFake } from "../../taste/leaks";
import { toDisplayPath } from "../../fsutil";

const MAX_BYTES = 1024 * 1024;
const SKIP_FILE = /\.(png|jpe?g|gif|webp|avif|ico|icns|svg|woff2?|ttf|otf|eot|pdf|zip|gz|tgz|wasm|mp[34]|mov|lockb)$|(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lock|Cargo\.lock|poetry\.lock)$/i;
const MAYBE_SECRET = /sk-|gh[pousr]_|github_pat_|AKIA|ASIA|_live_|xox[abprs]-|eyJ|AIza/;
// (sk- also covers OpenRouter's sk-or-v1-.)

/** Keys committed in plain text — only formats that are secret by definition. */
export class SecretsRuleValidator extends BaseRuleValidator<SecretsRule> {
  canHandle(rule: Rule): rule is SecretsRule {
    return rule.kind === "secrets";
  }

  protected async validateInternal(rule: SecretsRule, context: RuleValidatorContext) {
    const { root, snapshot, rawIssues } = context;
    let hitCount = 0;
    for (const entry of snapshot.byRel.values()) {
      if (entry.isDir || SKIP_FILE.test(entry.relPath)) continue;
      let text: string;
      try {
        if (statSync(entry.absPath).size > MAX_BYTES) continue;
        text = readFileSync(entry.absPath, "utf8");
      } catch {
        continue;
      }
      if (!MAYBE_SECRET.test(text)) continue;
      hitCount++;

      const lines = text.split(/\r?\n/);
      lines.forEach((line, index) => {
        for (const format of SECRETS) {
          for (const match of line.matchAll(format.pattern)) {
            const token = match[0];
            if (looksFake(token)) continue;
            if (format.test && !format.test(token)) continue;
            if (format.near && !lines.slice(Math.max(0, index - 2), index + 3).some((l) => format.near!.test(l))) continue;
            rawIssues.push(issueFromRule(rule, {
              path: `${entry.absPath}#secret:${index + 1}:${format.name}`,
              displayPath: `${toDisplayPath(entry.absPath, root)}:${index + 1} (${format.name})`,
              message: { key: "issue.leak.secret", params: { name: format.name } },
            }));
          }
        }
      });
    }
    return { hitCount };
  }
}

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

/** Agent work logs at the root, e.g. `IMPLEMENTATION_COMPLETE.md`. A warning: clutter, not harm. */
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
        severity: "warn",
      }));
    }
    return { hitCount: docs.length };
  }
}
