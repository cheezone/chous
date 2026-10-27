import { defineKind } from "../types";

export default defineKind({
  id: "electron",
  name: "Electron app",
  signals: [{ type: "deps", names: ["electron"] }],
});
