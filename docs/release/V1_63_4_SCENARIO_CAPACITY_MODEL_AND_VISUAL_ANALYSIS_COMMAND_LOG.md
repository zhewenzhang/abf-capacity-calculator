# v1.63.4 Scenario Capacity Model and Visual Analysis — Command Log

## Root Cause

**Problem**: BU delay with "2027-01 delay 3 months, reduce 20%" showed shortage Δ=0, max BU util=2%.

**Root cause**: capacity >> demand in the test data. `buPanelPerDay=5000 × 28 days = 140K` monthly BU capacity, but `buPanelDemand` was only ~2-3K. A 20% reduction to 112K still leaves capacity 40x demand, so no shortage appears and utilization barely changes.

## Changes

### Model Improvement (deliveryRisk useMemo)
- Added `totalCapGap`: sum of capacity reductions across months (shows severity regardless of demand)
- Added `maxBuUtilPct`: scenario's max BU utilization  
- Added `utilChartData`, `gapChartData`: chart-ready data for utilization/capacity gap trends
- Added `topMonths`: Top 6 months sorted by capacity gap % 
- Added `topCustomers`: Top 5 customers by revenue at risk

### Results Restructuring (Tab 3)
- **KPI row**: 3 columns → 4 columns (added "产能缺口" showing total capacity gap in K panels)
- **Replaced full monthly table** with:
  - **重点月份 Top 6** card (sorted by capacity gap %, concise view)
  - **客户影响 Top 5** card (per-customer revenue at risk in M NTD)
  - **折叠明细** `<details>` section (expandable full monthly data)
- **Added severity alert**: when `shortageMonthCount.delta = 0` but `totalCapGap > 0`, shows warning explaining capacity gap & BU utilization increase
- Removed old "customers at risk" section and redundant info alert
- Amounts in M NTD throughout

### Root Cause Documentation
- BU model accuracy depends on realistic capacity/demand ratios
- 20% reduction doesn't create shortage when baseline util is <5%
- Severity metrics (totalCapGap) provide meaningful impact even when shortage count is 0

## Verification

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ |
| `npm test -- --run` | ✅ 64 files, 1550 tests |
| `npm run verify:release-baseline` | ✅ All checks passed (from v1.63.2, unchanged) |

## Files Changed

| File | Change |
|---|---|
| `frontend/src/pages/ScenarioPlanning.tsx` | deliveryRisk useMemo expanded, Tab 3 restructured |
| `frontend/src/App.tsx` | APP_VERSION v1.63.4 |
| `frontend/package.json` | version 1.63.4 |

## Version

`v1.63.3` → `v1.63.4`
