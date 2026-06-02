# v1.54.8 Remove Workbench Issue Summary — CC Command

## 背景

用户在「每日营运工作台」指出「问题摘要」区块没有价值：

- 只能看到 Product / Capacity 的问题摘要。
- 卡片不能点击进入具体修复。
- 不能直接处理。
- 与下方「异常智能分析」重复。
- 占据工作台关键首屏空间。

用户明确要求：**删掉。**

## 目标

删除「每日营运工作台」里的 `问题摘要 / Issues Summary` 区块，让页面保留真正有用、可行动的模块：

1. Pipeline Readiness
2. 异常智能分析
3. 前瞻焦点
4. Revenue vs BP
5. Scenario / Report / Copilot 等后续区块

## 必须遵守

1. 全程中文回报。
2. 创建并持续更新命令日志：
   `docs/release/V1_54_8_REMOVE_WORKBENCH_ISSUE_SUMMARY_COMMAND_LOG.md`
3. 不修改 `firestore.rules`。
4. 不修改 `frontend/src/core/calculationEngine.ts`。
5. 不改业务计算逻辑。
6. 不改 DataQuality / Abnormality Intelligence 的核心生成逻辑。
7. 保持 Viewer read-only。
8. 不新增依赖。

## 需要修改的位置

主要文件：

- `frontend/src/pages/DailyOperationsWorkbench.tsx`

请删除这段 UI：

- `SECTION 2: Abnormality Summary`
- 标题使用 `workbench.abnormality.title`
- 对应截图中的「问题摘要」卡片区。

源码位置参考：

- `DailyOperationsWorkbench.tsx` 约第 558 行到 611 行。

同时清理只为这个区块服务的派生变量：

- `abnormalitiesByDomain`
- `domainKeys`

如果这些变量删除后导致以下 import 不再使用，也一起清理：

- `AbnormalityInsight`
- `WarningOutlined`
- `DOMAIN_ICONS` 相关只用于此区块的内容（如仍被别处使用则保留）
- `severityColor` 如只用于该区块则删除；如果「异常智能分析」仍使用则保留。

## 不要删除的内容

不要删除：

- `rankedOutput`
- `buildAbnormalityIntelligence`
- `异常智能分析 / Abnormality Intelligence`
- `今日必处理事项`
- `Pipeline Readiness`
- DQ 逻辑本身

原因：用户现在要删的是没有交互价值的摘要卡片，不是删掉异常分析能力。

## UX 要求

删除后页面应该更紧凑：

1. Pipeline Readiness 下方直接进入「异常智能分析」。
2. 不留下大块空白。
3. 不再出现「问题摘要 / Issues Summary」标题。
4. 页面滚动距离减少。

## 测试与验证

在 `frontend` 目录执行：

```powershell
npm run test -- --run
npm run lint -- --quiet
npm run build
```

如果可以执行浏览器 QA，请检查：

1. `/operations` 页面不再出现「问题摘要」。
2. 「异常智能分析」仍正常显示。
3. Pipeline Readiness 的立即修复入口仍保留。
4. mobile 375px 无空白断层。

## Guardrail

执行：

```powershell
git diff -- firestore.rules
git diff -- frontend/src/core/calculationEngine.ts
```

应无输出。

## 最终回报格式

请用中文回报：

1. 是否已删除「问题摘要」。
2. 修改文件清单。
3. 是否清理未使用变量/import。
4. test/lint/build 结果。
5. 是否修改 `firestore.rules` / `calculationEngine.ts`。
6. Commit hash / branch / push 状态。
7. 是否可交 AGY 验收。

