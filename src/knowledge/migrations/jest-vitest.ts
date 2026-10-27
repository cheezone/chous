import { defineMigration } from "../types";

export default defineMigration({
  role: "test-runner",
  from: "jest",
  to: "vitest",
  resolution: "agent",
  see: "https://vitest.dev/guide/migration.html",
  notes: [
    "Globals and timers APIs differ — update imports and fake timers.",
    "jest.mock / moduleNameMapper need Vitest aliases.",
    "Snapshot serializers and custom environments may need rewrites.",
  ].join("\n"),
});
