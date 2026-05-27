# V1.42.0 Daily Operations Workbench - Product Spec

> **Status**: Draft
> **Author**: Product Workflow Agent (Agent 1)
> **Date**: 2026-05-27
> **Route**: `/operations`
> **Sidebar Position**: After Dashboard (first item after overview)

---

## 1. Purpose and Problem Statement

### Current Pain Points

Today, a capacity planner starting their day must:

1. Open Dashboard to see high-level KPIs (but no actionable guidance).
2. Navigate to Products to check if SKU data is complete.
3. Navigate to Forecasts to verify monthly demand is entered.
4. Navigate to Capacity Plan to confirm factory configs exist.
5. Navigate to BP Targets to check revenue targets.
6. Navigate to Results to run calculations and see shortage months.
7. Navigate to Scenario Planning for what-if analysis.
8. Open AI Copilot to ask data quality questions.

This is **8 navigation steps** before the planner can answer the fundamental daily question: "Is my data healthy, what needs my attention today, and where are the risks?"

### Solution: Daily Operations Workbench

A single `/operations` page that serves as the daily entry point. It aggregates readiness status, abnormality alerts, forward-looking utilization, revenue-vs-target gaps, scenario presets, and copilot quick actions into one page. Users only navigate to individual pages when they need to fix something or drill into detail.

---

## 2. Page Layout

```
+------------------------------------------------------------------+
| PageHeader: "Daily Operations Workbench"                         |
| description: "Your daily entry point. Check readiness, fix       |
|               issues, and review risks in one place."            |
+------------------------------------------------------------------+
|                                                                  |
|  SECTION 1: Pipeline Readiness (6-stage horizontal stepper)      |
|  +--------+  +--------+  +--------+  +--------+  +--------+     |
|  | Stage1 |  | Stage2 |  | Stage3 |  | Stage4 |  | Stage5 |     |
|  | Ready  |->| Warning|->| Ready  |->| Blocked|->| Ready  | ... |
|  +--------+  +--------+  +--------+  +--------+  +--------+     |
|                                                                  |
|  SECTION 2: Abnormality Summary (card grid, grouped by domain)   |
|  +----------------------------+  +----------------------------+  |
|  | Products (2 errors)        |  | Forecast (1 warning)       |  |
|  +----------------------------+  +----------------------------+  |
|  +----------------------------+  +----------------------------+  |
|  | Capacity (1 error)         |  | BP (0 issues)              |  |
|  +----------------------------+  +----------------------------+  |
|                                                                  |
|  SECTION 3: Look-Ahead Focus (3/6/12 month toggle)              |
|  +----------------------------------------------------------+   |
|  | Month  | Core Util | BU Util | Shortage | Bottleneck     |   |
|  |--------|-----------|---------|----------|----------------|   |
|  | 2026-06|   92%     |   78%   |    0     | Core           |   |
|  | 2026-07|   88%     |   95%   |  1200    | BU             |   |
|  +----------------------------------------------------------+   |
|                                                                  |
|  SECTION 4: Revenue / BP Summary (side by side cards)           |
|  +---------------------------+  +---------------------------+   |
|  | Revenue Estimate          |  | BP Target                 |   |
|  | $12.4M USD                |  | 350M TWD                  |   |
|  | vs Target: 94.2%          |  | Gap: 20.4M TWD            |   |
|  +---------------------------+  +---------------------------+   |
|                                                                  |
|  SECTION 5: Scenario Shortcuts (5 preset buttons in a row)      |
|  +----------+ +----------+ +----------+ +----------+ +--------+ |
|  |Capacity  | |Capacity  | |Forecast  | |Forecast  | |Order   | |
|  |Delay     | |PullFwd   | |Increase  | |Decrease  | |Disapp. | |
|  +----------+ +----------+ +----------+ +----------+ +--------+ |
|                                                                  |
|  SECTION 6: Copilot Quick Actions (4 buttons)                   |
|  +----------------+ +----------------+ +----------------+ +----+|
|  |Why is data     | |What are the    | |Show me the     | |Fix ||
|  |quality low?    | |capacity risks? | |BP gaps?        | |now ||
|  +----------------+ +----------------+ +----------------+ +----+|
|                                                                  |
+------------------------------------------------------------------+
```

---

## 3. Section 1: Pipeline Readiness Stepper

### 3.1 Overview

A horizontal 6-stage stepper that shows the readiness status of each pipeline stage. Each stage is a clickable card that navigates to the relevant page when issues exist.

### 3.2 Stage Definitions

#### Stage 1: Products Ready

| Field | Value |
|---|---|
| **i18n Key** | `operations.stage.products` |
| **Icon** | `InboxOutlined` |
| **Navigation** | `/products` |
| **Data Source** | `getSKUs(scope)` |

**Status Logic**:

| Status | Condition | Color |
|---|---|---|
| `ready` | SKU count > 0 AND no `products` domain issues with severity `error` in `DataQualitySummary.issues` | Green (`#52c41a`) |
| `warning` | SKU count > 0 AND has `products` domain issues with severity `warning` but no `error` | Orange (`#faad14`) |
| `blocked` | SKU count > 0 AND has `products` domain issues with severity `error` | Red (`#ff4d4f`) |
| `notStarted` | SKU count === 0 | Gray (`#d9d9d9`) |

**CTA**: "Go to Products" button navigates to `/products`.

**Signals**:
- `skus.length === 0` -> notStarted
- Issues with `domain === 'products'` and `severity === 'error'` (e.g., `sku-missing-attr-*`, `sku-unsupported-currency-*`) -> blocked
- Issues with `domain === 'products'` and `severity === 'warning'` (e.g., `sku-zero-price-*`) -> warning

#### Stage 2: Forecast Ready

| Field | Value |
|---|---|
| **i18n Key** | `operations.stage.forecast` |
| **Icon** | `BarChartOutlined` |
| **Navigation** | `/forecasts` |
| **Data Source** | `getForecasts(scope)` |

**Status Logic**:

| Status | Condition | Color |
|---|---|---|
| `ready` | Forecast count > 0 AND no `forecast` domain issues with severity `error` | Green |
| `warning` | Forecast count > 0 AND has `forecast` domain issues with severity `warning` but no `error` (e.g., partial year, zero price) | Orange |
| `blocked` | Forecast count > 0 AND has `forecast` domain issues with severity `error` (e.g., orphan SKU references) | Red |
| `notStarted` | Forecast count === 0 | Gray |

**CTA**: "Go to Forecasts" button navigates to `/forecasts`.

**Signals**:
- `forecasts.length === 0` -> notStarted
- Issues with `domain === 'forecast'` and `severity === 'error'` (e.g., `forecast-orphan-sku-*`) -> blocked
- Issues with `domain === 'forecast'` and `severity === 'warning'` (e.g., `forecast-partial-year-*`, `forecast-zero-price-*`) -> warning

#### Stage 3: Capacity Matched

| Field | Value |
|---|---|
| **i18n Key** | `operations.stage.capacity` |
| **Icon** | `CloudOutlined` |
| **Navigation** | `/capacity` |
| **Data Source** | `getCapacityPlans(scope)` |

**Status Logic**:

| Status | Condition | Color |
|---|---|---|
| `ready` | Capacity plan count > 0 AND no `capacity` domain issues with severity `error` | Green |
| `warning` | Has `capacity` domain issues with severity `info` only (e.g., capacity without demand) | Orange |
| `blocked` | Has `capacity` domain issues with severity `error` (e.g., `forecast-missing-capacity`, `bu-demand-zero-capacity`) | Red |
| `notStarted` | Capacity plan count === 0 | Gray |

**CTA**: "Go to Capacity Plan" button navigates to `/capacity`.

**Signals**:
- `capacityPlans.length === 0` -> notStarted
- Issues with `domain === 'capacity'` and `severity === 'error'` -> blocked
- Issues with `domain === 'capacity'` and `severity === 'warning'` -> warning

#### Stage 4: BP Targets Ready

| Field | Value |
|---|---|
| **i18n Key** | `operations.stage.bpTargets` |
| **Icon** | `DollarOutlined` |
| **Navigation** | `/bp-targets` |
| **Data Source** | `params.bpTargets.yearlyRevenueTargetsMillionTwd` |

**Status Logic**:

| Status | Condition | Color |
|---|---|---|
| `ready` | At least one year has a BP target > 0 AND no `bp` domain issues with severity `error` | Green |
| `warning` | Has `bp` domain issues with severity `warning` (e.g., forecast exists without BP target, BP target exists without forecast) | Orange |
| `blocked` | No BP targets set for any year that has forecast data (all years with forecasts have missing/zero BP targets) | Red |
| `notStarted` | No BP targets configured at all (all values are 0 or undefined) | Gray |

**CTA**: "Go to BP Targets" button navigates to `/bp-targets`.

**Signals**:
- `Object.values(bpTargets).every(v => !v || v === 0)` -> notStarted
- Issues with `domain === 'bp'` and `severity === 'warning'` (e.g., `forecast-missing-bp-target-*`, `bp-target-zero-forecast-*`) -> warning
- All forecast years have missing BP targets -> blocked

#### Stage 5: Revenue Estimate Ready

| Field | Value |
|---|---|
| **i18n Key** | `operations.stage.revenueEstimate` |
| **Icon** | `CalculatorOutlined` |
| **Navigation** | `/results` |
| **Data Source** | Calculation results (run via `runCalculation`) |

**Status Logic**:

| Status | Condition | Color |
|---|---|---|
| `ready` | Calculation produces results AND `DataQualitySummary.confidence` is `high` or `medium` | Green |
| `warning` | Calculation produces results AND `DataQualitySummary.confidence` is `low` | Orange |
| `blocked` | `DataQualitySummary.confidence` is `blocked` (no data to calculate) | Red |
| `notStarted` | No calculation has been run (stages 1-3 are not all ready) | Gray |

**CTA**: "Go to Results" button navigates to `/results`.

**Signals**:
- Stages 1 (Products) and 2 (Forecast) are both `notStarted` -> notStarted
- `DataQualitySummary.confidence === 'blocked'` -> blocked
- Calculation runs but `confidence === 'low'` -> warning
- Calculation runs and `confidence` is `high` or `medium` -> ready

#### Stage 6: Scenario Review Ready

| Field | Value |
|---|---|
| **i18n Key** | `operations.stage.scenarioReview` |
| **Icon** | `ExperimentOutlined` |
| **Navigation** | `/scenario` |
| **Data Source** | Stages 1-5 readiness |

**Status Logic**:

| Status | Condition | Color |
|---|---|---|
| `ready` | Stage 5 (Revenue Estimate) is `ready` or `warning` (data is sufficient for scenario analysis) | Green |
| `warning` | Stage 5 is `blocked` but stages 1-3 have some data | Orange |
| `blocked` | Stage 5 is `blocked` AND data is insufficient | Red |
| `notStarted` | Stage 5 is `notStarted` | Gray |

**CTA**: "Go to Scenario Planning" button navigates to `/scenario`.

**Signals**:
- Stage 5 status `notStarted` -> notStarted
- Stage 5 status `blocked` -> blocked
- Stage 5 status `ready` or `warning` -> ready

### 3.3 Stepper Component Behavior

- Each stage renders as a card with icon, title, status badge, and optional CTA button.
- The stepper uses a horizontal layout with arrow connectors between stages.
- On narrow screens (< 768px), the stepper wraps into a 2-column grid.
- Clicking a stage card with status `blocked`, `warning`, or `notStarted` navigates to the relevant page.
- Clicking a stage card with status `ready` shows a brief "All clear" tooltip but does not navigate.
- The stepper recomputes on data load and on workspace scope change.

---

## 4. Section 2: Abnormality Summary

### 4.1 Overview

A card grid that shows the top data quality issues grouped by `DataQualityDomain`. Each domain card shows the count of issues by severity and the top issue details.

### 4.2 Domain Cards

The section renders one card per domain that has at least one issue with `severity !== 'info'`:

| Domain | Icon | Label (EN) | Label (zh-TW) |
|---|---|---|---|
| `products` | `InboxOutlined` | Products | 產品 |
| `forecast` | `BarChartOutlined` | Forecast | 預測 |
| `capacity` | `CloudOutlined` | Capacity | 產能 |
| `parameters` | `SettingOutlined` | Parameters | 參數 |
| `bp` | `DollarOutlined` | BP Targets | 營業目標 |
| `currency` | `DollarOutlined` | Currency | 幣別 |

### 4.3 Card Content

Each domain card displays:

1. **Header**: Domain icon + domain label + severity badge (error count / warning count).
2. **Top Issues**: Up to 3 issues from that domain, sorted by `decisionImpact` (high first), then `severity` (error first).
3. **Each issue row**: Severity indicator dot + localized title (from `titleMessage`) + "Fix" button.
4. **Footer**: "View all N issues" link that navigates to the relevant page for that domain.

### 4.4 Grouping Logic

```
const issuesByDomain = DataQualitySummary.issues
  .filter(i => i.severity !== 'info')
  .reduce((map, issue) => {
    if (!map[issue.domain]) map[issue.domain] = [];
    map[issue.domain].push(issue);
    return map;
  }, {});
```

Sort domains by: highest severity first (domains with errors before domains with warnings only), then by issue count descending.

### 4.5 Interaction

- "Fix" button on an issue row: Opens the `DataQualityGuidedFixModal` (existing component) for that specific issue.
- "View all" link: Navigates to the page associated with the domain:
  - `products` -> `/products`
  - `forecast` -> `/forecasts`
  - `capacity` -> `/capacity`
  - `parameters` -> `/parameters`
  - `bp` -> `/bp-targets`
  - `currency` -> `/parameters` (currency settings are on the Parameters page)

### 4.6 Empty State

If no issues exist (all domains clean), show a success message: "All data quality checks passed. Your data is ready for analysis." using the existing `EmptyState` component with a checkmark icon.

---

## 5. Section 3: Look-Ahead Focus Panel

### 5.1 Overview

A utilization table showing the upcoming months' capacity utilization, filtered to only show months that need attention (utilization > 85% or shortage > 0). Provides a time-range toggle for 3 / 6 / 12 months.

### 5.2 Time Range Toggle

Three toggle buttons: `3M`, `6M`, `12M`. Default: `6M`.

The toggle controls how many future months to scan. The table only shows months that meet the attention threshold, so the actual number of rows may be less than the toggle value.

### 5.3 Table Columns

| Column | Source | Format |
|---|---|---|
| Month | `monthlySummary.month` | `YYYY-MM` |
| Core Util. | `monthlySummary.coreUtilization` | Percentage (e.g., `92.3%`), color-coded: green < 80%, orange 80-90%, red > 90% |
| BU Util. | `monthlySummary.buUtilization` | Same color coding as Core |
| Core Shortage | `monthlySummary.coreShortage` | Integer panels, red if > 0, dash if 0 |
| BU Shortage | `monthlySummary.buShortage` | Same as Core Shortage |
| Bottleneck | `monthlySummary.bottleneck` | `Core` / `BU` / `None` |

### 5.4 Data Source

Uses the same `capacitySummary.monthlySummaries` data that the `buildLookAheadFocus` copilot tool uses. Filters to `month >= currentMonth` and applies the attention threshold:

```
(m.coreUtilization > 0.85) || (m.buUtilization > 0.85) || m.coreShortage > 0 || m.buShortage > 0
```

### 5.5 Empty State

If no months meet the attention threshold within the selected time range, show: "No capacity concerns in the next {N} months. All utilization levels are healthy."

### 5.6 Navigation

Clicking a month row navigates to `/results` with a scroll anchor to the monthly detail for that month (if supported), or to `/capacity` for that month's capacity config.

---

## 6. Section 4: Revenue / BP Summary

### 6.1 Overview

Two side-by-side `MetricCard` components showing the current revenue estimate and BP target comparison.

### 6.2 Revenue Estimate Card

| Field | Value |
|---|---|
| **Title** | `operations.revenue.title` ("Revenue Estimate") |
| **Primary Metric** | Total forecast revenue (USD), formatted with `formatCurrency()` |
| **Secondary Metric** | Total forecast PCS |
| **Delta** | Revenue change vs previous snapshot (if snapshots exist) |

### 6.3 BP Target Card

| Field | Value |
|---|---|
| **Title** | `operations.bp.title` ("BP Target") |
| **Primary Metric** | Current year BP target (million TWD) |
| **Secondary Metric** | Attainment percentage (from `bpAnalysis`) |
| **Gap** | Gap in million TWD, color-coded: green if >= 0, red if < 0 |
| **Status Badge** | `Met` / `Watch` / `Miss` from BP analysis |

### 6.4 Data Sources

- Revenue: `calculationResult.totalRevenueUsd` (from `runCalculation`)
- BP: `bpAnalysis.yearly[currentYear]` for current year's target, attainment, gap
- Currency: Uses `displayCurrency` preference from `AppPreferencesContext`

---

## 7. Section 5: Scenario Shortcut Panel

### 7.1 Overview

A row of 5 preset buttons that pre-configure the Scenario Planning page with common what-if scenarios. Clicking a preset navigates to `/scenario` with the multiplier values passed via URL query params or route state.

### 7.2 Preset Definitions

| Preset | i18n Key | Multiplier Values | Description |
|---|---|---|---|
| **Capacity Delay** | `operations.scenario.capacityDelay` | `coreCapacity: 0.9, buCapacity: 0.9` | Simulates a 10% capacity reduction (e.g., factory delay, maintenance shutdown) |
| **Capacity Pull Forward** | `operations.scenario.capacityPullForward` | `coreCapacity: 1.1, buCapacity: 1.1` | Simulates a 10% capacity increase (e.g., new line added early) |
| **Forecast Increase** | `operations.scenario.forecastIncrease` | `forecastVolume: 1.15` | Simulates a 15% demand increase (e.g., new customer win) |
| **Forecast Decrease** | `operations.scenario.forecastDecrease` | `forecastVolume: 0.85` | Simulates a 15% demand decrease (e.g., customer cancellation) |
| **Order Disappearance** | `operations.scenario.orderDisappearance` | `forecastVolume: 0.5` | Simulates a 50% demand drop (e.g., major order loss) |

All presets use `unitPrice: 1.0` (no price change) unless otherwise specified.

### 7.3 Implementation

Each preset button:
1. Encodes the multiplier values as URL search params: `/scenario?volume=0.85&price=1.0&core=1.0&bu=1.0`
2. The ScenarioPlanning page reads these params on mount and pre-populates the slider values.
3. The user must still click "Run Scenario" to execute (presets do not auto-run).

### 7.4 Button Design

Each button uses the `antd` `Button` component with:
- Icon: `ExperimentOutlined`
- Style: `default` (outlined) with a brief label
- Tooltip: Full description of what the preset simulates
- Disabled state: If stage 5 (Revenue Estimate) is not at least `warning`, disable all preset buttons and show tooltip: "Load data and run calculations first."

---

## 8. Section 6: Copilot Quick Actions

### 8.1 Overview

Four quick-action buttons that invoke specific AI Copilot tools and display the result inline (or navigate to the Copilot page with the tool pre-selected).

### 8.2 Quick Action Definitions

| Button | i18n Key | Tool ID | Description |
|---|---|---|---|
| **Data Quality** | `operations.copilot.dataQuality` | `dataProblems` | Calls `inspectDataQuality()` and shows the summary |
| **Capacity Risk** | `operations.copilot.capacityRisk` | `capacityRisk` | Calls `explainCapacityRisk()` and shows the summary |
| **BP Gap** | `operations.copilot.bpGap` | `bpGap` | Calls `explainBpGap()` and shows the summary |
| **Fix Suggestions** | `operations.copilot.fixSuggestions` | `suggestFixes` | Calls `suggestDataFixes()` and shows recommendations |

### 8.3 Behavior

**Option A (Inline Expansion)**: Clicking a button expands a results panel below the button row, showing the `CopilotToolResult` in the same structured format used by the AI Copilot page (facts, assumptions, inferences, recommendations, caveats).

**Option B (Navigate to Copilot)**: Clicking a button navigates to `/copilot` with the tool pre-selected via URL param: `/copilot?tool=dataProblems`. The Copilot page auto-runs the tool on mount.

**Recommended**: Option A (inline expansion) for a cohesive single-page experience. The expanded panel includes a "Open in Copilot" link for users who want the full interactive experience.

### 8.4 Result Panel Design

When expanded, the result panel uses the same structure as `CopilotMessage.tsx`:
- Confidence badge (high/medium/low/blocked)
- Summary text
- Collapsible sections for: Facts, Assumptions, Inferences, Recommendations, Caveats
- Source references link

---

## 9. Data Loading Strategy

### 9.1 Single Load on Mount

The workbench page loads all required data in a single `Promise.all` on mount, following the same pattern as `Dashboard.tsx`:

```
const [skus, forecasts, capacityPlans, params] = await Promise.all([
  getSKUs(scope),
  getForecasts(scope),
  getCapacityPlans(scope),
  getParameters(scope),
]);
```

### 9.2 Derived Computations

After loading, compute:
1. `DataQualitySummary` via `buildDataQualitySummary({ skus, forecasts, capacityPlans, params })`
2. Stage statuses from the summary + raw data counts
3. `AnalyticsModel` via `buildAnalyticsModel(...)` for utilization data
4. `BpAnalysisModel` via `buildBpAnalysis(...)` for BP attainment
5. `CalculationResult` via `runCalculation(...)` for revenue estimate

### 9.3 Refresh on Scope Change

When the workspace scope changes (detected via `scope.workspaceId` or `scope.role`), reload all data.

### 9.4 Loading State

Show `PageLoading` component during initial load (same pattern as Dashboard).

---

## 10. i18n Keys

### 10.1 English (en.ts)

```
// Operations Workbench
'menu.operations': 'Operations',
'operations.title': 'Daily Operations Workbench',
'operations.description': 'Your daily entry point. Check readiness, fix issues, and review risks in one place.',

// Pipeline Stages
'operations.stage.products': 'Products Ready',
'operations.stage.forecast': 'Forecast Ready',
'operations.stage.capacity': 'Capacity Matched',
'operations.stage.bpTargets': 'BP Targets Ready',
'operations.stage.revenueEstimate': 'Revenue Estimate Ready',
'operations.stage.scenarioReview': 'Scenario Review Ready',
'operations.stage.status.ready': 'Ready',
'operations.stage.status.warning': 'Warning',
'operations.stage.status.blocked': 'Blocked',
'operations.stage.status.notStarted': 'Not Started',
'operations.stage.cta': 'Go to {page}',

// Abnormality Summary
'operations.abnormality.title': 'Abnormality Summary',
'operations.abnormality.noIssues': 'All data quality checks passed. Your data is ready for analysis.',
'operations.abnormality.viewAll': 'View all {count} issues',
'operations.abnormality.fix': 'Fix',

// Look-Ahead Focus
'operations.lookAhead.title': 'Look-Ahead Focus',
'operations.lookAhead.months3': '3M',
'operations.lookAhead.months6': '6M',
'operations.lookAhead.months12': '12M',
'operations.lookAhead.noConcerns': 'No capacity concerns in the next {months} months. All utilization levels are healthy.',
'operations.lookAhead.month': 'Month',
'operations.lookAhead.coreUtil': 'Core Util.',
'operations.lookAhead.buUtil': 'BU Util.',
'operations.lookAhead.coreShortage': 'Core Shortage',
'operations.lookAhead.buShortage': 'BU Shortage',
'operations.lookAhead.bottleneck': 'Bottleneck',

// Revenue / BP Summary
'operations.revenue.title': 'Revenue Estimate',
'operations.revenue.forecastPcs': 'Forecast PCS',
'operations.bp.title': 'BP Target',
'operations.bp.attainment': 'Attainment',
'operations.bp.gap': 'Gap',

// Scenario Shortcuts
'operations.scenario.title': 'Scenario Shortcuts',
'operations.scenario.capacityDelay': 'Capacity Delay',
'operations.scenario.capacityDelayDesc': 'Simulate 10% capacity reduction (factory delay)',
'operations.scenario.capacityPullForward': 'Capacity Pull Forward',
'operations.scenario.capacityPullForwardDesc': 'Simulate 10% capacity increase (new line early)',
'operations.scenario.forecastIncrease': 'Forecast Increase',
'operations.scenario.forecastIncreaseDesc': 'Simulate 15% demand increase (new customer)',
'operations.scenario.forecastDecrease': 'Forecast Decrease',
'operations.scenario.forecastDecreaseDesc': 'Simulate 15% demand decrease (customer cut)',
'operations.scenario.orderDisappearance': 'Order Disappearance',
'operations.scenario.orderDisappearanceDesc': 'Simulate 50% demand drop (major order loss)',
'operations.scenario.disabled': 'Load data and run calculations first.',

// Copilot Quick Actions
'operations.copilot.title': 'Copilot Quick Actions',
'operations.copilot.dataQuality': 'Data Quality',
'operations.copilot.capacityRisk': 'Capacity Risk',
'operations.copilot.bpGap': 'BP Gap',
'operations.copilot.fixSuggestions': 'Fix Suggestions',
'operations.copilot.openInCopilot': 'Open in Copilot',
'operations.copilot.noData': 'Load data first to use copilot actions.',
```

### 10.2 Traditional Chinese (zhTW.ts)

```
// Operations Workbench
'menu.operations': '營運工作台',
'operations.title': '每日營運工作台',
'operations.description': '您的每日入口。一站式檢查就緒狀態、修正問題、檢視風險。',
'operations.stage.products': '產品就緒',
'operations.stage.forecast': '預測就緒',
'operations.stage.capacity': '產能匹配',
'operations.stage.bpTargets': 'BP 目標就緒',
'operations.stage.revenueEstimate': '營收預估就緒',
'operations.stage.scenarioReview': '情境檢視就緒',
'operations.stage.status.ready': '就緒',
'operations.stage.status.warning': '警告',
'operations.stage.status.blocked': '阻斷',
'operations.stage.status.notStarted': '未開始',
'operations.stage.cta': '前往{page}',
'operations.abnormality.title': '異常摘要',
'operations.abnormality.noIssues': '所有資料品質檢查通過，資料已準備好進行分析。',
'operations.abnormality.viewAll': '檢視全部 {count} 個問題',
'operations.abnormality.fix': '修正',
'operations.lookAhead.title': '前瞻焦點',
'operations.lookAhead.months3': '3 個月',
'operations.lookAhead.months6': '6 個月',
'operations.lookAhead.months12': '12 個月',
'operations.lookAhead.noConcerns': '未來 {months} 個月內無產能疑慮，所有稼動率均正常。',
'operations.lookAhead.month': '月份',
'operations.lookAhead.coreUtil': 'Core 稼動率',
'operations.lookAhead.buUtil': 'BU 稼動率',
'operations.lookAhead.coreShortage': 'Core 短缺',
'operations.lookAhead.buShortage': 'BU 短缺',
'operations.lookAhead.bottleneck': '瓶頸',
'operations.revenue.title': '營收預估',
'operations.revenue.forecastPcs': '預測 PCS',
'operations.bp.title': 'BP 目標',
'operations.bp.attainment': '達成率',
'operations.bp.gap': '差距',
'operations.scenario.title': '情境快捷',
'operations.scenario.capacityDelay': '產能延遲',
'operations.scenario.capacityDelayDesc': '模擬產能減少 10%（工廠延遲）',
'operations.scenario.capacityPullForward': '產能提前',
'operations.scenario.capacityPullForwardDesc': '模擬產能增加 10%（新產線提前）',
'operations.scenario.forecastIncrease': '預測增加',
'operations.scenario.forecastIncreaseDesc': '模擬需求增加 15%（新客戶）',
'operations.scenario.forecastDecrease': '預測減少',
'operations.scenario.forecastDecreaseDesc': '模擬需求減少 15%（客戶削減）',
'operations.scenario.orderDisappearance': '訂單消失',
'operations.scenario.orderDisappearanceDesc': '模擬需求下降 50%（重大訂單流失）',
'operations.scenario.disabled': '請先載入資料並執行計算。',
'operations.copilot.title': 'Copilot 快捷操作',
'operations.copilot.dataQuality': '資料品質',
'operations.copilot.capacityRisk': '產能風險',
'operations.copilot.bpGap': 'BP 差距',
'operations.copilot.fixSuggestions': '修復建議',
'operations.copilot.openInCopilot': '在 Copilot 中開啟',
'operations.copilot.noData': '請先載入資料以使用 Copilot 功能。',
```

---

## 11. Routing and Navigation

### 11.1 Route Registration

Add to `App.tsx` routes:

```tsx
<Route path="/operations" element={<OperationsWorkbench key={routeKey} scope={scope} />} />
```

### 11.2 Sidebar Menu

Add to sidebar menu items array (position: after Dashboard, before Products):

```tsx
{ key: 'operations', icon: <DashboardOutlined />, label: t('menu.operations') },
```

Use a distinct icon. Suggest `ScheduleOutlined` or `CalendarOutlined` to differentiate from the existing `DashboardOutlined`.

### 11.3 Lazy Import

```tsx
const OperationsWorkbench = lazy(() => import('./pages/OperationsWorkbench'));
```

---

## 12. Component Architecture

### 12.1 New Files

| File | Purpose |
|---|---|
| `frontend/src/pages/OperationsWorkbench.tsx` | Main page component |
| `frontend/src/components/operations/PipelineStepper.tsx` | 6-stage readiness stepper |
| `frontend/src/components/operations/AbnormalitySummary.tsx` | Domain-grouped issue cards |
| `frontend/src/components/operations/LookAheadPanel.tsx` | Utilization table with time toggle |
| `frontend/src/components/operations/RevenueBpSummary.tsx` | Revenue + BP metric cards |
| `frontend/src/components/operations/ScenarioShortcuts.tsx` | 5 preset scenario buttons |
| `frontend/src/components/operations/CopilotQuickActions.tsx` | 4 copilot action buttons |

### 12.2 Reused Existing Components

| Component | Usage |
|---|---|
| `PageHeader` | Page title and description |
| `MetricCard` | Revenue/BP summary cards |
| `SectionCard` | Section wrappers |
| `DataQualityAlert` | Inline DQ alerts within abnormality cards |
| `DataQualityGuidedFixModal` | Fix modal for issue remediation |
| `EmptyState` | Empty state for clean data |
| `PageLoading` | Loading spinner |
| `StatusTag` | Status badges on stepper stages |

### 12.3 Reused Core Modules

| Module | Usage |
|---|---|
| `buildDataQualitySummary` | Compute DQ issues for all sections |
| `buildAnalyticsModel` / `getDashboardHighlights` | Utilization data for look-ahead |
| `buildBpAnalysis` / `computeBpKpi` | BP attainment for revenue/BP summary |
| `runCalculation` | Revenue estimate |
| `inspectDataQuality`, `explainCapacityRisk`, `explainBpGap`, `suggestDataFixes` | Copilot quick actions |
| `formatCurrency`, `formatCurrencyShort`, `formatPercent`, `formatNumber` | Number formatting |
| `normalizeCurrencySettings` | Currency normalization |

---

## 13. Responsive Behavior

| Breakpoint | Layout |
|---|---|
| >= 1200px (lg) | Full layout: 6-stage stepper horizontal, 2-column abnormality grid, side-by-side revenue/BP cards |
| 992-1199px (md) | Stepper wraps to 3x2 grid, abnormality grid remains 2-column |
| 768-991px (sm) | Stepper 2x3 grid, abnormality single column, revenue/BP stacked |
| < 768px (xs) | All sections single column, stepper vertical |

---

## 14. Accessibility

- All stepper stages have `aria-label` describing the stage name and status.
- Scenario preset buttons have `aria-describedby` linking to tooltip descriptions.
- Look-ahead table uses proper `<table>` semantics with `<th>` headers.
- Color-coded statuses always include a text label alongside the color (not color-only).
- Copilot result panels use `role="region"` with `aria-label`.

---

## 15. Performance Considerations

- The page loads data via a single `Promise.all` (4 calls) on mount.
- Calculation and BP analysis are computed client-side after data loads (same as existing Results page).
- Copilot tool results are computed on-demand (button click), not on initial load.
- The look-ahead table filters client-side; no additional data fetching.
- Stepper status computation is O(issues.length) -- negligible.
- Target: First meaningful paint < 2 seconds on broadband.

---

## 16. Edge Cases

| Scenario | Behavior |
|---|---|
| No data loaded at all (skus=0, forecasts=0) | All stages show `notStarted`. Abnormality section shows "No Data Loaded" info message. Look-ahead is empty. Revenue/BP show dashes. Scenario buttons disabled. Copilot buttons show "Load data first." |
| Data loaded but DQ confidence is `blocked` | Stages 1-3 may show `ready` if data exists without errors. Stage 5 shows `blocked`. Scenario buttons disabled. |
| Viewer role | All "Fix" buttons are hidden. CTA buttons still navigate (viewing is allowed). Scenario presets still navigate. Copilot fix suggestions tool shows viewer-blocked message. |
| All stages `ready` | Stepper shows all green. Abnormality section shows success message. Look-ahead may still show concern months (high utilization is not a DQ issue). |
| Workspace scope change | All data reloads. Stepper and all sections recompute. |

---

## 17. Future Enhancements (Out of Scope for v1.42)

- **Custom presets**: Allow users to save their own scenario presets.
- **Drill-down modals**: Click a stepper stage to see a detail modal instead of navigating away.
- **Auto-refresh**: Periodic re-computation of stage statuses (e.g., every 5 minutes).
- **Email/Slack alerts**: Push notifications when a stage transitions from `ready` to `blocked`.
- **Historical trend**: Show how stage statuses have changed over time.
- **Drag-and-drop ordering**: Let users reorder sections on the workbench.

---

## 18. Acceptance Criteria

### 18.1 Functional

- [ ] `/operations` route renders the workbench page.
- [ ] Sidebar shows "Operations" menu item with correct icon.
- [ ] Pipeline stepper shows 6 stages with correct status based on data state.
- [ ] Clicking a non-ready stage navigates to the correct page.
- [ ] Abnormality summary groups issues by domain and shows top 3 per domain.
- [ ] "Fix" button opens the DataQualityGuidedFixModal for the selected issue.
- [ ] Look-ahead panel shows months with > 85% utilization or shortage.
- [ ] Time toggle (3M/6M/12M) changes the look-ahead window.
- [ ] Revenue card shows total forecast revenue in display currency.
- [ ] BP card shows current year target, attainment, and gap.
- [ ] Scenario preset buttons encode correct multiplier values in URL params.
- [ ] Scenario Planning page reads and applies URL param multipliers on mount.
- [ ] Copilot quick action buttons invoke the correct tool and show inline results.
- [ ] i18n: All strings have both EN and zh-TW translations.
- [ ] Viewer role: Fix buttons hidden, CTA navigation still works.
- [ ] Empty data state: All sections show appropriate empty states.

### 18.2 Non-Functional

- [ ] Page loads within 2 seconds on broadband.
- [ ] Responsive layout works on all breakpoints (xs/sm/md/lg).
- [ ] No console errors or warnings.
- [ ] All ARIA labels present for accessibility.
- [ ] Existing pages unaffected (no regressions).
