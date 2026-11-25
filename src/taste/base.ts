import { taste } from "./define";

/**
 * Applies to every repository. Only facts: things that leak, things that rot,
 * leftovers of chous's old config. Where files live is each ecosystem's own
 * business — SQLite, React and Vue all lay out their roots differently, and
 * all of them are right.
 */
export function base() {
  const t = taste("base");

  t.lifecycle();
  t.artifacts();
  t.worklogs();
  t.caseCollisions();

  t.no([".chous", ".chousignore"], { reason: "reason.chousConfig" });

  // Anything still visible here is not gitignored, so it would be committed.
  t.no(["**/.DS_Store", "**/Thumbs.db", "**/desktop.ini"], { reason: "reason.osJunk" });
  t.no(["**/.env*.local"], {
    reason: "reason.envLocal",
  });
  t.no(["**/*.log"], { reason: "reason.logs" });

  return t.rules;
}
