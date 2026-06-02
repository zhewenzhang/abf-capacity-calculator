# V1.54.9 Workbench Fake-Useful Cleanup — Command Log

## 需求理解

清理「每日营运工作台」中假有用、不可操作、重复噪音的 UI，并将 AI 快捷按钮变成真实深链入口。

## 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `frontend/src/pages/DailyOperationsWorkbench.tsx` | 删除 SECTION 2「问题摘要」；清理未使用变量；AI 快捷按钮改为 `/copilot?tool=xxx` |
| `frontend/src/pages/AiCopilot.tsx` | 支持 `?tool=xxx` URL query，自动执行 tool，执行后清除 query |
| `frontend/src/components/copilot/CopilotChat.tsx` | 新增 `pendingToolId` / `onPendingToolConsumed` props，自动执行深链 tool |
| `docs/release/V1_54_9_WORKBENCH_FAKE_USEFUL_CLEANUP_COMMAND_LOG.md` | 本日志 |

## 删除了哪些低价值 UI

### SECTION 2: Abnormality Summary（问题摘要）
- 原因：只是按 domain 分组展示原始异常，用户不能从这里直接修复
- 与 SECTION 2B「异常智能分析」重复
- 附带清理：`abnormalitiesByDomain` useMemo、`domainKeys`、`severityColor()`、`DOMAIN_ICONS`、`domainLabelKey()`、`AbnormalityInsight` 类型导入

## 保留了哪些高价值模块

- Pipeline Readiness
- Abnormality Intelligence（异常智能分析）
- Look-Ahead
- Revenue / BP Summary
- Scenario Shortcuts + Scenario v2
- Management Report
- AI Copilot Quick Actions（已改为真实深链）

## AI 快捷按钮深链映射

| 按钮 | 新行为 |
|------|--------|
| 数据问题 | `/copilot?tool=dataProblems` |
| 产能风险 | `/copilot?tool=capacityRisk` |
| BP 差距 | `/copilot?tool=bpGap` |
| 前瞻分析 | `/copilot?tool=lookAhead` |
| 异常影响 | `/copilot?tool=abnormalityDetail` |
| 情境模拟 | `/copilot?tool=scenarioV2` |
| 报告叙事 | `/copilot?tool=reportNarrative` |

## AI Assistant 深链支持

- 读取 `?tool=<toolId>` URL query
- 自动执行一次对应 tool（走 `runTool` + `applyOutputValidation`）
- 执行后清除 URL query，避免刷新重复触发
- 不破坏手动输入和 quick buttons
- 不绕过 output validation / DeepSeek 安全边界

## test / lint / build

| 检查 | 结果 |
|------|------|
| `npm run test -- --run` | ✅ 59/59 文件，1442/1442 测试通过 |
| `npm run lint -- --quiet` | ✅ 0 errors |
| `npm run build` | ✅ built in 1.24s |

## 安红线

| 检查 | 结果 |
|------|------|
| firestore.rules | ✅ 无修改 |
| calculationEngine.ts | ✅ 无修改 |
| DeepSeek API key | ✅ 未触碰 |
| Firebase Auth | ✅ 未触碰 |
| 新 npm dependency | ✅ 未新增 |
| 外部 API 调用 | ✅ 未新增 |
| 自动写入 Firestore | ✅ 未新增 |

## Git

- Branch: `xiaomi/v1-54-9-workbench-fake-useful-cleanup`
- Commit: 待提交
