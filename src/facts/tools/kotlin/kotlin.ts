import { tool } from "../../define";
import { naming, stem, STYLE } from "../../kinds";

/** Kotlin source declares something; a `.kt` holding only a comment is a template (Spotless's license header). */
const DECLARES = /^[ \t]*(package|import|((public|private|internal|protected|data|sealed|abstract|open|enum|annotation|value|inline|expect|actual)\s+)*(class|interface|object|fun|val|var|typealias))\b/m;

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
      name: (f) => (DECLARES.test(f.text()) ? stem(f) : undefined),
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
        smell: [{ "src/main/kotlin/utils.kt": "package app\n\nfun greet() = 1\n" }, { "src/main/kotlin/process_declarations.kt": "class ProcessDeclarations\n" }],
        clean: [
          { "src/main/kotlin/ProcessDeclarations.kt": "class ProcessDeclarations\n", "src/jvmMain/kotlin/Platform.jvm.kt": "actual fun platform() = 1\n", "build.gradle.kts": "" },
          { "spotless/copyright.kt": "/*\n * Copyright $YEAR\n */\n" },
        ],
      },
    }),
  ],
});
