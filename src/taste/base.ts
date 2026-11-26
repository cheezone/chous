import { taste } from "./define";

/**
 * Every repository. What chous stands for is in docs/manifesto.md; each rule
 * here names the value it keeps.
 */
export function base(opts: { workspacePackage?: boolean } = {}) {
  const t = taste("base");

  t.lifecycle({ workflows: !opts.workspacePackage });
  t.artifacts();
  t.leftovers({ rootDocs: !opts.workspacePackage });
  t.twins();
  t.contracts();

  t.no([".chous", ".chousignore"], { reason: "reason.chousConfig", value: "cleanliness" });

  // Files their own tools call personal, local or legacy: src/facts/tools/ (`absent`).
  t.absent("base");

  return t.rules;
}
