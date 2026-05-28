# Architecture and Data Flow Review

**Date**: 2026-05-28
**Start Time**: 15:17:08
**End Time**: 15:45:00 (approx)
**Duration**: ~28 minutes
**Branch**: xiaomi/v1-41-ai-copilot-reliability-marathon
**Scope**: frontend/src/core/ and frontend/src/services/ modules

---

## 1. Architecture Overview

### 1.1 Layer Structure

```
┌─────────────────────────────────────────────────────────┐
│  UI Layer (frontend/src/pages/*.tsx)                     │
│  - React pages orchestrate data loading + rendering     │
│  - Calls service functions for CRUD, core for compute   │
├─────────────────────────────────────────────────────────┤
│  Service Layer (frontend/src/services/*.ts)             │
│  - Thin Firestore CRUD wrappers                         │
│  - Imports from core/currency for normalization         │
│  - Imports from core/defaults for default values        │
│  - Imports from services/projectScope for path helpers  │
├─────────────────────────────────────────────────────────┤
│  Core Layer (frontend/src/core/*.ts)                    │
│  - Pure functions, zero side effects                    │
│  - NO imports from services/**                          │
│  - Deterministic: same input = same output              │
│  - All business logic lives here                        │
├─────────────────────────────────────────────────────────┤
│  Types (frontend/src/types.ts)                          │
│  - Shared TypeScript interfaces                         │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Dependency Direction

```
UI → Services (Firestore CRUD)
UI → Core (computation)
Services → Core (currency normalization, defaults only)
Core → Types (interfaces only)
Core → Core (internal module composition)
```

**Key invariant**: Core modules NEVER import from services. Verified by grep -- zero matches for `from '../services` in frontend/src/core/.

---

## 2. Data Flow Diagrams

### 2.1 Products Flow

```
Firestore DB
  ↓ (getSKUs / saveSKU / batchSaveSKUs)
skuService.ts
  - normalizeSku(): applies currencyOrUsd() from core/currency
  - CRUD via Firebase SDK
  ↓
UI (Products page, ProductsSpreadsheetLab)
  - validateSKU() from core/validation
  - calculateSkuUpp(), normalizeSkuDraft() from core/skuDerived
  ↓
Core calculationEngine.ts
  - calculateSkuMonth(sku, forecast, params) → SkuCalculationResult
```

### 2.2 Forecasts Flow

```
Firestore DB
  ↓ (getForecasts / saveForecast / batchSaveForecasts)
forecastService.ts
  - normalizeForecast(): applies currencyOrUsd()
  - CRUD via Firebase SDK
  ↓
UI (Forecasts page, ForecastsSpreadsheetLab)
  - buildYearlyGrowthForecasts() from core/forecastGrowth
  - buildDataQualitySummary() for inline DQ warnings
  ↓
Core calculationEngine.ts
  - runCalculation(skus, forecasts, capacityPlans, params)
```

### 2.3 Capacity Flow

```
Firestore DB
  ↓ (getCapacityPlans / saveCapacityPlan / batchSaveCapacityPlans)
capacityService.ts
  - batchSaveCapacityPlans(): delete-then-write pattern
  - ID format: "${month}-${factoryId}"
  ↓
UI (CapacityPlan, CapacitySpreadsheet)
  ↓
Core calculationEngine.ts
  - Aggregates capacity by month (sum across factories)
  - coreCapacity = corePanelPerDay * workingDays
  - buCapacity = buPanelPerDay * workingDays
```

### 2.4 Parameters Flow

```
Firestore DB
  ↓ (getParameters / saveParameters)
parameterService.ts
  - getParameters(): returns defaults if no doc exists
  - DEFAULT_YIELD and DEFAULT_PANEL hardcoded in service
  - normalizeCurrencySettings() from core/currency
  ↓
UI (Parameters page)
  - DEFAULT_YIELD_MATRIX, DEFAULT_PANEL_PARAMS from core/defaults
  ↓
Core modules consume ProjectParameters as input
```

### 2.5 BP Targets Flow

```
Firestore (stored in parameters document)
  ↓
parameterService.ts → params.bpTargets
  ↓
UI (BpTargets page)
  - recordToRows() / rowsToRecord() from core/bpTargetsHelpers
  ↓
Core bpTargets.ts
  - buildBpAnalysis(): Year/Quarter/Month views
  - Customer/SKU dimension contribution
  - USD → TWD conversion for BP comparison
```

### 2.6 Calculation Engine Flow

```
Inputs: SKU[], Forecast[], CapacityPlan[], ProjectParameters
  ↓
calculationEngine.ts::runCalculation()
  ├── For each SKU × Forecast:
  │   ├── getYieldRate(sizeCategory, layerCount, yieldMatrix)
  │   ├── calculatePanelLayout(chipLength, chipWidth, panelParams)
  │   ├── calculateSteps(layerCount) → {coreSteps, buSteps}
  │   └── calculateSkuMonth() → SkuCalculationResult
  ├── Aggregate by month:
  │   ├── totalCorePanelDemand, totalBuPanelDemand
  │   ├── coreCapacity, buCapacity (from capacity plans × workingDays)
  │   ├── utilization = demand / capacity
  │   ├── shortage = max(demand - capacity, 0)
  │   └── bottleneck = max(coreShortage, buShortage)
  └── Output: CalculationResult
        ├── skuResults: SkuCalculationResult[]
        ├── monthlySummaries: MonthlyCapacitySummary[]
        ├── totalRevenue, totalForecastPcs
        ├── maxCoreUtilization, maxBuUtilization
        └── shortageMonthCount, worstBottleneckMonth
```

### 2.7 Data Quality Flow

```
Inputs: SKU[], Forecast[], CapacityPlan[], ProjectParameters
  ↓
dataQuality.ts::buildDataQualitySummary()
  ├── Products checks: missing attrs, zero price, unsupported currency
  ├── Forecast checks: orphan SKU, zero price, partial year
  ├── Capacity checks: missing capacity, BU demand with zero capacity
  ├── Currency checks: missing TWD/CNY exchange rates
  ├── BP checks: target without forecast, forecast without target
  └── enrichment: enrichWithImpact() assigns decisionImpact
  ↓
Output: DataQualitySummary {status, confidence, confidenceScore, issues[]}
```

### 2.8 Scenario Engine Flow

```
Inputs: SKU[], Forecast[], CapacityPlan[], ProjectParameters, multipliers
  ↓
scenarioEngine.ts::computeScenarioComparison()
  ├── applyScenarioMultipliers() → transformed data
  ├── runCalculation() on original → baseCalcResult
  ├── runCalculation() on transformed → scenarioCalcResult
  ├── buildBpAnalysis() on both → baseBpModel, scenarioBpModel
  ├── buildDataQualitySummary() on transformed → scenarioDqSummary
  └── computeDelta() for each metric
  ↓
Output: ScenarioComparison {baseline, scenario, deltas}
```

### 2.9 Operational Scenario Flow (v1.44)

```
Inputs: OperationalScenarioParams
  ↓
operationalScenario.ts::runOperationalScenario()
  ├── capacityDelay / capacityPullForward → shiftCapacityPlans()
  ├── forecastAdjustment → adjustForecastVolume()
  └── orderDisappearance → removeMatchingForecasts()
  ↓
buildComparisonFromTransformedData()
  ├── runCalculation() on baseline
  ├── runCalculation() on scenario
  └── computeCustomerSkuImpact() → byCustomer, bySku, top20Sku
  ↓
Output: OperationalScenarioResult {comparison, impact, description, caveats}
```

### 2.10 AI Copilot Flow

```
Inputs: SKU[], Forecast[], CapacityPlan[], ProjectParameters, AnalyticsModel
  ↓
aiCopilotContext.ts::buildAiCopilotContext()
  ├── buildDataQualitySummary()
  ├── buildRiskAttributionModel()
  ├── sanitizeDeep() — strips sensitive keys
  └── Array caps: topIssues 8, topDrivers 5, shortageMonths 12
  ↓
Output: AiCopilotContext (compact, sanitized)
  ↓
aiCopilotTools.ts::routeQuestion() / runTool()
  ├── inspectDataQuality()
  ├── explainCapacityRisk()
  ├── explainBpGap()
  ├── suggestDataFixes()
  ├── explainScenarioImpact()
  ├── buildLookAheadFocus()
  ├── explainWorkbenchOverview()
  ├── explainAbnormalityDetail()
  ├── explainScenarioV2Impact()
  └── generateReportNarrative()
  ↓
Output: CopilotToolResult {facts, assumptions, inferences, recommendations, ...}
```

### 2.11 Operations Workbench Flow

```
Inputs: SKU[], Forecast[], CapacityPlan[], ProjectParameters
  ↓
workbench.ts::buildWorkbenchViewModel()
  ├── buildDataQualitySummary()
  ├── buildAnalyticsModel()
  ├── getDashboardHighlights()
  ├── buildBpAnalysis() + computeBpKpi()
  ├── deriveWorkflowStages() → 7 stages with status
  ├── classifyAbnormalities() → cross-domain insights
  ├── computeLookAheadFocus() → next 6 months
  └── deriveRevenueBpSummary()
  ↓
Output: WorkbenchViewModel {stages, abnormalities, lookAhead, revenueBp, ...}
```

### 2.12 Management Report Flow

```
Inputs: WorkbenchViewModel, DataQualitySummary, AnalyticsModel, BpAnalysisModel, ScenarioComparison
  ↓
managementReport.ts::buildManagementReport()
  ├── buildExecutiveSummarySection()
  ├── buildDataConfidenceSection()
  ├── buildKpiGridSection()
  ├── buildTopRisksSection()
  ├── buildRequiredFixesSection()
  ├── buildRevenueBpSection()
  ├── buildLookAheadSection()
  ├── buildScenarioRecommendationsSection()
  ├── buildNarrativeSection()
  ├── Weekly-only: trend, utilization, forecast accuracy, customer, SKU
  └── sanitizeObject() — strips sensitive keys
  ↓
Output: ManagementReport {sections[], executiveSummary, caveats}
  ↓
exportReportToMarkdown() / exportReportToJson()
```

---

## 3. Architectural Assessment

### 3.1 Strengths

| Aspect | Status | Evidence |
|--------|--------|----------|
| Core purity | PASS | All core modules are pure functions, zero side effects |
| Layer separation | PASS | Core never imports from services (verified by grep) |
| Determinism | PASS | Same input always produces same output |
| Security boundary | PASS | sanitizeDeep() in context builder, SENSITIVE_KEYS stripping in reports |
| i18n support | PASS | LocalizedMessage pattern with msg() helper throughout |
| Array caps | PASS | topIssues capped at 8, topDrivers at 5, shortageMonths at 12 |
| Test coverage | GOOD | Every core module has a corresponding .test.ts file |

### 3.2 Service Layer Assessment

| Service | Pattern | Notes |
|---------|---------|-------|
| skuService.ts | Thin CRUD | normalizeSku uses core/currency |
| forecastService.ts | Thin CRUD | normalizeForecast uses core/currency |
| capacityService.ts | Thin CRUD | batchSave uses delete-then-write |
| parameterService.ts | Thin CRUD | Hardcodes DEFAULT_YIELD and DEFAULT_PANEL |
| projectScope.ts | Path + auth | Clean single source of truth for Firestore paths |
| bpTargetService.ts | N/A | BP targets stored inside parameters document |

---

## 4. Issues Found

### 4.1 P1 -- Duplicate Utility Functions (Refactor Risk)

**Severity**: P1 (Technical Debt)
**Impact**: Maintenance burden, inconsistency risk if one copy is updated and others are not

| Function | Copies | Files |
|----------|--------|-------|
| `getLayerBucket()` | 3 | analytics.ts, bpAttribution.ts, riskAttribution.ts |
| `computeDelta()` | 3 | scenarioEngine.ts, operationalScenario.ts, changeImpact.ts |
| `computeBpAttainmentPct()` | 2 | scenarioEngine.ts, operationalScenario.ts |
| `computeBpGap()` | 2 | scenarioEngine.ts, operationalScenario.ts |
| `toYear()` | 3 | analytics.ts (exported), bpTargets.ts, bpAttribution.ts |
| `toQuarter()` | 3 | analytics.ts (exported), bpTargets.ts, bpAttribution.ts |
| `safeShare()` | 2 | riskAttribution.ts, riskBrief.ts |
| `msg()` | 5 | dataQuality.ts, riskAttribution.ts, riskBrief.ts, bpAttribution.ts, keyFindings.ts |
| `buildDimensionMatrix()` | 2 | analytics.ts (nested), bpTargets.ts |
| `parseMonth()` | 3+ | analytics.ts, bpTargets.ts, bpAttribution.ts |

**Recommendation**: Extract shared utilities into a `core/utils/` or `core/shared.ts` module:
- `core/timeUtils.ts`: parseMonth, toYear, toQuarter, quarterMonths, yearMonths
- `core/mathUtils.ts`: safeShare, computeDelta, round2
- `core/i18nUtils.ts`: msg() helper
- `core/domainUtils.ts`: getLayerBucket, collectInvalidSkuIds

### 4.2 P1 -- Duplicated Default Constants

**Severity**: P1 (Consistency Risk)

`DEFAULT_YIELD_MATRIX` is defined in two places:
1. `core/defaults.ts` line 4: `DEFAULT_YIELD_MATRIX`
2. `services/parameterService.ts` line 17: `DEFAULT_YIELD` (same values, different name)

`DEFAULT_PANEL_PARAMS` is also duplicated:
1. `core/defaults.ts` line 12: `DEFAULT_PANEL_PARAMS`
2. `services/parameterService.ts` line 24: `DEFAULT_PANEL` (same values, different name)

**Recommendation**: parameterService.ts should import from core/defaults.ts instead of redeclaring.

### 4.3 P1 -- Duplicate Comparison Logic in operationalScenario.ts

**Severity**: P1 (Code Duplication)

`operationalScenario.ts` duplicates significant logic from `scenarioEngine.ts`:
- `computeDelta()` -- identical implementation
- `computeBpAttainmentPct()` -- identical implementation
- `computeBpGap()` -- identical implementation
- `buildComparisonFromTransformedData()` -- reimplements `computeScenarioComparison()` with minor variations

**Recommendation**: Extract shared comparison functions from scenarioEngine.ts and export them for operationalScenario.ts to reuse.

### 4.2 P2 -- Large Monolithic Files

**Severity**: P2 (Maintainability)

| File | Lines | Concern |
|------|-------|---------|
| aiCopilotTools.ts | ~1490 | 10 tools + router + runner in one file |
| managementReport.ts | ~1165 | 8 daily + 5 weekly section builders + markdown/json exporters |
| riskBrief.ts | ~840 | Risk brief builder with role-based attention |
| analytics.ts | ~425 | Analytics model + dashboard highlights + shortage exposure |
| bpTargets.ts | ~428 | BP analysis + legacy backward compat wrapper |

**Recommendation**: Consider splitting:
- `aiCopilotTools.ts` → `copilot/tools/` directory with one file per tool
- `managementReport.ts` → split section builders from export functions

### 4.3 P2 -- Legacy Backward Compatibility Wrapper

**Severity**: P2 (Dead Code Risk)

`bpTargets.ts` lines 379-427 contain `buildBpAttainment()` and related types (`BpTargetRecord`, `BpAttainmentResult`) marked as "Legacy function for Dashboard compatibility." These wrap the new `buildBpAnalysis()` and convert to the old format.

**Recommendation**: Audit whether any consumers still use `buildBpAttainment()`. If none, remove it.

### 4.4 P2 -- Hardcoded Chinese Strings in AI Copilot Tools

**Severity**: P2 (i18n Consistency)

`aiCopilotTools.ts` contains many hardcoded Traditional Chinese strings in tool summaries, facts, and recommendations (e.g., lines 48, 50, 82-83, 94-95, 109, etc.). Other core modules use the `LocalizedMessage` pattern with `msg()` helper.

**Recommendation**: Migrate hardcoded strings in aiCopilotTools.ts to use the i18n system, or document that these are intentionally hardcoded for the AI context (not user-facing UI).

### 4.5 P2 -- Capacity Service Delete-Before-Write Pattern

**Severity**: P2 (Data Safety)

`capacityService.ts::batchSaveCapacityPlans()` (lines 51-95) implements a delete-then-write pattern: it reads all existing docs, deletes matching ones, then writes new ones in a single batch. This is correct but fragile -- if the batch write fails after deletes, data could be lost.

**Recommendation**: Consider using Firestore `writeBatch` with only set operations (upsert pattern) instead of delete-then-write. The current ID format (`${month}-${factoryId}`) already supports upserts.

### 4.6 P2 -- BP Targets Stored Inside Parameters Document

**Severity**: P2 (Data Model)

BP targets are stored as a sub-field of the parameters document (`params.bpTargets.yearlyRevenueTargetsMillionTwd`), not as a separate collection. This couples BP target changes with parameter changes and limits query flexibility.

**Recommendation**: Consider whether BP targets should be a separate document/collection in a future refactor. Current approach works but creates tight coupling.

### 4.7 P3 -- Inconsistent Bucket Naming

**Severity**: P3 (Cosmetic)

`getLayerBucket()` returns different bucket names in different files:
- `analytics.ts` line 118: `'2-8L'`, `'10-14L'`, `'16-20L'`, `'20L+'`
- `bpAttribution.ts` line 76: `'2-8L'`, `'10-14L'`, `'16-20L'`, `'20L+'`
- `riskAttribution.ts` line 145: `'2-8L'`, `'10-14L'`, `'16-20L'`, `'20L+'`
- `yieldMatrix.ts` line 10 (`layerCountToBucket`): `'4-8L'`, `'10-14L'`, `'16-20L'`, `'20L+'`

The `analytics/bpAttribution/riskAttribution` versions use `'2-8L'` while `yieldMatrix.ts` uses `'4-8L'`. These serve different purposes (yield lookup vs display grouping) but the inconsistency could cause confusion.

**Recommendation**: Document the distinction clearly or unify to one bucket scheme.

### 4.8 P3 -- Sensitive Key Lists Are Duplicated

**Severity**: P3 (Consistency)

Two separate `SENSITIVE_KEYS` lists exist:
1. `aiCopilotContext.ts` line 33: `['uid', 'email', 'token', 'auth', 'apiKey', 'secret', 'password', 'workspaceId', 'userId', 'ownerUid', 'member']`
2. `managementReport.ts` line 85: `['apikey', 'api_key', 'token', 'secret', 'password', 'credential', 'bearer', 'authorization', 'auth', 'key']`

These are different lists with different items. The context builder strips workspace/user identifiers; the report builder strips credential-related keys.

**Recommendation**: Consolidate into a shared `SENSITIVE_KEYS` constant with clear documentation of which keys are stripped where.

---

## 5. Low-Risk Fixes (Can Be Applied Now)

### 5.1 Extract shared time utilities

Create `core/timeUtils.ts` with:
```typescript
export function parseMonth(m: string): { year: number; month: number }
export function toYear(m: string): string
export function toQuarter(m: string): string
export function quarterMonths(q: string): string[]
export function yearMonths(y: string): string[]
```

Then update analytics.ts, bpTargets.ts, bpAttribution.ts to import from it.

### 5.2 Extract shared math utilities

Create `core/mathUtils.ts` with:
```typescript
export function safeShare(value: number, total: number): number | undefined
export function computeDelta(base: number | null, scenario: number | null): DeltaMetric
export function round2(n: number): number
```

Then update scenarioEngine.ts, operationalScenario.ts, riskAttribution.ts, riskBrief.ts to import from it.

### 5.3 Extract shared i18n helper

Create `core/i18nUtils.ts` with:
```typescript
export function msg(key: string, params?: Record<string, string | number>): LocalizedMessage
```

Then update all 5 files that define their own `msg()`.

### 5.4 Fix parameterService.ts default duplication

Replace the hardcoded `DEFAULT_YIELD` and `DEFAULT_PANEL` in parameterService.ts with imports from core/defaults.ts.

### 5.5 Extract shared getLayerBucket

Move to `core/domainUtils.ts`:
```typescript
export function getLayerBucket(layerCount: number): string {
  if (layerCount <= 8) return '2-8L';
  if (layerCount <= 14) return '10-14L';
  if (layerCount <= 20) return '16-20L';
  return '20L+';
}
```

---

## 6. Recommendations for Larger Refactors

### 6.1 Split aiCopilotTools.ts

The file is 1490 lines with 10 tools + router + runner. Consider:
```
core/copilot/
  tools/inspectDataQuality.ts
  tools/explainCapacityRisk.ts
  tools/explainBpGap.ts
  tools/suggestDataFixes.ts
  tools/explainScenarioImpact.ts
  tools/buildLookAheadFocus.ts
  tools/explainWorkbenchOverview.ts
  tools/explainAbnormalityDetail.ts
  tools/explainScenarioV2Impact.ts
  tools/generateReportNarrative.ts
  router.ts
  runner.ts
```

### 6.2 Extract comparison helpers from scenarioEngine.ts

Export `computeDelta`, `computeBpAttainmentPct`, `computeBpGap` from scenarioEngine.ts so operationalScenario.ts can import them instead of duplicating.

### 6.3 Unify sensitive key stripping

Create `core/sanitize.ts` with a comprehensive SENSITIVE_KEYS set and sanitize functions, replacing the two separate implementations.

### 6.4 Consider bpTargets as separate Firestore document

Currently BP targets are nested inside the parameters document. If BP target management grows in complexity, consider extracting to a separate document.

---

## 7. Summary

### Architecture Health: GOOD

The architecture follows a clean layered pattern with strong invariants:
- Core modules are pure functions with zero side effects
- Services are thin Firestore CRUD wrappers
- No cross-layer dependency violations
- Security boundaries are enforced (sanitizeDeep, SENSITIVE_KEYS)
- i18n is consistently applied via LocalizedMessage pattern

### Primary Concerns

1. **Duplicate utility functions** (P1): 10+ functions duplicated across 2-5 files each
2. **Duplicate default constants** (P1): parameterService.ts re-declares defaults from core/defaults.ts
3. **Duplicate comparison logic** (P1): operationalScenario.ts duplicates scenarioEngine.ts internals
4. **Large monolithic files** (P2): aiCopilotTools.ts (1490 lines), managementReport.ts (1165 lines)
5. **Hardcoded Chinese strings** (P2): aiCopilotTools.ts uses hardcoded strings instead of i18n

### No Critical (P0) Issues Found

The architecture is fundamentally sound. The issues identified are technical debt and maintainability concerns, not correctness or security problems.
