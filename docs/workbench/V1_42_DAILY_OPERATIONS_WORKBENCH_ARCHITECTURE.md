# V1.42 Daily Operations Workbench -- Architecture Document

**Version**: 1.42.0
**Date**: 2026-05-27
**Author**: Architecture Agent (Agent 3)
**Status**: Design

---

## 1. Executive Summary

The Daily Operations Workbench is a new page that aggregates cross-domain insights
(data quality, capacity risk, BP attainment, scenario what-if, and look-ahead focus)
into a single operational dashboard. It reads from existing services and core modules
only -- no new Firestore schema, no modifications to `calculationEngine.ts`.

The core helper `buildWorkbenchViewModel` is a **pure function** that takes the same
four service outputs the Dashboard already loads and produces a unified
`WorkbenchViewModel`.

---

## 2. Existing Data Flow (Dashboard.tsx -- the reference pattern)

```
Firestore Services (read-only)
  |
  +-- getSKUs(scope)          -> SKU[]
  +-- getForecasts(scope)     -> Forecast[]
  +-- getCapacityPlans(scope) -> CapacityPlan[]
  +-- getParameters(scope)    -> ProjectParameters
  |
  v
Dashboard.tsx (useEffect + Promise.all)
  |
  +-- buildAnalyticsModel(skus, forecasts, capacityPlans, params) -> AnalyticsModel
  +-- getDashboardHighlights(model)                                -> DashboardHighlights
  +-- buildDataQualitySummary({skus, forecasts, capacityPlans, params}) -> DataQualitySummary
  +-- buildBpAnalysis(skuResults, skus, monthlySummaries, bpTargets, currency) -> BpAnalysisModel
  +-- computeBpKpi(bpModel.yearly)                                 -> BpKpiSummary
  |
  v
React render (KPI cards, charts, tables, alerts)
```

**Key observations from the source code:**

- `Dashboard.tsx` lines 62-67: loads all 4 services in parallel via `Promise.all`.
- `Dashboard.tsx` lines 83-88: builds analytics model and DQ summary only when
  `skus.length > 0 && forecasts.length > 0`.
- `dataQuality.ts` line 60: `buildDataQualitySummary` is a pure function consuming
  `DataQualityInput { skus, forecasts, capacityPlans, params }`.
- `analytics.ts` line 123: `buildAnalyticsModel` calls `runCalculation` internally
  and returns `AnalyticsModel` with yearly health, monthly revenue, dimension matrices.
- `bpTargets.ts` line 84: `buildBpAnalysis` takes `skuResults` (from analytics),
  optional `skus` for dimension grouping, `monthlySummaries`, `bpTargetsMillionTwd`,
  and `currencySettings`.
- `aiCopilotTools.ts`: 6 deterministic tools, all pure functions consuming
  `AiCopilotContext`. The `buildLookAheadFocus` tool (line 571) filters future months
  where utilization > 85% or shortage > 0.
- `scenarioEngine.ts` line 90: `computeScenarioComparison` takes raw data +
  multipliers and produces `ScenarioComparison` with deltas.
- `riskAttribution.ts`: `buildRiskAttributionModel` identifies risk drivers by
  dimension during shortage months.

---

## 3. Workbench Data Flow Design

### 3.1 Data Loading (reuse existing services)

The Workbench page follows the exact same loading pattern as `Dashboard.tsx`:

```
WorkbenchPage (useEffect + Promise.all)
  |
  +-- getSKUs(scope)          -> SKU[]
  +-- getForecasts(scope)     -> Forecast[]
  +-- getCapacityPlans(scope) -> CapacityPlan[]
  +-- getParameters(scope)    -> ProjectParameters
  |
  v
buildWorkbenchViewModel(input) -> WorkbenchViewModel   [PURE FUNCTION]
  |
  v
React render (workflow stages, abnormality cards, look-ahead chart, revenue/BP bar)
```

The Workbench page component (`WorkbenchPage.tsx`) will:
1. Load data using the same 4 service calls as Dashboard.
2. Call `buildWorkbenchViewModel` with a `WorkbenchInput` object.
3. Render the `WorkbenchViewModel` using presentational sub-components.

### 3.2 Core Pure Function: `buildWorkbenchViewModel`

```typescript
// Location: frontend/src/core/workbench.ts

export interface WorkbenchInput {
  skus: SKU[];
  forecasts: Forecast[];
  capacityPlans: CapacityPlan[];
  params: ProjectParameters;
}

export function buildWorkbenchViewModel(input: WorkbenchInput): WorkbenchViewModel
```

Internally, this function delegates to existing core modules:

```
buildWorkbenchViewModel(input)
  |
  +-- buildDataQualitySummary(input)                    -> DataQualitySummary
  +-- buildAnalyticsModel(skus, forecasts, caps, params) -> AnalyticsModel
  +-- getDashboardHighlights(model)                      -> DashboardHighlights
  +-- buildBpAnalysis(...)                               -> BpAnalysisModel
  +-- computeBpKpi(bpModel.yearly)                       -> BpKpiSummary
  |
  +-- deriveWorkflowStages(dqSummary, model, bpModel, skus, forecasts, capacityPlans)
  +-- classifyAbnormalities(dqSummary, model, bpModel, highlights)
  +-- computeLookAheadFocus(model.monthlySummaries)
  +-- deriveRevenueBpSummary(model, bpModel, bpKpi)
  +-- buildScenarioPresets(params)
```

### 3.3 Workflow Stage Status Derivation

Each stage is derived from data presence and data quality. The logic is a pure
mapping from observable state to status:

| Stage | ID | ready | warning | blocked | notStarted |
|---|---|---|---|---|---|
| Products | `products` | skus.length > 0 AND no DQ errors in `products` domain | skus.length > 0 AND DQ warnings in `products` domain | skus.length === 0 | -- |
| Forecasts | `forecasts` | forecasts.length > 0 AND no DQ errors in `forecast` domain | forecasts.length > 0 AND DQ warnings in `forecast` domain | forecasts.length === 0 | -- |
| Capacity | `capacity` | capacityPlans.length > 0 AND no DQ errors in `capacity` domain | capacityPlans.length > 0 AND DQ warnings in `capacity` domain | capacityPlans.length === 0 OR DQ has `forecast-missing-capacity` error | -- |
| Parameters | `parameters` | params has yieldMatrix AND panelParams | DQ has currency or parameter warnings | DQ has currency errors (missing exchange rates) | -- |
| BP Targets | `bpTargets` | params.bpTargets has active targets AND no DQ warnings in `bp` domain | params.bpTargets has targets BUT DQ has bp-related warnings | params.bpTargets is undefined OR all targets are 0 | params.bpTargets is undefined |
| Analysis | `analysis` | model !== null (skus + forecasts both present) | model exists but shortageMonthCount > 0 | model is null (no data) | -- |
| Scenario | `scenario` | (always ready -- scenario is optional what-if) | -- | -- | User has not run a scenario yet |

**Status derivation function (pseudocode):**

```typescript
function deriveWorkflowStages(
  dq: DataQualitySummary,
  model: AnalyticsModel | null,
  bpModel: BpAnalysisModel | null,
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters
): WorkflowStage[]
```

Each stage gets:
- `cta`: a route path (e.g., `/products`, `/forecasts`, `/capacity`, `/parameters`, `/bp-targets`, `/scenario`) or `null` if no action needed.
- `ctaLabel`: an i18n key for the call-to-action button text.
- `issues`: array of `DataQualityIssue` objects relevant to this stage's domain.

### 3.4 Abnormality Insight Classification

Abnormalities are classified into 5 domains. Each insight maps to a concrete
observable from existing core modules:

| Domain | Source Module | Detection Logic |
|---|---|---|
| `data` | `dataQuality.ts` | DQ issues with `decisionImpact === 'high'` |
| `capacity` | `analytics.ts` | Months where `coreUtilization > 1.0` or `buUtilization > 1.0`, or `coreShortage > 0` / `buShortage > 0` |
| `sales` | `analytics.ts` | `revenueTrend === 'down'` from `DashboardHighlights`, or top customer contributing > 50% of revenue |
| `bp` | `bpTargets.ts` | `BpPeriodRecord` where `status === 'miss'` or `status === 'watch'` |
| `scenario` | `scenarioEngine.ts` | (Optional) When a scenario is active, deltas where `shortageMonthCount` increased or `bpAttainmentPct` decreased |

**Classification function:**

```typescript
function classifyAbnormalities(
  dq: DataQualitySummary,
  model: AnalyticsModel,
  bpModel: BpAnalysisModel,
  highlights: DashboardHighlights
): AbnormalityInsight[]
```

**Severity mapping:**
- `critical`: DQ high-impact errors, capacity shortage months, BP miss status
- `warning`: DQ medium-impact warnings, utilization > 85%, BP watch status
- `info`: DQ low-impact info, revenue trend flat, capacity without demand

### 3.5 Look-Ahead Focus Computation

Derived from `AnalyticsModel.monthlySummaries`, reusing the same logic as
`aiCopilotTools.ts` `buildLookAheadFocus` (line 571-661):

```typescript
function computeLookAheadFocus(
  monthlySummaries: MonthlyCapacitySummary[]
): LookAheadFocusItem[]
```

Logic:
1. Determine `currentMonth` from `new Date()` (format `YYYY-MM`).
2. Filter `monthlySummaries` where `month >= currentMonth`.
3. For each month, extract `coreUtilization`, `buUtilization`, `bottleneck`,
   and `hasShortage` (coreShortage > 0 OR buShortage > 0).
4. Return the next 6 months (or fewer if data ends sooner).

This is the same algorithm as `buildLookAheadFocus` in `aiCopilotTools.ts` but
returns a typed array instead of a `CopilotToolResult`.

### 3.6 Revenue/BP Summary Derivation

Derived from `AnalyticsModel` and `BpAnalysisModel`:

```typescript
function deriveRevenueBpSummary(
  model: AnalyticsModel,
  bpModel: BpAnalysisModel,
  bpKpi: BpKpiSummary
): RevenueBpSummary
```

Logic:
1. `currentRevenue`: `bpKpi.totalForecastMillionTwd` (forecast revenue in million TWD).
2. `bpTarget`: `bpKpi.totalTargetMillionTwd` (total BP target in million TWD).
3. `attainment`: `bpKpi.overallAttainment` (0-1 ratio, or null if no target).
4. `gap`: `bpKpi.totalGapMillionTwd` (forecast - target, in million TWD).
5. `status`: Derived from `attainment`:
   - `attainment >= 1.0` -> `'met'`
   - `attainment >= 0.8` -> `'watch'`
   - `attainment < 0.8` -> `'miss'`
   - `attainment === null` -> `'no-target'`

### 3.7 Scenario Presets

Static presets defined in `workbench.ts` (no Firestore read needed):

```typescript
const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'volume-up-10',
    label: 'workbench.scenario.volumeUp10',
    description: 'workbench.scenario.volumeUp10.desc',
    params: { forecastVolume: 1.1, unitPrice: 1.0, coreCapacity: 1.0, buCapacity: 1.0 },
  },
  {
    id: 'volume-down-10',
    label: 'workbench.scenario.volumeDown10',
    description: 'workbench.scenario.volumeDown10.desc',
    params: { forecastVolume: 0.9, unitPrice: 1.0, coreCapacity: 1.0, buCapacity: 1.0 },
  },
  {
    id: 'capacity-up-20',
    label: 'workbench.scenario.capacityUp20',
    description: 'workbench.scenario.capacityUp20.desc',
    params: { forecastVolume: 1.0, unitPrice: 1.0, coreCapacity: 1.2, buCapacity: 1.2 },
  },
  {
    id: 'price-up-5',
    label: 'workbench.scenario.priceUp5',
    description: 'workbench.scenario.priceUp5.desc',
    params: { forecastVolume: 1.0, unitPrice: 1.05, coreCapacity: 1.0, buCapacity: 1.0 },
  },
  {
    id: 'stress-test',
    label: 'workbench.scenario.stressTest',
    description: 'workbench.scenario.stressTest.desc',
    params: { forecastVolume: 1.2, unitPrice: 0.95, coreCapacity: 1.0, buCapacity: 1.0 },
  },
];
```

---

## 4. TypeScript Interface Definitions

These interfaces will be defined in `frontend/src/core/workbench.ts`.

```typescript
// ============================================================
// Workflow Stage Status
// ============================================================

/**
 * Status of a workflow stage in the Daily Operations Workbench.
 * - 'ready': stage has valid data, no blocking issues
 * - 'warning': stage has data but with warnings
 * - 'blocked': stage has critical issues preventing reliable analysis
 * - 'notStarted': stage has no data at all
 */
export type WorkflowStageStatus = 'ready' | 'warning' | 'blocked' | 'notStarted';

/**
 * A single workflow stage in the Workbench.
 */
export interface WorkflowStage {
  /** Stable identifier (e.g., 'products', 'forecasts', 'capacity'). */
  id: string;
  /** I18n key for the display label. */
  label: string;
  /** Derived status based on data presence and data quality. */
  status: WorkflowStageStatus;
  /** Data quality issues relevant to this stage. */
  issues: Array<{
    id: string;
    severity: 'error' | 'warning' | 'info';
    title: string;
    detail: string;
  }>;
  /** Route path for the call-to-action button (null if no action needed). */
  cta: string | null;
  /** I18n key for the call-to-action button label. */
  ctaLabel: string;
}

// ============================================================
// Abnormality Insights
// ============================================================

/**
 * Domain classification for abnormality insights.
 */
export type AbnormalityDomain = 'data' | 'capacity' | 'sales' | 'bp' | 'scenario';

/**
 * A single abnormality insight surfaced by the Workbench.
 */
export interface AbnormalityInsight {
  /** Which operational domain this abnormality belongs to. */
  domain: AbnormalityDomain;
  /** Severity level. */
  severity: 'critical' | 'warning' | 'info';
  /** Short title (I18n key). */
  title: string;
  /** Detailed explanation (I18n key with params). */
  detail: string;
  /** Supporting evidence (e.g., affected months, SKUs, percentages). */
  evidence: Record<string, string | number | boolean | null>;
  /** Route to the page where the user can investigate further. */
  sourcePage: string;
  /** I18n key for the recommended action. */
  recommendedAction: string;
}

// ============================================================
// Look-Ahead Focus
// ============================================================

/**
 * A single month's look-ahead focus item.
 */
export interface LookAheadFocusItem {
  /** Month in YYYY-MM format. */
  month: string;
  /** Core utilization ratio (0-1+), null if capacity is 0. */
  coreUtilization: number | null;
  /** BU utilization ratio (0-1+), null if capacity is 0. */
  buUtilization: number | null;
  /** Which process is the bottleneck ('Core' | 'BU' | 'None'). */
  bottleneck: 'Core' | 'BU' | 'None';
  /** True if coreShortage > 0 or buShortage > 0. */
  hasShortage: boolean;
}

// ============================================================
// Revenue / BP Summary
// ============================================================

/**
 * Aggregated revenue vs BP target summary.
 */
export interface RevenueBpSummary {
  /** Current forecast revenue in million TWD. */
  currentRevenue: number;
  /** BP target in million TWD (null if no target configured). */
  bpTarget: number | null;
  /** Attainment ratio 0-1 (null if no target). */
  attainment: number | null;
  /** Gap in million TWD (forecast - target, null if no target). */
  gap: number | null;
  /** Status derived from attainment. */
  status: 'met' | 'watch' | 'miss' | 'no-target';
}

// ============================================================
// Scenario Presets
// ============================================================

/**
 * A predefined scenario configuration for quick what-if analysis.
 */
export interface ScenarioPreset {
  /** Unique identifier. */
  id: string;
  /** I18n key for display label. */
  label: string;
  /** I18n key for description. */
  description: string;
  /** Scenario multiplier parameters. */
  params: {
    forecastVolume: number;
    unitPrice: number;
    coreCapacity: number;
    buCapacity: number;
  };
}

// ============================================================
// Workbench ViewModel (top-level output)
// ============================================================

/**
 * The complete view model for the Daily Operations Workbench page.
 * Produced by `buildWorkbenchViewModel()`, consumed by React components.
 */
export interface WorkbenchViewModel {
  /** Workflow stages with derived status. */
  stages: WorkflowStage[];
  /** Cross-domain abnormality insights, sorted by severity (critical first). */
  abnormalities: AbnormalityInsight[];
  /** Next 6 months of capacity look-ahead. */
  lookAhead: LookAheadFocusItem[];
  /** Aggregated revenue vs BP target summary. */
  revenueBp: RevenueBpSummary;
  /** Predefined scenario presets for quick what-if. */
  scenarioPresets: ScenarioPreset[];
  /** Data quality confidence level (reused from DataQualitySummary). */
  dqConfidence: 'high' | 'medium' | 'low' | 'blocked';
}
```

---

## 5. Constraint Verification

### 5.1 No new Firestore schema needed

The Workbench reads from the same 4 collections the Dashboard already reads:
- `skus` (via `getSKUs`)
- `forecasts` (via `getForecasts`)
- `capacityPlans` (via `getCapacityPlans`)
- `parameters` (via `getParameters`)

Scenario presets are static constants defined in code, not stored in Firestore.
No write operations are performed by the Workbench page.

### 5.2 Only reads from existing services

The Workbench page imports:
- `getSKUs` from `frontend/src/services/skuService.ts`
- `getForecasts` from `frontend/src/services/forecastService.ts`
- `getCapacityPlans` from `frontend/src/services/capacityService.ts`
- `getParameters` from `frontend/src/services/parameterService.ts`

The core helper `buildWorkbenchViewModel` imports only from existing core modules:
- `buildDataQualitySummary` from `frontend/src/core/dataQuality.ts`
- `buildAnalyticsModel`, `getDashboardHighlights` from `frontend/src/core/analytics.ts`
- `buildBpAnalysis`, `computeBpKpi` from `frontend/src/core/bpTargets.ts`

### 5.3 Does not modify calculationEngine

`calculationEngine.ts` is called indirectly through `buildAnalyticsModel` (which
internally calls `runCalculation`). The Workbench does not call `runCalculation`
directly and does not modify any of its logic, inputs, or outputs.

### 5.4 Core helper is a pure function

`buildWorkbenchViewModel` is a pure function:
- Takes `WorkbenchInput` (immutable data).
- Returns `WorkbenchViewModel` (new object).
- No side effects: no Firestore calls, no network requests, no DOM mutations.
- No imports from `services/**` or `firebase/**`.
- Deterministic: same input always produces same output.

---

## 6. Module Dependency Graph

```
frontend/src/core/workbench.ts          [NEW - pure function]
  |
  +-- types/index.ts                     [EXISTING - SKU, Forecast, etc.]
  +-- core/dataQuality.ts               [EXISTING - buildDataQualitySummary]
  +-- core/analytics.ts                 [EXISTING - buildAnalyticsModel, getDashboardHighlights]
  +-- core/bpTargets.ts                 [EXISTING - buildBpAnalysis, computeBpKpi]
  +-- core/currency.ts                  [EXISTING - normalizeCurrencySettings, CurrencySettings]

frontend/src/pages/WorkbenchPage.tsx     [NEW - React component]
  |
  +-- services/skuService.ts            [EXISTING - getSKUs]
  +-- services/forecastService.ts       [EXISTING - getForecasts]
  +-- services/capacityService.ts       [EXISTING - getCapacityPlans]
  +-- services/parameterService.ts      [EXISTING - getParameters]
  +-- core/workbench.ts                 [NEW - buildWorkbenchViewModel]
  +-- types/index.ts                    [EXISTING - ProjectScope]
```

No circular dependencies. The new `workbench.ts` module depends only on core
modules that are already stable and tested.

---

## 7. File Inventory

| File | Purpose | Status |
|---|---|---|
| `frontend/src/core/workbench.ts` | Pure function: `buildWorkbenchViewModel` + all interfaces | NEW |
| `frontend/src/core/workbench.test.ts` | Unit tests for the pure function | NEW |
| `frontend/src/pages/WorkbenchPage.tsx` | React page component | NEW |
| `docs/workbench/V1_42_DAILY_OPERATIONS_WORKBENCH_ARCHITECTURE.md` | This document | NEW |

---

## 8. Data Flow Diagram

```
                        +-----------------------+
                        |   Firestore (read)    |
                        +-----------+-----------+
                                    |
                    getSKUs, getForecasts,
                    getCapacityPlans, getParameters
                                    |
                                    v
                        +-----------+-----------+
                        |   WorkbenchPage.tsx   |
                        |   (React component)   |
                        +-----------+-----------+
                                    |
                         buildWorkbenchViewModel(input)
                                    |
                                    v
                +-------------------+-------------------+
                |          workbench.ts (PURE)          |
                |                                       |
                |  +-- buildDataQualitySummary()        |
                |  +-- buildAnalyticsModel()            |
                |  +-- getDashboardHighlights()         |
                |  +-- buildBpAnalysis()                |
                |  +-- computeBpKpi()                   |
                |  +-- deriveWorkflowStages()           |
                |  +-- classifyAbnormalities()          |
                |  +-- computeLookAheadFocus()          |
                |  +-- deriveRevenueBpSummary()         |
                |  +-- buildScenarioPresets()           |
                +-------------------+-------------------+
                                    |
                                    v
                        +-----------+-----------+
                        |  WorkbenchViewModel   |
                        +-----------+-----------+
                                    |
        +----------+--------+------+------+--------+
        |          |        |      |      |        |
        v          v        v      v      v        v
    stages  abnormalities lookAhead revenueBp presets dqConfidence
```

---

## 9. Risk and Mitigations

| Risk | Mitigation |
|---|---|
| `buildAnalyticsModel` internally calls `runCalculation` which may throw on bad data | Wrap in try/catch in `buildWorkbenchViewModel`; surface as a `blocked` stage with error detail |
| Look-ahead depends on current date (`new Date()`) | Pass `currentDate` as optional parameter for testability; default to `new Date()` |
| BP targets may not be configured | `RevenueBpSummary.status` handles `'no-target'` gracefully |
| Large number of abnormalities could overwhelm the UI | Cap at 10 insights (critical first, then warning, then info) |
