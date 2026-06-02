# v1.54.6 Forecast Month System Bug Repair — CC Command

## 背景

线上「预测」页面出现提示：

> 有 14 笔预测资料的月份不是 YYYY-MM 格式，系统无法判断年度与月份，因此不会将它们纳入 BP 与产能分析。请到「预测」页修正月份栏位。

这不应被默认判定为用户输入错误。此前页面曾出现类似 `66ea`、`c5a3` 这种「年份」，高度疑似 Firestore doc id、内部 row id、或字段映射错误进入了 `Forecast.month`。

本次任务目标是修复系统根因，而不是只改提示文案。

## 必须遵守

1. 全程中文回报。
2. 必须创建并持续更新命令日志：
   `docs/release/V1_54_6_FORECAST_MONTH_SYSTEM_BUG_REPAIR_COMMAND_LOG.md`
3. 使用系统化调试：先查根因，再修复。
4. 不得修改 `firestore.rules`。
5. 不得修改 `frontend/src/core/calculationEngine.ts`，除非你先在报告中证明非改不可；默认应通过 forecast sanitization / adapter layer 修复。
6. 不得泄露 API key，不得新增外部依赖。
7. 保持 Viewer read-only。
8. 不得把 AGY review branch 合并进产品分支。

## 当前初步证据

请重点检查以下文件：

- `frontend/src/services/forecastService.ts`
  - `saveForecast()` / `batchSaveForecasts()` 当前接受任何 `month` 字符串，没有写入前验证。
- `frontend/src/pages/Forecasts.tsx`
  - 多数写入路径使用固定 `ALL_MONTHS` 或 import header，理论上应是合法 `YYYY-MM`。
- `frontend/src/pages/ForecastsSpreadsheetLab.tsx`
  - 由 selectedYear + month key 生成 `YYYY-MM`，理论上应合法。
- `frontend/src/core/dataQuality.ts`
  - 已新增 `forecast-invalid-month` 检查，但仍有部分下游检查使用 raw forecasts。
- `frontend/src/core/analytics.ts`
  - `buildAnalyticsModel()` 直接把 raw forecasts 传给 `runCalculation()`。
  - `toYear()` / `monthsToYears()` 对非法 month 仍可能产生错误年度。
- `frontend/src/core/yearlyScenario.ts`
  - 当前也用 `f.month.length >= 4`、`startsWith(year)`，应改为只接受合法 `YYYY-MM`。

## 阶段 1：根因调查

请先做只读调查，并在命令日志中记录：

1. 当前目标 workspace/project 下 14 笔 invalid forecast 的：
   - forecast doc id
   - skuId
   - month
   - forecastPcs
   - createdAt / updatedAt 如有
2. 判断 invalid month 是否符合以下模式：
   - 等于 Firestore doc id
   - 等于 SKU id 的前 4 位或片段
   - 等于 DataSheetGrid row id
   - 等于导入表头
   - 空值 / undefined / null / 其他
3. 检查所有 forecast 写入路径：
   - Forecasts 月/季/年编辑保存
   - Forecasts 批量 set / multiply / yearly growth / fill forward / clear
   - Forecast import
   - ForecastsSpreadsheetLab 保存
   - demoDataService
   - workspace copy flow
   - snapshot/restore 如有涉及 forecasts
4. 输出清晰的 root cause 假设：
   - 根因 A：历史脏数据
   - 根因 B：某写入路径字段映射错误
   - 根因 C：workspace copy / import / snapshot restore 复制了旧脏数据
   - 根因 D：其他

不要在根因调查前直接修文案或过滤。

## 阶段 2：源头防线修复

实现 forecast month 写入前验证，建议新增或复用共享工具：

- `isValidMonthKey(value): boolean`
- `assertValidForecastMonth(month, context)`
- `filterValidForecasts(forecasts)`
- `findInvalidForecasts(forecasts)`

修复要求：

1. `saveForecast()` 写入前必须拒绝 invalid month。
2. `batchSaveForecasts()` 写入前必须拒绝 invalid month，并报告最多 5 个 sample。
3. Forecast import 必须只接受合法 `YYYY-MM` header，并在发现非法 header 时显示清楚提示。
4. Forecast 页面本地编辑 key 必须继续使用 `skuId::YYYY-MM`，不能混用 `skuId-month` 这种会因为 SKU id 含 `-` 而解析错的格式。
5. 如果发现某个路径把 doc id / row id 写入 month，必须修根因。

## 阶段 3：下游分析防污染

目标：invalid month 可以被 DQ 报告出来，但绝不能进入 BP、产能、情境、AI 分析计算。

要求：

1. 在 `buildAnalyticsModel()` 前过滤 invalid forecasts。
2. 在 `dataQuality.ts` 中，所有 BP/capacity/currency/year aggregation 只使用 `validForecasts`。
3. `capacityWithoutDemand`、`bu-demand-zero-capacity`、`bp-target-zero-forecast` 等检查也不能用 raw invalid forecasts。
4. `yearlyScenario.ts` 必须只从合法 month 提取 year，并只对合法 month 做 `startsWith(year)`。
5. 其他直接调用 `runCalculation()` 的 scenario/operations 模块，如会吃 raw forecasts，也要加 sanitization wrapper。

## 阶段 4：用户可修复体验

不要再把责任直接推给用户。将提示改为：

> 系统检测到 14 笔预测资料的月份字段异常，可能来自旧版数据或导入/复制流程。系统已暂时排除这些资料，避免影响 BP 与产能分析。请使用下方修复工具检查并修复。

必须提供至少一种修复方式：

1. 如果可以从 doc id、row metadata、或其他字段推断合法月份：
   - 提供「一键修复可推断月份」按钮。
2. 如果无法推断：
   - 在「预测」页提供异常记录清单，让用户选择/输入正确月份。
   - 显示 doc id、sku code、forecast pcs、当前错误 month。
   - 不允许保存非法 month。

如果本轮时间不够做完整 UI，至少必须：

- 在预测页显示 invalid forecast table。
- 提供删除 invalid forecast 或导出 invalid forecast 的安全操作。
- 不要让用户盲目去表格中找不到的资料。

## 阶段 5：测试

至少新增/更新以下测试：

1. `forecastService`：
   - `saveForecast()` rejects invalid month。
   - `batchSaveForecasts()` rejects invalid month。
   - valid month 正常保存。
2. `dataQuality`：
   - invalid month 产生 `forecast-invalid-month`。
   - invalid month 不会产生 `forecast-missing-bp-target-66ea`。
   - invalid month 不进入 missing capacity / BU zero capacity。
3. `analytics`：
   - invalid month 不进入 `monthlySummaries`。
   - invalid month 不污染 `yearlyHealth`。
4. Forecast page：
   - invalid forecast issue 显示为系统数据异常，不显示技术 key。
   - 如果有修复/删除入口，viewer 角色不可执行。
5. Yearly scenario：
   - invalid month 不会生成错误年份。

## 阶段 6：验证命令

在 `frontend` 目录执行：

```powershell
npm run test -- --run
npm run lint -- --quiet
npm run build
```

如 repo 有 demo seed validation，也执行：

```powershell
node docs/demo/validate-demo-seed.mjs
```

再做 grep guardrail：

```powershell
git diff -- firestore.rules
git diff -- frontend/src/core/calculationEngine.ts
rg -n "sk-[A-Za-z0-9]|DEEPSEEK_API_KEY" .
```

## 最终回报格式

请用中文输出：

1. 是否确认为系统问题，根因是什么。
2. 14 笔 invalid forecast 的模式摘要。
3. 修改文件清单。
4. 是否新增修复入口，如何使用。
5. test/lint/build 结果。
6. 是否修改 `firestore.rules` / `calculationEngine.ts`。
7. Commit hash / branch / push 状态。
8. 是否可交 AGY 验收。

