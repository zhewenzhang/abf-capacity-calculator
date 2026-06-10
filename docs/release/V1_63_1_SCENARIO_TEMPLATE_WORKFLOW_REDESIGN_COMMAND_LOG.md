# v1.63.1 Scenario Template Workflow Redesign — Command Log

## Summary

Redesigned the /scenario page with a tabbed layout (年度倍率調整、情境劇本、模擬結果) and enhanced scenario template parameters. Created reusable ScenarioTemplates component. Extended operational scenario engine with delay month/ratio support.

## Changes

### ScenarioPlanning.tsx
- Converted to tabbed layout using Ant Design Tabs:
  - Tab 1: Annual Multipliers (existing multiplier matrix + presets)
  - Tab 2: Scenario Templates (enhanced parameter editors)
  - Tab 3: Simulation Results (comprehensive display)
- Enhanced template scenario parameters:
  - BU Capacity Delay: Start month, delay duration, delay ratio
  - Major Customer Loss: Customer selector from SKU data
  - Forecast Surge: Target scope (all/customer/SKU), percentage
- Added displayComparison to switch between template and annual results
- Added customer/SKU impact display tables for template results
- Results tab shows: template description, annual impact, BP impact, capacity impact, customer/SKU impact
- Annual scenario now auto-switches to results tab on execution

### ScenarioTemplates.tsx (NEW)
- Reusable component for the three template scenario cards
- Props-driven parameter editors with Select and InputNumber
- Separate from main ScenarioPlanning page for cleaner code

### ScenarioResults.tsx (REMOVED)
- Was not needed; results rendered inline in ScenarioPlanning

### operationalScenario.ts
- Added `capacityDelayStartMonth` (YYYY-MM) and `capacityDelayRatio` (0-100) params
- Updated `runCapacityShiftScenario` to filter by start month and apply ratio reduction
- Capacity plans before start month are kept unchanged
- Ratio reduces capacity values before shifting

### i18n (en.ts, zhTW.ts)
- Added tab navigation keys (scenario.tab.*)
- Added enhanced template param keys (startMonth, delayRatio, selectCustomer, targetAll, etc.)
- Added results section keys (annualImpact, customerImpact, skuImpact, etc.)

### Other changes
- APP_VERSION updated to v1.63.1 in App.tsx and package.json
- Scenarios section removed from DailyOperationsWorkbench (now just navigation entry)

## Verification

| Test | Result |
|---|---|
| `tsc -b` | ✅ |
| `npm run build` | ✅ |
| `npm test -- --run` | ✅ 64 files, 1546 tests |
| `npm run verify:release-baseline` | ✅ All checks passed |

## Files Changed

| File | Change |
|---|---|
| `frontend/src/pages/ScenarioPlanning.tsx` | Tabbed layout, enhanced templates, comprehensive results |
| `frontend/src/pages/ScenarioTemplates.tsx` | NEW — template scenario component |
| `frontend/src/core/operationalScenario.ts` | Added capacityDelayStartMonth/Ratio params |
| `frontend/src/App.tsx` | APP_VERSION v1.63.1 |
| `frontend/package.json` | version 1.63.1 |
| `frontend/src/i18n/en.ts` | New i18n keys for tabs, params, results |
| `frontend/src/i18n/zhTW.ts` | New i18n keys for tabs, params, results |

## Version

`v1.63.0` → `v1.63.1`
