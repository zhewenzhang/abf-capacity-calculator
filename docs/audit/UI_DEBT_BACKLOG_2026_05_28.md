# UI Debt Backlog

**Date**: 2026-05-28
**Branch**: xiaomi/v1-41-ai-copilot-reliability-marathon
**Source**: UI Consistency and UX Review (same date)

---

## Debt Summary

| Priority | Count | Total Estimated Effort |
|----------|-------|----------------------|
| P0 | 3 | 4-6 hours |
| P1 | 8 | 6-10 hours |
| P2 | 12 | 8-14 hours |
| **Total** | **23** | **18-30 hours** |

---

## P0 -- Critical Inconsistency

### DEBT-001: Missing `.abf-page` on ScenarioPlanning and AiCopilot

**Pages affected**: ScenarioPlanning.tsx, AiCopilot.tsx
**Impact**: Breaks global page padding, margin, and typography rules defined in `index.css`. These pages will render with different spacing than all other pages.
**Fix**: Add `className="abf-page"` to the root `<div>` of each page.
**Effort**: 5 minutes
**Risk**: None -- purely additive CSS class

### DEBT-002: CalculationResults inline style debt (97 occurrences)

**File**: CalculationResults.tsx
**Impact**: Makes the page hard to maintain, inconsistent spacing, no theme token usage. Risk brief and change review sections are almost entirely inline-styled.
**Fix**: Extract inline styles to CSS classes in a co-located `.css` or `.module.css` file. Prioritize repeated patterns (flex layouts, color values, margins).
**Effort**: 3-4 hours
**Risk**: Low -- visual regression testing needed

### DEBT-003: DailyOperationsWorkbench inline style debt (57 occurrences)

**File**: DailyOperationsWorkbench.tsx
**Impact**: Same as DEBT-002 but for the workbench page.
**Fix**: Extract inline styles to CSS classes.
**Effort**: 2-3 hours
**Risk**: Low

---

## P1 -- Significant Gaps

### DEBT-004: PageHeader adoption across all pages

**Pages affected**: 12 of 13 (only ScenarioPlanning uses it)
**Impact**: No consistent page title/description header. Each page renders its title differently (or not at all).
**Fix**: Add `<PageHeader title={t('...')} description={t('...')} />` to each page's render method, inside the `.abf-page` container.
**Effort**: 1-2 hours (mostly i18n key additions)
**Risk**: Low -- additive change, does not affect layout of existing content

### DEBT-005: ActionBar adoption for toolbar pages

**Pages affected**: Products, Forecasts, CapacityPlan, CalculationResults
**Impact**: These pages use raw `<Card>` with `<Row>/<Col>` for toolbars, which produces inconsistent spacing and styling compared to pages using `ActionBar`.
**Fix**: Replace toolbar `<Card>` blocks with `<ActionBar>` component. Move buttons and controls into ActionBar children.
**Effort**: 2-3 hours
**Risk**: Low-Medium -- layout may shift slightly; needs visual check

### DEBT-006: Loading state standardization

**Pages affected**: Parameters (raw div), ScenarioPlanning (raw Spin), AiCopilot (raw Spin), Products/Forecasts/CapacityPlan (Table loading prop)
**Impact**: Inconsistent loading experience. Some pages show centered spinner, others show table skeleton, one shows plain text.
**Fix**: Use `<PageLoading />` for initial page loads. Table-level loading can remain as-is (it serves a different purpose).
**Effort**: 30 minutes
**Risk**: None

### DEBT-007: Products toolbar -> ActionBar migration

**File**: Products.tsx, line 636
**Impact**: Toolbar Card has inline layout that should use ActionBar for consistency.
**Fix**: Wrap toolbar buttons in `<ActionBar>` component.
**Effort**: 20 minutes
**Risk**: Low

### DEBT-008: Forecasts toolbar -> ActionBar migration

**File**: Forecasts.tsx, line 918
**Impact**: Same as DEBT-007.
**Fix**: Wrap toolbar buttons in `<ActionBar>` component.
**Effort**: 20 minutes
**Risk**: Low

### DEBT-009: CapacityPlan toolbars -> ActionBar migration

**File**: CapacityPlan.tsx, lines 726 and 762
**Impact**: Two separate toolbar Cards should be consolidated.
**Fix**: Merge into a single `<ActionBar>` with grouped controls.
**Effort**: 30 minutes
**Risk**: Low

### DEBT-010: Parameters loading state fix

**File**: Parameters.tsx, line 277
**Impact**: Shows plain text "Loading..." instead of standard spinner.
**Fix**: Replace `<div>{t('common.loading')}</div>` with `<PageLoading />`.
**Effort**: 2 minutes
**Risk**: None

### DEBT-011: ScenarioPlanning loading state fix

**File**: ScenarioPlanning.tsx, lines 208-212
**Impact**: Uses raw `<Spin>` in a manually centered div.
**Fix**: Replace with `<PageLoading />`.
**Effort**: 2 minutes
**Risk**: None

---

## P2 -- Minor Gaps

### DEBT-012: EmptyState adoption for data-empty pages

**Pages affected**: Products, Forecasts, CapacityPlan, CalculationResults, Parameters
**Impact**: These pages show nothing or raw alerts when data is empty. Inconsistent with DailyOpsWorkbench and spreadsheet labs which use `EmptyState`.
**Fix**: Add `<EmptyState>` component when data arrays are empty.
**Effort**: 1 hour
**Risk**: None

### DEBT-013: UnitText adoption

**Pages affected**: 11 of 13 (only BpTargets uses it)
**Impact**: Units are hardcoded in text strings. If unit formatting changes, every page needs manual updates.
**Fix**: Replace inline unit text with `<UnitText>` component where appropriate.
**Effort**: 1-2 hours
**Risk**: None

### DEBT-014: Hardcoded color values

**Locations**:
- Dashboard welcome card: `#e6f7ff`, `#91d5ff`
- Products edit form: `#f0f5ff`
- Products add form: `#f0f5ff`, `#91d5ff`
- CapacityPlan total row: `#f0f5ff`, `#1890ff`, `#52c41a`
- Forecasts edit highlight: `#1677ff`, `#e6f4ff`

**Impact**: Colors won't update if theme changes. Some colors may not meet contrast requirements.
**Fix**: Replace with Ant Design theme tokens (`token.colorPrimaryBg`, `token.colorSuccess`, etc.) or CSS custom properties.
**Effort**: 1-2 hours
**Risk**: Low -- visual changes possible

### DEBT-015: Emoji in CapacityPlan labels

**File**: CapacityPlan.tsx
**Locations**: Lines 500-501 (`📊`), 907-909 (`🔵`, `🟢`, `📊`), 829-831 (`✏️`, `🗑️`)
**Impact**: Inconsistent with rest of app which uses Ant Design icons.
**Fix**: Replace emoji with `<AntDesignIcon />` components.
**Effort**: 15 minutes
**Risk**: None

### DEBT-016: DQ indicators on CalculationResults

**File**: CalculationResults.tsx
**Impact**: The primary analysis page has no data quality indicators, unlike Products/Forecasts/CapacityPlan/BpTargets.
**Fix**: Add `DataQualityAlert` or `DataQualityBadge` for summary-level DQ status.
**Effort**: 30 minutes
**Risk**: None

### DEBT-017: DQ indicators on DailyOperationsWorkbench

**File**: DailyOperationsWorkbench.tsx
**Impact**: Computes `dqSummary` but does not display DQ indicators.
**Fix**: Add `DataQualityAlert` at page level.
**Effort**: 20 minutes
**Risk**: None

### DEBT-018: SectionCard underuse

**Pages affected**: Products, Forecasts, CapacityPlan, CalculationResults, Parameters
**Impact**: These pages use raw `<Card>` instead of `SectionCard`, resulting in inconsistent margins and styling.
**Fix**: Replace `<Card>` with `<SectionCard>` where appropriate (section-level cards, not toolbar cards).
**Effort**: 1-2 hours
**Risk**: Low -- margin changes may affect layout

### DEBT-019: Card border inconsistency

**File**: CalculationResults.tsx
**Impact**: Uses `bordered={false}` on most Cards, while other pages use default bordered Cards.
**Fix**: Standardize on one approach across all pages.
**Effort**: 30 minutes
**Risk**: Low

### DEBT-020: Button order standardization

**Impact**: Some pages put primary action first (good), but order varies (Save/Add vs Add/Save).
**Fix**: Establish convention (primary action rightmost or leftmost) and apply consistently.
**Effort**: 30 minutes
**Risk**: None

### DEBT-021: BpTargets error state class

**File**: BpTargets.tsx, line 332
**Impact**: Error `<Alert>` uses inline `style={{ margin: 16 }}` instead of `className="abf-alert-page"`.
**Fix**: Add `className="abf-alert-page"` and remove inline style.
**Effort**: 2 minutes
**Risk**: None

### DEBT-022: `abf-section` vs `section-card` class inconsistency

**Impact**: Parameters and BpTargets use `className="abf-section"` on Cards. SectionCard uses `className="section-card"`. These may have different CSS rules.
**Fix**: Standardize on one class name and update all usages.
**Effort**: 15 minutes
**Risk**: Low

### DEBT-023: Custom DQ displays vs DataQualityAlert component

**Files**: Dashboard.tsx, Parameters.tsx
**Impact**: These pages build custom DQ alert UIs inline instead of using the reusable `DataQualityAlert` component.
**Fix**: Refactor to use `DataQualityAlert` where the custom UI does not add significant value.
**Effort**: 30 minutes
**Risk**: Low

---

## Priority Recommendations

### Quick Wins (< 30 min each, no risk)
- DEBT-001: Add `.abf-page` class (5 min)
- DEBT-006: Loading state standardization (30 min)
- DEBT-010: Parameters loading fix (2 min)
- DEBT-011: ScenarioPlanning loading fix (2 min)
- DEBT-015: Replace emoji with icons (15 min)
- DEBT-021: BpTargets error class (2 min)
- DEBT-022: Class name standardization (15 min)

**Total quick wins**: ~1 hour 15 minutes

### Medium Effort (1-3 hours each, low risk)
- DEBT-004: PageHeader adoption (1-2 hours)
- DEBT-005: ActionBar adoption (2-3 hours)
- DEBT-007/008/009: Individual toolbar migrations (1 hour total)
- DEBT-012: EmptyState adoption (1 hour)
- DEBT-013: UnitText adoption (1-2 hours)
- DEBT-014: Hardcoded color cleanup (1-2 hours)
- DEBT-018: SectionCard adoption (1-2 hours)

### Large Effort (3+ hours each)
- DEBT-002: CalculationResults inline style extraction (3-4 hours)
- DEBT-003: DailyOperationsWorkbench inline style extraction (2-3 hours)

---

## Suggested Sprint Plan

**Sprint 1 (Quick Wins -- 1.5 hours)**:
DEBT-001, DEBT-006, DEBT-010, DEBT-011, DEBT-015, DEBT-021, DEBT-022

**Sprint 2 (Component Adoption -- 4 hours)**:
DEBT-004, DEBT-007, DEBT-008, DEBT-009, DEBT-012, DEBT-016, DEBT-017

**Sprint 3 (Consistency -- 4 hours)**:
DEBT-005, DEBT-013, DEBT-014, DEBT-018, DEBT-019, DEBT-020, DEBT-023

**Sprint 4 (Style Debt -- 6 hours)**:
DEBT-002, DEBT-003
