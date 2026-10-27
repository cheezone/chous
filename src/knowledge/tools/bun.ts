import { defineTool } from "../types";

export default defineTool({
  id: "bun",
  name: "Bun",
  status: "beta",
  roles: {
    "package-manager": {
      signals: [
        { type: "files", patterns: ["bun.lock", "bun.lockb"] },
        { type: "pkgField", field: "packageManager", equals: "bun" },
      ],
      files: ["bun.lock", "bun.lockb", "bunfig.toml"],
    },
    runtime: {
      signals: [
        { type: "files", patterns: ["bunfig.toml"] },
        { type: "deps", names: ["@types/bun", "bun-types"] },
        { type: "scripts", commands: ["bun "] },
      ],
      files: ["bunfig.toml"],
    },
    "test-runner": {
      signals: [{ type: "scripts", commands: ["bun test"] }],
      files: [],
    },
    bundler: {
      signals: [{ type: "scripts", commands: ["bun build"] }],
      files: [],
    },
  },
});
