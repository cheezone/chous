import { defineKind } from "../types";

export default defineKind({
  id: "nx",
  name: "Nx workspace",
  signals: [{ type: "files", patterns: ["nx.json"] }],
});
