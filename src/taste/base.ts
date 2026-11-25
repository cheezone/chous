import { taste } from "./define";

/**
 * Applies to every repository. Only facts: things that leak, things that rot,
 * leftovers. Where files live is each ecosystem's own
 * business — SQLite, React and Vue all lay out their roots differently, and
 * all of them are right.
 */
export function base(opts: { workspacePackage?: boolean } = {}) {
  const t = taste("base");

  t.lifecycle();
  t.artifacts();
  t.leftovers({ scripts: !opts.workspacePackage });
  t.twins();
  if (!opts.workspacePackage) t.license();

  t.no([".chous", ".chousignore"], { reason: "reason.chousConfig" });

  // Anything still visible here is not gitignored, so it would be committed.
  t.no(["**/.DS_Store", "**/Thumbs.db", "**/desktop.ini"], { reason: "reason.osJunk" });
  t.no(["**/.env*.local"], {
    reason: "reason.envLocal",
  });
  t.no(["**/*.log"], { reason: "reason.logs" });

  // Files their own tools call personal. Each source says "not checked in".
  t.no(["**/CLAUDE.local.md", "**/.claude/settings.local.json"], { reason: "reason.claudeLocal" });
  t.no(["**/local.properties"], { reason: "reason.localProperties" });
  t.no(["**/.idea/workspace.xml"], { reason: "reason.ideaWorkspace" });
  t.no(["**/.cursorrules"], { reason: "reason.cursorrules", severity: "warn" });

  return t.rules;
}
