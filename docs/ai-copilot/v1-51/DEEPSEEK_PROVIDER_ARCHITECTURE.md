# DeepSeek Provider Architecture

**版本**: v1.51
**日期**: 2026-05-29

---

## 架构概述

DeepSeek Provider 基于现有的 AiProviderAdapter 接口实现，使用 OpenAI-compatible Chat Completions API。

---

## Provider 配置

| 配置项 | 值 |
|--------|-----|
| **Provider ID** | `deepseek` |
| **Display Name** | DeepSeek v4 Flash (BYOK) |
| **Base URL** | `https://api.deepseek.com` |
| **Model** | `deepseek-v4-flash` |
| **Timeout** | 30 秒 |
| **Max Tokens** | 4000 |

---

## API Key 安全

### 存储方式

- **Session Memory Only** — API key 仅存储在 React state 中
- **不持久化** — 不写入 localStorage、sessionStorage、Firestore
- **关闭清除** — 关闭 Settings Drawer 时清除 key

### 允许方式

1. React memory only session BYOK 输入
2. `.env.local` 本地文件（被 .gitignore 忽略）
3. PowerShell 当前 session 环境变量

### 禁止方式

1. 源码中 hardcode key
2. 文档中包含真实 key
3. 测试 snapshot 中包含 key
4. `.env` 被提交
5. localStorage/sessionStorage
6. Firestore
7. URL query
8. Export pack
9. Report

---

## 请求流程

```
用户输入 → CopilotChat → handleSend
    ↓
检查 providerMode
    ↓
如果 deepseek:
    1. 验证 API key 存在
    2. 构建 sanitized context
    3. 构建 prompt pack
    4. 调用 DeepSeek API
    5. 解析响应
    6. 输出验证
    7. 显示结果
```

---

## 错误处理

| 错误类型 | 处理方式 |
|---------|---------|
| API key 缺失 | 返回 blocked 响应 |
| API key 无效 | 返回 blocked 响应 |
| 网络超时 | 返回 blocked 响应 |
| API 错误 | 返回 blocked 响应 |
| 响应解析失败 | 返回 blocked 响应 |

---

## Fallback 策略

1. **默认 deterministic local** — 不依赖外部 AI
2. **用户选择 DeepSeek** — 需要提供 session key
3. **DeepSeek 失败** — 返回 blocked 响应，不白屏
4. **用户可随时切换回 local** — 无锁定

---

## CORS 风险

DeepSeek API 可能存在 CORS 限制。解决方案：

1. **检测 CORS 错误** — 捕获 fetch 错误
2. **返回友好提示** — 告知用户 CORS 限制
3. **建议 fallback** — 引导用户使用 local mode

---

## 输出验证

所有 DeepSeek 输出必须经过 `validateProviderOutput` 或等价安全验证：

1. **禁止假保存声明** — AI 不能说"我已保存"
2. **禁止猜测缺失数据** — AI 不能编造数据
3. **禁止单位混淆** — USD/TWD/Million TWD 必须正确
4. **禁止因果推断** — 归因是比例分攤，不是因果

---

**报告生成时间**: 2026-05-29
**维护者**: DeepSeek Provider Architecture Agent
