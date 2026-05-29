# v1.51.1 DeepSeek Runtime Wiring Report

**版本**: v1.51.1
**日期**: 2026-05-30

---

## 调用链路

```
用户输入 → handleSubmit
    ↓
检查 providerMode === 'deepseek'
    ↓
验证 deepseekSessionKey 存在
    ↓
getProviderById('deepseek')
    ↓
validateConfig({ apiKey: deepseekSessionKey })
    ↓
buildProviderSystemPrompt(context, 'deepseek')
buildProviderUserMessage(context, question)
    ↓
provider.buildRequest(config, systemPrompt, userMessage, {})
    ↓
provider.runCompletion(config, request)
    ↓
检查 response.confidence
    ↓
如果 blocked/fallback: 使用 deterministic result + caveat
如果成功: 构建 CopilotToolResult + validateProviderOutput
    ↓
显示结果
```

---

## 实现细节

### 1. DeepSeek 缺 key

```typescript
if (!deepseekSessionKey || deepseekSessionKey.trim().length === 0) {
  // 返回 blocked result
  blockedReason: t('copilot.provider.deepseekKeyRequired')
}
```

### 2. DeepSeek 调用

```typescript
const provider = getProviderById('deepseek');
const config: ProviderConfig = {
  providerId: 'deepseek',
  apiKey: deepseekSessionKey,
};
const validation = provider.validateConfig(config);
// ...
const response = await provider.runCompletion(config, request);
```

### 3. 输出验证

```typescript
const aiResult: CopilotToolResult = {
  toolName: 'DeepSeek AI',
  title: 'DeepSeek AI Response',
  summary: response.content,
  // ...
};
const validated = applyOutputValidation(aiResult);
```

### 4. Fallback

```typescript
if (response.confidence === 'blocked' || response.isFallback) {
  // DeepSeek failed, fall back to deterministic
  const fallbackResult: CopilotToolResult = {
    ...result, // deterministic result
    caveats: [...result.caveats, `DeepSeek fallback: ${response.content}`],
  };
}
```

---

## 安全验证

| 检查项 | 状态 |
|--------|------|
| 禁止假保存声明 | ✅ output validation |
| 禁止猜测缺失数据 | ✅ guardrails |
| 禁止单位混淆 | ✅ guardrails |
| 禁止因果推断 | ✅ guardrails |
| API key 不泄露 | ✅ 不进入 response |

---

**报告生成时间**: 2026-05-30
**维护者**: DeepSeek Runtime Call Wiring Agent
