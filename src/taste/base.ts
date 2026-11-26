import { taste } from "./define";

/**
 * Every repository. What chous stands for is in docs/manifesto.md; each rule
 * here names the value it keeps.
 */
export function base(opts: { workspacePackage?: boolean } = {}) {
  const t = taste("base");

  t.lifecycle();
  t.artifacts();
  t.leftovers({ scripts: !opts.workspacePackage, rootDocs: !opts.workspacePackage });
  t.twins();
  t.contracts();

  t.no([".chous", ".chousignore"], { reason: "reason.chousConfig", value: "cleanliness" });

  // Anything still visible here is not gitignored, so it would be committed.
  // OS junk and local.properties are found by what their makers write into them (see `leftovers`).
  // A name only: a program's log, or a test's input (Matomo keeps access logs to import). For review.
  t.no(["**/*.log"], { reason: "reason.logs", value: "cleanliness", verdict: "review" });

  // Files their own tools call personal, local or legacy: src/facts/tools/ (`absent`).
  t.absent("base");

  return t.rules;
}
