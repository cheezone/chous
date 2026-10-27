<p align="center">
  <img src="public/logo.png" alt="chous" width="160" height="160" />
</p>

<h1 align="center">chous</h1>

<p align="center">
  <b>有主见的品味检查器</b>
</p>

<p align="center">
  <a href="https://github.com/cheezone/chous/actions/workflows/ci.yml"><img src="https://github.com/cheezone/chous/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/chous"><img src="https://img.shields.io/npm/v/chous.svg" alt="npm" /></a>
  <a href="https://www.npmjs.com/package/chous"><img src="https://img.shields.io/node/v/chous.svg" alt="node" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/chous.svg" alt="MIT" /></a>
</p>

<p align="center">
  <a href="https://cheez.tech">Cheez Lin</a>
  ·
  <a href="./README.md">English</a>
</p>

---

## chous

_/tʃoʊs/_

Chous 是一个有主见的品味检查器。AI 编辑器会自己发明目录、格式化工具和测试框架——项目从没要求过这些。Chous 按你选的**人设**检查仓库：布局、技术栈、命名，然后告诉 AI 该改成什么。

别让 AI 自由发挥。跟着一个真人走。

\* *chous* 来自中文「抽丝」：抽丝剥茧，理清头绪。

### 输入

```
tests/
.prettierrc
jest.config.ts
```

### 输出

```
✖ tests/         → 应重命名为 test/
✖ .prettierrc    → 不在白名单
✖ jest.config.ts → 将 jest 替换为 vitest
```

```bash
npx chous
```

## 许可证

[MIT](LICENSE)
