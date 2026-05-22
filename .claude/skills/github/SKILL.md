---
name: github
description: GitHub 操作 Skill - PR 创建、Issues 管理、版本发布
---

# GitHub Skill

## 可用命令

### `/pr-create <base><title>
创建 Pull Request

```
参数：
- base: 目标分支（默认 main）
- title: PR 标题

自动执行：
1. 检查当前分支
2. 生成基于 git 历史生成变更说明
3. 自动添加 reviewers
4. 添加项目约定的标签
```

### `/pr-list
列出当前项目的 PR 列表

### `/issue-create <title>
创建 Issue

### `/release <version>
创建版本发布
- 自动生成发布说明
- 创建 Git tag
- 生成 GitHub Release

## 使用示例

```
/github pr-create main "feat: add user authentication"
/github release v1.15.0
```
