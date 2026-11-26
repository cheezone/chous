import { tool } from "../../define";
import { naming, stem, STYLE } from "../../kinds";

export default tool({
  id: "elixir",
  name: "Elixir",
  researched: "2026-11",
  facts: [
    naming({
      id: "elixirFileName",
      match: /\.exs?$/,
      name: stem,
      style: STYLE.snake,
      message: {
        en: "Elixir files not in snake_case ({{count}}, e.g. {{name}}): Elixir's naming conventions say file names follow the module in snake_case",
        zh: "不是 snake_case 的 Elixir 文件（{{count}} 个，如 {{name}}）：Elixir 命名约定规定文件名按模块名的 snake_case 来写",
      },
      sources: [
        {
          url: "https://hexdocs.pm/elixir/naming-conventions.html",
          check: "https://raw.githubusercontent.com/elixir-lang/elixir/main/lib/elixir/pages/references/naming-conventions.md",
          quote: "Generally speaking, filenames follow the snake_case convention of the module they define.",
        },
      ],
      examples: {
        smell: [{ "lib/MyApp.ex": "" }],
        clean: [{ "lib/my_app.ex": "", "test/my_app_test.exs": "", "mix.exs": "" }],
      },
    }),
  ],
});
