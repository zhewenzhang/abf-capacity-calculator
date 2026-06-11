# v1.64.3 Scenario Capacity Gap Semantics Fix — CC Execution Command

## 0. Mission

修复 v1.64.2 的关键返工问题：`产能缺口` 不能再用 `base capacity - scenario capacity` 伪装。那只是“产能减少量”，不是“缺口”。

本任务必须把 `/scenario` 的模拟结果分析面板改成业务语义正确、图表可读、日志完整的版本。

## 1. Must Read First

Read these files before editing:

```text
docs/release/V1_64_2_SCENARIO_RESULT_ANALYSIS_PANEL_REDESIGN_COMMAND.md
docs/release/V1_64_2_SCENARIO_RESULT_ANALYSIS_PANEL_REDESIGN_LOG.md
frontend/src/pages/ScenarioPlanning.tsx
frontend/src/core/scenarioResultPresentation.ts
frontend/src/core/operationalScenario.ts
frontend/src/core/scenarioEngine.ts
```

## 2. Baseline / Branch

Start from latest `main`, not the old v1.64.2 branch:

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
cd frontend
npm run verify:release-baseline
cd ..
git checkout -b xiaomi/v1-64-3-scenario-capacity-gap-semantics-fix
```

Create and continuously update:

```text
docs/release/V1_64_3_SCENARIO_CAPACITY_GAP_SEMANTICS_FIX_LOG.md
```

## 3. Root Cause Investigation Required

Before implementing, write a short root-cause section in the log answering:

1. Where is `totalCapGap` currently calculated?
2. Is it calculating capacity reduction or actual unmet demand?
3. Which fields in `monthlySummaries` represent demand, capacity, and shortage?
4. Which existing engine output should be trusted for shortage / unmet demand?

Do not patch labels before answering these questions.

## 4. Required Fixes

### 4.1 Correct Capacity Gap Semantics

Current bad pattern to eliminate:

```ts
baseBuCapacity - scenBuCapacity
```

This is **capacity reduction**, not **capacity gap**.

Correct concepts:

- `产能减少量`: how much available capacity was reduced compared with baseline.
- `产能缺口`: unmet demand after scenario, i.e. shortage / demand exceeding available capacity.

Implement both separately:

1. `capacityReductionPanels`
   - Use only for explaining how much capacity was removed.
   - Label: `产能减少量`

2. `capacityGapPanels`
   - Use shortage/unmet demand.
   - Prefer existing monthly summary shortage fields if available:
     - `scen.buShortage`
     - `scen.coreShortage`
     - or equivalent existing engine output.
   - If monthly summary provides demand and capacity, formula is:

```ts
Math.max(demand - availableCapacity, 0)
```

Do not call capacity reduction a gap.

### 4.2 KPI Row

Change the result KPIs to:

1. `新增短缺月份`
   - `+3 个月`
   - subtext: `原始：35 个月`

2. `最高 BU 利用率`
   - `228.7%`
   - subtext: affected month if known, otherwise `模拟期间`

3. `产能缺口`
   - Based on actual shortage/unmet demand only.
   - If zero: `0 panels` + green `OK`.
   - If non-zero: `123,456 panels`.
   - subtext: `需求超过可用产能的合计`.

4. `产能减少量`
   - New KPI or secondary card if needed.
   - Shows the capacity removed by delay/reduction.
   - This prevents losing the useful reduction signal while keeping semantics correct.

5. `风险营收暴露（年度）`
   - Keep yearly default, not total.
   - Use `M NTD`.

### 4.3 Capacity Gap Chart

Use actual `capacityGapPanels`, not capacity reduction.

If all actual gaps are zero:

- Show explanation card:
  - `未产生产能缺口`
  - `当前情境虽然降低了可用产能，但需求仍低于可用产能，因此没有交付缺口。`
  - Also show `产能减少量` as a separate number, so users still see the scenario effect.

If gaps exist:

- Render bar chart by month.
- Y axis and tooltip must use `panels` with thousands separators.
- Highlight top 3 gap months.

### 4.4 BU Utilization Chart Window

Do not use the entire 2026-2040 range by default.

Implement default `影响窗口`:

- from first month where scenario differs from baseline or shortage differs,
- to last such month,
- plus 3 months padding on both sides.

Add a toggle:

- `影响窗口`
- `全部月份`

Tooltip must show:

- Month
- Baseline BU %
- Scenario BU %
- Delta pp

### 4.5 Data Quality Warning

Keep v1.64.2 structured warning, but make sure it is readable and not just a highlighted strip.

Must include:

- issue count
- top issue
- impact
- action button/link

### 4.6 Command Log Repair

v1.64.2 log was not properly finalized. v1.64.3 log must be complete:

- no mojibake in log
- no `待提交后补充`
- no `待推送后补充`
- include actual commit hash and branch after commit

Use UTF-8 without corrupted characters.

## 5. Tests Required

Add/update tests before or alongside implementation.

Minimum tests:

1. `capacityGapPanels` is not equal to `baseCapacity - scenarioCapacity` when shortage is zero.
2. If capacity is reduced but demand is still below capacity:
   - capacity gap shows `0 panels`
   - capacity reduction shows non-zero.
3. If demand exceeds scenario capacity:
   - capacity gap shows non-zero panels.
4. `OK Panel PNL` is absent.
5. `影响窗口` chart data is shorter than full range when scenario only affects a limited window.
6. `风险营收暴露（年度）` still uses yearly `M NTD`.
7. `npm run verify:release-baseline` passes.

## 6. Red Lines

Do not modify:

```text
firestore.rules
frontend/src/core/calculationEngine.ts
DeepSeek Secret / API key
Firebase Auth logic
```

Do not:

- merge to main
- deploy
- weaken `verify-release-baseline`
- restore old UI
- reintroduce `情境檢視就緒`
- reintroduce `M TWD`, `M CNY`, `K TWD`, `B TWD`, `NT$`

## 7. Validation Commands

Run:

```bash
cd frontend
npm run lint -- --quiet
npm run build
npm test -- --run
npm run verify:release-baseline
cd ../functions
npm run build
```

If any command fails, stop and report the failure. Do not claim final completion.

## 8. Commit / Push

After all checks pass:

```bash
git add frontend docs/release
git commit -m "fix: correct scenario capacity gap semantics"
git push origin xiaomi/v1-64-3-scenario-capacity-gap-semantics-fix
```

Do not merge or deploy.

## 9. Final Report Requirements

Final report must be Chinese and include:

- 是否完成
- 开始时间 / 结束时间 / 总耗时
- Token 使用量（如果可见；不可见就写不可见）
- 根因证明：为什么 v1.64.2 是错的
- 新口径说明：产能缺口 vs 产能减少量
- 修改文件清单
- 测试覆盖清单
- lint/build/test/verify/functions build 结果
- 红线文件是否触碰
- commit hash
- push branch
- 是否建议 AGY 验收

If not finished, write `进度回报` only. Do not write `最终报告`.
