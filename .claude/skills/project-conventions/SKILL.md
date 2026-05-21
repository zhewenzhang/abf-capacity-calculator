---
name: project-conventions
description: ABF 产能计算器项目开发规范
user-invocable: false
---

# ABF 产能计算器 - 项目开发规范

## 代码规范

### TypeScript
- 避免使用 `any` 类型，优先定义明确的 interface 或 type
- 使用 `interface` 用于对象类型，`type` 用于联合类型
- 优先使用类型推断，避免冗余类型声明

### React
- 使用函数式组件 + hooks
- 组件文件使用 TypeScript 泛型正确声明 props 类型

### 国际化 (i18n)
- **金额显示：不包含货币符号，纯数字
- 所有 UI 文本必须同时提供中英文双语
- 翻译键命名：`页面名.组件名.描述` 格式
- 货币切换在 AppPreferencesContext 中统一管理

### 测试
- 核心业务逻辑必须有单元测试（`src/core/*.test.ts`）
- 使用 Vitest 运行测试

## Git 提交规范
- 格式：`type: description`
- type: feat, fix, docs, chore, refactor, perf, test
- 示例：`feat: add yearly health matrix analysis`

## 组件规范
- 使用 Ant Design 6 组件库
- 表格优先使用 `AppTable` 封装组件
- 图表使用 `@ant-design/charts` 或 `recharts`

## 业务规则
- BP 目标计算使用 TWD（新台币）而非 USD
- 年份过滤：过滤掉 NaN/undefined
- 千位分隔符：所有金额数字显示千位分隔符
