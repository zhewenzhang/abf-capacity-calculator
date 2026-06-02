# V1.55.X Orphan Forecast Remediation — Command Log

## Baseline

- **Baseline commit**: `9f6d441dceac6afe0ff01a992da0f658114dabec`
- **Branch**: `xiaomi/v1-55-x-orphan-forecast-remediation`

## Anti-Regression Checklist

| Check | Status |
|-------|--------|
| Based on latest main | ✅ `9f6d441` |
| ABF CSS brand | ✅ Found (2 occurrences) |
| v1.52.0 residue | ✅ None |
| Topbar (PRIMARY_NAV) | ✅ Present (5 matches) |
| BP page (buildBpSheetRows) | ✅ Present |
| Scenario (annualMultipliers) | ✅ Present (5 matches) |
| Pipeline Readiness (twk-readiness-grid) | ✅ Present |
| No Issues Summary block | ✅ Confirmed |
| firestore.rules | ✅ Not modified |
| calculationEngine.ts | ✅ Not modified |

## Changes

### 1. `frontend/src/core/dataQuality.ts`
Enhanced orphan forecast evidence with more data:
- Added `forecastId`, `forecastPcs`, `unitPrice`, `unitPriceCurrency` to evidence object

### 2. `frontend/src/pages/Forecasts.tsx`
Replaced simple bullet list with rich mini-table showing:
- SKU ID (truncated with tag)
- Month
- Quantity (forecastPcs)
- Price (unitPrice + currency)
- Per-row "Fix Now" button

### 3. `frontend/src/components/common/DataQualityGuidedFixModal.tsx`
Enhanced issue explanation section:
- Added mini-table showing affected forecasts (month, quantity, price)
- Updated prop type to include `unitPrice`

### 4. `frontend/src/i18n/en.ts` and `zhTW.ts`
Added new keys:
- `forecasts.quantity` — "Quantity" / "數量"
- `forecasts.price` — "Price" / "單價"

## Remediation Options

The existing Guided Fix Modal provides 3 remediation paths:
1. **Create SKU** — navigates to Products page with SKU ID pre-filled
2. **Clean Orphan Forecasts** — deletes all forecasts for missing SKU (with Popconfirm)
3. **Rebind to Existing SKU** — transfers forecasts to selected existing SKU

## test / lint / build

| Check | Result |
|-------|--------|
| `npm run lint -- --quiet` | ✅ 0 errors |
| `npm run build` | ✅ Success |
| `npm run test -- --run` | ✅ 61/61 files, 1520/1520 tests |
