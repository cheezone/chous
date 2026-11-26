import { tool } from "../../define";
import { folder, naming, STYLE } from "../../kinds";
import { jsonSchedule } from "../../official";
import versions from "../../data/eol/python";

const PEP8 = { url: "https://peps.python.org/pep-0008/#package-and-module-names", check: "https://raw.githubusercontent.com/python/peps/main/peps/pep-0008.rst" };

export default tool({
  id: "python",
  name: "Python",
  researched: "2026-11",
  facts: [
    naming({
      id: "pythonModuleName",
      // A hyphen makes a script that cannot be imported, not a module: PEP 8's module names do not cover it.
      match: /\.py$/,
      name: (f) => f.name.slice(0, -".py".length),
      style: STYLE.lowercase,
      message: {
        en: "Python files with capitals in their names ({{count}}, e.g. {{name}}): PEP 8 gives modules all-lowercase names",
        zh: "名字带大写字母的 Python 文件（{{count}} 个，如 {{name}}）：PEP 8 规定模块名全小写",
      },
      sources: [{ ...PEP8, quote: "Modules should have short, all-lowercase names." }],
      examples: {
        smell: [{ "app/UserService.py": "" }, { "tests/test_UserService.py": "" }],
        clean: [{ "app/user_service.py": "", "app/__init__.py": "", "scripts/build-docs.py": "" }],
      },
    }),
    naming({
      id: "pythonPackageName",
      match: /(^|\/)[^/]+\/__init__\.py$/,
      name: folder,
      ofDirectory: true,
      style: STYLE.lowercase,
      message: {
        en: "package {{name}} has capitals in its name: PEP 8 gives packages all-lowercase names",
        zh: "包 {{name}} 的名字带大写字母：PEP 8 规定包名全小写",
      },
      sources: [{ ...PEP8, quote: "Python packages should also have short, all-lowercase names" }],
      examples: {
        smell: [{ "src/MyPackage/__init__.py": "" }],
        clean: [{ "src/my_package/__init__.py": "", "Docs/conf.py": "" }],
      },
    }),
  ],
  eol: {
    product: "python",
    label: "Python",
    source: "https://peps.python.org/api/release-cycle.json",
    data: "https://peps.python.org/api/release-cycle.json",
    parse: (raw) => jsonSchedule(raw, "end_of_life", (name) => (/^\d+\.\d+$/.test(name) ? name : undefined)),
    use: { en: "a supported Python 3 release", zh: "仍在维护的 Python 3 版本" },
    versions,
    examples: { smell: [{ ".python-version": "3.8\n" }], clean: [{ ".python-version": "3.13\n" }] },
  },
});
