import type { Issue, IssueMessage, LintResult } from "../types";
import type { Colorizer } from "../color";
import type { TranslationFunctions } from "../i18n";
import { APP_NAME } from "../constants";

/** Issues shown without `--verbose`; the rest are counted. */
const CONCISE_LIMIT = 30;

const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
const visibleLength = (s: string) => s.replace(ANSI_RE, "").length;

/** `issue.deps.native` → `LL.issue.deps.native(params)`. */
export function formatIssueMessage(LL: TranslationFunctions, msg: IssueMessage): string {
  const path = msg.key.split(".").slice(1);
  const fn = path.reduce<any>((node, key) => node?.[key], LL.issue) as ((params?: unknown) => string) | undefined;
  return fn ? fn("params" in msg ? msg.params : undefined) : msg.key;
}

/** Errors before warnings, then by path. */
function byWeight(a: Issue, b: Issue): number {
  if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1;
  return a.displayPath.localeCompare(b.displayPath);
}

export function renderReport(
  result: LintResult,
  opts: {
    verbose: boolean;
    color: Colorizer;
    LL: TranslationFunctions;
    version?: string;
  },
): string {
  const { color: c, LL: t, verbose } = opts;
  const lines: string[] = [];

  const version = opts.version ? ` v${opts.version}` : "";
  const by = t.app.by();
  lines.push(`${c.bold(APP_NAME)}${version} ${c.dim(`${by ? `${by} ` : ""}@Cheez Lin <https://cheez.tech>`)}`, "");

  const issues = [...result.issues].sort(byWeight);
  const shown = verbose ? issues : issues.slice(0, CONCISE_LIMIT);
  const width = Math.max(0, ...shown.map((i) => visibleLength(i.displayPath)));

  for (const issue of shown) {
    const icon = issue.severity === "error" ? c.red("✖") : c.yellow("⚠");
    const reason = verbose && issue.reason ? ` ${c.dim(t.report.reason({ reason: issue.reason }))}` : "";
    lines.push(`${icon} ${issue.displayPath.padEnd(width)} ${c.dim(t.report.arrow())} ${formatIssueMessage(t, issue.message)}${reason}`);
  }
  if (shown.length < issues.length) lines.push(c.dim(t.report.moreHidden({ count: issues.length - shown.length })));
  if (shown.length > 0) lines.push("");

  const errors = issues.filter((i) => i.severity === "error").length;
  lines.push(
    issues.length === 0
      ? c.green(t.report.noIssues())
      : t.report.found({ errors, warnings: issues.length - errors }),
  );

  lines.push("", c.dim(t.meta.taste({ names: result.tastes.join(" · ") })));
  if (result.workspacePackages?.length) {
    lines.push(c.dim(t.meta.workspacePackages({ count: result.workspacePackages.length })));
  }
  if (result.fileCount !== undefined && result.duration !== undefined) {
    lines.push(c.dim(t.meta.performance({ fileCount: result.fileCount, duration: result.duration })));
  }
  return lines.join("\n");
}
