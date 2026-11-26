import { defineTool } from "../types";

export default defineTool({
  id: "bun",
  name: "Bun",
  roles: {
    "package-manager": {
      signals: [
        { type: "files", patterns: ["bun.lock", "bun.lockb"] },
        { type: "pkgField", field: "packageManager", equals: "bun" },
      ],
    },
    runtime: {
      signals: [
        { type: "files", patterns: ["bunfig.toml"] },
        { type: "deps", names: ["@types/bun", "bun-types"] },
        { type: "scripts", commands: ["bun "] },
      ],
    },
    "test-runner": {
      signals: [{ type: "scripts", commands: ["bun test"] }],
    },
    bundler: {
      signals: [{ type: "scripts", commands: ["bun build"] }],
    },
  },
});
