/**
 * Regression over real repositories: every claim chous makes about the
 * projects in test/corpus.json, at their pinned commits, against the claims
 * recorded in test/corpus.claims.txt.
 *
 *   pnpm run corpus            # compare; exits 1 on any difference
 *   pnpm run corpus --update   # record the current claims
 *
 * A difference is not a failure to fix by updating: read each changed line.
 * A wrong fact is a false positive; a taste a project does not share is not.
 * Checkouts are cached in $CHOUS_CORPUS_DIR (default: <tmp>/chous-corpus).
 * Needs network; it is not part of `pnpm run test`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { lintWorkspace } from "../src/rules/lint";

/** Claims depend on the date (end of life); the corpus pins one. */
const TODAY = "2026-11-25";

const ROOT = resolve(import.meta.dirname, "..");
const CLAIMS = join(ROOT, "test/corpus.claims.txt");
const cache = process.env.CHOUS_CORPUS_DIR ?? join(tmpdir(), "chous-corpus");
const update = process.argv.includes("--update");
const corpus: Array<{ repo: string; commit: string; group: string }> = JSON.parse(readFileSync(join(ROOT, "test/corpus.json"), "utf8"));

const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function checkout(repo: string, commit: string): string {
  const dir = join(cache, repo.replace("/", "__"));
  if (existsSync(join(dir, ".git")) && git(dir, "rev-parse", "HEAD") === commit) return dir;
  mkdirSync(dir, { recursive: true });
  if (!existsSync(join(dir, ".git"))) {
    git(dir, "init", "-q");
    git(dir, "remote", "add", "origin", `https://github.com/${repo}`);
  }
  git(dir, "fetch", "-q", "--depth", "1", "origin", commit);
  git(dir, "checkout", "-q", "--force", "FETCH_HEAD");
  return dir;
}

const lines: string[] = [];
for (const { repo, commit } of corpus) {
  process.stderr.write(`${repo}\n`);
  const result = await lintWorkspace({ root: checkout(repo, commit), today: TODAY });
  for (const i of result.issues) {
    lines.push([repo, i.verdict, i.value, i.displayPath, i.message.key, JSON.stringify(i.message.params ?? {})].join("\t"));
  }
}
lines.sort();

if (update) {
  writeFileSync(CLAIMS, `${lines.join("\n")}\n`);
  console.log(`recorded ${lines.length} claims about ${corpus.length} repositories`);
} else {
  const before = existsSync(CLAIMS) ? readFileSync(CLAIMS, "utf8").split("\n").filter(Boolean) : [];
  const was = new Set(before);
  const now = new Set(lines);
  const gone = before.filter((l) => !now.has(l));
  const added = lines.filter((l) => !was.has(l));
  for (const l of gone) console.log(`- ${l}`);
  for (const l of added) console.log(`+ ${l}`);
  console.log(`${lines.length} claims; ${added.length} new, ${gone.length} gone`);
  if (gone.length || added.length) process.exit(1);
}
