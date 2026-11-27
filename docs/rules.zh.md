# chous 的规则

[宣言](manifesto.zh.md)说 chous 主张什么，这份文档说它具体查什么、凭什么。这里的数值和名单会调整，宣言不变。chous 对具体软件知道的那一点（停止维护时间表、废弃、语言命名规定）见 [chous 知道什么](facts.zh.md)，由注册表生成。

## 立场值

体积和数量只让东西进入「待审视」，从不定性。这些数是 chous 的立场，不是测量出的好坏：在 85 个真实仓库（`test/corpus.json`）里，它们只圈出分布的尾部。

| 检测 | 立场值 |
|---|---|
| 源文件 | 超过 1000 行，或超过 100 KiB |
| 一个目录平铺的源文件 | 超过 50 个 |
| 根目录的文件 | 超过 30 个 |
| 根目录的文档（README、LICENSE 这类有位置约定的除外） | 超过 3 份（这一条是臭味） |
| agent 指令文件（AGENTS.md、CLAUDE.md、GEMINI.md、Copilot 指令） | 超过 300 行 |
| 内容完全相同的文件 | 4 KiB 以上；agent 指令文件不论大小 |
| 单个文件 | 50 MiB 以上（臭味） |

JSON 输出（`chous --json`）给出每条结果背后的完整事实：所有长文件、平铺目录、重复文件组、根目录文档、被忽略却仍被提交的文件，不截断。人看的报告只列前几项。

## chous 怎样确认事实

- 停止维护的日期只收官方数据里写着的版本。表里没有的版本不报，也从不推断日期。
- 版本只取实际运行的环境：`.nvmrc`、`.node-version`、`.python-version`、`.tool-versions`、项目里任何一个 Dockerfile 的 `FROM`（经过任何镜像仓库，`ARG` 展开后）、GitHub workflow 任务安装的版本或运行它的容器、dev container 的镜像和 features、`volta.node`、框架依赖。CI 矩阵测试的是兼容承诺，和 `engines` 一样，不读。Node 的代号（`lts/gallium`）按官方时间表换算成版本。`engines.node` 是兼容承诺，不是运行环境；只有它声明的范围全部已停止维护时才报，例如 `^16`。
- 文件的身份靠内容确认，不靠名字：`.DS_Store` 开头的 `Bud1`、Android 写进 `local.properties` 的「绝不能提交」、安装包和可执行文件的文件头、构建工具写下的标记文件。
- 引用别人的话，原话和它的工具放在一起（`src/facts/tools/`），只在收录时核对一次：官方文档改个措辞不是新闻。停止维护的日期由程序从官方数据写入，每周比对一次。

## 作用域

不检查的只有两类，名字都由放它们进来的工具规定：npm 的 `node_modules/`；`vendor/`（Go 规定的目录名，GitHub Linguist 的 vendor.yml 也认 `vendors?/`）；Go 的 `testdata/`（"The go tool will ignore a directory named "testdata""）；Jest、Vitest 写的 `__snapshots__/`；Linguist 认定的测试夹具 `tests/fixtures/`、`specs/fixtures/`。其他名字，chous 不猜，由仓库自己在 `.gitattributes` 里用 GitHub 的写法声明：`测试数据/** linguist-vendored`、`upstream/** linguist-vendored`，`linguist-generated` 同样生效，`-linguist-vendored` 把路径要回来。`tests/`、`examples/`、`playground/` 是你自己的代码，照常检查。

## 每条规则知道什么、主张什么

| 规则 | chous 知道的事实 | chous 的主张 | 品味 | 结果 |
|---|---|---|---|---|
| 停止维护的运行时、框架 | 实际运行的版本，以及官方数据里的停止维护日期；官方只说「不再支持」、没给日期的（Angular），照原话报 | 停止维护的就是臭的 | 现代 | 臭味 |
| `engines.node` 只允许已停止维护的版本 | 声明的范围，以及其中每个版本的停止维护日期 | 不要只承诺支持已经死掉的版本 | 现代 | 臭味 |
| 作者宣布废弃、称为遗留的依赖 | 依赖名，以及作者的公开原话：npm 的 deprecated 字段（安装时由 pnpm、npm 原样记进 lockfile，chous 直接读，只报 package.json 里直接写的依赖）、README、安全公告 | 不在废弃的东西上继续建造 | 现代 | 臭味 |
| 工具宣布废弃的清单字段（Cargo 的 `authors`） | 字段，以及工具文档的原话 | 换成工具推荐的写法 | 现代 | 臭味 |
| 只差大小写或 Unicode 写法的名字 | 两个名字同时存在 | 一个东西一个名字 | 秩序 | 臭味 |
| 同一目录命名风格混用 | 每个文件名的风格，按语言分开比（不按后缀：`.ts`、`.js`、`.vue` 是同一种语言）；PascalCase 和单词名不算混用 | 同一目录一种风格 | 秩序 | 臭味 |
| 根目录文档太多 | 根目录有几份没有位置约定的文档 | 根目录是入口 | 秩序 | 臭味 |
| monorepo 里一个依赖跨大版本、嵌套 lockfile、两份不一致的 workspace 列表 | 版本号、文件位置、两份列表的内容 | 同一个事实只说一遍 | 秩序 | 臭味 |
| 源文件超过 1000 行或 100 KiB（不计生成的、别人的） | 行数和字节数；长行不跳过 | 是否职责过多由 agent 判断，不机械拆分 | 秩序 | 待审视 |
| 一个目录平铺 50 个以上源文件 | 文件数 | 是否该按职责分组由 agent 判断 | 秩序 | 待审视 |
| 根目录超过 30 个文件 | 文件数 | 根目录是入口 | 秩序 | 待审视 |
| 内容完全相同的文件（4 KiB 以上；agent 指令文件不论大小） | 字节完全相同；同一个文件经软链接到达的只算一次 | 只留一份，或说得出为什么要有多份 | 秩序 | 待审视 |
| agent 指令文件（AGENTS.md、CLAUDE.md、GEMINI.md、Copilot 指令）超过 300 行 | 行数 | 只留每次都用得上的 | 秩序 | 待审视 |
| 不符合语言命名规定的名字（文件名、目录名，或文件里声明的包名） | 名字，以及语言风格指南的原话 | 照语言的规定起名 | 约定 | 臭味 |
| 构建产物、缓存、虚拟环境，不管目录叫什么 | 工具写下的标记文件（`CACHEDIR.TAG`、`pyvenv.cfg`、`CMakeCache.txt`、`.tsbuildinfo`），或者有构建脚本 | 不提交构建产物 | 洁净 | 臭味 |
| 系统垃圾、崩溃转储（ELF core 文件）、`local.properties` | 文件内容是操作系统或 Android Studio 写的 | 不提交系统垃圾和本机配置 | 洁净 | 臭味 |
| 工具自己说不要提交的文件（`.env*.local`、`.idea/workspace.xml`） | 文件名，以及工具文档里「不要提交」的原话 | 不提交个人和本地的东西 | 洁净 | 臭味 |
| 被 .gitignore 忽略却仍被提交的文件（空的占位文件和目录自己的 .gitignore 除外） | git 索引和 .gitignore 两处说法相反 | 要么取消跟踪，要么用 `!` 写明例外 | 洁净 | 臭味 |
| 50 MiB 以上的文件 | 文件大小 | 这么大的文件不该进入仓库历史，改用 Git LFS 或 Releases（chous 自己的政策，不看平台允许多少） | 洁净 | 臭味 |
| 安装包（`.apk`、`.ipa`、`.msi`、`.deb`、`.dmg`……） | 文件签名确认了格式 | 交给用户的东西属于 Releases | 洁净 | 臭味 |
| 可执行文件和库（`.exe`、`.dll`、`.so`、`.dylib`，以及没有扩展名的 ELF、Mach-O） | 文件头确认了格式 | 本项目构建出来的属于 Releases；构建要读的输入可以留 | 洁净 | 待审视 |
