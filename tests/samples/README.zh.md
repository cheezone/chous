# 测试 Samples

这个目录包含了用于测试不同预设配置的真实项目示例。这些项目都是预期能够通过对应预设配置检查的参考项目。

## 测试项目说明

### nuxt.com
- **用途**: 测试 `@presets/nuxt4.chous` 预设
- **来源**: `third/nuxt.com`
- **项目类型**: Nuxt 4 项目

### project-layout
- **用途**: 测试 `go.chous` 预设
- **来源**: `third/project-layout`
- **项目类型**: Go 项目标准布局

### ai-chatbot
- **用途**: 测试 `@presets/nextjs.chous` 预设
- **来源**: https://github.com/vercel/ai-chatbot.git
- **项目类型**: Next.js 项目

### pythondotorg
- **用途**: 测试 `python.chous` 预设
- **来源**: https://github.com/python/pythondotorg.git
- **项目类型**: Python/Django 项目

## 使用说明

这些示例项目用于确保对应的预设配置文件能够正确验证真实项目的文件结构。在运行测试时，应该确保这些项目能够通过对应预设的 lint 检查。如果某个示例项目无法通过对应的预设检查，说明预设配置可能需要调整。
