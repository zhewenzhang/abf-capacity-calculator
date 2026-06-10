# v1.63.2 Scenario Capacity Delay Logic Fix — Command Log

## Root Cause Analysis

**Problem**: BU Capacity Delay template results showed all zeros.

**Root cause analysis**:

1. `runCapacityShiftScenario` was **shifting capacity plans forward by N months** (e.g., 2026-01 → 2026-04). This created months with ZERO capacity plans, but the core issue was that shifted plans falling outside the forecast range were **dropped entirely**.

2. Revenue is calculated from **forecasts** (`forecastPcs × unitPrice`), NOT from capacity constraints. So even if capacity is zero, revenue stays the same → `totalRevenueUsd.delta = 0`.

3. The KPI cards in Tab 3 were computed from `comparison` (annual scenario), not from `displayComparison` which could be template results. So template results never showed in the KPI cards — they showed "—" or stale annual data.

## Fix Applied

### 1. Engine Fix (operationalScenario.ts)
- **Removed plan-shifting logic** — Instead of moving capacity plans to future months (creating gaps + dropping out-of-range entries), plans now stay in their original months
- **Applied ratio reduction during the delay window** — `delayRatio%` reduction is applied to capacity only during `[startMonth, startMonth + shiftMonths)` window
- Plans before the window are unchanged, after the window return to normal (simulating delayed capacity arriving late)
- Removed `shiftCapacityPlans()` function (no longer needed)
- Results now correctly show: **increased shortage months**, **higher BU/Core utilization**, while revenue remains forecast-based

### 2. Display Fix (ScenarioPlanning.tsx)
- Fixed KPI cards to use data from `displayComparison` (which correctly picks template or annual results)
- Replaced customer/SKU revenue impact tables (always $0 for capacity scenarios) with **Capacity & Shortage Impact** summary showing:
  - Shortage month count delta
  - Max BU utilization change  
  - Max Core utilization change
  - Info alert explaining revenue is forecast-based, not capacity-constrained
- Added `displayTemplateScenarioDeltas` for template-specific delta metrics
- Removed unused variables/imports (bpChartData, utilChartData, tableRows, formatNumber, etc.)

### 3. Tests
- **Updated** capacity delay test to expect non-zero shortage/utilization impact with `delayRatio`
- **Added**: test without start month (applies to all capacity)
- **Added**: test without ratio (null op — no impact)
- **Added**: test with start month (correctly limits delay window)
- **Updated** DailyOperationsWorkbench test for `capacityShiftTarget` regression (no longer throws)

## Verification

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ |
| `npm test -- --run` | ✅ 64 files, 1549 tests |
| `npm run verify:release-baseline` | ✅ All checks passed |

## Files Changed

| File | Change |
|---|---|
| `frontend/src/core/operationalScenario.ts` | Plan-stay-in-place logic, removed shiftCapacityPlans |
| `frontend/src/pages/ScenarioPlanning.tsx` | Tab 3 capacity impact display, kpi fix, cleanup |
| `frontend/src/core/operationalScenario.test.ts` | New BU delay tests + updated existing |
| `frontend/src/pages/DailyOperationsWorkbench.test.tsx` | Updated capacityShiftTarget tests |

## Version

`v1.63.1` → `v1.63.2`
