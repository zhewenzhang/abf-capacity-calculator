# 多 Agent 协作系统使用指南

## 📋 概述

本系统提供 5 个专业 Agent，协同完成复杂的软件开发任务。

## 🚀 快速开始

### 方式 1：使用 Skill（推荐）
```bash
/multi-agent 你的复杂任务描述
```

### 方式 2：手动调用 Agent
在对话中直接使用：
```
我需要使用 researcher-agent 分析当前项目的数据流
```

## 🎯 适用场景

### 适合多 Agent 协作的任务：
- ✅ 新功能全流程开发（从设计到测试）
- ✅ 大型重构（影响多个模块）
- ✅ 复杂 bug 修复（需要根因分析）
- ✅ 性能优化（需要分析+实现+验证）
- ✅ 安全审计（需要审查+修复+验证）

### 不适合的任务：
- ❌ 简单的单行代码修改
- ❌ 单纯的文档查询
- ❌ 已经明确的小任务

## 📊 典型流程示例

### 场景：添加新功能
```
1. Orchestrator: 分解任务为 5 个子任务
2. Researcher: 分析现有代码模式
3. Implementer: 实现核心功能
4. Reviewer: 代码质量审查
5. Tester: 编写并运行测试
6. Orchestrator: 整合结果与报告
```

## ⚙️ 高级用法

### 自定义 Agent 团队
创建 `.claude/agents/custom-agent.md`：
```yaml
---
name: custom-agent
description: 你的专业 Agent 描述
subagent_type: claude|Explore|Plan
---

# 详细的角色和职责定义
```

### 并行执行多个 Agent
```
同时执行：
1. researcher-agent: 分析数据模型
2. researcher-agent: 分析 API 模式
```

## 📝 最佳实践

### 1. 任务描述要清晰
✅ 好的描述：
```
添加一个 Excel 导入功能，支持批量上传产品数据，
需要：1) 前端上传组件 2) 数据验证 3) 错误处理 4) 单元测试
```

❌ 不好的描述：
```
添加 Excel 导入
```

### 2. 设定明确的验收标准
在任务中说明：
- 功能完成的标志是什么
- 代码质量要求
- 测试覆盖要求
- 性能要求

### 3. 允许 Agent 间通信
不要限制每个 Agent 的输出，让它们可以：
- 指出需要其他 Agent 补充的部分
- 质疑之前 Agent 的结论
- 提出新的发现

## 🔧 配置优化

### 在 settings.json 中添加权限
```json
{
  "permissions": {
    "allow": [
      "Agent",
      "Bash(npm test:*)",
      "Bash(npm run lint:*)"
    ]
  }
}
```

## 📚 可用 Agent 详解

### Orchestrator
- **职责**：总控调度、任务分解、结果整合
- **最佳使用**：复杂任务的起点
- **输出**：任务分解报告、执行计划、最终整合结果

### Researcher
- **职责**：代码研究、模式识别、影响分析
- **最佳使用**：开始编码前的代码理解
- **工具**：Glob, Grep, Read

### Implementer
- **职责**：代码实现、重构、bug 修复
- **最佳使用**：需要编写或修改代码时
- **工具**：Edit, Write, Bash

### Reviewer
- **职责**：代码审查、质量检查、安全审计
- **最佳使用**：代码实现完成后
- **工具**：Read, Grep

### Tester
- **职责**：测试设计、用例编写、结果验证
- **最佳使用**：功能实现后
- **工具**：Bash, Read, Edit

## 🎉 开始使用

现在你可以：
1. 尝试 `/multi-agent 修复 i18n 审查中发现的所有问题`
2. 或提出一个新功能让多 Agent 团队协作完成

祝你使用愉快！
