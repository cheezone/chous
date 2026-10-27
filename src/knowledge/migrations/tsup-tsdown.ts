import { defineMigration } from "../types";

export default defineMigration({
  role: "bundler",
  from: "tsup",
  to: "tsdown",
  resolution: "agent",
  see: "https://tsdown.dev/",
  notes: "Config option names differ; rewrite tsup.config.* to tsdown.config.* carefully.",
});
