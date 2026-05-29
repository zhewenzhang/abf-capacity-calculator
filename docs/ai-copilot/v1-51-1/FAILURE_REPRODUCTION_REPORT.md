# v1.51.1 Failure Reproduction Report

**版本**: v1.51.1
**日期**: 2026-05-30

---

## 阻塞点复现

### P1-1: DeepSeek API key 只存在 Drawer 内部 state

**复现**:
```typescript
// AiProviderSettingsDrawer.tsx
const [byokKey, setByokKey] = useState('');
```

**问题**: key 只存在于 Drawer 组件内部 state，没有回传给父组件。

**修复**: ✅ 已添加 props:
- `deepseekApiKey: string`
- `onDeepseekApiKeyChange: (key: string) => void`
- `onClearDeepseekApiKey: () => void`

---

### P1-2: CopilotChat 中 sessionKey 未使用

**复现**:
```typescript
// CopilotChat.tsx (修复前)
const [sessionKey, setSessionKey] = useState('');
void sessionKey;
void setSessionKey;
```

**问题**: sessionKey 被声明但被 void 消除，未实际使用。

**修复**: ✅ 已重命名为 `deepseekSessionKey` 并实际使用。

---

### P1-3: handleSubmit 没有 deepseek 分支

**复现**:
```typescript
// CopilotChat.tsx (修复前)
if (providerMode === 'external-byok') { ... }
else if (providerMode === 'mock') { ... }
else { ... } // 没有 deepseek 分支
```

**问题**: DeepSeek mode 不会调用 DeepSeek provider。

**修复**: ✅ 已添加 `providerMode === 'deepseek'` 分支，调用 DeepSeek provider。

---

### P1-4: aiProviderAdapter.ts 文件头注释冲突

**复现**:
```
Key constraints:
- No fetch() or network API calls
```

**问题**: 文件头说 "No fetch()"，但 DeepSeek provider 实现中使用了 fetch。

**修复**: ✅ 已更新注释为 "External AI providers (e.g., DeepSeek) use fetch() for API calls"。

---

## 结论

所有 v1.51 阻塞点已复现并修复。

---

**报告生成时间**: 2026-05-30
**维护者**: Failure Reproduction Agent
