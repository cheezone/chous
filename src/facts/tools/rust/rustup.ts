import { tool } from "../../define";
import { legacy } from "../../kinds";

export default tool({
  id: "rustup",
  name: "rustup",
  researched: "2026-11",
  facts: [
    legacy({
      id: "rustToolchainLegacy",
      files: ["rust-toolchain"],
      when: (f) => (/\[toolchain\]/.test(f.text()) ? undefined : {}),
      message: {
        en: "the legacy rust-toolchain format: rustup reads rust-toolchain.toml with a [toolchain] table",
        zh: "旧格式的 rust-toolchain：rustup 读的是带 [toolchain] 表的 rust-toolchain.toml",
      },
      sources: [
        {
          url: "https://rust-lang.github.io/rustup/overrides.html#the-toolchain-file",
          check: "https://raw.githubusercontent.com/rust-lang/rustup/main/doc/user-guide/src/overrides.md",
          quote: "For backwards compatibility, rust-toolchain files also support a legacy format",
        },
      ],
      examples: {
        smell: [{ "rust-toolchain": "stable\n" }],
        clean: [{ "rust-toolchain": '[toolchain]\nchannel = "stable"\n' }, { "rust-toolchain.toml": '[toolchain]\nchannel = "stable"\n' }],
      },
    }),
  ],
});
