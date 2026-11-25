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
  t.no(["**/.env*.local"], { reason: "reason.envLocal", value: "cleanliness" });
  t.no(["**/*.log"], { reason: "reason.logs", value: "cleanliness" });

  // Files their own tools call personal.
  t.no(["**/CLAUDE.local.md", "**/.claude/settings.local.json"], { reason: "reason.claudeLocal", value: "cleanliness" });
  t.no(["**/.idea/workspace.xml"], { reason: "reason.ideaWorkspace", value: "cleanliness" });

  // Cursor calls it legacy.
  t.no(["**/.cursorrules"], { reason: "reason.cursorrules", value: "modernity" });

  return t.rules;
}
