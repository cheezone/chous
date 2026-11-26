import type { Messages } from "./types";
import { absentMessages, depMessages, eolMessages, factMessages } from "../facts";

/** 简体中文。键与 en.ts 一一对应，缺一个就是类型错误。 */
export default {
  app: {
    by: "",
  },
  cli: {
    help: {
      tagline: "有主见的品味检查器，没有配置。",
      noCommand: "（不带命令）",
      commands: "命令：",
      lintCmdDesc: "检查当前目录",
      scanCmdDesc: "找出目录下的 git 仓库，逐个检查",
      manifestoCmdDesc: "输出 chous 的品味宣言（给你和你的 agent 看）",
      installCursorHookDesc: "安装 Cursor hooks，自动检查",
      installClaudeHookDesc: "安装 Claude Code hooks，自动检查",
      options: "选项：",
      langHint: "设置输出语言（默认：自动）",
      jsonHint: "以 JSON 输出结果，给 agent 用",
      verboseHint: "列出全部问题，并附上原因",
      noColorHint: "禁用彩色输出",
      helpHint: "显示帮助",
    },
    error: {
      missingLangValue: "缺少 --lang 参数值（仅支持：{{supported}}）",
      unsupportedLang: "不支持的语言：{{code}}（仅支持：{{supported}}）",
      unknownArg: "未知参数：{{arg}}",
    },
    install: {
      cursorHooksInstalled: "已安装 Cursor hooks",
      claudeHooksInstalled: "已安装 Claude Code hooks",
      credit: "chous · https://github.com/cheezone/chous",
    },
  },
  scan: {
    issues: "问题（{{count}}）",
  },
  meta: {
    taste: "品味：{{names}}",
    performance: "在 {{duration}}ms 内遍历了 {{fileCount}} 个文件",
    workspacePackages: "工作区包：{{count}}",
  },
  agent: {
    intro: "chous 在这个仓库里发现了品味问题：有臭味的，以及需要看一眼的。",
    fix: "修掉所有臭味，再运行 `chous --verbose`，确认一条都没有了；在那之前不要说已经修好。对每一条待审视的，打开文件看一看，判断它该不该留，并说明你的判断。`chous manifesto` 讲清楚了这套品味。",
    reason: "原因：{{reason}}",
    smells: "臭味（修掉）：",
    review: "待审视（判断）：",
  },
  report: {
    found: "臭味 {{smells}} 处 · 待审视 {{reviews}} 处",
    noIssues: "没有臭味",
    moreHidden: "……还有 {{count}} 条（加 --verbose 查看全部）",
    reason: "（{{reason}}）",
    source: "来源：{{url}}",
    arrow: "→",
    review: "待审视：chous 知道事实，不知道用途。由你或你的 agent 判断。",
    scope: "只看品味：不检查正确性、安全和测试。",
    value: {
      modernity: "现代",
      order: "秩序",
      convention: "约定",
      cleanliness: "洁净",
    },
  },
  issue: {
    no: {
      because: "不允许：{{reason}}",
    },
    deps: {
      deprecated: "{{name}} {{version}}，作者已在 npm 上宣布废弃：「{{message}}」",
      obsolete: "{{name}}：{{why}} → {{use}}",
    },
    manifest: {
      remove: "删除 \"{{field}}\"：{{reason}}",
    },
    workspace: {
      drift: "{{name}} 同时用了不同的大版本（{{versions}}），会被装两份",
      listsDiffer: "package.json 写的是 {{json}}，pnpm-workspace.yaml 写的是 {{yaml}}：同一件事说了两遍，而且两遍不一样",
    },
    leftover: {
      installer: "源码树里的安装包：构建出来的东西应该放到 Releases，git 会永远保留它的每一个版本",
      executable: "编译好的可执行文件或库：如果是本项目构建出来的，应该放到 Releases；如果是构建要读取的输入，就留着",
      ignoredTracked: "{{count}} 个文件被 .gitignore 忽略，却仍被提交：用 `git rm --cached` 取消跟踪，或者用 `!` 规则把它们排除出忽略",
      rootDocs: "根目录除 README、LICENSE 这类之外还有 {{count}} 份文档（{{names}}）：根目录是入口，最多留 {{limit}} 份，其余移进 docs/",
    },
    contract: {
      ...factMessages("zh"),
    },
    twins: {
      case: "和 {{other}} 只差大小写；在 macOS 和 Windows 上检出时只会留下一个",
      unicode: "和 {{other}} 是同一个名字，只是重音字符用了另一种 Unicode 写法；在 macOS 上检出时只会留下一个",
      styles: "命名风格混用：{{styles}}（{{examples}}）；同一个目录只用一种起名方式",
    },
    measure: {
      longFiles: "{{count}} 个源文件超过 {{lines}} 行或 {{kib}} KiB（{{files}}）：是否承担了太多职责，由你或你的 agent 判断；不要机械拆分",
      flatDirs: "{{count}} 个目录各自平铺了 {{limit}} 个以上源文件（{{dirs}}）：每个目录是不是只管一件事？",
      crowdedRoot: "根目录有 {{count}} 个文件，超过 {{limit}} 个：根目录是入口",
      copies: "{{count}} 组内容完全相同的文件（{{groups}}）：只留一份、改用链接，或者说明为什么要有多份",
      instructions: "{{lines}} 行 agent 指令（超过 {{limit}} 行）：agent 每次在这里工作都会全部读一遍；只留每次都用得上的，其余放到用得上的地方",
      hugeFile: "{{size}} MiB：这么大的文件不该进入仓库历史；改用 Git LFS 或 Releases",
    },
    leak: {
      artifact: "构建产物没有被 gitignore，会被提交上去",
      cache: "缓存目录，它自己的 CACHEDIR.TAG 写明了：工具会重新生成，加进 .gitignore",
      venv: "Python 虚拟环境（pyvenv.cfg）：Python 文档写明它不提交进版本控制",
      cmake: "CMake 构建目录（CMakeCache.txt）：是构建产物，不是源码，加进 .gitignore",
      tsbuildinfo: "TypeScript 的增量构建状态：tsc 每次构建都会重写，加进 .gitignore",
    },
    lifecycle: {
      ended: "{{name}} 已于 {{date}} 停止维护 → {{use}}",
      unsupported: "官方已声明 {{name}} 不再受支持 → {{use}}",
      declared: "engines.node 只允许 {{versions}}，全都已停止维护（最晚一个于 {{date}}）→ {{use}}",
    },
  },
  reason: {
    ...absentMessages("zh"),
    chousConfig: "chous 没有配置，删掉它",
    osJunk: "系统垃圾文件，删掉并加进 .gitignore",
    coreDump: "操作系统写下的崩溃转储（ELF core 文件），删掉",
    nestedLockfile: "只能有一个 lockfile，放在工作区根目录",
    nestedPackageManager: "只在工作区根目录设置一次",
    localProperties: "本机的 Android SDK 路径；文件自带的注释就写着「绝不能提交」",
  },
  dep: depMessages("zh"),
  eol: eolMessages("zh"),
} satisfies Messages;
