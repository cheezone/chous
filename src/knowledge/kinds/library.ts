import { defineKind } from "../types";

export default defineKind({
  id: "library",
  name: "npm library",
  signals: [
    { type: "pkgField", field: "exports", exists: true },
    { type: "pkgField", field: "main", exists: true },
  ],
});
