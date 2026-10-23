# Taste lint 调研

日期：2026-10-23

## 原话

### 第一次

> 现在Github上有对taste进行lint的库吗？例如旧版本的库不要，一些无用的路线错误的库不要，一些错误的文件架构不要之类的

### 第二次

> 我有点没太听懂。你说的一大堆术语啊，分层、切片、公开 API、命名都有规则。它只认这一套架构，还在 beta。又是什么鬼？然后

`npm view taste-lint` 摘录（2026-10-23，版本 `0.6.0`）：

```text
taste-lint@0.6.0 | MIT | deps: 10 | versions: 16
Taste linter: copy and typography rules from agent-skills answered by TypeSafe Jev probabilities, with mechanical checks, calibration and a scorecard
https://blode.co/taste-lint

keywords: copywriting, design, jev, lint, taste, typesafe, typography

bin: taste-lint

maintainers:
- mblode <m@blode.co>

dist-tags:
latest: 0.6.0

published 3 weeks ago by GitHub Actions <npm-oidc-no-reply@github.com>
```

## 结论

GitHub 上有人在做 “taste lint”，但现有库都是拆开做的。没有一个库会把一个人的技术品味一次查完：旧库不要、走错的技术路线不要、目录也不要对。

`taste-lint`（[mblode/taste-lint](https://github.com/mblode/taste-lint)，npm `taste-lint@0.6.0`）查的是 AI 写出来的界面和文案好不好看、好不好读。它不查旧库、不查技术路线、不查目录摆放。

现有工具要么只认一种固定目录摆法，要么把黑名单交给使用者自己写，要么只扫没人用到的文件和依赖。它们不会带一份人设，告诉 AI：`tests/` 改成 `test/`，`prettier` 换成 `@antfu/eslint-config`，`jest` 换成 `vitest`。这件事是 `chous` 的 `antfu` 预设在做的范围。

## taste-lint 实际查什么

作者 Matthew Blode。他先写了一套给 AI 用的检查清单（[mblode/agent-skills](https://github.com/mblode/agent-skills)），再把其中能用程序判定的部分做成这个命令行工具。文档在 [blode.co/taste-lint](https://blode.co/taste-lint)。

它主要盯界面和文案。例如按钮写 `Successfully saved your changes! 🎉`，它会要求改成 `Changes saved`。字体大小、行距、动画写成「所有属性一起动」，也会报。需要 Node 24.11 以上。

大约 200 条规则里，只有约 28 条能让检查失败，而且都是能用规则直接判定的。其余只是备注。想让 AI 帮着判断时，还要自己配 Vercel AI Gateway 的 key。文档写明：模型的意见永远不会单独让构建失败。

四个检查范围：

| 范围 | 看什么 |
| --- | --- |
| `product` | JSX / TSX / CSS 里的文案、字体、交互、动画 |
| `writing` | Markdown、MDX、README |
| `instructions` | `AGENTS.md`、skills、计划文档 |
| `code` | 性能、数据访问、测试有没有价值、死代码、超长文件、密钥、CI 浪费 |

`code` 模式的具体例子：请求里用了会卡住的同步调用、循环里一条条查数据库、测试其实没断言、没人引用的依赖、超过 1000 行的文件、密钥写进仓库、CI 每次都全量装依赖。这些发现只出备注，不会让检查失败。

它碰不到这次想查的三件事：

- 不会说「这个库太旧了，别用」。
- 不会说「这条技术路线别走了，换成另一个库」。最多提一句「这个重库有系统自带的替代」。
- 不会说「目录摆错了」。不存在「`tests/` 应改成 `test/`」这种规则。

## 其他能对上号的库

下面这些库各自只覆盖一小块。名字后面是它真正会拦的东西。

### 目录摆放

- [feature-sliced/steiger](https://github.com/feature-sliced/steiger)：只认 Feature-Sliced Design 这一种目录摆法。约 337 star，2026-03 还有提交，配置格式仍在改（beta）。术语见下一节。
- [Igorkowalski94/eslint-plugin-project-structure](https://github.com/Igorkowalski94/eslint-plugin-project-structure)：自己写下文件夹树、每个文件夹里该有哪些文件、文件夹之间能不能互相引用。规则要逐项配。
- [loeffel-io/ls-lint](https://github.com/loeffel-io/ls-lint)：只查目录名和文件名，例如是不是 kebab-case。不判断架构对不对。
- [sverweij/dependency-cruiser](https://github.com/sverweij/dependency-cruiser)：查文件之间的引用有没有越界、有没有绕圈。不查「这个文件不该出现在仓库里」。

### 旧库、不该用的库

- [JamieMason/syncpack](https://github.com/JamieMason/syncpack) 的 banned version group：可以在 monorepo 里禁止某个包。
- [sindresorhus/eslint-package-json](https://github.com/sindresorhus/eslint-package-json) 的 `no-restricted-dependencies`，以及 [npm-package-json-lint](https://npmpackagejsonlint.org/)：在 `package.json` 里拉黑依赖。
- ESLint 自带的 `no-restricted-imports`：禁止代码里 import 某个库，可以附一句该换成什么。
- [QuiiBz/sherif](https://github.com/QuiiBz/sherif)：零配置，管 monorepo 里同一个库的版本是否一致、包信息是否整齐。不判断「Prettier 这条路已经不走了」。
- [webpro-nl/knip](https://github.com/webpro-nl/knip)：找没被用到的依赖、导出和文件。还在用的旧库它不会报。

2026-09 的一份对照（[rev-dep 的工具比较](https://rev-dep.com/docs/comparison-with-other-tools/overview)）把这些标成已停更或归档，新项目不必再看：`depcheck`、`unimported`、`npm-check`、`ts-prune`、`good-fences`。`madge` 自 2024-08 后没有新版本。

### 代码写法

- [@antfu/eslint-config](https://github.com/antfu/eslint-config)：文件里面的格式和写法（无分号、单引号、不用 Prettier）。不检查 `tests/` 该不该改成 `test/`，也不检查仓库根上不该有哪些配置文件。

### 路由

没有通用的「这条路由方案已经过时」检查器。Next 的 ESLint 插件能抓 App Router 的一些具体错误，但不会说 pages 路由这条路不要再走。Vue Router、React Router 的旧写法也一样，只能自己用 `no-restricted-imports` 或依赖黑名单去禁。

## 「分层、切片、公开 API」是什么

这是 steiger 那个库的说法，跟 `taste-lint` 无关。

Feature-Sliced Design 规定项目必须按一种固定方式摆文件夹：

- 分层：页面、功能、数据、公共代码分成几层。上面的层可以引用下面的层，不能反过来。
- 切片：一个功能一个文件夹，例如 `features/auth`。
- 公开 API：外面只能从该文件夹的入口文件引用，不能伸手去拿里面的内部文件。
- 命名：这些文件夹的名字还有一套自己的规矩。

项目如果不是按这套摆的，steiger 就没法用。beta 的意思是规则和配置格式还在改，不适合当稳定依赖。
