# v1.64 Graduated Customer Churn Scenario Template — Command Log

## Release Scope

Enhance `/scenario`'s "主要客户流失" (Customer Loss) template to be a fully functional graduated churn simulation tool.

## Changes

### Engine: operationalScenario.ts
- Added new params to `OperationalScenarioParams`:
  - `orderDisappearanceStartMonth?: string` — churn start month (YYYY-MM)
  - `orderDisappearanceMonths?: number` — churn duration in months
  - `orderDisappearanceRatio?: number` — % of forecast volume lost (0-100)
  - `orderDisappearanceScope?: 'all' | 'sku'` — scope: all SKUs or specific SKU
  - `orderDisappearanceSkuCode?: string` — specific SKU when scope === 'sku'
- Added `applyGraduatedChurn()` function:
  - Within `[startMonth, startMonth + months)`: reduces matching forecasts by `ratio%`
  - Before start month: unchanged (forecasts remain)
  - After churn window: unchanged (churn period ended)
  - Non-matching forecasts: always unchanged
- Modified `runOrderDisappearanceScenario()`:
  - Reads new churn params from `OperationalScenarioParams`
  - Builds effective filter with scope support
  - Calls `applyGraduatedChurn()` when churn params are provided
  - Falls back to legacy `removeMatchingForecasts()` when no churn window
  - Description includes churn parameters

### UI: ScenarioTemplates.tsx
- Enhanced "客户流失" card with 5 new controls:
  - **开始月份** (Start Month) — Select from available months
  - **流失比例** (Churn Ratio) — InputNumber 5–100%
  - **流失持续月数** (Duration) — InputNumber 1–24 months
  - **影响范围** (Scope) — Select: 全部产品 / 指定产品
  - **指定产品** (SKU Selector) — appears when scope is "sku"
- Added new props for churn state + handlers

### UI: ScenarioPlanning.tsx
- Added churn state variables: `churnStartMonth`, `churnMonths`, `churnRatio`, `churnScope`, `churnSkuCode`
- Updated `handleRunTemplateScenario` to pass all churn params to the engine
- Added `isChurnScenario` and `churnAnalysis` useMemo:
  - **Revenue impact** (M NTD): from totalRevenueUsd delta
  - **Revenue to compensate** (M NTD): absolute negative delta
  - **BP attainment delta**: change in BP attainment %
  - **BP gap**: baseline vs scenario BP gap
  - **Core/BU capacity released**: demand reduction from monthly summaries
  - **Annual impact data**: year-by-year revenue comparison
  - **Capacity release data**: year-by-year freed capacity
  - **Alternative order suggestions**: top unaffected customers by revenue
- Added churn results rendering with:
  - **KPI row**: 营收影响 / 需补回营收 / BP达成率变化 / BP差距
  - **Capacity released KPI sub-row**: Core 产能释放 / BU 产能释放
  - **Annual revenue impact chart** (BarChart): baseline vs scenario by year
  - **Capacity released chart** (BarChart): Core vs BU freed panels by year
  - **Annual impact table**: year-by-year detail with delta
  - **Alternative order suggestions**: unaffected customers table
- Added `TeamOutlined` icon import

### i18n
- Added 5 keys for churn template fields in both `en.ts` and `zhTW.ts`

## Constraints Followed
- ✅ No hardcoded mock data — all results based on real forecast/customer data
- ✅ Amounts in M NTD throughout
- ✅ Used existing recharts and antd components — no new library imports
- ✅ Graduated churn: partial reduction within window, not total removal
- ✅ Backward compatible: falls back to legacy behavior when churn params absent

## Verification

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 errors, 203 warnings (pre-existing + minor `any` types) |
| `npm run build` | ✅ Built in 760ms |
| `npm test -- --run` | ✅ 64 files, 1550 tests |
| `npm run verify:release-baseline` | ✅ ALL CHECKS PASSED |

## Files Changed

| File | Change |
|---|---|
| `frontend/src/core/operationalScenario.ts` | Added graduated churn params + `applyGraduatedChurn()` function; modified `runOrderDisappearanceScenario()` |
| `frontend/src/pages/ScenarioTemplates.tsx` | Added churn config UI (month, ratio, duration, scope, SKU) + new props |
| `frontend/src/pages/ScenarioPlanning.tsx` | Added churn state, handler, `churnAnalysis` useMemo, churn results rendering with KPI + charts + table + suggestions |
| `frontend/src/i18n/en.ts` | Added 5 churn template i18n keys |
| `frontend/src/i18n/zhTW.ts` | Added 5 churn template i18n keys |

## Version

`v1.63.5` → `v1.64` (new feature release)
