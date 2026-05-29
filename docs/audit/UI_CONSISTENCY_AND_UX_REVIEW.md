# UI Consistency and UX Review

**Date**: 2026-05-28
**Branch**: xiaomi/v1-41-ai-copilot-reliability-marathon
**Scope**: All 13 major pages in `frontend/src/pages/`
**Reviewer**: Agent 6 (UI Consistency and UX)

---

## UI System Elements Checklist

| # | Element | Description |
|---|---------|-------------|
| 1 | `.abf-page` | Root container class on every page |
| 2 | `PageHeader` | Title + description + optional actions |
| 3 | `ActionBar` | Standardized toolbar for Save/Discard etc. |
| 4 | `SectionCard` / `Card` | Consistent card wrappers for sections |
| 5 | Alert classes | `abf-alert-page`, `abf-alert-section` |
| 6 | `EmptyState` | Empty data placeholder |
| 7 | `UnitText` | Consistent unit label styling |
| 8 | `DataQualityBadge` / `DataQualityAlert` | DQ indicators |
| 9 | Inline style debt | Count of `style={{...}}` occurrences |
| 10 | `PageLoading` | Standard loading spinner |

---

## Page-by-Page Compliance Assessment

### 1. Dashboard.tsx

| Element | Status | Notes |
|---------|--------|-------|
| `.abf-page` | OK | Line 209 |
| `PageHeader` | MISSING | No page header; jumps straight into alerts and KPI cards |
| `ActionBar` | N/A | No save/discard actions needed |
| `SectionCard` | OK | Used for yearly health, BP, charts, insights |
| Alert classes | OK | `abf-alert-page` (line 210), `abf-alert-section` (lines 243, 247) |
| `EmptyState` | MISSING | Shows raw `<Card>` with inline styles for welcome state (line 247) |
| `UnitText` | MISSING | Units displayed inline without component |
| `DataQualityBadge/Alert` | PARTIAL | Uses inline `<Tag>` and `<Alert>` for DQ confidence, not `DataQualityAlert` component |
| Inline styles | 7 | Moderate; mostly layout |
| `PageLoading` | OK | Line 193 |
| `MetricCard` | OK | Used for all KPI cards |

**Issues**:
- P2: No `PageHeader` component -- inconsistent with ScenarioPlanning (the only page that uses it)
- P2: Welcome state card (line 247) uses hardcoded colors (`#e6f7ff`, `#91d5ff`) instead of theme tokens or CSS classes
- P2: DQ confidence display is custom inline rather than using `DataQualityAlert` component

---

### 2. Products.tsx

| Element | Status | Notes |
|---------|--------|-------|
| `.abf-page` | OK | Line 616 |
| `PageHeader` | MISSING | No page header |
| `ActionBar` | MISSING | Toolbar is a raw `<Card>` with inline layout (line 636) |
| `SectionCard` | MISSING | Uses raw `<Card>` throughout |
| Alert classes | OK | `abf-alert-page` (lines 617, 622) |
| `EmptyState` | MISSING | No empty state for zero SKUs |
| `UnitText` | MISSING | Units hardcoded in text |
| `DataQualityBadge/Alert` | OK | Both used (lines 496, 627-633) |
| Inline styles | 31 | HIGH -- extensive inline styling |
| `PageLoading` | MISSING | Uses `loading` prop on Table instead |

**Issues**:
- P1: Toolbar (line 636) should use `ActionBar` component instead of raw Card
- P1: 31 inline styles -- significant debt, especially in EditFormRow (lines 825-863)
- P2: No `PageHeader`
- P2: No `EmptyState` for zero SKUs
- P2: EditFormRow uses hardcoded `#f0f5ff` background (line 825)
- P2: Add form card uses hardcoded colors (line 682)

---

### 3. Forecasts.tsx

| Element | Status | Notes |
|---------|--------|-------|
| `.abf-page` | OK | Line 867 |
| `PageHeader` | MISSING | No page header |
| `ActionBar` | MISSING | Toolbar is a raw `<Card>` (line 918) |
| `SectionCard` | MISSING | No section cards used |
| Alert classes | OK | `abf-alert-page` (lines 868, 870) |
| `EmptyState` | MISSING | No empty state |
| `UnitText` | MISSING | Units hardcoded |
| `DataQualityBadge/Alert` | OK | Both used |
| Inline styles | 16 | Moderate |
| `PageLoading` | MISSING | Uses `loading` prop on Table |

**Issues**:
- P1: Toolbar should use `ActionBar` component
- P2: No `PageHeader`
- P2: No `EmptyState` for zero SKUs
- P2: Inline highlight colors hardcoded (`#1677ff`, `#e6f4ff`) in InputNumber styles (lines 739-740)

---

### 4. CapacityPlan.tsx

| Element | Status | Notes |
|---------|--------|-------|
| `.abf-page` | OK | Line 699 |
| `PageHeader` | MISSING | No page header |
| `ActionBar` | MISSING | Two toolbars as raw Cards (lines 726, 762) |
| `SectionCard` | MISSING | Uses raw `<Card>` throughout |
| Alert classes | OK | `abf-alert-page` (lines 700, 702) |
| `EmptyState` | MISSING | No empty state |
| `UnitText` | MISSING | Units in inline text |
| `DataQualityBadge/Alert` | OK | `DataQualityAlert` used |
| Inline styles | 34 | HIGHEST among all pages |
| `PageLoading` | MISSING | Uses `loading` prop on Table |

**Issues**:
- P1: 34 inline styles -- highest debt; total row uses hardcoded `#f0f5ff`, `#1890ff`, `#52c41a` colors (lines 568-575)
- P1: Two separate toolbar Cards should be consolidated into `ActionBar`
- P2: No `PageHeader`
- P2: Emoji characters used in labels (lines 500-501, 907-909, etc.) -- inconsistent with rest of app

---

### 5. BpTargets.tsx

| Element | Status | Notes |
|---------|--------|-------|
| `.abf-page` | OK | Line 335 |
| `PageHeader` | MISSING | No page header |
| `ActionBar` | OK | Line 357 -- uses ActionBar with info text |
| `SectionCard` | PARTIAL | Uses `className="abf-section"` on Card (line 377) |
| Alert classes | OK | `abf-alert-page` (line 343) |
| `EmptyState` | MISSING | No empty state |
| `UnitText` | OK | Line 357 |
| `DataQualityBadge/Alert` | OK | `DataQualityAlert` used |
| Inline styles | 7 | Low |
| `PageLoading` | OK | Line 331 |

**Issues**:
- P2: No `PageHeader`
- P2: Error state returns raw `<Alert>` with `style={{ margin: 16 }}` instead of `abf-alert-page` class (line 332)
- This is the **most compliant** page overall

---

### 6. Parameters.tsx

| Element | Status | Notes |
|---------|--------|-------|
| `.abf-page` | OK | Line 350 |
| `PageHeader` | MISSING | No page header |
| `ActionBar` | OK | Line 358 |
| `SectionCard` | PARTIAL | Uses `className="abf-section"` on Cards (lines 367, 377) |
| Alert classes | OK | `abf-alert-page` (lines 351, 354) |
| `EmptyState` | MISSING | Loading shows raw `<div>` with text (line 277) |
| `UnitText` | MISSING | Units hardcoded in form labels |
| `DataQualityBadge/Alert` | PARTIAL | Custom currency DQ alert (lines 496-524), not using DataQualityAlert |
| Inline styles | 24 | Moderate-high |
| `PageLoading` | MISSING | Uses raw `<div>{t('common.loading')}</div>` (line 277) |

**Issues**:
- P1: Loading state (line 277) uses raw div instead of `PageLoading` component
- P1: 24 inline styles; yearly rate section uses `display: 'flex'` layout with inline styles (line 587)
- P2: No `PageHeader`
- P2: Currency DQ alert is custom inline instead of using `DataQualityAlert` component

---

### 7. CalculationResults.tsx

| Element | Status | Notes |
|---------|--------|-------|
| `.abf-page` | OK | Line 793 |
| `PageHeader` | MISSING | No page header |
| `ActionBar` | MISSING | No ActionBar; uses raw `<div>` with flex for view selector (line 822) |
| `SectionCard` | MISSING | Uses raw `<Card>` with `bordered={false}` throughout |
| Alert classes | OK | `abf-alert-page` (line 794), `abf-alert-section` (line 1639) |
| `EmptyState` | MISSING | No empty state for zero model |
| `UnitText` | MISSING | Units hardcoded |
| `DataQualityBadge/Alert` | MISSING | No DQ indicators on this page |
| Inline styles | 97 | HIGHEST absolute count |
| `PageLoading` | OK | Line 789 |
| `MetricCard` | OK | Used for summary KPIs |

**Issues**:
- P0: 97 inline styles -- massive debt, primarily in risk brief view and change review sections
- P1: No `ActionBar`; view selector bar (line 822) is a raw div with inline flex
- P2: No `PageHeader`
- P2: No `DataQualityBadge/Alert` on results page (only page with data that lacks DQ indicators)
- P2: Many Cards use `bordered={false}` which is inconsistent with other pages

---

### 8. ScenarioPlanning.tsx

| Element | Status | Notes |
|---------|--------|-------|
| `.abf-page` | MISSING | Root `<div>` has no class (line 216) |
| `PageHeader` | OK | Line 217 -- the ONLY page using PageHeader |
| `ActionBar` | MISSING | Action buttons in raw `<div>` (line 263) |
| `SectionCard` | MISSING | Uses raw `<Card>` |
| Alert classes | MISSING | No alert classes used |
| `EmptyState` | MISSING | No empty state |
| `UnitText` | MISSING | Units hardcoded |
| `DataQualityBadge/Alert` | MISSING | No DQ indicators |
| Inline styles | 25 | Moderate-high |
| `PageLoading` | MISSING | Uses raw `<Spin>` in centered div (line 209) |
| `MetricCard` | OK | Used for comparison KPIs |

**Issues**:
- P0: Missing `.abf-page` container class -- breaks global page styling
- P1: Loading state (line 209) uses raw `<Spin>` in a styled div instead of `PageLoading`
- P1: No alert classes on any Alert components
- P1: No `DataQualityBadge/Alert` despite computing `baselineDq`
- P2: Action bar (line 263) should use `ActionBar` component

---

### 9. AiCopilot.tsx

| Element | Status | Notes |
|---------|--------|-------|
| `.abf-page` | MISSING | Uses inline `maxWidth: 800` centered div (line 92) |
| `PageHeader` | MISSING | Uses raw `<Title>` + `<Space>` (lines 93-96) |
| `ActionBar` | N/A | No save/discard actions |
| `SectionCard` | MISSING | No section cards |
| Alert classes | MISSING | No alert classes |
| `EmptyState` | MISSING | Uses raw `<Alert>` for no data (line 88) |
| `UnitText` | N/A | No units displayed |
| `DataQualityBadge/Alert` | MISSING | No DQ indicators |
| Inline styles | 5 | Low |
| `PageLoading` | MISSING | Uses raw `<Spin>` in centered div (line 77) |
| `MetricCard` | N/A | No metrics displayed |

**Issues**:
- P0: Missing `.abf-page` container class
- P1: Loading state uses raw `<Spin>` instead of `PageLoading`
- P1: No `PageHeader`; custom header with raw `<Title>` and icon
- P2: Error/no-data states use raw `<Alert>` without `abf-alert-page` class

---

### 10. DailyOperationsWorkbench.tsx

| Element | Status | Notes |
|---------|--------|-------|
| `.abf-page` | OK | Verified via grep |
| `PageHeader` | MISSING | No page header |
| `ActionBar` | MISSING | No ActionBar |
| `SectionCard` | OK | Used extensively |
| Alert classes | OK | `abf-alert-page` used |
| `EmptyState` | OK | Imported and used |
| `UnitText` | MISSING | Units hardcoded |
| `DataQualityBadge/Alert` | MISSING | No DQ indicators despite computing `dqSummary` |
| Inline styles | 57 | VERY HIGH |
| `PageLoading` | OK | Used |
| `MetricCard` | OK | Used for KPIs |

**Issues**:
- P0: 57 inline styles -- very high debt
- P2: No `PageHeader`
- P2: No `DataQualityBadge/Alert` despite having DQ summary data
- P2: No `UnitText` usage

---

### 11. ForecastsSpreadsheetLab.tsx

| Element | Status | Notes |
|---------|--------|-------|
| `.abf-page` | OK | Verified via grep |
| `PageHeader` | MISSING | No page header |
| `ActionBar` | MISSING | No ActionBar |
| `SectionCard` | MISSING | Uses raw `<Card>` |
| Alert classes | OK | `abf-alert-page` used |
| `EmptyState` | OK | Imported and used |
| `UnitText` | MISSING | Units hardcoded |
| `DataQualityBadge/Alert` | MISSING | No DQ indicators |
| Inline styles | 5 | Low |
| `PageLoading` | OK | Used |
| `ExperimentalBanner` | OK | Present |

**Issues**:
- P2: No `PageHeader`
- P2: No `DataQualityBadge/Alert`
- P2: No `UnitText`

---

### 12. ProductsSpreadsheetLab.tsx

| Element | Status | Notes |
|---------|--------|-------|
| `.abf-page` | OK | Verified via grep |
| `PageHeader` | MISSING | No page header |
| `ActionBar` | OK | Uses ActionBar component |
| `SectionCard` | MISSING | Uses raw `<Card>` |
| Alert classes | OK | `abf-alert-page` used |
| `EmptyState` | MISSING | No EmptyState |
| `UnitText` | MISSING | Units hardcoded |
| `DataQualityBadge/Alert` | MISSING | No DQ indicators |
| Inline styles | -- | Low |
| `PageLoading` | OK | Used |
| `ExperimentalBanner` | OK | Present |

**Issues**:
- P2: No `PageHeader`
- P2: No `EmptyState`
- P2: No `DataQualityBadge/Alert`

---

### 13. CapacitySpreadsheet.tsx

| Element | Status | Notes |
|---------|--------|-------|
| `.abf-page` | OK | Verified via grep |
| `PageHeader` | MISSING | No page header |
| `ActionBar` | MISSING | No ActionBar |
| `SectionCard` | MISSING | Uses raw `<Card>` |
| Alert classes | OK | `abf-alert-page` used |
| `EmptyState` | OK | Imported and used |
| `UnitText` | MISSING | Units hardcoded |
| `DataQualityBadge/Alert` | MISSING | No DQ indicators |
| Inline styles | 5 | Low |
| `PageLoading` | OK | Used |
| `ExperimentalBanner` | OK | Present |

**Issues**:
- P2: No `PageHeader`
- P2: No `DataQualityBadge/Alert`

---

## Summary Scorecard

| Page | abf-page | PageHeader | ActionBar | SectionCard | Alert cls | EmptyState | UnitText | DQ Badge | PageLoading | Score |
|------|----------|------------|-----------|-------------|-----------|------------|----------|----------|-------------|-------|
| Dashboard | OK | -- | N/A | OK | OK | -- | -- | partial | OK | 6/9 |
| Products | OK | -- | -- | -- | OK | -- | -- | OK | -- | 3/9 |
| Forecasts | OK | -- | -- | -- | OK | -- | -- | OK | -- | 3/9 |
| CapacityPlan | OK | -- | -- | -- | OK | -- | -- | OK | -- | 3/9 |
| BpTargets | OK | -- | OK | partial | OK | -- | OK | OK | OK | 7/9 |
| Parameters | OK | -- | OK | partial | OK | -- | -- | partial | -- | 4/9 |
| CalculationResults | OK | -- | -- | -- | OK | -- | -- | -- | OK | 3/9 |
| ScenarioPlanning | -- | OK | -- | -- | -- | -- | -- | -- | -- | 1/9 |
| AiCopilot | -- | -- | N/A | -- | -- | -- | N/A | -- | -- | 0/9 |
| DailyOpsWorkbench | OK | -- | -- | OK | OK | OK | -- | -- | OK | 5/9 |
| ForecastsSpreadsheetLab | OK | -- | -- | -- | OK | OK | -- | -- | OK | 4/9 |
| ProductsSpreadsheetLab | OK | -- | OK | -- | OK | -- | -- | -- | OK | 4/9 |
| CapacitySpreadsheet | OK | -- | -- | -- | OK | OK | -- | -- | OK | 4/9 |

---

## Cross-Cutting Issues

### P0 -- Critical Inconsistency (3 items)

1. **ScenarioPlanning and AiCopilot missing `.abf-page`**: These two pages lack the root container class, breaking global page padding/margin/typography rules defined in `index.css`.

2. **CalculationResults has 97 inline styles**: This is the largest page and carries the most style debt. Risk brief and change review sections are almost entirely inline-styled.

3. **DailyOperationsWorkbench has 57 inline styles**: Second highest debt; workbench sections use extensive inline layouts.

### P1 -- Significant Gaps (8 items)

1. **PageHeader used on only 1 of 13 pages**: Only ScenarioPlanning uses `PageHeader`. All other pages have no consistent title/description header.

2. **ActionBar used on only 3 of 13 pages**: BpTargets, Parameters, and ProductsSpreadsheetLab use `ActionBar`. Products, Forecasts, CapacityPlan, and CalculationResults use raw Card-based toolbars.

3. **Loading state inconsistency**: 7 pages use `PageLoading`, Parameters uses a raw div, ScenarioPlanning and AiCopilot use raw `<Spin>`, and Products/Forecasts/CapacityPlan rely on Table's `loading` prop.

4. **Products toolbar should be ActionBar**: The toolbar Card at line 636 is a textbook `ActionBar` use case.

5. **Forecasts toolbar should be ActionBar**: The toolbar Card at line 918 is a textbook `ActionBar` use case.

6. **CapacityPlan toolbars should be ActionBar**: Two separate toolbar Cards at lines 726 and 762.

7. **Parameters loading state**: Line 277 uses raw `<div>{t('common.loading')}</div>` instead of `PageLoading`.

8. **ScenarioPlanning loading state**: Line 209 uses raw `<Spin>` in a styled div.

### P2 -- Minor Gaps (12 items)

1. **No EmptyState on Products, Forecasts, CapacityPlan, CalculationResults, Parameters**: These pages show nothing or raw alerts when data is empty.

2. **No UnitText on 11 of 13 pages**: Only BpTargets uses `UnitText`. All other pages hardcode units in text.

3. **Hardcoded colors**: Welcome card (`#e6f7ff`), edit form (`#f0f5ff`), capacity total row (`#f0f5ff`, `#1890ff`, `#52c41a`) use raw hex instead of theme tokens.

4. **Emoji in CapacityPlan labels**: Lines 500-501, 907-909 use emoji characters (`📊`, `🔵`, `🟢`) which are inconsistent with the rest of the app.

5. **DQ indicators missing on CalculationResults**: The only data-heavy page without any DQ badges or alerts.

6. **DQ indicators missing on DailyOperationsWorkbench**: Computes `dqSummary` but does not display DQ indicators.

7. **SectionCard underused**: Only Dashboard and DailyOperationsWorkbench use `SectionCard`; others use raw `<Card>`.

8. **Card border inconsistency**: CalculationResults uses `bordered={false}` extensively; other pages use default bordered cards.

9. **Button order**: Primary action is generally leftmost (good), but some pages put Save before Add (Products) while others put Add before Save (CapacityPlan).

10. **BpTargets error state**: Line 332 returns raw `<Alert>` with inline margin instead of wrapping in `.abf-page` with `abf-alert-page` class.

11. **`abf-section` class used inconsistently**: Only Parameters and BpTargets use `className="abf-section"` on Cards; others use `section-card` (via SectionCard) or no class.

12. **Custom DQ displays**: Dashboard and Parameters build custom DQ alert UIs inline instead of using the `DataQualityAlert` component.

---

## Low-Risk Fixes That Can Be Applied

These are safe, non-breaking changes that improve consistency without altering business logic:

1. **Add `.abf-page` to ScenarioPlanning**: Change `<div>` to `<div className="abf-page">` at line 216.

2. **Add `.abf-page` to AiCopilot**: Change `<div style={{ maxWidth: 800... }}>` to `<div className="abf-page" style={{ maxWidth: 800... }}>` at line 92.

3. **Replace Parameters loading state**: Change `<div>{t('common.loading')}</div>` to `<PageLoading />` at line 277.

4. **Replace ScenarioPlanning loading state**: Replace raw `<Spin>` block (lines 208-212) with `<PageLoading />`.

5. **Replace AiCopilot loading state**: Replace raw `<Spin>` block (lines 76-80) with `<PageLoading />`.

6. **Add `abf-alert-page` to BpTargets error**: Change `<Alert ... style={{ margin: 16 }}>` to `<Alert ... className="abf-alert-page">` at line 332.

7. **Add `abf-alert-page` to ScenarioPlanning alerts**: Add `className="abf-alert-page"` to the info banner (line 223) and viewer guard (line 231).
