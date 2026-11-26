import { tool } from "../../define";
import { byDirectory, custom } from "../../kinds";
import { type ContractFile, nearest, parseJsonc } from "../../kit";

/** The directories `autoload.psr-4` and `autoload-dev.psr-4` map namespaces to, from the nearest composer.json; read once per project. */
const read = new WeakMap<Set<string>, Map<string, string[]>>();
function psr4Dirs(f: ContractFile): { root: string; dirs: string[] } | undefined {
  const root = nearest(f, "composer.json");
  if (root === undefined) return undefined;
  const byRoot = read.get(f.all) ?? new Map<string, string[]>();
  read.set(f.all, byRoot);
  const known = byRoot.get(root);
  if (known) return { root, dirs: known };
  const composer = parseJsonc(f.read(`${root}composer.json`));
  const dirs = [composer?.autoload?.["psr-4"], composer?.["autoload-dev"]?.["psr-4"]]
    .flatMap((map) => Object.values(map ?? {}))
    .flatMap((dir) => (Array.isArray(dir) ? dir : [dir]))
    .filter((dir): dir is string => typeof dir === "string")
    .map((dir) => dir.replace(/^\.\//, "").replace(/\/*$/, "/").replace(/^\/$/, ""));
  byRoot.set(root, dirs);
  return { root, dirs };
}

/** The classes, interfaces, traits and enums a file declares, by name. */
const DECLARES = /^[ \t]*(?:(?:abstract|final|readonly)[ \t]+)*(?:class|interface|trait|enum)\s+([A-Za-z_][A-Za-z0-9_]*)/gm;

export default tool({
  id: "composer",
  name: "Composer (PSR-4)",
  researched: "2026-11",
  facts: [
    custom({
      id: "psr4FileName",
      value: "convention",
      match: /\.php$/,
      groupBy: byDirectory,
      check: (f) => {
        const map = psr4Dirs(f);
        if (!map || !map.dirs.some((dir) => f.rel.startsWith(`${map.root}${dir}`))) return undefined;
        const name = f.name.slice(0, -".php".length);
        // `0.2.10.php` cannot hold a PSR-4 class: the name is not a class name.
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return undefined;
        const declared = [...f.text().matchAll(DECLARES)].map((m) => m[1]!);
        // One class, named otherwise. A file declaring several (a test with its helpers) has none that owns its name.
        return declared.length === 1 && declared[0] !== name ? { name, className: declared[0]! } : undefined;
      },
      message: {
        en: "files named unlike the class they declare ({{count}}, e.g. {{name}}.php declares {{className}}): PSR-4 says the file name matches the class name, case included",
        zh: "文件名和所声明的类名不一致（{{count}} 个，如 {{name}}.php 声明的是 {{className}}）：PSR-4 规定文件名与类名一致，大小写也要一致",
      },
      sources: [
        {
          url: "https://www.php-fig.org/psr/psr-4/",
          check: "https://raw.githubusercontent.com/php-fig/fig-standards/master/accepted/PSR-4-autoloader.md",
          quote: "The file name MUST match the case of the terminating class name.",
        },
      ],
      examples: {
        smell: [
          { "composer.json": JSON.stringify({ autoload: { "psr-4": { "App\\": "app/" } } }), "app/Models/user.php": "<?php\nnamespace App\\Models;\n\nclass User {}\n" },
          { "composer.json": JSON.stringify({ autoload: { "psr-4": { "Acme\\": ["src/", "lib/"] } } }), "lib/HttpClient.php": "<?php\nfinal class HTTPClient {}\n" },
          { "composer.json": JSON.stringify({ autoload: { "psr-4": { "Piwik\\": "core/" } } }), "core/Categeories.php": "<?php\nclass Categories {}\n" },
        ],
        clean: [
          { "composer.json": JSON.stringify({ autoload: { "psr-4": { "App\\": "app/" } } }), "app/Models/User.php": "<?php\nclass User {}\n", "app/helpers.php": "<?php\nfunction helper() {}\n" },
          { "composer.json": JSON.stringify({ autoload: { "psr-4": { "App\\": "app/" } } }), "database/migrations/2024_01_01_create_users.php": "<?php\nreturn new class extends Migration {};\n", "config/app.php": "<?php\nclass Unrelated {}\n" },
          {
            "composer.json": JSON.stringify({ "autoload-dev": { "psr-4": { "Tests\\": "tests/" } } }),
            "tests/DavTest.php": "<?php\nclass FakeClient {}\n\nclass DavTest {}\n",
            "tests/Updates/0.2.10.php": "<?php\nclass Updates_0_2_10 {}\n",
            "tests/ActionTest.php": "<?php\nclass HelperA {}\nclass HelperB {}\n",
          },
        ],
      },
    }),
  ],
});
