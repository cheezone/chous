import { defineKind } from "../types";

export default defineKind({
  id: "rust",
  name: "Rust crate",
  signals: [{ type: "files", patterns: ["Cargo.toml"] }],
});
