import { defineKind } from "../types";

export default defineKind({
  id: "cli",
  name: "CLI package",
  signals: [{ type: "pkgField", field: "bin", exists: true }],
});
