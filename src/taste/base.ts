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
  t.leaks();
  t.worklogs();

  t.no([".chous", ".chousignore"], { reason: { en: "chous has no config, delete it", zh: "chous 没有配置，删掉它" } });

  // Anything still visible here is not gitignored, so it would be committed.
  t.no(["**/.DS_Store", "**/Thumbs.db", "**/desktop.ini"], { reason: { en: "OS junk, delete it and gitignore it", zh: "系统垃圾文件，删掉并加进 .gitignore" } });
  t.no(["**/.env*.local"], {
    reason: { en: "local env file that may hold secrets; Vite and Next.js say to gitignore *.local", zh: "本地环境变量文件，可能含密钥；Vite 和 Next.js 官方都要求把 *.local 加进 .gitignore" },
  });
  t.no(["**/*.log"], { reason: { en: "logs, gitignore them", zh: "日志文件，加进 .gitignore" } });

  return t.rules;
}
