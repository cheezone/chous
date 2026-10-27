import { defineMigration } from "../types";

export default defineMigration({
  role: "package-manager",
  from: "yarn",
  to: "pnpm",
  resolution: "auto",
  see: "https://pnpm.io/installation",
  notes: "Safe to set packageManager field and remove yarn.lock after reinstalling with pnpm.",
});
