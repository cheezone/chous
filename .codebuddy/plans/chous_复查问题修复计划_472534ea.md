---
name: chous 复查问题修复计划
overview: 修复 chous CLI 复查中确认的 7 组问题：init/cursor install 静默无输出、`-l auto` 锁死英文、init 模板只认 zh/en、语言清单三份手写副本、stop hook 死代码、totalFileCount 死变量、i18n 词典三处缺陷；并补齐 README 的 CLI 选项与 DSL 语法说明。
todos:
  - id: unify-locale-resolution
    content: 修复 -l auto 语言解析，并统一模板选择与语言清单（F2/F3/F4）
    status: completed
  - id: init-feedback
    content: 新增包管理器探测，为 init 与 cursor install 补上成功输出（F1）
    status: completed
    dependencies:
      - unify-locale-resolution
  - id: cleanup-dead-code
    content: 用 [skill:lsp-code-analysis] 确认引用后清理 stop hook 死代码与 totalFileCount（F5/F6）
    status: completed
    dependencies:
      - unify-locale-resolution
  - id: i18n-fixes
    content: 修正日语占位符、巴西葡语引号与中文宽松类型三处词典缺陷（F7）
    status: completed
  - id: init-regression-test
    content: 为 init.test.ts 追加日语模板用例，护住 F3 不再回流
    status: completed
    dependencies:
      - init-feedback
  - id: readme-docs
    content: 同步补齐中英文 README 的 CLI 选项与常用规则关键字说明（D）
    status: completed
    dependencies:
      - init-feedback
  - id: verify-all
    content: 跑 lint/typecheck/build+CI=1 test，并用 [subagent:code-explorer] 复查残留
    status: completed
    dependencies:
      - unify-locale-resolution
      - init-feedback
      - cleanup-dead-code
      - i18n-fixes
      - init-regression-test
      - readme-docs
---

## Product Overview

chous 是一个文件结构校验 CLI 工具（核心理念：一门专为文件系统设计的 `.chous` 规则 DSL + 内置预设 + AI 编辑器集成），本轮工作不是新增功能，而是**修复已逐条核实过的既有问题**，共 4 类（用户已全选）。

## Core Features

### A. 用户可感知的行为修复

- `chous init` 当前在**成功创建 `.chous` 后完全无输出**（只有文件已存在时才打印一行提示）；`chous cursor install` 成功时同样静默。修复后：初始化完成应打印「已创建规则文件」「检测到的框架」「检测到的包管理器」「已启用的预设」「下一步：运行 chous」；安装 Cursor 钩子成功应打印「已安装 Cursor hooks」。保留已有的静默开关能力。
- `chous -l auto` 当前反而比不加 `-l` 更差：不加时按系统语言输出，加了 `auto` 会被锁成英文。修复后 `-l auto` 真正等于「按系统语言输出」，与 `init`/`cursor` 分支的既有语义一致（Cursor 钩子安装命令里写死的正是 `-l auto`）。

### B. 多语言一致性

- `chous init` 选模板当前只认中文和英文，导致另有 6 种语言（德语/西班牙语/法语/日语/韩语/巴西葡语）已经存在且是真实翻译的初始化模板**永远不会被使用**，用户始终拿到英文注释的模板。修复后按界面语言选择对应模板，缺失时回落英文。
- 全项目的语言清单目前有 3 份手写副本，且其中 1 份已与真实语言集合脱节。修复后收敛为单一来源，避免后续新增语言时再次漏改。
- 词典 3 处具体缺陷：日语「已创建规则文件」带了一个永远不会被替换的占位符；巴西葡语一条提示用错引号包裹，用户会原样看到 `${APP_CONFIG_FILE_NAME}`、`${APP_NAME}` 这类字面量；简体中文是唯一使用宽松类型声明的语言，丧失了编译期的键完整性检查。

### C. 内部清理（不改变任何对外行为）

- Cursor 停止钩子里每次都会把全部问题重新格式化一遍、并额外构造两份「配置文件引用」列表，而这两份数据构造完从未被使用，属于纯无用开销；清理后钩子行为与产出完全不变。
- 一个跨配置组累加的文件计数变量声明并累加后从未被读取；清理时注意区分同名但确实在用的另一个集合。

### D. 文档补齐

- 中英文 README 目前**完全没有列出任何 CLI 选项**，而随钩子下发的提示词又要求 AI 执行 `chous --verbose`，读者在文档里搜不到这个旗标。修复后补上命令行选项说明，并同步补充常用规则关键字清单，两份 README 结构必须对等。

## Tech Stack Selection

沿用项目现状，不引入任何新依赖：TypeScript + Bun（运行时/测试）、tsdown（打包为 `dist/cli.mjs`）、oxlint（lint）、typesafe-i18n（8 语言词典与类型生成）。运行时依赖仅 `compare-versions` / `ignore` / `picomatch` / `tinyglobby`。

## Implementation Approach

### 改动总览

| 编号 | 修复点 | 落点 |
| --- | --- | --- |
| A-1 (F1) | `init` / `cursor install` 成功输出 | `src/cli.ts` |
| A-2 (F2) | `-l auto` 语言解析 | `src/cli.ts` |
| B-1 (F3) | `init` 模板按语言选择 | `src/cli.ts` |
| B-2 (F4) | 语言清单单一来源 | `src/cli.ts` + `src/runtime.ts` |
| B-3 (F7) | 词典 3 处缺陷 | `src/i18n/{ja,pt-BR,zh}/index.ts` |
| C (F5/F6) | 死代码清理 | `src/cli.ts` |
| D | README 双语补齐 | `README.md` + `README.zh.md` |


### 关键决策与理由

**F2（`-l auto`）——在解析层归一化，而非在使用层逐处修正。**
`detectLangArg()` 目前原样返回 `"auto"`，而 `getLL()` 对未知 locale 会回落到 `baseLocale`（即 `en`）。把归一化收敛进 `detectLangArg()` 一处：命中值为 `"auto"` 时直接返回 `detectSystemLang()`。这样 `main()` 与其错误兜底分支（两处调用点）同时修好，且 `parseArgs()` 对 `opts.lang` 的既有校验与 `opts.lang === "auto"` 的分支逻辑都不受影响——改动 3 行，无副作用。

**F3 + F4（模板选择与语言清单）——用自动生成的 `locales` 作为唯一真相源。**
`findTemplatePath()` 里写死的 `(lang === "zh") ? "zh" : "en"` 与同文件 `findPromptTemplatePath()` 里手写的 8 语言数组，本质是同一件事的两种写法，且前者已脱节。统一为：`isLocale(lang)` 时优先取 `templates/<lang>/`，否则回落 `baseLocale`；数组硬编码整体删除。`src/runtime.ts` 中重复的语言联合类型改为类型别名 `SupportedLang = Locales`（`import type`，编译期擦除，零运行时成本），保留其基于前缀匹配的 `mapToSupportedLang()`——前缀匹配无法由 `locales` 推导，属于必要逻辑，但返回值受 `Locales` 约束后，拼错语言码会被类型检查拦住。**不手改** `i18n-types.ts` / `i18n-util*.ts` 三个自动生成文件。

**F1（init 输出）——复用已有 i18n 文案，不新增 key。**
经核实 `cli.initCmd` 下 `created` / `detectedFramework` / `detectedPackageManager` / `enabledPresets` / `nextStep` / `cursorHooksInstalled` 六个 key 在 `src/` 全目录**零调用点**，而 `renderReport` 的 `initMessages` 注释里点名的恰是其中两条——说明这是半成品。因此只做「接线」：扩展 `generateAutoDetectedConfig()` 的返回值把已探测到的框架透出，新增轻量的 `detectPackageManager()`（按 `bun.lockb`/`bun.lock`、`pnpm-lock.yaml`、`yarn.lock`、`package-lock.json` 判定，沿用同文件 `detectJsPreset()` 之类的 `existsSync` 风格），在 `runInit()` 内按 `opts?.quiet` 决定是否打印；`cursor install` 的成功提示放在 `main()` 里（`LL` 在那里可用，且能拿到 `result.installed`）。不新增/不删除任何 i18n key，因此**无需重跑 typesafe-i18n 代码生成**。探测未命中时（如空目录无锁文件）跳过对应那行，不打印「undefined」。

**F5/F6（死代码）——严格只减不加。**
删除 `handleCursorHook()` 中的 `issueDetails` 与 `configRefs` 两个从未被读取的构造块。连带效应需一并处理：`configPaths` 集合（声明 + `add`）随 `configRefs` 一起失去用途；`formatIssueMessage` 在整个 `src/` 里唯一的调用点就在被删块内，导入需移除；`LL` 参数在该函数体内也仅剩那一处使用，删掉后参数变为未使用——oxlint 会报，故同步移除形参与该调用点实参。`totalFileCount` 同理移除声明、累加与相关注释，但**不动**同样出现在该区域的 `visitedConfigRoot`（它确实在用）与 `result.fileCount`（报告渲染在用）。删除后 hook 的 stdout 契约不变。

**F7（词典）——最小等价改写。**
① 日语 `created` 去掉 `: {path}`（基准 `en` 及另外 6 种语言均无占位符，且类型签名是零参数）。② 巴西葡语 `suggestInit` 由单引号改为反引号模板串，使 `${APP_CONFIG_FILE_NAME}`、`${APP_NAME}` 正常插值（其余 7 种语言已是此写法）。③ 简体中文由 `BaseTranslation` 改为 `Translation`，与其余 7 种语言对齐。

**D（文档）——双语对等。**
在 `README.md` / `README.zh.md` 的「Getting Started」之后各插入一节 CLI 选项说明（`chous`、`chous init`、`chous cursor install`，以及 `-c/--config`、`-v/--verbose`、`-l/--lang`（含 `auto`）、`-s/--strict`、`--stats-output`、`--no-color`、`-h/--help`），措辞以 `printHelp()` 与 `templates/*/stop.prompt` 的实际用法为准；并补充常用规则关键字清单（`import`、`must have`、`allow`、`no`、`use ... for files|dirs`、`if-parent-matches`、`if-contains`、`except`、`prefix:` / `suffix:`、`strict`、`in <dir>:` 嵌套块、`move`、`rename`、`optional`、`[where:]`）。两文件章节顺序与小标题层级保持一致。

### 性能与可靠性

全部改动均为常量级或更少工作：F2/F3/F4 是纯逻辑收敛，无新增 IO；F1 新增的 `detectPackageManager()` 最多 4 次 `existsSync`，与既有探测函数同量级；F5/F6 是**删除**热路径上的无用计算，stop hook 每次运行少做一轮全量 issue 格式化（issue 数量级为百/千时收益线性），属纯赚。无时间复杂度变化，无缓存/批处理需求。

### 技术债控制

- 所有新逻辑都落在既有函数内（`detectPackageManager` 紧随 `detectPythonPreset` 等同类探测函数），不新增文件、不新增依赖、不新增架构模式。
- F4 让「语言集合」从 3 份手写副本收敛到 1 份自动生成来源，是**减少**技术债而非增加。
- 不触碰任何自动生成文件，避免与 typesafe-i18n 的重新生成冲突。

## Implementation Notes

**边界与不改动清单（重要）**

- 不改 `bun.lock`、`bunfig.toml`、`.github/workflows/*`（用户已明确放弃锁文件镜像源问题）。
- 不改 `templates/` 下 16 个模板文件的内容（已验证 8 种语言的 `.chous` 与 `stop.prompt` 结构、行号、规则语法完全对齐，且都是真实翻译）。
- 不撤销工作区已有的 18 个文件改动（上一轮成果：README 预设列表、`presetOrder` 去 `ts`、Cursor hook 不再硬编码 `bunx`、24 条 lint 警告清零），本轮在其之上叠加。
- 不改 `src/i18n/i18n-types.ts`、`src/i18n/i18n-util.ts`、`src/i18n/i18n-util.sync.ts`、`src/i18n/i18n-util.async.ts`（typesafe-i18n 自动生成）。

**已排除的误报，不要动**

- `src/i18n/zh/index.ts` 的 `by: ''` 是有意设计：`src/rules/report.ts` 对空串专门分支处理，中文下输出 `@Cheez Lin <https://cheez.tech>` 而不带英文 "by"。
- 8 种语言的键集合与基准 `en` 完全一致，无缺键/多键/层级错位，无需「补翻译」。

**回归风险点**

- `tests/code/init.test.ts` 是**仅 CI 运行**的测试（`shouldSkip = !process.env.CI`），且通过 `Bun.spawnSync(["node", dist/cli.mjs, ...])` 调用**构建产物**——本地验证需先 `bun run build`，再以 `CI=1` 运行。该文件断言 `stdout` 包含 `already exists`（文件已存在路径），F1 只新增成功路径的输出，不改该文案，故断言不受影响。
- F1 必须保留 `runInit` 现有的 `opts?.quiet` 能力，输出统一走 `LL`，避免硬编码字符串。
- F5 删除 `LL` 形参时务必同步更新 `handleCursorHook` 的调用点实参，否则 typecheck 失败。
- F7-③ 把中文切到严格 `satisfies Translation` 后，若中文词典存在任何结构偏差会**立刻**在 `bun run typecheck` 暴露——这正是该修复的目的，按报错修正即可。

**验证口径**：`bun run lint` 需保持 `Found 0 warnings and 0 errors`；`bun run typecheck` 无 `error TS`；`bun run build && CI=1 bun test` 全绿。

## Architecture Design

本次为既有 CLI 的定点修复，沿用现有分层（`cli.ts` 命令/参数层 → `config/parser.ts` 解析层 → `rules/*` 校验与报告层 → `i18n/*` 文案层），不新增模块、不调整依赖方向。唯一新增的跨模块耦合是 `src/runtime.ts` 以 `import type` 引用 `src/i18n/i18n-types.ts` 的 `Locales` 类型，方向为「运行时工具 → 类型定义」，无循环、编译期擦除，不改变打包产物结构。

## Directory Structure

本轮在既有工程上定点修改，仅涉及以下 7 个文件（均标注具体职责）：

```
chous/
├── src/
│   ├── cli.ts                    # [MODIFY] 本轮改动最集中处，承载 5 项修复：
│   │                             #   1) detectLangArg() 把 "auto" 归一化为 detectSystemLang()（F2）
│   │                             #   2) findTemplatePath() 改为按 isLocale(lang) 取 templates/<lang>/，
│   │                             #      缺失回落 baseLocale（F3）
│   │                             #   3) findPromptTemplatePath() 删除手写 supportedLangs 数组，
│   │                             #      与 (2) 共用同一套解析逻辑（F4）
│   │                             #   4) 新增 detectPackageManager()（锁文件探测，风格对齐既有
│   │                             #      detectJsPreset/detectGoPreset/detectPythonPreset）；
│   │                             #      扩展 generateAutoDetectedConfig() 返回值透出 framework /
│   │                             #      packageManager；runInit() 在非 quiet 时打印 created /
│   │                             #      detectedFramework / detectedPackageManager / enabledPresets /
│   │                             #      nextStep（F1）；main() 的 cursor install 分支补打
│   │                             #      cursorHooksInstalled（仅在 result.installed 为 true 时）
│   │                             #   5) 删除 handleCursorHook() 内 issueDetails / configRefs 与随之
│   │                             #      失去用途的 configPaths、formatIssueMessage 导入、LL 形参；
│   │                             #      删除 totalFileCount（含累加与过时注释）；不动 visitedConfigRoot
│   │                             #      与 result.fileCount（F5/F6）
│   ├── runtime.ts                # [MODIFY] SupportedLang 改为 type SupportedLang = Locales 的类型别名，
│   │                             #   消除手写语言联合类型；保留 mapToSupportedLang() 的前缀匹配逻辑，
│   │                             #   返回值受 Locales 约束（F4）
│   └── i18n/
│       ├── ja/index.ts           # [MODIFY] initCmd.created 去掉无效占位符 ": {path}"（F7-①）
│       ├── pt-BR/index.ts        # [MODIFY] initCmd.suggestInit 由单引号改为反引号模板串，
│       │                         #   使 ${APP_CONFIG_FILE_NAME} / ${APP_NAME} 正常插值（F7-②）
│       └── zh/index.ts           # [MODIFY] import/ satisfies 由 BaseTranslation 改为 Translation，
│                                 #   与其他 7 种语言对齐（F7-③）
├── tests/
│   └── code/init.test.ts         # [MODIFY] 追加一条仅 CI 运行的用例：以日语运行 init，
│                                 #   断言产物为日语模板而非英文模板（F3 的回归护栏）
├── README.md                     # [MODIFY] 新增 CLI 选项说明章节 + 常用规则关键字清单（D）
└── README.zh.md                  # [MODIFY] 与 README.md 结构对等的中文版本（D）
```

## Key Code Structures

```ts
// src/cli.ts —— 统一后的模板解析（F3/F4 共用）与 init 输出所需的数据回传（F1）
import { baseLocale, isLocale, locales } from "./i18n/i18n-util";

// 探测项目包管理器；锁文件均不存在时返回 undefined（不打印该行）
function detectPackageManager(cwd: string): "npm" | "pnpm" | "yarn" | "bun" | undefined;

// 返回值新增 framework / packageManager，供 runInit 打印检测结果
function generateAutoDetectedConfig(cwd: string, lang: string): {
  content: string;
  presets: string[];
  framework: "nuxt3" | "nuxt4" | "nextjs" | undefined;
  packageManager: "npm" | "pnpm" | "yarn" | "bun" | undefined;
};

// 模板路径统一解析：命中语言目录优先，否则回落 baseLocale（en）；保持返回 string | null
function resolveLangTemplate(selfDir: string, kind: "config" | "stop", lang: string): string | null;
```

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 在改动完成后做一次全局收口复查——确认 `src/` 中不再残留任何手写语言清单副本、`cli.initCmd.*` 下不再存在零调用 key、且 `templates/<lang>/` 的 8 个目录都能被解析到。
- Expected outcome: 输出带「文件:行号 + 证据」的核查清单，明确列出「残留项」与「已闭环项」，作为本轮修复完整性的独立佐证。

### Skill

- **lsp-code-analysis**
- Purpose: 在删除 `handleCursorHook()` 内死代码之前，用语义级「查找引用」反向确认 `issueDetails`、`configRefs`、`configPaths`、`formatIssueMessage`、`totalFileCount` 确实没有其他读取点（尤其区分同名但真实在用的 `visitedConfigRoot`、`result.fileCount`），避免误删。
- Expected outcome: 每个待删符号都给出「定义位置 + 全部引用位置」的确定性结论；若发现任何非预期的外部引用则中止删除并在计划中标注，从而把删除动作的回归风险降到零。