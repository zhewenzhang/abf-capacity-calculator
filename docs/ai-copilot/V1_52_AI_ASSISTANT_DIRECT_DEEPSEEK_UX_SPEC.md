# v1.52 AI Assistant Direct DeepSeek + Claude/Gemini Style Chat UX

## 1. 目标

### 1.1 业务目标
- 移除用户输入 API Key 的要求，提供开箱即用的 AI 助手体验
- 直接接入项目 Owner 提供的 DeepSeek API（通过安全代理）
- UI 参考 Claude/Gemini Web 风格重构，提升专业感
- 中文界面下 AI 必须用繁体中文回答

### 1.2 技术目标
- 创建 Firebase Functions 安全代理，DeepSeek API Key 存放在后端
- 前端永远看不到 DeepSeek API Key
- 保持所有现有安全边界（Guardrails、Output Validation）
- 保持确定性工具作为 fallback

---

## 2. 安全架构

### 2.1 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (SPA)                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ CopilotChat │ → │ aiChatService│ → │   Firebase   │     │
│  │   (React)   │    │   (fetch)   │    │  Functions   │     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘     │
└───────────────────────────────────────────────┼─────────────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │  DeepSeek API │
                                        │ (server-side) │
                                        └───────────────┘
                                                ↑
                                        ┌───────────────┐
                                        │   Secret      │
                                        │   Manager     │
                                        │ (DEEPSEEK_KEY)│
                                        └───────────────┘
```

### 2.2 安全原则

| 原则 | 实现 |
|------|------|
| API Key 不进前端 | 存放在 Google Cloud Secret Manager |
| 前端调用 proxy | 通过 Firebase Functions 间接调用 DeepSeek |
| Auth 验证 | 前端附带 Firebase Auth ID Token |
| 限流 | 每用户每分钟 10 次请求 |
| 输出验证 | 所有 AI 响应经过 8 类验证器 |

---

## 3. 为什么不能把 API Key 放前端

### 3.1 风险分析

| 风险 | 说明 |
|------|------|
| **DevTools 泄露** | 任何人可通过浏览器 DevTools 查看 JS bundle 中的 Key |
| **Source Map** | 即使混淆，Source Map 仍可能泄露 |
| **网络嗅探** | 前端直接调用 DeepSeek API，Key 在请求头中可见 |
| **滥用费用** | 泄露的 Key 可被用于产生大量 API 调用费用 |
| **合规问题** | 违反 DeepSeek 服务条款（Key 不得暴露在客户端） |

### 3.2 安全代理的优势

| 优势 | 说明 |
|------|------|
| **Key 隔离** | Key 存放在服务端，前端永远看不到 |
| **统一限流** | 服务端控制调用频率，防止滥用 |
| **审计日志** | 可记录所有 AI 调用用于审计 |
| **成本控制** | 可设置每日/每月调用上限 |
| **模型切换** | 后端可随时切换模型，无需更新前端 |

---

## 4. 前端 UX 重构方案

### 4.1 参考设计

- **Claude Web**: 居中对话流、简洁消息卡片、清晰的 AI/用户区分
- **Gemini Web**: 快捷操作入口、结构化响应展示

### 4.2 布局结构

```
┌─────────────────────────────────────────┐
│ [Robot] AI Data Copilot  [StatusTag] [⚙]│  ← 顶部栏
├─────────────────────────────────────────┤
│                                         │
│     ┌── Empty State ──────────────┐     │
│     │   🤖 有什麼可以幫您的嗎？   │     │
│     │   [資料問題] [產能風險]      │     │
│     └────────────────────────────┘     │
│                                         │
│     ┌── Message (Claude style) ───┐     │
│     │ 🤖 DeepSeek AI    [HIGH]   │     │
│     │ 回應內容...                  │     │
│     │ [Fact] [Assumption] [...]    │     │
│     │ ⚠ Caveat                    │     │
│     └────────────────────────────┘     │
│                                         │
├─────────────────────────────────────────┤
│ [快捷1] [快捷2] [快捷3] ...            │  ← 快捷按鈕
│ ┌────────────────────────────── [Send]┐│  ← 輸入框
│ │ 詢問您的產能資料...                 ││
│ └────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### 4.3 关键样式参数

| 元素 | 样式 |
|------|------|
| 消息区域 | max-width: 720px, 居中 |
| 输入框 | 圆角 12px, 无边框 textarea + 圆形发送按钮 |
| 空状态 | 大图标 + 3 个卡片快捷入口 |
| 背景 | `#fafafa` (浅灰) |
| 消息卡片 | `borderRadius: 12`, `border: 1px solid #f0f0f0` |

### 4.4 移动端适配

- 断点: 768px
- 移动端: 输入框全宽，消息卡片全宽
- 桌面端: 居中 720px

---

## 5. DeepSeek Proxy 方案

### 5.1 Firebase Functions 配置

```typescript
// functions/src/index.ts
export const api = onRequest({
  region: 'asia-east1',
  memory: '256MiB',
  timeoutSeconds: 60,
  secrets: ['DEEPSEEK_API_KEY'],
  cors: ['https://abf-capacity-calculator.web.app'],
}, async (req, res) => {
  if (req.method === 'POST' && req.path === '/ai-chat') {
    return aiChatHandler(req, res);
  }
  if (req.method === 'GET' && req.path === '/health') {
    res.json({ status: 'ok', version: '1.52.0' });
    return;
  }
  res.status(404).json({ error: 'Not found' });
});
```

### 5.2 请求流程

```
1. 前端获取 Firebase Auth ID Token
2. POST /api/ai-chat
   Headers: Authorization: Bearer <idToken>
   Body: { systemPrompt, userMessage, maxTokens, temperature }
3. Functions 验证 ID Token
4. 限流检查 (10 req/min/user)
5. 调用 DeepSeek API (server-side)
6. 返回 { content, tokensUsed, providerId, model }
```

### 5.3 错误处理

| HTTP 状态码 | 错误码 | 处理 |
|-------------|--------|------|
| 401 | UNAUTHENTICATED | 前端提示重新登录 |
| 429 | RATE_LIMITED | 前端提示稍后重试 |
| 400 | INVALID_ARGUMENT | 前端提示输入过长 |
| 500 | INTERNAL | 前端降级到确定性工具 |

---

## 6. 中文回答策略

### 6.1 System Prompt 语言规则

```markdown
## 語言要求
你必須完全以繁體中文（Traditional Chinese）回答。
絕對不可使用簡體中文。
使用專業術語：稼動率、產能、預測、缺口、瓶頸、營收、達成率。
```

### 6.2 语言检测

- 前端传递 `lang` 参数给 proxy
- `zh-TW` / `zh` → 注入繁体中文语言规则
- `en` → 注入英文语言规则

### 6.3 专业术语对照

| 英文 | 繁体中文 |
|------|---------|
| Utilization | 稼動率 |
| Capacity | 產能 |
| Forecast | 預測 |
| Shortage | 缺口 |
| Bottleneck | 瓶頸 |
| Revenue | 營收 |
| Attainment | 達成率 |

---

## 7. 权限与 Viewer 限制

### 7.1 角色权限矩阵

| 功能 | Owner | Editor | Viewer |
|------|-------|--------|--------|
| 查看 AI 分析 | ✅ | ✅ | ✅ |
| 使用快捷按钮 | ✅ | ✅ | ✅ |
| 输入自定义问题 | ✅ | ✅ | ✅ |
| 查看修复建议 | ✅ | ✅ | ❌ |
| 执行修复操作 | ✅ | ✅ | ❌ |
| 修改 Provider 设置 | ✅ | ✅ | ❌ |

### 7.2 Viewer 限制实现

- `CopilotQuickButtons`: Viewer 不显示 "建議修復" 按钮
- `CopilotMessage`: Viewer 不显示修复执行入口
- `AiProviderSettingsDrawer`: Viewer 只读，不可修改模式

---

## 8. 测试计划

### 8.1 单元测试

| 测试文件 | 关键用例 |
|----------|---------|
| `aiChatService.test.ts` | Auth token 传递、401 处理、429 限流、成功响应解析 |
| `aiProviderAdapter.test.ts` | proxyProvider.validateConfig 无需 Key、runCompletion 调用 proxy、错误降级 |
| `aiCopilotOutputValidation.test.ts` | 不受影响，继续验证 8 类输出 |
| `aiCopilotGuardrails.test.ts` | 不受影响，继续验证 10 条红线 |
| `i18nKeys.test.ts` | Key parity 测试自动验证新增/删除 |

### 8.2 集成测试

1. 空状态渲染 → 快捷按钮可点击
2. 快捷按钮 → 确定性工具 → 结果显示
3. 文本输入 → proxy 调用 → AI 响应显示
4. Proxy 失败 → 降级到确定性工具 → 警告提示
5. 繁体中文界面 → AI 以繁体中文回答
6. Viewer 角色 → 无修復建議
7. Settings Drawer → 无 API Key 输入框

### 8.3 Browser QA

| # | 检查项 | Viewports |
|---|--------|-----------|
| 1 | 页面不白屏 | Desktop 1440x900, Mobile 375x812 |
| 2 | 没有 console error | Both |
| 3 | 输入框可见 | Both |
| 4 | quick prompts 可见 | Both |
| 5 | provider status 可见 | Both |
| 6 | 不再出现用户 API key 输入框 | Both |
| 7 | 中文语言下文案为中文 | Both |
| 8 | mobile 不横向溢出 | Mobile |
| 9 | message cards 可读 | Both |
| 10 | fallback / blocked 状态可读 | Both |

---

## 9. 发布风险

### 9.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Firebase Functions 部署失败 | 无法使用 AI 功能 | 降级到确定性工具 |
| DeepSeek API 不可用 | AI 分析失败 | 自动降级到确定性工具 |
| 限流过于严格 | 高频用户被拒 | 调整限流参数 |
| 响应格式变化 | 解析失败 | 防御性解析 + 降级 |

### 9.2 业务风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| AI 回答不准确 | 用户误解数据 | Output Validation + Caveats |
| 中文回答质量差 | 用户体验下降 | 专业术语约束 + 验证 |
| 成本超支 | 费用增加 | 限流 + 监控 |

---

## 10. 回滚方案

### 10.1 快速回滚

```bash
# 1. 回滚前端
git revert <commit-hash>
firebase deploy --only hosting

# 2. 回滚 Functions (如果需要)
firebase functions:delete api --region asia-east1
```

### 10.2 部分回滚

- **仅回滚 UI**: 保留 proxy，恢复旧版 copilot 组件
- **仅回滚 Proxy**: 前端切换到 local 模式，不调用 proxy

### 10.3 回滚验证

- 确定性工具正常工作
- 无 API Key 泄露
- 安全边界完整

---

## 附录 A: 文件清单

### 新增文件

| 文件路径 | 说明 |
|----------|------|
| `functions/package.json` | Functions 依赖 |
| `functions/tsconfig.json` | TypeScript 配置 |
| `functions/src/index.ts` | Functions 入口 |
| `functions/src/aiChat.ts` | AI Chat proxy handler |
| `functions/src/deepseekClient.ts` | DeepSeek API 封装 |
| `functions/src/rateLimit.ts` | 限流实现 |
| `frontend/src/services/aiChatService.ts` | 前端 proxy 调用 |
| `frontend/src/services/aiChatService.test.ts` | proxy 测试 |

### 修改文件

| 文件路径 | 说明 |
|----------|------|
| `firebase.json` | 添加 functions 配置 |
| `frontend/src/core/aiProviderAdapter.ts` | 重写 provider |
| `frontend/src/core/aiProviderPromptPack.ts` | 添加语言规则 |
| `frontend/src/core/aiCopilotGuardrails.ts` | 更新禁止列表 |
| `frontend/src/components/copilot/CopilotChat.tsx` | 重写主对话组件 |
| `frontend/src/components/copilot/AiProviderSettingsDrawer.tsx` | 重写设置抽屉 |
| `frontend/src/components/copilot/AiProviderStatusTag.tsx` | 更新状态标签 |
| `frontend/src/components/copilot/CopilotMessage.tsx` | 更新消息样式 |
| `frontend/src/components/copilot/CopilotQuickButtons.tsx` | 更新快捷按钮 |
| `frontend/src/i18n/en.ts` | 更新翻译 |
| `frontend/src/i18n/zhTW.ts` | 更新翻译 |
| `frontend/src/App.tsx` | 版本号 |
| `frontend/src/services/snapshotService.ts` | 版本号 |
| `frontend/package.json` | 版本号 |

---

## 附录 B: 部署检查清单

- [ ] `functions/` 目录已创建，`package.json` + `tsconfig.json` 就绪
- [ ] `firebase.json` 已更新 `functions` 配置和 hosting rewrite
- [ ] `DEEPSEEK_API_KEY` secret 已设置
- [ ] `frontend/package.json` 版本 → `1.52.0`
- [ ] `App.tsx` APP_VERSION → `v1.52.0`
- [ ] `snapshotService.ts` APP_VERSION → `v1.52.0`
- [ ] 所有新 i18n 键已添加到 en.ts 和 zhTW.ts
- [ ] 已删除的 BYOK i18n 键已从两边移除
- [ ] `npm run build` 编译通过
- [ ] `npm run test` 全部通过
- [ ] `cd functions && npm run build` 编译通过
- [ ] 本地 emulator 测试 proxy 调用成功
