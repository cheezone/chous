import { tool } from "../../define";
import { jsonSchedule } from "../../official";
import versions from "../../data/eol/node";

export default tool({
  id: "node",
  name: "Node.js",
  researched: "2026-11",
  facts: [],
  eol: {
    product: "node",
    label: "Node",
    source: "https://github.com/nodejs/Release/blob/main/schedule.json",
    data: "https://raw.githubusercontent.com/nodejs/Release/main/schedule.json",
    // `v18`, not the `v0.12` lines of the old numbering.
    parse: (raw) => jsonSchedule(raw, "end", (name) => /^v([1-9]\d*)$/.exec(name)?.[1], "codename"),
    use: { en: "a supported LTS release", zh: "仍在维护的 LTS 版本" },
    versions,
    examples: { smell: [{ ".nvmrc": "16\n" }, { ".nvmrc": "lts/gallium\n" }, { "docker/api.Dockerfile": "ARG NODE=14\nFROM public.ecr.aws/docker/library/node:${NODE}-alpine\n" }], clean: [{ ".nvmrc": "24\n" }, { ".nvmrc": "lts/*\n" }] },
  },
});
