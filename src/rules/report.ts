import type { Issue, IssueMessage, LintResult, Value } from "../types";
import type { Colorizer } from "../color";
import type { TFunction } from "../i18n";
import { APP_NAME } from "../constants";
import { sourcesFor } from "../taste/sources";

/** Issues shown without `--verbose`; the rest are counted. */
const CONCISE_LIMIT = 30;

const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
const visibleLength = (s: string) => s.replace(ANSI_RE, "").length;

/** Translate a message; params that are messages themselves are translated first. */
/** File names can hold terminal control sequences that erase or hide lines: show them, escaped. */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const visible = (s: string) => s.replace(/[\u0000-\u001f\u007f-\u009f]/g, (ch) => `\\x${ch.charCodeAt(0).toString(16).padStart(2, "0")}`);

export function formatIssueMessage(t: TFunction, msg: IssueMessage): string {
  const params = Object.fromEntries(
    Object.entries(msg.params ?? {}).map(([k, v]) => [k, typeof v === "object" ? t(v.t) : typeof v === "string" ? visible(v) : v]),
  );
  return t(msg.key, params);
}

const VALUES: Value[] = ["modernity", "order", "convention", "cleanliness"];

const byPath = (a: Issue, b: Issue) => a.displayPath.localeCompare(b.displayPath);

export function renderReport(
  result: LintResult,
  opts: {
    verbose: boolean;
    color: Colorizer;
    t: TFunction;
    version?: string;
  },
): string {
  const { color: c, t, verbose } = opts;
  const lines: string[] = [];

  const version = opts.version ? ` v${opts.version}` : "";
  const by = t("app.by");
  lines.push(`${c.bold(APP_NAME)}${version} ${c.dim(`${by ? `${by} ` : ""}@Cheez Lin <https://cheez.tech>`)}`, "");

  const smells = result.issues.filter((i) => i.verdict === "smell");
  const reviews = result.issues.filter((i) => i.verdict === "review").sort(byPath);
  const groups = VALUES.map((value) => ({ value, issues: smells.filter((i) => i.value === value).sort(byPath) })).filter((g) => g.issues.length);

  let budget = verbose ? Infinity : CONCISE_LIMIT;
  let hidden = 0;
  const block = (issues: Issue[], mark: string) => {
    const shown = issues.slice(0, Math.max(0, budget));
    budget -= shown.length;
    hidden += issues.length - shown.length;
    const width = Math.max(0, ...shown.map((i) => visibleLength(visible(i.displayPath))));
    for (const issue of shown) {
      const reason = verbose && issue.reason ? ` ${c.dim(t("report.reason", { reason: t(issue.reason) }))}` : "";
      lines.push(`  ${mark} ${visible(issue.displayPath).padEnd(width)} ${c.dim(t("report.arrow"))} ${formatIssueMessage(t, issue.message)}${reason}`);
      if (verbose) {
        const nested = Object.values(issue.message.params ?? {}).map((v) => (typeof v === "object" ? v.t : undefined));
        for (const { url } of sourcesFor([issue.reason, issue.message.key, ...nested])) lines.push(c.dim(`      ${t("report.source", { url })}`));
      }
    }
  };

  for (const { value, issues } of groups) {
    lines.push(c.bold(t(`report.value.${value}`)));
    block(issues, c.red("✗"));
    lines.push("");
  }
  if (reviews.length) {
    lines.push(c.bold(t("report.review")));
    block(reviews, c.yellow("?"));
    lines.push("");
  }
  if (hidden) lines.push(c.dim(t("report.moreHidden", { count: hidden })), "");

  lines.push(
    result.issues.length === 0
      ? c.green(t("report.noIssues"))
      : t("report.found", { smells: smells.length, reviews: reviews.length }),
  );
  lines.push(c.dim(t("report.scope")));

  lines.push("", c.dim(t("meta.taste", { names: result.tastes.join(" · ") })));
  if (result.workspacePackages?.length) {
    lines.push(c.dim(t("meta.workspacePackages", { count: result.workspacePackages.length })));
  }
  if (result.fileCount !== undefined && result.duration !== undefined) {
    lines.push(c.dim(t("meta.performance", { fileCount: result.fileCount, duration: result.duration })));
  }
  return lines.join("\n");
}

/**
 * The report as data, for agents: every finding with what chous knows about
 * it — verdict, taste, rule, the message in words and as a key, why, and where
 * the claim comes from.
 */
export function reportToJSON(result: LintResult, t: TFunction, version?: string) {
  const findings = result.issues.map((issue) => {
    const nested = Object.values(issue.message.params ?? {}).map((v) => (typeof v === "object" ? v.t : undefined));
    return {
      verdict: issue.verdict,
      value: issue.value,
      rule: issue.ruleKind,
      taste: issue.ruleSource.taste,
      path: issue.displayPath,
      message: formatIssueMessage(t, issue.message),
      key: issue.message.key,
      params: Object.fromEntries(Object.entries(issue.message.params ?? {}).map(([k, v]) => [k, typeof v === "object" ? t(v.t) : v])),
      ...(issue.reason ? { reason: t(issue.reason) } : {}),
      sources: sourcesFor([issue.reason, issue.message.key, ...nested]).map((s) => s.url),
    };
  });
  return {
    tool: APP_NAME,
    ...(version ? { version } : {}),
    root: result.root,
    tastes: result.tastes,
    counts: { smells: findings.filter((f) => f.verdict === "smell").length, reviews: findings.filter((f) => f.verdict === "review").length },
    findings,
  };
}
