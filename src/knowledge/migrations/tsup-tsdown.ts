import { defineMigration } from "../types";

export default defineMigration({
  role: "bundler",
  from: "tsup",
  to: "tsdown",
  resolution: "agent",
  see: "https://tsdown.dev/",
  notes: { en: "Config option names differ; rewrite tsup.config.* to tsdown.config.* carefully.", zh: "配置项名称不同；请仔细把 tsup.config.* 改写成 tsdown.config.*。" },
});
