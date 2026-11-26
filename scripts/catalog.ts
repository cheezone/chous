/**
 * The catalogue of everything chous knows, written from the registry in
 * src/facts/ — so the docs can never list a tool chous does not check, or
 * miss one it does. `pnpm run docs` writes it; a test fails when it is stale.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PACKAGES, TOOLS } from "../src/facts";
import type { Source, Text } from "../src/facts/define";
import type { Value } from "../src/types";

type Lang = "en" | "zh";

const WORDS = {
  en: {
    title: "What chous knows",
    generated: "Generated from `src/facts/` by `pnpm run docs`. Do not edit: change the tool's file and run it again.",
    intro: "Each line is something a tool, platform or package author states about itself, with their own words behind it (`chous --verbose` shows them). chous reports it when a project goes against it.",
    counts: (t: number, f: number, a: number, e: number, p: number) => `${t} tools · ${f} facts about files · ${a} paths that should not be committed · ${e} end-of-life schedules · ${p} npm package entries.`,
    tools: "Tools",
    researched: (date: string) => `Researched ${date}.`,
    colon: ": ",
    space: " ",
    sep: " · ",
    taste: "Taste",
    says: "chous says",
    seen: "Seen in real projects",
    unseen: "not yet",
    seenNote: "“Seen in real projects” counts findings in the regression corpus (`test/corpus.json`: real repositories at pinned commits, every finding checked by hand). “not yet” means no repository there breaks it: the fact is checked against the tool's own words and examples, not yet against the wild.",
    source: "Source",
    absent: "Should not be committed",
    eol: (label: string, n: number, first: string, last: string, latest: string) =>
      latest ? `End of life: ${n} versions of ${label}, from ${first} to ${last}; the latest ended on ${latest}.` : `End of life: ${label} ${first} to ${last} are no longer supported (no date given).`,
    packages: "npm packages",
    pkg: "Package",
    verdict: "Verdict",
    use: "Use instead",
    why: "Why",
    smell: "smell",
    review: "review",
    value: { modernity: "Modernity", order: "Order", convention: "Convention", cleanliness: "Cleanliness" } as Record<Value, string>,
  },
  zh: {
    title: "chous 知道什么",
    generated: "由 `pnpm run docs` 从 `src/facts/` 生成。不要手改：改工具文件，再运行一次。",
    intro: "每一行都是工具、平台或包作者对自己的说法，背后有他们的原话（`chous --verbose` 会显示）。项目违背它时，chous 就报出来。",
    counts: (t: number, f: number, a: number, e: number, p: number) => `${t} 个工具 · ${f} 条关于文件的事实 · ${a} 条不该提交的路径 · ${e} 份停止维护时间表 · ${p} 条 npm 包。`,
    tools: "工具",
    researched: (date: string) => `调研于 ${date}。`,
    colon: "：",
    space: "",
    sep: "；",
    taste: "品味",
    says: "chous 说",
    seen: "真实命中",
    unseen: "尚未见到",
    seenNote: "「真实命中」统计回归语料（`test/corpus.json`：锁定 commit 的真实仓库，每条结论都人工核对过）里的结论。「尚未见到」表示那里还没有仓库违反它：这条事实已对照工具原话和正反例检验，还没有在真实项目里遇到过。",
    source: "来源",
    absent: "不该提交",
    eol: (label: string, n: number, first: string, last: string, latest: string) =>
      latest ? `停止维护：${label} 的 ${n} 个版本，从 ${first} 到 ${last}；最近一个在 ${latest} 停止维护。` : `停止维护：${label} ${first} 到 ${last} 官方已不再支持（没有给出日期）。`,
    packages: "npm 包",
    pkg: "包",
    verdict: "结论",
    use: "改用",
    why: "原因",
    smell: "臭味",
    review: "待审视",
    value: { modernity: "现代", order: "秩序", convention: "约定", cleanliness: "洁净" } as Record<Value, string>,
  },
};

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\{\{\w+\}\}/g, "…");
const hosts = (sources: readonly Source[] | undefined) => [...new Set((sources ?? []).map((s) => new URL(s.url).hostname.replace(/^www\./, "")))].join(", ");
const say = (text: Text, lang: Lang) => cell(text[lang]);

/** Which corpus repositories each finding was seen in, from the recorded claims. */
const CLAIMS = readFileSync(resolve(import.meta.dirname, "../test/corpus.claims.txt"), "utf8").split("\n").filter(Boolean);
function seenIn(test: (line: string) => boolean, w: (typeof WORDS)[Lang]): string {
  const repos = new Map<string, number>();
  for (const line of CLAIMS) if (test(line)) repos.set(line.split("\t")[0]!, (repos.get(line.split("\t")[0]!) ?? 0) + 1);
  if (!repos.size) return w.unseen;
  const top = [...repos].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return top.slice(0, 3).map(([r]) => r).join(", ") + (top.length > 3 ? ` +${top.length - 3}` : "");
}

export function catalog(lang: Lang): string {
  const w = WORDS[lang];
  const facts = TOOLS.reduce((n, t) => n + t.facts.length, 0);
  const absents = TOOLS.reduce((n, t) => n + ("absent" in t ? (t.absent?.length ?? 0) : 0), 0);
  const eols = TOOLS.filter((t) => "eol" in t).length;
  const out = [`# ${w.title}`, "", `> ${w.generated}`, "", w.intro, "", w.counts(TOOLS.length, facts, absents, eols, PACKAGES.length), "", w.seenNote, "", `## ${w.tools}`, ""];

  for (const t of TOOLS) {
    out.push(`### ${t.name}`, "", w.researched(t.researched), "");
    const rows = [
      ...t.facts.map((f) => [w.value[f.value], say(f.message, lang), hosts(f.sources), seenIn((l) => l.includes(`\tissue.contract.${f.id}\t`), w)]),
      ...("absent" in t ? (t.absent ?? []) : []).map((a) => [
        w.value[a.value],
        `${w.absent}${w.colon}${a.names.map((n) => `\`${n}\``).join(", ")} — ${say(a.message, lang)}`,
        hosts(a.sources),
        seenIn((l) => l.includes(`"t":"reason.${a.id}"`), w),
      ]),
    ];
    if (rows.length) {
      out.push(`| ${w.taste} | ${w.says} | ${w.source} | ${w.seen} |`, "|---|---|---|---|", ...rows.map((r) => `| ${r.join(" | ")} |`), "");
    }
    if ("eol" in t && t.eol) {
      const { label, versions, source } = t.eol;
      const dates = versions.map((v) => v.date).filter(Boolean).sort();
      out.push(
        `${w.eol(label, versions.length, versions[0]!.version, versions.at(-1)!.version, dates.at(-1) ?? "")}${w.space}${w.source}${w.colon}${hosts([{ url: source }])}${w.sep}${w.seen}${w.colon}${seenIn((l) => l.includes(`"t":"eol.${t.eol!.product}"`), w)}`,
        "",
      );
    }
  }

  out.push(`## ${w.packages}`, "", `| ${w.pkg} | ${w.verdict} | ${w.use} | ${w.why} |`, "|---|---|---|---|");
  for (const p of PACKAGES) {
    out.push(`| ${p.names.map((n) => `\`${n}\``).join(", ")} | ${p.kind === "native" ? w.review : w.smell} | ${cell(p.use)} | ${say(p.why, lang)} |`);
  }
  return `${out.join("\n")}\n`;
}
