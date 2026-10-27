import { defineMigration } from "../types";

export default defineMigration({
  role: "git-hooks",
  from: "husky",
  to: "simple-git-hooks",
  resolution: "agent",
  notes: "Move hook scripts into package.json simple-git-hooks field and rename .husky → .githooks.",
});
