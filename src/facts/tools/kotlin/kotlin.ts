import { tool } from "../../define";
import { naming, stem, STYLE } from "../../kinds";

const CONVENTIONS = { url: "https://kotlinlang.org/docs/coding-conventions.html#source-file-names", check: "https://raw.githubusercontent.com/JetBrains/kotlin-web-site/master/docs/topics/coding-conventions.md" };

export default tool({
  id: "kotlin",
  name: "Kotlin",
  researched: "2026-11",
  facts: [
    naming({
      id: "kotlinFileName",
      // `Platform.jvm.kt`: a multiplatform source set's suffix follows the name.
      match: /\.kt$/,
      name: stem,
      style: STYLE.upperCamel,
      message: {
        en: "Kotlin files not in upper camel case ({{count}}, e.g. {{name}}): Kotlin's coding conventions name files like ProcessDeclarations.kt",
        zh: "不是大驼峰的 Kotlin 文件（{{count}} 个，如 {{name}}）：Kotlin 编码规范要求文件名像 ProcessDeclarations.kt 这样",
      },
      sources: [
        { ...CONVENTIONS, quote: "its name should be the same as the name of the class, with the .kt extension appended." },
        { ...CONVENTIONS, quote: "where the first letter of each word is capitalized." },
      ],
      examples: {
        smell: [{ "src/main/kotlin/utils.kt": "" }, { "src/main/kotlin/process_declarations.kt": "" }],
        clean: [{ "src/main/kotlin/ProcessDeclarations.kt": "", "src/jvmMain/kotlin/Platform.jvm.kt": "", "build.gradle.kts": "" }],
      },
    }),
  ],
});
