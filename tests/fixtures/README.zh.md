# 测试 Fixtures

此目录包含按预期结果组织的数据驱动测试 fixtures。测试运行器会自动发现并运行所有 fixtures。

## 目录结构

- **pass/**: 包含预期**通过**所有检查的测试用例（有效配置）。
- **fail/**: 包含预期**失败**检查的测试用例（用于验证错误检测功能）。

## 添加新测试用例

要添加新的测试用例，只需在相应的文件夹（`pass/` 或 `fail/`）中创建一个新目录，包含：
- 一个 `.chous` 配置文件
- 演示场景的测试文件

测试运行器会自动发现并运行新的测试用例。无需修改代码！

## 当前测试用例

### Pass 用例
- `allow-nested`: 嵌套目录中的基础 allow 规则
- `allow-multiple`: 多重扩展名的 allow
- `allow-array`: allow 的数组语法
- `allow-glob`: allow 中的 Glob 模式
- `allow-relative`: allow 中的相对路径模式
- `deep-nested`: 深层嵌套目录行为

### Fail 用例
- `strict-nested`: 违反嵌套目录中的 strict 模式
- `strict-files`: 违反 strict files 模式
- `move-nested`: 违反嵌套目录中的 move 规则
- `use-nested`: 违反嵌套目录中的命名约定

## 与 Samples 的区别

- **samples/**: 包含预期**通过**所有检查的真实项目示例（参考项目）。
- **fixtures/pass/**: 包含预期**通过**的聚焦测试用例（单元测试场景）。
- **fixtures/fail/**: 包含预期**失败**的聚焦测试用例（错误检测场景）。
