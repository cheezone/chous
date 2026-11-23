import { taste } from "./define";

/** Python projects. */
export function python() {
  const t = taste("python");

  t.allow([
    "pyproject.toml", "setup.py", "setup.cfg", "MANIFEST.in",
    "requirements*.txt", "requirements*.in",
    "Pipfile", "Pipfile.lock", "poetry.lock", "poetry.toml", "pdm.lock", "pdm.toml",
    "pip-tools-compile.txt", "pyrightconfig.json", "mypy.ini", "pylintrc", "flake8",
    "pytest.ini", "tox.ini", "runtime.txt", "Procfile",
  ]);
  t.allow(["src", "tests", "test", "scripts", "script", "lib", "libs", "app", "apps", "package", "packages"]);
  t.allow(["*.py"]);

  return t.rules;
}
