# v1.64.2 Scenario Result Analysis Panel Redesign — CC Execution Command

## 0. Mission

重构 `/scenario` 的「模拟结果 / 交付风险暴露」分析区。当前问题不是单个 label 错误，而是结果面板没有把模拟输出翻译成业务可读的分析。

本任务只改「情境模拟」页面的模拟结果分析体验。不要修改正式计算引擎、Firestore 规则、AI Secret、Auth、部署配置。

## 1. Non-Negotiable Baseline Rules

1. 必须从最新 `origin/main` 创建新分支，不得从旧 feature branch 继续开发。
2. 开始前必须运行并记录：
   - `git fetch origin`
   - `git checkout main`
   - `git pull --ff-only origin main`
   - `cd frontend && npm run verify:release-baseline`
3. 不得回退 v1.62.3+ baseline：
   - PageShell 宽版布局必须保留
   - 顶栏 AI Drawer 必须保留
   - AI 不得重新出现在 `PRIMARY_NAV`
   - Pipeline Readiness 不得恢复「情境檢視就緒」
   - 风险简报新版执行摘要不得回退
   - 年度营运指标不得回退
   - BP 模拟 + 版本历史不得回退
4. 金额默认显示 `M NTD`。不得在主要 UI 显示 `M USD`、`M TWD`、`M CNY`、`K TWD`、`B TWD`、`NT$`、`$`、`¥`。
5. 不修改：
   - `firestore.rules`
   - `frontend/src/core/calculationEngine.ts`
   - DeepSeek Secret / API key / Firebase Auth
6. 所有模拟都必须是浏览器内存沙箱，不得写入正式数据，除非用户点击已有的保存版本功能。

## 2. Branch / Log

Create branch:

```bash
git checkout -b xiaomi/v1-64-2-scenario-result-analysis-panel-redesign
```

Create and continuously update command log:

```text
docs/release/V1_64_2_SCENARIO_RESULT_ANALYSIS_PANEL_REDESIGN_LOG.md
```

The log must include:

- start time / end time / elapsed time
- baseline commit
- commands run
- root cause summary
- changed files
- validation outputs
- commit hash
- push branch
- whether AGY review is recommended

## 3. Problems To Fix

The screenshot shows six UX/data issues:

1. **数据品质问题只有黄色 highlight**
   - It says baseline data has quality problems, but does not explain what problem, impact, or repair path.

2. **短缺变化 unclear**
   - `+3 (base: 35)` has no clear unit or comparison meaning.

3. **产能缺口 label broken**
   - It shows `OK Panel PNL`, which is not human-readable and mixes status with unit.

4. **风险营收 is total**
   - User needs year-by-year exposure. A total value hides the affected years and is not actionable.

5. **BU 利用趋势 not readable**
   - The chart is too wide and does not emphasize affected months or baseline vs scenario delta.

6. **产能缺口 chart blank**
   - Empty chart is not acceptable. If gap is zero, explain why. If gap exists, show it.

## 4. Product Design Target

Replace the current result area with a clear analysis panel:

### 4.1 Data Quality Explanation

The data quality warning must become an actionable strip:

- Show issue count and top issue type, e.g. `发现 6 个资料质量问题`
- Explain impact in Chinese:
  - `预测引用了不存在的 SKU，会影响客户、产品与产能归因。`
  - `BP 或产能结论仍可参考，但归因可能不完整。`
- Provide action button/link:
  - `查看资料问题` deep-link to the relevant data page if available, otherwise scroll/open the issue detail section.
  - `继续模拟` remains possible; do not block the user.

Do not only color-highlight text.

### 4.2 KPI Row Redesign

Replace unclear KPI labels with four business KPIs:

1. `新增短缺月份`
   - Format: `+3 个月`
   - Subtext: `原始：35 个月`
   - Tooltip/secondary text: `与原始方案相比，模拟后新增的短缺月份数。`

2. `最高 BU 利用率`
   - Format: `228.7%`
   - Subtext: `发生于 YYYY-MM`
   - Color:
     - < 85% normal
     - 85%-100% warning
     - > 100% danger

3. `产能缺口`
   - If no shortage/gap: show `0 panels` and a green `OK` badge separately.
   - If gap exists: show `123,456 panels`.
   - Never show `OK Panel PNL`.
   - Subtext: `短缺月份的需求 - 可用产能合计`.

4. `风险营收暴露（年度）`
   - Default to the most impacted year, not total.
   - Format: `2027：24,989.4 M NTD`.
   - Subtext: `短缺月份中的预测营收`.
   - If total is useful, place it only in tooltip or secondary text: `合计：xx M NTD`.

### 4.3 Yearly Revenue Exposure

Add a compact year-by-year table or mini bar chart below/inside the risk revenue card:

Columns:

- 年度
- 风险营收暴露 `M NTD`
- 短缺月份
- 主要客户 / SKU if available

Default display: next 5 affected years. If more years exist, allow horizontal scroll, but keep 5 years visible without cramped wrapping.

### 4.4 BU Utilization Chart

Make `BU 利用率趋势` useful:

- Show only relevant window by default:
  - affected months ± 6 months, or
  - first non-zero scenario effect to last non-zero scenario effect ± 3 months.
- Provide a toggle:
  - `影响窗口`
  - `全部月份`
- Lines:
  - Baseline BU: muted gray
  - Scenario BU: red/orange
  - Delta line or area: optional but recommended if chart remains hard to read
- Add 85% and 100% reference lines.
- Tooltip must show:
  - month
  - baseline BU %
  - scenario BU %
  - delta pp
- Y axis must use percent with one decimal if needed.

### 4.5 Capacity Gap Chart

Do not render a blank grid.

If gap values are all zero:

- Replace chart with an explanation card:
  - `未产生产能缺口`
  - `模拟后可用产能仍高于需求，因此缺口为 0。`
  - show `产能余裕下降` if slack changed.

If any gap exists:

- Show monthly bar chart:
  - X: month
  - Y: panels, with thousands separators
  - Tooltip: `YYYY-MM：123,456 panels`
- Highlight top 3 gap months.

### 4.6 Scenario-Type Awareness

The same panel must adapt to scenario type:

- Forecast surge:
  - emphasize affected customer/product, yearly risk revenue, utilization increase, new shortage months.
- Customer loss:
  - emphasize revenue loss, BP gap relief/worsening, released capacity.
- Capacity delay/reduction:
  - emphasize utilization, gap, shortage, capacity slack.

Do not use one generic sentence for all scenario types.

## 5. Technical Design Requirements

Avoid putting more business derivation directly into `ScenarioPlanning.tsx`.

Create a focused helper module, for example:

```text
frontend/src/core/scenarioResultPresentation.ts
```

Suggested exports:

- `buildScenarioResultSummary(...)`
- `buildScenarioKpis(...)`
- `buildYearlyRiskRevenueRows(...)`
- `buildUtilizationChartSeries(...)`
- `buildCapacityGapChartSeries(...)`
- `getScenarioResultEmptyState(...)`

The page component should mostly render the prepared presentation model.

## 6. Tests Required

Add or update tests. Minimum coverage:

1. Data quality warning includes issue explanation and action text, not only generic highlight.
2. Shortage KPI displays `个月` and baseline subtext.
3. No UI string `OK Panel PNL`.
4. Risk revenue is yearly by default and uses `M NTD`.
5. BU utilization chart has distinct baseline/scenario labels and tooltip data includes delta.
6. Capacity gap chart:
   - renders zero-state explanation when all gaps are zero
   - renders bars when gaps exist
7. `npm run verify:release-baseline` still passes.

Also add guard if reasonable:

- `OK Panel PNL` must never appear in built source or scenario UI tests.

## 7. Validation Commands

Run from repo root unless noted:

```bash
cd frontend
npm run lint -- --quiet
npm run build
npm test -- --run
npm run verify:release-baseline
cd ../functions
npm run build
```

If any command fails, stop and report root cause. Do not claim complete.

## 8. Commit / Push

Commit only after all validation passes:

```bash
git add frontend docs/release
git commit -m "fix: redesign scenario result analysis panel"
git push origin xiaomi/v1-64-2-scenario-result-analysis-panel-redesign
```

Do not merge to main. Do not deploy. Wait for AGY review.

## 9. Final Report Requirements

Final response must be in Chinese and include:

- 是否完成
- 开始时间 / 结束时间 / 总耗时
- Token 使用量（如果工具可见；不可见则写不可见）
- 根因总结
- 设计改动摘要
- 修改文件清单
- 六个截图问题逐项是否解决
- test / lint / build / verify / functions build 结果
- 是否触碰红线文件
- commit hash
- push branch
- 是否建议 AGY 验收

If work is not complete, do not write “最终报告”. Write “进度回报” only, and clearly state remaining work.
