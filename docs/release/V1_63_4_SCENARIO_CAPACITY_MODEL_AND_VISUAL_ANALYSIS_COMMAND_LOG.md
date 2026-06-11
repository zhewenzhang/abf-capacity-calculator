# v1.63.4 Scenario Capacity Model and Visual Analysis — Command Log

## Root Cause Investigation

**Problem**: BU delay with "2027-01 delay 3 months, reduce 20%" showed shortage Δ=0, max BU util=2%. Results appear unrealistic.

**Root cause**: Test data has BU capacity >> demand:
- `buPanelPerDay=5000` × 28 days = 140K panels/month BU capacity
- `buPanelDemand` was only ~2-3K panels/month
- Baseline utilisation = (2-3K)/140K ≈ 1.4–2.1%
- Scenario (20% reduction → 112K) = (2-3K)/112K ≈ 1.8–2.7%
- Shortage change = 0 (demand never exceeds capacity even after reduction)

**Calculation logic verified as correct**:
1. **Units**: Both demand and capacity in panels per month — match ✓
2. **Month application**: capacity `cp.month` aligned with forecast `fc.month` — correct ✓
3. **Shortage**: `Math.max(demand - capacity, 0)` — standard computation ✓
4. **Utilization**: `demand / capacity` — correct ratio ✓
5. **Delay window**: `[startMonth, startMonth + shiftMonths)` applies ratio reduction to `corePanelPerDay`/`buPanelPerDay` — correct ✓

**Conclusion**: Model is mathematically correct. Low utilisation is caused by test data mismatch (capacity >> demand). When baseline utilisation < 5%, even a 20% reduction cannot create shortage.

## Changes (this round)

### Visual Analysis (Charts)
- Added **BU utilization trend line chart** (recharts `LineChart`):
  - Baseline (gray) vs Scenario (red) lines across all months
  - 100% alert `ReferenceLine` with dashed red line and label
  - Auto-scaled Y-axis for data visibility, tooltip with exact values
- Added **capacity gap rate bar chart** (recharts `BarChart`):
  - Per-month capacity gap percentage (`(1 - scenCap / baseCap) × 100`)
  - Orange bars with tooltip and legend

### Root Cause Documentation
- BU model accuracy depends on realistic capacity/demand ratios
- 20% reduction doesn't create shortage when baseline util is < 5%
- Severity metrics (`totalCapGap`) already provide meaningful impact even when shortage count = 0

### Previous Round Changes (v1.63.4 initial)
- Added `totalCapGap`, `maxBuUtilPct`, `utilChartData`, `gapChartData`, `topMonths`, `topCustomers` to `deliveryRisk` useMemo
- Replaced full monthly table with: KPI row (4 columns), 重点月份 Top 6 card, 客户影响 Top 5 card, 折叠明细 `<details>` section
- Added severity alert when `shortageMonthCount.delta = 0` but `totalCapGap > 0`
- Amounts shown in M NTD throughout

## Verification

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 errors, 187 warnings (pre-existing) |
| `npm run build` | ✅ Built in 874ms |
| `npm test -- --run` | ✅ 64 files, 1550 tests |
| `npm run verify:release-baseline` | ✅ ALL CHECKS PASSED |

## Files Changed Since v1.63.4

| File | Change |
|---|---|
| `frontend/src/pages/ScenarioPlanning.tsx` | Added recharts LineChart (BU utilisation + 100% alert line) and BarChart (capacity gap rate) between KPI row and Top 6 table; fixed antd/recharts Tooltip name conflict via alias |
| `docs/release/V1_63_4_SCENARIO_CAPACITY_MODEL_AND_VISUAL_ANALYSIS_COMMAND_LOG.md` | Updated this log |

## Version

`v1.63.4` (no bump — charts complete existing v1.63.4 scope)
