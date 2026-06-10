# v1.63.3 Scenario Capacity Delay Analysis Redesign — Command Log

## Root Cause

**Problem**: BU Capacity Delay template results showed blank/incomplete analysis — Revenue KPI showed "—" because `kpi` is computed from `comparison` (annual scenario), not from template data. The seasonal data flow prevented template results from appearing in KPI cards.

## Redesign: Delivery Risk Exposure Analysis

Replaced the ineffective revenue KPI card with a comprehensive **交付风险暴露 (Delivery Risk Exposure)** analysis that shows meaningful metrics for capacity-driven scenarios:

### What Changed

**Tab 3 Results (ScenarioPlanning.tsx):**
- Removed the Revenue KPI card (always "—" for template scenarios, since revenue is forecast-based)
- Added **交付风险暴露** card with:
  1. **KPI row**: Shortage delta (Δ shortage months), Max BU utilization, Revenue-at-Risk
  2. **Monthly capacity gap table**: Per-month comparison of baseline vs scenario BU capacity, BU utilization, and shortage changes
  3. **Customer risk exposure table**: Which customers are affected, how many products, revenue-at-risk in M NTD
  4. **Info note** explaining the methodology (revenue-at-risk = forecast revenue in shortage months, not actual loss confirmation)

**New deliveryRisk useMemo:**
- Computes monthly capacity gaps from `ScenarioComparison.baseline.calcResult.monthlySummaries`
- Identifies months with increased shortage
- Computes revenue-at-risk (USD → M NTD via `convertFromUsd`)
- Tracks customer-level risk exposure by cross-referencing skuResults with SKU customer data

### Key Metrics Shown
| Metric | Description | Source |
|---|---|---|
| 短缺变化 | Δ shortage month count | `deltas.shortageMonthCount` |
| BU 利用率 | Scenario max BU utilization | `deltas.maxBuUtilization` |
| 风险营收暴露 | Revenue from shortage months (M NTD) | Custom computation |
| 产能缺口 | Per-month capacity gap table | Monthly summaries comparison |
| 客户风险 | Per-customer revenue at risk | SKU cross-reference |

## Verification

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ |
| `npm test -- --run` | ✅ 64 files, 1550 tests |
| `npm run verify:release-baseline` | ✅ All checks passed |

## Files Changed

| File | Change |
|---|---|
| `frontend/src/pages/ScenarioPlanning.tsx` | Added deliveryRisk useMemo, redesigned Tab 3 results |
| `frontend/src/core/operationalScenario.test.ts` | Added delivery risk non-empty + BU util change test |
| `frontend/src/App.tsx` | APP_VERSION v1.63.3 |
| `frontend/package.json` | version 1.63.3 |

## Version

`v1.63.2` → `v1.63.3`
