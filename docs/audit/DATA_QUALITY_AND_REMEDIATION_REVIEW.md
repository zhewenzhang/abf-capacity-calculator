# Data Quality Visibility (v1.35) and Remediation (v1.36) Review

**Review Date**: 2026-05-28
**Branch**: `xiaomi/v1-41-ai-copilot-reliability-marathon`
**Reviewer**: Agent 9 -- Data Quality and Remediation Agent

---

## Scope

This review covers:
- **v1.35**: Data Quality Visibility -- detection engine, badge/alert UI components, page-level integration
- **v1.36**: Data Quality Remediation -- Quick Fix Drawer, Guided Fix Modal, Navigation Fix, BP/Parameters inline fixes

---

## 1. Component-by-Component Assessment

### 1.1 Core Engine: `frontend/src/core/dataQuality.ts`

**Verdict: PASS**

- `buildDataQualitySummary()` produces a comprehensive `DataQualitySummary` with `status`, `confidence`, `confidenceScore`, and `issues[]`.
- Covers 7 domains: `products`, `forecast`, `capacity`, `parameters`, `bp`, `currency`, `analytics`.
- Issue taxonomy is well-structured with 18 distinct issue ID patterns:
  - Products: `sku-missing-attr-*`, `sku-zero-price-*`, `sku-unsupported-currency-*`
  - Forecast: `forecast-orphan-sku-*`, `forecast-zero-price-*`, `forecast-partial-year-*`
  - Capacity: `forecast-missing-capacity`, `capacity-without-forecast`, `bu-demand-zero-capacity`
  - Currency: `missing-constant-twd-rate`, `missing-yearly-twd-rate`, `missing-constant-cny-rate`, `missing-yearly-cny-rate`
  - BP: `bp-target-zero-forecast-*`, `forecast-missing-bp-target-*`, `bp-target-evenly-allocated`
  - Parameters: `fixed-working-days`
  - Analytics: `no-data-blocked`
- `enrichWithImpact()` assigns deterministic `decisionImpact` (high/medium/low) based on ID patterns.
- Confidence score calculation: 100 - (high * 25) - (medium * 5), thresholds at 40 (error) and 80 (warning).
- Each issue includes localized `titleMessage` and `detailMessage` fields.

**Findings**:

| # | Severity | Finding |
|---|----------|---------|
| 1 | P2 | `bp-target-evenly-allocated` and `fixed-working-days` are always emitted as info issues even when no actual data exists. These appear on every summary call, adding noise. Consider gating them behind a check for non-empty data. |
| 2 | P2 | The `evidence` field on `sku-missing-attr-*` issues stores `missingCount` but not the actual missing attribute names as a machine-readable string. The `detail` string has them, but `getFieldsWithIssues()` in `DataQualityQuickFixDrawer.tsx` (line 88) tries to parse `evidence?.missingAttrs` which is never set by the engine. This means the Quick Fix Drawer cannot programmatically determine which fields to highlight. |

### 1.2 DataQualityBadge: `frontend/src/components/common/DataQualityBadge.tsx`

**Verdict: PASS**

- Correctly maps severity to icons:
  - `error` -> `ExclamationCircleOutlined` (red `#ff4d4f`)
  - `warning` -> `WarningOutlined` (amber `#faad14`)
  - `info` -> `InfoCircleOutlined` (blue `#1677ff`)
- Supports `variant='dot'` mode with colored circles.
- `DataQualityBadgeList` aggregates multiple issues, shows highest severity, caps at `maxVisible=3` with "+N more" in tooltip.
- Uses `useI18n()` for translated detail messages.

**Findings**: None.

### 1.3 DataQualityAlert: `frontend/src/components/common/DataQualityAlert.tsx`

**Verdict: PASS**

- Renders Ant Design `Alert` with correct type based on highest severity.
- Supports `severityFilter` to show only specific severity levels.
- Supports `maxIssues` to limit displayed issues (default 5).
- Supports `compact` mode for inline display.
- `DataQualityIndicator` provides a compact inline counter with tooltip.

**Findings**: None.

### 1.4 Quick Fix Drawer: `frontend/src/components/common/DataQualityQuickFixDrawer.tsx`

**Verdict: PASS with issues**

- Renders a right-side `Drawer` for editing SKU attributes.
- Shows fields with DQ issues highlighted with `WarningOutlined` icon.
- Validates input using dedicated validators from `dataQualityRemediation.ts`.
- Calculates UPP from chip dimensions on save.
- Blocks Viewer role (shows warning alert, disables form).
- Calls `saveSKU()` API on confirm.
- Calls `onSuccess(updatedSku)` callback for local state update.

**Findings**:

| # | Severity | Finding |
|---|----------|---------|
| 3 | P1 | `getFieldsWithIssues()` (line 82-105) reads `issue.evidence?.missingAttrs` as a string, but the engine never sets this field. The engine sets `evidence: { skuCode, missingCount }`. As a result, fields with missing attributes will NOT be highlighted in the drawer -- the `fieldsWithIssues` set will be empty for `sku-missing-attr-*` issues. Only `unitPrice` (from `sku-zero-price-*`) and `unitPriceCurrency` (from `sku-unsupported-currency-*`) will be correctly flagged. |
| 4 | P2 | The drawer does not show which specific attributes are missing in the issue summary. The `issuesFound` alert shows the translated `detailMessage` which mentions the attrs, but the form fields themselves are not visually differentiated for `sku-missing-attr-*` issues due to finding #3. |

### 1.5 Guided Fix Modal: `frontend/src/components/common/DataQualityGuidedFixModal.tsx`

**Verdict: PASS**

- Renders a `Modal` for orphan forecast remediation.
- Shows clear issue explanation with SKU ID and month tags.
- Explains impact (revenue, attributes, confidence).
- Provides two remediation paths:
  1. "Create SKU in Products" (navigates to `/products?createSku={skuId}`)
  2. "Edit Forecast Reference" (calls `onEditForecast` callback)
- Marks first option as "Recommended" with blue tag.
- Blocks Viewer role (shows warning, disables clickable cards).
- Footer note: "This modal provides guidance only. No automatic changes will be made."

**Findings**:

| # | Severity | Finding |
|---|----------|---------|
| 5 | P1 | "Create SKU in Products" navigates to `/products?createSku={skuId}`, but `Products.tsx` does not read or handle the `createSku` URL parameter. The parameter is parsed by `parseRemediationFocusParams()` but `Products.tsx` never calls it. The user navigates to Products but no pre-filled add form appears. |
| 6 | P2 | "Edit Forecast Reference" calls `onEditForecast` which shows `message.info(t('remediation.orphanForecast.editForecastHint'))` -- a text hint only. This is acceptable for MVP but provides no concrete action (no inline edit capability for orphan forecasts). |

### 1.6 Navigation Fix: URL focus params in CapacityPlan.tsx

**Verdict: PASS**

- `parseRemediationFocusParams()` extracts `focusMonth`, `focusField`, `createSku` from URL search params.
- `applyRemediationHighlight()` scrolls to element, adds CSS class `remind-flash`, removes after 3 seconds.
- Capacity page reads `focusParams.focusMonth` and shows an info alert: "Focus: {month}".
- Uses `document.querySelector('[data-month="..."]')` and `document.querySelector('[data-month-cell="..."]')` to find target elements.

**Findings**:

| # | Severity | Finding |
|---|----------|---------|
| 7 | P1 | The `data-month` and `data-month-cell` attributes are NOT present on any elements in the Capacity grid. The column headers render Ant Design `Table` column titles with `<div>` elements that have no `data-month` attribute. The `document.querySelector` calls will always return null, so the scroll/highlight effect never fires. The focus hint alert still shows, but the actual visual focus is lost. |
| 8 | P2 | `focusField` parameter is supported but no code in CapacityPlan.tsx generates element IDs matching `capacity-{month}-{field}`. The `getCapacityFieldId()` utility in `dataQualityRemediation.ts` exists but is never called. |

### 1.7 BP Targets Fix: `frontend/src/pages/BpTargets.tsx`

**Verdict: PASS**

- Builds DQ summary and filters for `bp` domain issues.
- Maps year -> DQ issue for cell-level indicators using `findIssueByYear()`.
- For `forecast-missing-bp-target` issues, shows a `Popover` with:
  - Input for BP target value (Million TWD)
  - "Confirm Fix" and "Cancel" buttons
  - Validates value >= 0
  - Saves via `saveParameters()` API
  - Reloads data after save
- For other DQ issues (read-only), shows `WarningOutlined` with tooltip.
- Viewer gate: `handleQuickFixOpen` returns early if `!writable`, popover disabled state.

**Findings**:

| # | Severity | Finding |
|---|----------|---------|
| 9 | P2 | The `severityFilter` for the `DataQualityAlert` is `['warning']` only. BP issues like `bp-target-zero-forecast-*` are warnings, but if any error-severity BP issues were added in the future, they would be silently filtered out. Minor risk. |

### 1.8 Parameters Fix: `frontend/src/pages/Parameters.tsx`

**Verdict: PASS**

- Builds DQ summary and filters for `currency` domain issues.
- Separates TWD and CNY missing rate issues.
- For missing exchange rates, shows:
  - A `Popover` on the currency settings card title with `ExclamationCircleOutlined` icon
  - Separate `InputNumber` fields for TWD and CNY rates
  - "Confirm Fix" buttons for each
  - Validates rates > 0
  - Saves via `saveParameters()` API
  - Reloads data after save
- An inline `Alert` with "Fix Now" link that opens the same popover.
- Viewer gate: popover only rendered when `writable`, tooltip-only when not writable.

**Findings**: None.

---

## 2. Integration Completeness

### 2.1 Products.tsx

| Check | Status | Notes |
|-------|--------|-------|
| DQ summary built | PASS | Uses all 4 data sources (SKUs, forecasts, capacity, params) |
| DQ alert shown | PASS | Filters to `products` domain, shows errors+warnings |
| SKU row badges | PASS | Per-row `DataQualityBadge` in SKU Code column |
| Price cell badges | PASS | Zero-price and unsupported-currency badges in Unit Price column |
| Quick Fix Drawer | PASS | Opens on badge click, blocked for viewers |
| Local state update | PASS | `handleQuickFixSuccess` updates SKU in local state |

### 2.2 Forecasts.tsx

| Check | Status | Notes |
|-------|--------|-------|
| DQ summary built | PASS | Uses all 4 data sources |
| DQ alert shown | PASS | Filters to `forecast` domain, excludes orphan issues (shown separately) |
| Orphan alert | PASS | Separate `Alert` with per-issue "Fix Now" buttons |
| SKU row badges | PASS | Per-row `DataQualityBadge` in SKU Code column |
| Guided Fix Modal | PASS | Opens on "Fix Now" click, blocked for viewers |
| Local state update | PASS | `loadData()` called after fix |

### 2.3 CapacityPlan.tsx

| Check | Status | Notes |
|-------|--------|-------|
| DQ summary built | PASS | Uses all 4 data sources (with partial params) |
| DQ alert shown | PASS | Filters to `capacity` domain |
| Focus hint | PARTIAL | Alert shows, but scroll/highlight does not work (see finding #7) |
| Navigation fix | FAIL | `data-month` attributes missing from DOM |

### 2.4 BpTargets.tsx

| Check | Status | Notes |
|-------|--------|-------|
| DQ summary built | PASS | Uses skus, forecasts, params |
| DQ alert shown | PASS | Filters to `bp` domain, warnings only |
| Cell indicators | PASS | `WarningOutlined` per year column with tooltip |
| Quick Fix popover | PASS | For `forecast-missing-bp-target`, inline edit with save |
| Viewer gate | PASS | Popover disabled, click handler returns early |

### 2.5 Parameters.tsx

| Check | Status | Notes |
|-------|--------|-------|
| DQ summary built | PASS | Uses all 4 data sources |
| Currency issues shown | PASS | Inline `Alert` + card title icon |
| Quick Fix popover | PASS | For TWD/CNY missing rates, inline edit with save |
| Viewer gate | PASS | Popover only rendered for writers |

---

## 3. Gap Analysis

### 3.1 Viewer Gate Assessment

| Location | Fix Action | Gate | Status |
|----------|-----------|------|--------|
| Products.tsx | Quick Fix Drawer | `if (!writable) return` in `handleQuickFixClick` | PASS |
| Products.tsx | Quick Fix Drawer save | `disabled={!writable}` on save button | PASS |
| Forecasts.tsx | Guided Fix Modal | `if (!writable) return` in `handleOrphanFixClick` | PASS |
| Forecasts.tsx | Guided Fix option click | `if (!writable) return` in `handleOptionClick` | PASS |
| BpTargets.tsx | Quick Fix Popover | `if (!writable) return` in `handleQuickFixOpen` | PASS |
| BpTargets.tsx | Quick Fix save | `if (!writable) return` in `handleQuickFixSave` | PASS |
| Parameters.tsx | Exchange Rate Popover | Popover only rendered when `writable` | PASS |
| Parameters.tsx | Exchange Rate save | N/A (form disabled for viewers via general page gate) | PASS |
| CapacityPlan.tsx | Save All | `disabled={!writable}` on save button | PASS |

**Verdict: All viewer gates are functional.**

### 3.2 Silent Auto-Fix Assessment

**Verdict: No silent auto-fixes found.**

All remediation actions require explicit user interaction:
- Quick Fix Drawer: User must click "Confirm Fix"
- Quick Fix Popovers (BP, Parameters): User must click "Confirm Fix"
- Guided Fix Modal: User must click a remediation option card
- Navigation Fix: Only scrolls/highlights, no data modification

### 3.3 Fix Refresh Assessment

| Fix Action | Refresh Mechanism | Status |
|-----------|-------------------|--------|
| SKU Quick Fix | `onSuccess(updatedSku)` -> local state update | PASS |
| BP Target Quick Fix | `loadData()` called after save | PASS |
| Exchange Rate Quick Fix | `loadParams()` called after save | PASS |
| Orphan Guided Fix (create SKU) | Navigate to Products (full page reload) | PASS |
| Orphan Guided Fix (edit forecast) | `message.info()` only (no data change) | N/A |

### 3.4 DQ Taxonomy Gap Assessment

| # | Gap | Severity | Description |
|---|-----|----------|-------------|
| 10 | P2 | No check for duplicate SKU codes | If two SKUs share the same `skuCode`, forecasts may reference the wrong one. |
| 11 | P2 | No check for negative forecast values | `forecastPcs < 0` is not detected as a DQ issue. |
| 12 | P2 | No check for negative capacity values | `corePanelPerDay < 0` or `buPanelPerDay < 0` are not detected. |
| 13 | P2 | No check for extreme outlier values | A forecast of 999,999,999 pcs or a unit price of $999,999 would not be flagged. |
| 14 | P2 | No check for stale data | If forecasts are 2+ years old with no updates, no staleness warning. |
| 15 | P2 | No check for inconsistent currency across forecasts for same SKU | If SKU is USD but some forecasts use TWD, no cross-reference check. |
| 16 | P2 | No check for working days validity | `defaultWorkingDays > 31` or `defaultWorkingDays < 1` is not flagged. |
| 17 | P2 | No check for yield matrix completeness | If yield matrix has 0 values for active SKU size/layer combos, no warning. |

---

## 4. Summary of Findings by Priority

### P0 (Critical -- blocks functionality)

None.

### P1 (High -- significant UX/functionality gap)

| # | Location | Finding |
|---|----------|---------|
| 3 | `DataQualityQuickFixDrawer.tsx` | `getFieldsWithIssues()` reads `evidence?.missingAttrs` which is never set by the engine. Fields with missing SKU attributes are not highlighted in the Quick Fix drawer. |
| 5 | `DataQualityGuidedFixModal.tsx` | "Create SKU in Products" navigates with `?createSku={skuId}` but `Products.tsx` never reads this param, so no pre-filled form appears. |
| 7 | `CapacityPlan.tsx` | `data-month` and `data-month-cell` DOM attributes are not rendered, so `applyRemediationHighlight()` cannot find target elements. Navigation Fix scroll/highlight is non-functional. |

### P2 (Medium -- improvement opportunities)

| # | Location | Finding |
|---|----------|---------|
| 1 | `dataQuality.ts` | `bp-target-evenly-allocated` and `fixed-working-days` info issues always emitted, adding noise. |
| 2 | `dataQuality.ts` | `evidence.missingAttrs` not set for `sku-missing-attr-*` issues; only `missingCount` is stored. |
| 4 | `DataQualityQuickFixDrawer.tsx` | No visual differentiation for which specific attributes are missing in the form. |
| 6 | `DataQualityGuidedFixModal.tsx` | "Edit Forecast Reference" only shows a text hint, no concrete inline action. |
| 8 | `CapacityPlan.tsx` | `focusField` param supported but no element IDs generated for it. |
| 9 | `BpTargets.tsx` | `severityFilter` for BP alert is `['warning']` only, excluding potential future error issues. |
| 10-17 | `dataQuality.ts` | DQ taxonomy gaps: no duplicate SKU code check, no negative value checks, no outlier detection, no staleness check, no cross-currency consistency check, no working days validity check, no yield matrix completeness check. |

---

## 5. Recommendations

### Immediate (before v1.36 release)

1. **Fix finding #3**: Either (a) add `missingAttrs` to the `evidence` object in `dataQuality.ts` for `sku-missing-attr-*` issues, or (b) update `getFieldsWithIssues()` in the drawer to parse the `detailMessage` string or use a different mechanism to identify missing fields.

2. **Fix finding #7**: Add `data-month={month}` attributes to the Capacity grid column headers and `data-month-cell={month}` attributes to the total row cells in `CapacityPlan.tsx`.

3. **Fix finding #5**: Either implement `createSku` param handling in `Products.tsx` (auto-open add form with pre-filled SKU ID), or change the Guided Fix Modal to use a different approach (e.g., copy SKU ID to clipboard with instructions).

### Short-term (v1.37)

4. Add `missingAttrs` string array to the `evidence` field for `sku-missing-attr-*` issues in `dataQuality.ts`.

5. Add `data-month` / `data-month-cell` attributes to Capacity grid rendering.

6. Implement `focusField` support in CapacityPlan.tsx using `getCapacityFieldId()`.

### Medium-term (v1.38+)

7. Extend DQ taxonomy with negative value checks, outlier detection, and cross-reference consistency checks.

8. Add a global DQ summary dashboard accessible from the app header, aggregating all domain issues.

---

## Appendix: Files Reviewed

| File | Lines | Role |
|------|-------|------|
| `frontend/src/core/dataQuality.ts` | 493 | Core DQ detection engine |
| `frontend/src/core/dataQualityVisibility.ts` | 179 | Domain filtering and lookup helpers |
| `frontend/src/core/dataQualityRemediation.ts` | 428 | Remediation types, validation, URL utilities |
| `frontend/src/components/common/DataQualityBadge.tsx` | 123 | Inline badge component |
| `frontend/src/components/common/DataQualityAlert.tsx` | 115 | Page-level alert component |
| `frontend/src/components/common/DataQualityQuickFixDrawer.tsx` | 417 | SKU Quick Fix drawer |
| `frontend/src/components/common/DataQualityGuidedFixModal.tsx` | 233 | Orphan Forecast guided fix modal |
| `frontend/src/components/common/index.ts` | 15 | Component exports |
| `frontend/src/pages/Products.tsx` | 864 | Products page with DQ integration |
| `frontend/src/pages/Forecasts.tsx` | 1139 | Forecasts page with DQ integration |
| `frontend/src/pages/CapacityPlan.tsx` | 1054 | Capacity Plan page with DQ integration |
| `frontend/src/pages/BpTargets.tsx` | 394 | BP Targets page with DQ integration |
| `frontend/src/pages/Parameters.tsx` | 636 | Parameters page with DQ integration |
| `frontend/src/core/dataQuality.test.ts` | 201 | Unit tests for DQ engine |
| `frontend/src/i18n/en.ts` | ~1040 | English i18n (DQ + remediation keys) |
| `frontend/src/i18n/zhTW.ts` | ~1048 | Traditional Chinese i18n (DQ + remediation keys) |
