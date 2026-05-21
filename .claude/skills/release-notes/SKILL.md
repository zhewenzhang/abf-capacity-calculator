---
name: release-notes
description: 基于 git 历史生成 ABF 产能计算器版本发布说明
disable-model-invocation: true
---

# Release Notes Generator

## 用途
自动生成 ABF 产能计算器的版本发布说明，基于 git commit 历史分类整理变更。

## 调用方式
`/release-notes <版本号>`

示例：
```
/release-notes v1.15.0
```

## 功能
1. 提取当前版本与上一个 tag 之间的所有 commits
2. 按类型分类：Features, Fixes, Chores, Documentation
3. 生成符合项目规范的中英文双语发布说明
4. 自动更新 CHANGELOG.md（如果存在）

## 输出格式
- 版本号和日期
- 按类别分组的变更列表
- 每个变更包含简短描述和关联的 commit hash
