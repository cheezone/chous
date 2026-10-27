import { defineMigration } from "../types";

export default defineMigration({
  role: "package-manager",
  from: "npm",
  to: "pnpm",
  resolution: "auto",
  see: "https://pnpm.io/installation",
  notes: "Safe to set packageManager field and remove package-lock.json after reinstalling with pnpm.",
});
