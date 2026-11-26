import { tool } from "../../define";
import { folder, naming, stem, STYLE } from "../../kinds";

const STYLE_GUIDE = {
  url: "https://dart.dev/effective-dart/style#do-name-packages-and-file-system-entities-using-lowercase-with-underscores",
  check: "https://raw.githubusercontent.com/dart-lang/site-www/main/src/content/effective-dart/style.md",
  quote: "DO name packages, directories, and source files using `lowercase_with_underscores`",
};

export default tool({
  id: "dart",
  name: "Dart",
  researched: "2026-11",
  facts: [
    naming({
      id: "dartFileName",
      match: /\.dart$/,
      name: stem,
      style: STYLE.snake,
      message: {
        en: "Dart files not in lowercase_with_underscores ({{count}}, e.g. {{name}}): Effective Dart names source files that way",
        zh: "不是 lowercase_with_underscores 的 Dart 文件（{{count}} 个，如 {{name}}）：Effective Dart 规定源文件这样命名",
      },
      sources: [STYLE_GUIDE],
      examples: {
        smell: [{ "lib/SliderMenu.dart": "" }, { "lib/file-system.dart": "" }],
        clean: [{ "lib/slider_menu.dart": "", "lib/models/user.g.dart": "" }],
      },
    }),
    naming({
      id: "dartDirectoryName",
      match: /\/[^/]+\.dart$/,
      name: folder,
      style: STYLE.snake,
      message: {
        en: "directory {{name}} holds Dart files and is not in lowercase_with_underscores: Effective Dart names directories that way",
        zh: "目录 {{name}} 放着 Dart 文件，但不是 lowercase_with_underscores：Effective Dart 规定目录这样命名",
      },
      sources: [STYLE_GUIDE],
      examples: {
        smell: [{ "lib/userProfile/view.dart": "" }],
        clean: [{ "lib/user_profile/view.dart": "", "ios/Runner/AppDelegate.swift": "" }],
      },
    }),
  ],
});
