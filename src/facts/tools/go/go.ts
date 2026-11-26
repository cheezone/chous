import { tool } from "../../define";
import { naming, STYLE } from "../../kinds";

export default tool({
  id: "go",
  name: "Go",
  researched: "2026-11",
  facts: [
    naming({
      id: "goPackageName",
      match: /\.go$/,
      // The name in the package clause; an external test package adds `_test` by design.
      name: (f) => /^package\s+(\w+)/m.exec(f.text())?.[1]?.replace(/_test$/, ""),
      style: STYLE.oneWord,
      message: {
        en: "package {{name}}: Go package names are lower case and single words, with no underscores or mixedCaps",
        zh: "package {{name}}：Go 的包名是一个小写单词，不用下划线，也不用驼峰",
      },
      sources: [
        {
          url: "https://go.dev/doc/effective_go#package-names",
          check: "https://raw.githubusercontent.com/golang/website/master/_content/doc/effective_go.html",
          quote: "By convention, packages are given lower case, single-word names; there should be no need for underscores or mixedCaps.",
        },
      ],
      examples: {
        smell: [{ "internal/user_store/store.go": "package user_store\n" }, { "pkg/httputil/client.go": "// Package httpUtil helps.\npackage httpUtil\n" }],
        clean: [{ "internal/store/store.go": "package store\n", "internal/store/store_test.go": "package store_test\n" }, { "cmd/my-tool/main.go": "package main\n" }],
      },
    }),
  ],
});
