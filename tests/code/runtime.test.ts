import { describe, expect, it } from "vitest";
import { resolveSystemLang } from "../../src/runtime";

const nls = JSON.stringify({
  userLocale: "zh-cn",
  osLocale: "zh-cn",
  resolvedLanguage: "en",
  locale: "zh-cn",
  availableLanguages: {},
});

describe("resolveSystemLang", () => {
  it("ignores Cursor-injected LANG on Windows and uses the Windows locale", () => {
    expect(
      resolveSystemLang({
        platform: "win32",
        env: { LANG: "en_US.UTF-8" },
        intlLocale: "zh-CN",
      }),
    ).toBe("zh");
  });

  it("uses VSCODE_NLS_CONFIG.osLocale on Windows when Intl is unavailable", () => {
    expect(
      resolveSystemLang({
        platform: "win32",
        env: { LANG: "en_US.UTF-8", VSCODE_NLS_CONFIG: nls },
      }),
    ).toBe("zh");
  });

  it("lets LC_ALL override the Windows locale", () => {
    expect(
      resolveSystemLang({
        platform: "win32",
        env: { LC_ALL: "en_US.UTF-8", LANG: "zh_CN.UTF-8" },
        intlLocale: "zh-CN",
      }),
    ).toBe("en");
  });

  it("keeps POSIX LANG ahead of Intl", () => {
    expect(
      resolveSystemLang({
        platform: "linux",
        env: { LANG: "ja_JP.UTF-8" },
        intlLocale: "en-US",
      }),
    ).toBe("ja");
  });

  it("reads VS Code locale on POSIX when LANG is unset", () => {
    expect(
      resolveSystemLang({
        platform: "darwin",
        env: { VSCODE_NLS_CONFIG: nls },
        intlLocale: "en-US",
      }),
    ).toBe("zh");
  });
});
