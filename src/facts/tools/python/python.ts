import { tool } from "../../define";
import { jsonSchedule } from "../../official";
import versions from "../../data/eol/python";

export default tool({
  id: "python",
  name: "Python",
  researched: "2026-11",
  facts: [],
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
