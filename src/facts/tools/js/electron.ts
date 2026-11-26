import { tool } from "../../define";
import { htmlText, isoDate } from "../../official";
import versions from "../../data/eol/electron";

const pkg = (electron: string) => JSON.stringify({ name: "a", private: true, devDependencies: { electron } });

export default tool({
  id: "electron",
  name: "Electron",
  researched: "2026-11",
  facts: [],
  eol: {
    product: "electron",
    label: "Electron",
    dep: "electron",
    source: "https://releases.electronjs.org/schedule",
    data: "https://releases.electronjs.org/schedule",
    // Each row: "<v>.0.0", then alpha, beta and stable dates, then end of life. A date marked † is tentative: not yet a fact.
    parse: (raw) =>
      [...htmlText(raw).matchAll(/\b(\d+)\.0\.0 ((?:(?:[A-Z][a-z]{2} \d{1,2}, \d{4})(?: †)? |— ){3})([A-Z][a-z]{2}) (\d{1,2}), (\d{4})( †)?/g)]
        .filter((m) => !m[6])
        .map((m) => ({ version: m[1]!, date: isoDate(m[3]!, m[4]!, m[5]!) })),
    use: { en: "one of the three latest stable Electron releases", zh: "最新的三个稳定版 Electron 之一" },
    versions,
    examples: { smell: [{ "package.json": pkg("^39.8.10") }], clean: [{ "package.json": pkg("^45.0.0") }] },
  },
});
