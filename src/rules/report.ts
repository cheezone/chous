import type { Issue, IssueMessage, LintResult, Value } from "../types";
import type { Colorizer } from "../color";
import type { TFunction } from "../i18n";
import { APP_NAME } from "../constants";
import { sourcesFor } from "../taste/sources";

const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

/** Translate a message; params that are messages themselves are translated first. */
/** File names can hold terminal control sequences that erase or hide lines: show them, escaped. */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
/** Control characters in a name (a newline, an escape) shown as `\x0a`, so one name stays one line. */
export const visible = (s: string) => s.replace(/[\u0000-\u001f\u007f-\u009f]/g, (ch) => `\\x${ch.charCodeAt(0).toString(16).padStart(2, "0")}`);

export function formatIssueMessage(t: TFunction, msg: IssueMessage): string {
  const params = Object.fromEntries(
    Object.entries(msg.params ?? {}).map(([k, v]) => [k, typeof v === "object" ? t(v.t) : typeof v === "string" ? visible(v) : v]),
  );
  return t(msg.key, params);
}

const VALUES: Value[] = ["modernity", "order", "convention", "cleanliness"];

/** Items listed under one finding, before the rest is counted (`--verbose` and `--json` show all). */
const ITEMS_SHOWN = 5;
const COPIES_SHOWN = 3;

/** Columns a string takes in a terminal: CJK characters take two. */
const columns = (s: string) => [...s.replace(ANSI_RE, "")].reduce((n, ch) => n + (ch.codePointAt(0)! >= 0x2e80 ? 2 : 1), 0);

/** Wrap at `width` columns; lines after the first start at `indent`. Breaks at spaces, or anywhere in CJK text. */
function wrap(text: string, width: number, indent: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const token of text.split(/(?<= )|(?<=[\u2e80-\uffff])(?=[\u2e80-\uffff])/u)) {
    const room = width - (out.length ? indent : 0);
    if (line && columns(line + token) > room) {
      out.push(line.trimEnd());
      line = token.trimStart();
    } else line += token;
  }
  if (line) out.push(line.trimEnd());
  return out.map((l, i) => (i ? " ".repeat(indent) + l : l));
}

const kib = (bytes: number) => Math.max(1, Math.round(bytes / 1024));

/**
 * A message as the report shows it: what it is, then why or the details, then
 * what to do. chous's messages are written `subject: detail → action` (or `；`,
 * `：` in Chinese); a message without them is all subject.
 */
export function messageParts(message: string): { subject: string; detail?: string; action?: string } {
  const arrow = outside(message, /\s*→\s*/g);
  const action = arrow ? message.slice(arrow.index + arrow[0].length) : undefined;
  const rest = arrow ? message.slice(0, arrow.index) : message;
  const sep = outside(rest, /: |：|; |；/g);
  const subject = sep ? rest.slice(0, sep.index) : rest;
  const detail = sep ? rest.slice(sep.index + sep[0].length) : undefined;
  return { subject, ...(detail ? { detail } : {}), ...(action ? { action } : {}) };
}

const OPEN = "(（[“「";
const CLOSE = ")）]”」";

/** The first match not inside brackets or quotes: `zod (.: ^3; web: ^4)` is one subject, and so is a quoted sentence. */
function outside(text: string, pattern: RegExp): RegExpExecArray | undefined {
  const depthAt: number[] = [];
  let depth = 0;
  for (const ch of text) {
    if (CLOSE.includes(ch)) depth = Math.max(0, depth - 1);
    for (let i = 0; i < ch.length; i++) depthAt.push(depth);
    if (OPEN.includes(ch)) depth++;
  }
  for (const m of text.matchAll(pattern)) if (depthAt[m.index] === 0) return m;
  return undefined;
}

/** What a finding lists, from its details: the files, directories or copies behind it, one line each. */
export function detailItems(t: TFunction, issue: Issue): Array<{ text: string; note?: string; children?: string[] }> {
  const d = issue.details ?? {};
  const files = d.files;
  if (Array.isArray(files) && files.length && typeof files[0] === "object") {
    return (files as Array<{ path: string; lines: number; bytes: number }>).map((f) => ({ text: f.path, note: t("report.lines", { lines: f.lines, kib: kib(f.bytes) }) }));
  }
  if (Array.isArray(d.dirs)) return (d.dirs as Array<{ path: string; files: number }>).map((f) => ({ text: f.path, note: t("report.files", { count: f.files }) }));
  if (Array.isArray(d.groups)) {
    return (d.groups as Array<{ files: string[]; bytes: number }>).map((g) => ({ text: `${g.files.length} × ${g.bytes >= 1024 * 1024 ? `${(g.bytes / 1024 / 1024).toFixed(1)} MiB` : `${kib(g.bytes)} KiB`}`, children: g.files }));
  }
  if (Array.isArray(d.docs)) return (d.docs as string[]).map((text) => ({ text }));
  return [];
}

export function renderReport(
  result: LintResult,
  opts: {
    verbose: boolean;
    color: Colorizer;
    t: TFunction;
    version?: string;
    /** Terminal width, for wrapping. */
    width?: number;
  },
): string {
  const { color: c, t, verbose } = opts;
  const width = Math.max(60, Math.min(opts.width ?? 100, 140));
  const lines: string[] = [];

  const version = opts.version ? ` v${opts.version}` : "";
  const by = t("app.by");
  lines.push(`${c.bold(APP_NAME)}${version} ${c.dim(`${by ? `${by} ` : ""}@Cheez Lin <https://cheez.tech>`)}`, "");

  const smells = result.issues.filter((i) => i.verdict === "smell");
  const reviews = result.issues.filter((i) => i.verdict === "review");

  // One explanation, then where it applies: findings that say the same thing are one entry.
  const entries = (issues: Issue[]) => {
    const byMessage = new Map<string, Issue[]>();
    for (const issue of [...issues].sort((a, b) => a.displayPath.localeCompare(b.displayPath))) {
      const text = formatIssueMessage(t, issue.message);
      const group = byMessage.get(text);
      if (group) group.push(issue);
      else byMessage.set(text, [issue]);
    }
    return [...byMessage];
  };

  // `git rm --cached` in a message is something to type: without color it keeps its backticks; with color it
  // drops them and takes `span` (bold, or the headline's own color).
  const code = (s: string, base: (x: string) => string, span: (x: string) => string = c.bold) =>
    c.enabled ? s.split(/`([^`]+)`/).map((part, i) => (i % 2 ? span(part) : base(part))).join("") : s;
  const plain = (x: string) => x;
  // After oxlint: the headline in the verdict's color, the places in a frame, then `help:`.
  const block = (issues: Issue[], smell: boolean) => {
    const tone = smell ? c.smell : c.review;
    for (const [message, group] of entries(issues)) {
      // `package.json (moment)` under a line about moment says it twice: the path is enough. Only a label the
      // rule appended is dropped; a file really named `asset (git)` keeps its name.
      const where = (issue: Issue) => {
        const { displayPath: path, label } = issue;
        return label !== undefined && path.endsWith(` (${label})`) && message.includes(label) ? path.slice(0, -label.length - 3) : path;
      };
      const rows: Array<{ text: string; note?: string; children?: string[] }> = [];
      const { subject, detail, action } = messageParts(message);
      const [first, ...rest] = wrap(subject, width - 4, 4);
      lines.push(`  ${tone(smell ? "×" : "⚠")} ${code(first!, tone, tone)}`, ...rest.map((l) => `    ${code(l.trimStart(), tone, tone)}`));
      if (detail) lines.push(...wrap(detail, width - 4, 0).map((l) => `    ${code(l, plain)}`));
      if (verbose && group[0]!.reason) lines.push(...wrap(t("report.reason", { reason: t(group[0]!.reason) }), width - 4, 0).map((l) => `    ${c.dim(l)}`));
      for (const issue of group) {
        const items = detailItems(t, issue);
        if (items.length) rows.push(...items);
        else if (issue.displayPath !== "./") {
          const count = Array.isArray(issue.details?.files) ? (issue.details!.files as unknown[]).length : 0;
          rows.push({ text: where(issue), ...(count > 1 ? { note: t("report.files", { count }) } : {}) });
        }
      }
      // Sets of copies take several lines each: fewer of them.
      const limit = verbose ? Infinity : rows.some((r) => r.children) ? COPIES_SHOWN : ITEMS_SHOWN;
      const shown = rows.slice(0, limit);
      if (shown.length) {
        // Notes in one column, when the paths leave room for it.
        const pad = Math.max(...shown.map((r) => columns(visible(r.text))));
        const aligned = pad + 30 <= width;
        shown.forEach((r, i) => {
          const text = visible(r.text);
          const lead = i === 0 ? "╭─" : "├─";
          if (r.children) {
            lines.push(`   ${lead}[${c.label(text)}]`);
            // A file copied hundreds of times is still one set: a few of its copies, then how many more.
            const copies = verbose ? r.children : r.children.slice(0, ITEMS_SHOWN);
            for (const child of copies) lines.push(`   │   ${c.link(visible(child))}`);
            if (r.children.length > copies.length) lines.push(`   │   ${code(t("report.more", { count: r.children.length - copies.length }), c.dim)}`);
          } else {
            lines.push(`   ${lead}[${c.link(text)}]${r.note ? `${aligned ? " ".repeat(pad - columns(text) + 2) : "  "}${c.label(r.note)}` : ""}`);
          }
        });
        if (rows.length > shown.length) lines.push(`   │ ${code(t("report.more", { count: rows.length - shown.length }), c.dim)}`);
        lines.push("   ╰────");
      }
      if (action) lines.push(...wrap(action, width - 8, 0).map((l, i) => `  ${i ? "      " : c.help("help: ")}${code(l, plain)}`));
      if (verbose) {
        const nested = Object.values(group[0]!.message.params ?? {}).map((v) => (typeof v === "object" ? v.t : undefined));
        for (const { url } of sourcesFor([group[0]!.reason, group[0]!.message.key, ...nested])) lines.push(c.dim(`  ${t("report.source", { url })}`));
      }
      lines.push("");
    }
  };

  for (const value of VALUES) {
    const issues = smells.filter((i) => i.value === value);
    if (!issues.length) continue;
    lines.push(`${c.bold(t(`report.value.${value}`))} ${c.dim(String(issues.length))}`, "");
    block(issues, true);
  }
  if (reviews.length) {
    const { subject, detail } = messageParts(t("report.review"));
    lines.push(`${c.review(subject)} ${c.dim(String(reviews.length))}${detail ? `  ${c.dim(detail)}` : ""}`, "");
    block(reviews, false);
  }

  lines.push(
    result.issues.length === 0
      ? c.green(t("report.noIssues"))
      : t("report.found", { smells: smells.length ? c.smell(String(smells.length)) : "0", reviews: reviews.length ? c.review(String(reviews.length)) : "0" }),
  );
  lines.push(c.dim(t("report.scope")));
  if (result.issues.length) lines.push(code(t("report.agentHint"), c.dim));

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
      ...(issue.details ? { details: issue.details } : {}),
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
