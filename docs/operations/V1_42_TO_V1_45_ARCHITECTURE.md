# V1.42 to V1.45 Architecture -- Abnormality Intelligence, Operational Scenarios v2, Management Report

**Version**: 1.45.0
**Date**: 2026-05-28
**Author**: Architecture Agent (Agent 2)
**Status**: Design
**Depends on**: V1.42 Daily Operations Workbench

---

## 1. Executive Summary

This document defines the architecture for three new core modules extending the
v1.42 Daily Operations Workbench:

- **v1.43 -- Abnormality Intelligence**: Structured taxonomy, severity ranking,
  evidence citation, and "why it matters" narrative for all abnormality insights.
- **v1.44 -- Operational Scenario v2**: Time-shift, forecast adjustment, and
  order-disappearance scenarios with per-customer/per-SKU impact analysis.
- **v1.45 -- Management Report**: Deterministic daily/weekly report generation
  with markdown/JSON export.

All three modules are **pure functions** with zero side effects. They import only
from existing `core/` modules. No new Firestore schema is required. No formulas
in `calculationEngine.ts` are modified.

---

## 2. Architectural Constraints (carried from v1.42)

| Constraint | Enforcement |
|---|---|
| Pure functions only | No imports from `services/**`, no Firestore, no network, no DOM |
| No formula modification | `calculationEngine.ts` is read-only; new modules consume its output |
| AI isolation | New modules do NOT import from AI provider paths; AI tools may consume new modules |
| No new Firestore schema | All new data is derived at runtime from existing service outputs |
| Deterministic output | Same input always produces same output (critical for v1.45 reports) |
| Reuse, not duplicate | v1.43 reuses `DataQualityIssue` from `dataQuality.ts`; v1.44 reuses `ScenarioMultipliers` from `scenarioEngine.ts` |

---

## 3. Module Dependency Graph

```
                    types/ (SKU, Forecast, CapacityPlan, ProjectParameters)
                        |
            +-----------+-----------+-----------+
            |           |           |           |
      dataQuality   analytics   bpTargets   scenarioEngine
            |           |           |           |
            v           v           v           v
    +---------------+   |           |   +-----------------+
    | abnormality   |   |           |   | operational     |
    | Intelligence  |<--+-----------+-->| Scenario v2     |
    | (v1.43)       |                   | (v1.44)         |
    +-------+-------+                   +--------+--------+
            |                                    |
            +--------+          +----------------+
                     |          |
                     v          v
              +------+----------+------+
              | managementReport      |
              | (v1.45)               |
              +-----------------------+
                        |
                        v
              React components (read-only consumers)
```

---

## 4. V1.43 -- Abnormality Intelligence

**New file**: `frontend/src/core/abnormalityIntelligence.ts`

### 4.1 Purpose

The v1.42 workbench produces a flat list of `AbnormalityInsight` objects (max 10)
via `classifyAbnormalities()`. v1.43 enriches this into a structured intelligence
layer with:

1. A taxonomy that classifies every abnormality type
2. A severity ranker that orders by business impact (not just critical/warning/info)
3. Evidence citations that attach specific data points to each insight
4. A "why it matters today" narrative generator

### 4.2 AbnormalityTaxonomy

```typescript
/**
 * Structured classification of all abnormality types.
 * Each type maps to a domain, a canonical set of causes, and a business impact category.
 */
export type AbnormalityCategory =
  | 'data-integrity'        // DQ errors that block or distort analysis
  | 'capacity-constraint'   // Supply-demand imbalance
  | 'revenue-risk'          // BP miss, revenue concentration, trend decline
  | 'operational-readiness' // Workflow stages blocked, missing config
  | 'forecast-gap'          // Partial data, orphan records, missing periods
  | 'currency-mismatch';    // Exchange rate issues, unit confusion

export interface AbnormalityType {
  /** Stable identifier matching DataQualityIssue.id patterns or derived signals. */
  id: string;
  /** Taxonomy category. */
  category: AbnormalityCategory;
  /** Source domain (reused from workbench.ts AbnormalityDomain). */
  domain: 'data' | 'capacity' | 'sales' | 'bp' | 'scenario';
  /** I18n key for the taxonomy label. */
  label: string;
  /** Business impact description template (I18n key with params). */
  impactTemplate: string;
  /** Typical root causes (I18n keys). */
  typicalCauses: string[];
  /** Recommended investigation path (route). */
  investigationRoute: string;
}

export interface AbnormalityTaxonomy {
  /** All registered abnormality types. */
  types: AbnormalityType[];
  /** Lookup by issue id pattern. */
  lookup(issueId: string): AbnormalityType | undefined;
}
```

**Design decision**: The taxonomy is a static registry (like `SCENARIO_PRESETS` in
`workbench.ts`). It does NOT duplicate DQ rules. Instead, it maps `DataQualityIssue.id`
patterns to richer metadata. The `classifyAbnormalities` function in `workbench.ts`
already produces `AbnormalityInsight` objects; the taxonomy enriches them post-hoc.

### 4.3 AbnormalitySeverityRanker

```typescript
export interface RankedAbnormality {
  /** The enriched abnormality insight. */
  insight: AbnormalityInsight;
  /** Taxonomy type (if matched). */
  taxonomyType: AbnormalityType | null;
  /** Composite severity score (0-100, higher = more urgent). */
  severityScore: number;
  /** Business impact category. */
  impactCategory: 'blocking' | 'distorting' | 'degrading' | 'informational';
  /** Evidence citations attached to this insight. */
  citations: EvidenceCitation[];
  /** "Why it matters today" narrative. */
  whyItMatters: string;
}

/**
 * Rank abnormalities by business impact.
 *
 * Scoring formula (deterministic):
 *   baseScore = { critical: 80, warning: 50, info: 20 }
 *   + impactBonus = { high: 20, medium: 10, low: 0 }
 *   + domainWeight = { data: 1.2, capacity: 1.1, bp: 1.0, sales: 0.9, scenario: 0.8 }
 *   - ageDiscount = 0 (no time decay; all insights are "today")
 *
 * Final score = min(100, baseScore + impactBonus) * domainWeight
 *
 * Ties broken by: (1) critical before warning before info, (2) data domain first.
 */
export function rankAbnormalities(
  insights: AbnormalityInsight[],
  dqSummary: DataQualitySummary,
  taxonomy: AbnormalityTaxonomy,
): RankedAbnormality[];
```

### 4.4 EvidenceCitation

```typescript
/**
 * A structured evidence citation attached to an abnormality insight.
 * Links the insight to specific data points that support the claim.
 */
export interface EvidenceCitation {
  /** What data point this citation references. */
  metric: string;
  /** The actual value observed. */
  value: number | string;
  /** The expected or threshold value (null if not applicable). */
  threshold: number | string | null;
  /** Unit of measurement (e.g., 'panels', '%', 'M TWD'). */
  unit: string;
  /** Source module that produced this data point. */
  source: 'dataQuality' | 'analytics' | 'bpTargets' | 'scenarioEngine' | 'riskAttribution';
  /** Time period this evidence relates to (YYYY-MM or YYYY). */
  period?: string;
  /** Affected SKU codes (if applicable). */
  affectedSkuCodes?: string[];
}
```

**Key design rule**: Evidence citations are derived from existing module outputs.
The `AbnormalityInsight.evidence` field (from v1.42) already contains a
`Record<string, string | number | boolean | null>`. The citation layer transforms
this into structured, typed evidence with source attribution.

### 4.5 WhyItMattersNarrative

```typescript
/**
 * Generate a "why it matters today" explanation for a ranked abnormality.
 *
 * Pure function. Uses the abnormality's taxonomy, severity score, and evidence
 * to produce a localized narrative string.
 *
 * Template structure (I18n key with params):
 *   "{category} issue: {title}. {impactDescription}. Evidence: {topCitation}."
 *
 * The narrative is deterministic: same RankedAbnormality input always produces
 * the same output string.
 */
export function generateWhyItMatters(
  ranked: RankedAbnormality,
  currentDate: Date,
): string;
```

### 4.6 Main Entry Point

```typescript
export interface AbnormalityIntelligenceInput {
  /** Workbench abnormalities (from buildWorkbenchViewModel). */
  abnormalities: AbnormalityInsight[];
  /** Data quality summary (for enrichment). */
  dqSummary: DataQualitySummary;
  /** Current date for "today" context. */
  currentDate?: Date;
}

export interface AbnormalityIntelligenceOutput {
  /** Ranked abnormalities with full intelligence. */
  ranked: RankedAbnormality[];
  /** Summary statistics. */
  summary: {
    total: number;
    blocking: number;
    distorting: number;
    degrading: number;
    informational: number;
    topCategory: AbnormalityCategory | null;
  };
  /** Top 3 "must act today" items. */
  mustActToday: RankedAbnormality[];
}

/**
 * Build the full abnormality intelligence output.
 * Pure function, zero side effects.
 */
export function buildAbnormalityIntelligence(
  input: AbnormalityIntelligenceInput,
): AbnormalityIntelligenceOutput;
```

### 4.7 Relationship to Existing Modules

| Existing Module | How v1.43 Uses It |
|---|---|
| `dataQuality.ts` | Consumes `DataQualitySummary` and `DataQualityIssue` for enrichment; does NOT duplicate rules |
| `workbench.ts` | Consumes `AbnormalityInsight[]` output; does NOT re-classify |
| `analytics.ts` | Reads `AnalyticsModel` for evidence citation values |
| `bpTargets.ts` | Reads `BpAnalysisModel` for BP-related evidence |
| `riskAttribution.ts` | Reads `RiskDriver` data for capacity-related evidence |

---

## 5. V1.44 -- Operational Scenario v2

**New file**: `frontend/src/core/operationalScenario.ts`

### 5.1 Purpose

The v1.42 `scenarioEngine.ts` supports 4 global multipliers applied uniformly.
v1.44 adds three new scenario types that operate at finer granularity:

1. **CapacityShiftScenario** -- shift capacity by N months (delay/pull-forward)
2. **ForecastAdjustmentScenario** -- increase/decrease by percentage (can target specific customers/SKUs)
3. **OrderDisappearanceScenario** -- remove specific customer/SKU orders entirely

All produce a `ScenarioComparison` (reusing the existing type) so the UI can
display deltas the same way.

### 5.2 Key Design Decision: Extend, Do Not Modify

`scenarioEngine.ts` is NOT modified. The new module:
- Imports `ScenarioMultipliers`, `ScenarioComparison`, `computeScenarioComparison`,
  `applyScenarioMultipliers`, `clampMultipliers` from `scenarioEngine.ts`
- Imports `runCalculation` from `calculationEngine.ts`
- Imports `buildBpAnalysis`, `computeBpKpi` from `bpTargets.ts`
- Applies transformations to the raw data BEFORE passing to the scenario engine
- This keeps `scenarioEngine.ts` stable while adding new scenario types

### 5.3 CapacityShiftScenario

```typescript
/**
 * Shift capacity forward or backward by N months.
 *
 * Business scenario: Equipment delivery delayed by 2 months, or new production
 * line comes online 3 months early.
 *
 * How it works:
 * 1. For each capacity plan entry, shift its month by `shiftMonths` (+ = delay, - = pull forward)
 * 2. Months that fall outside the forecast range are dropped
 * 3. Months that lose capacity (shifted out) get zero capacity
 * 4. The shifted capacity plans are then passed to computeScenarioComparison
 */
export interface CapacityShiftScenario {
  /** Number of months to shift. Positive = delay, negative = pull forward. */
  shiftMonths: number;
  /** Which capacity metric to shift. 'both' shifts Core and BU together. */
  target: 'core' | 'bu' | 'both';
  /** Optional: only shift capacity for specific factory IDs. */
  factoryIds?: string[];
}

/**
 * Apply a capacity shift scenario and compute the comparison.
 *
 * Pure function. Does NOT modify scenarioEngine.ts.
 */
export function computeCapacityShiftScenario(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters,
  scenario: CapacityShiftScenario,
  baselineDqSummary: DataQualitySummary,
): ScenarioComparison;
```

**Implementation approach**:

```typescript
function shiftCapacityPlans(
  capacityPlans: CapacityPlan[],
  shiftMonths: number,
  target: 'core' | 'bu' | 'both',
  factoryIds?: string[],
): CapacityPlan[] {
  return capacityPlans
    .filter(cp => !factoryIds || factoryIds.includes(cp.factoryId))
    .map(cp => {
      const shifted = shiftMonthString(cp.month, shiftMonths);
      if (!shifted) return null; // dropped: outside valid range
      return {
        ...cp,
        month: shifted,
        corePanelPerDay: target === 'bu' ? cp.corePanelPerDay : cp.corePanelPerDay,
        buPanelPerDay: target === 'core' ? cp.buPanelPerDay : cp.buPanelPerDay,
      };
    })
    .filter((cp): cp is CapacityPlan => cp !== null);
}
```

### 5.4 ForecastAdjustmentScenario

```typescript
/**
 * Adjust forecast volume by a percentage, optionally scoped to specific
 * customers or SKUs.
 *
 * Business scenario: A customer increases orders by 15%, or a product family
 * sees a 20% demand drop.
 */
export interface ForecastAdjustmentScenario {
  /** Percentage adjustment (e.g., 0.15 = +15%, -0.20 = -20%). */
  adjustmentPercent: number;
  /** Scope: which forecasts to adjust. */
  scope: {
    /** Filter by customer names (empty = all customers). */
    customers?: string[];
    /** Filter by SKU IDs (empty = all SKUs). */
    skuIds?: string[];
    /** Filter by SKU codes (empty = all SKUs). */
    skuCodes?: string[];
    /** Filter by months (empty = all months). */
    months?: string[];
  };
}

/**
 * Apply a forecast adjustment scenario and compute the comparison.
 *
 * Pure function. Transforms forecasts before passing to scenarioEngine.
 */
export function computeForecastAdjustmentScenario(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters,
  scenario: ForecastAdjustmentScenario,
  baselineDqSummary: DataQualitySummary,
): ScenarioComparison;
```

**Implementation approach**: Build a filtered set of forecasts where matching
entries have their `forecastPcs` multiplied by `(1 + adjustmentPercent)`. Then
call `computeScenarioComparison` with multipliers `{ forecastVolume: 1.0, ... }`
(since the adjustment is already applied to the data).

### 5.5 OrderDisappearanceScenario

```typescript
/**
 * Remove specific customer or SKU orders entirely.
 *
 * Business scenario: A customer cancels their program, a product is
 * discontinued, or a trade restriction eliminates a market.
 */
export interface OrderDisappearanceScenario {
  /** Which orders to remove. */
  targets: {
    /** Remove all orders for these customers. */
    customers?: string[];
    /** Remove all orders for these SKU IDs. */
    skuIds?: string[];
    /** Remove all orders for these SKU codes. */
    skuCodes?: string[];
  };
  /** Months to apply removal (empty = all months). */
  months?: string[];
}

/**
 * Apply an order disappearance scenario and compute the comparison.
 *
 * Pure function. Filters out matching forecasts before passing to scenarioEngine.
 */
export function computeOrderDisappearanceScenario(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters,
  scenario: OrderDisappearanceScenario,
  baselineDqSummary: DataQualitySummary,
): ScenarioComparison;
```

### 5.6 CustomerSkuImpact

```typescript
/**
 * Per-customer, per-SKU impact analysis for any scenario type.
 *
 * Computes how each customer and SKU is affected by the scenario,
 * enabling drill-down into who gains/loses the most.
 */
export interface CustomerSkuImpact {
  /** Per-customer impact summary. */
  byCustomer: CustomerImpactRow[];
  /** Per-SKU impact summary (top 20 by absolute revenue delta). */
  bySku: SkuImpactRow[];
}

export interface CustomerImpactRow {
  customer: string;
  baseRevenue: number;
  scenarioRevenue: number;
  revenueDelta: number;
  revenueDeltaPercent: number;
  baseForecastPcs: number;
  scenarioForecastPcs: number;
  /** Whether this customer's SKUs experience capacity shortage in the scenario. */
  hasShortageInScenario: boolean;
}

export interface SkuImpactRow {
  skuId: string;
  skuCode: string;
  customer: string;
  baseRevenue: number;
  scenarioRevenue: number;
  revenueDelta: number;
  revenueDeltaPercent: number;
  /** Months where this SKU faces capacity shortage in the scenario. */
  shortageMonths: string[];
}

/**
 * Compute per-customer and per-SKU impact from a scenario comparison.
 *
 * Pure function. Uses the baseline and scenario skuResults from ScenarioComparison.
 */
export function computeCustomerSkuImpact(
  comparison: ScenarioComparison,
  skus: SKU[],
): CustomerSkuImpact;
```

### 5.7 Unified Entry Point

```typescript
export type OperationalScenarioConfig =
  | { type: 'capacityShift'; config: CapacityShiftScenario }
  | { type: 'forecastAdjustment'; config: ForecastAdjustmentScenario }
  | { type: 'orderDisappearance'; config: OrderDisappearanceScenario };

export interface OperationalScenarioResult {
  /** The scenario comparison (same structure as scenarioEngine output). */
  comparison: ScenarioComparison;
  /** Per-customer, per-SKU impact breakdown. */
  impact: CustomerSkuImpact;
  /** The scenario configuration that was applied. */
  config: OperationalScenarioConfig;
}

/**
 * Run any operational scenario and produce a full comparison with impact analysis.
 *
 * Pure function. Dispatches to the appropriate scenario handler.
 */
export function runOperationalScenario(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters,
  config: OperationalScenarioConfig,
  baselineDqSummary: DataQualitySummary,
): OperationalScenarioResult;
```

### 5.8 Relationship to Existing Modules

| Existing Module | How v1.44 Uses It |
|---|---|
| `scenarioEngine.ts` | Imports types (`ScenarioMultipliers`, `ScenarioComparison`) and functions (`computeScenarioComparison`, `applyScenarioMultipliers`); does NOT modify |
| `calculationEngine.ts` | Imports `runCalculation` for direct computation when scenario engine's global multipliers are insufficient |
| `bpTargets.ts` | Imports `buildBpAnalysis`, `computeBpKpi` for BP delta computation |
| `dataQuality.ts` | Imports `buildDataQualitySummary` for scenario DQ re-evaluation |

---

## 6. V1.45 -- Management Report

**New file**: `frontend/src/core/managementReport.ts`

### 6.1 Purpose

Generate deterministic management reports that summarize the operational state
of the workbench, including top risks, required fixes, scenario comparisons,
and AI-ready narratives. Reports can be exported as markdown or JSON.

### 6.2 Core Types

```typescript
export type ReportType = 'daily' | 'weekly';

export type ExportFormat = 'markdown' | 'json';

/**
 * A section of the management report.
 */
export interface ReportSection {
  /** Section identifier. */
  id: string;
  /** I18n key for the section title. */
  title: string;
  /** Section content type. */
  type: 'risk-list' | 'fix-list' | 'scenario-comparison' | 'narrative' | 'kpi-grid';
  /** Section data (structure depends on type). */
  data: Record<string, unknown>;
  /** Priority order (lower = higher priority). */
  priority: number;
}

/**
 * Complete management report.
 */
export interface ManagementReport {
  /** Report type. */
  reportType: ReportType;
  /** Generation timestamp (ISO 8601). */
  generatedAt: string;
  /** Report period (e.g., '2026-05-28' for daily, '2026-W22' for weekly). */
  period: string;
  /** Report sections, ordered by priority. */
  sections: ReportSection[];
  /** Executive summary (1-3 sentences). */
  executiveSummary: string;
  /** Confidence level of the underlying data. */
  dataConfidence: 'high' | 'medium' | 'low' | 'blocked';
  /** Export format used. */
  exportFormat: ExportFormat;
  /** The full exported content (markdown string or JSON object). */
  content: string | Record<string, unknown>;
}
```

### 6.3 Report Sections

```typescript
/**
 * Top risks section: ranked abnormalities with evidence.
 */
interface TopRisksSectionData {
  risks: Array<{
    rank: number;
    title: string;
    severity: 'critical' | 'warning' | 'info';
    category: string;
    evidence: string;
    recommendedAction: string;
  }>;
  totalRiskCount: number;
  criticalCount: number;
}

/**
 * Required fixes section: high-impact DQ issues with fix suggestions.
 */
interface RequiredFixesSectionData {
  fixes: Array<{
    issueId: string;
    domain: string;
    title: string;
    impact: 'high' | 'medium';
    suggestion: string;
    draft: boolean;
  }>;
  totalFixCount: number;
}

/**
 * Scenario comparison section: baseline vs scenario deltas.
 */
interface ScenarioComparisonSectionData {
  scenarioLabel: string;
  deltas: Array<{
    metric: string;
    base: number | null;
    scenario: number | null;
    delta: number | null;
    deltaPercent: number | null;
    direction: 'improved' | 'degraded' | 'unchanged';
  }>;
  customerImpact: Array<{
    customer: string;
    revenueDelta: number;
  }>;
}

/**
 * KPI grid section: key metrics at a glance.
 */
interface KpiGridSectionData {
  metrics: Array<{
    label: string;
    value: number | string;
    unit: string;
    status: 'good' | 'watch' | 'critical';
    trend: 'up' | 'down' | 'flat' | null;
  }>;
}

/**
 * AI narrative section: structured narrative for AI consumption.
 */
interface NarrativeSectionData {
  paragraphs: string[];
  keyTakeaways: string[];
  openQuestions: string[];
}
```

### 6.4 Main Entry Point

```typescript
export interface ManagementReportInput {
  /** Workbench view model (from buildWorkbenchViewModel). */
  workbench: WorkbenchViewModel;
  /** Data quality summary. */
  dqSummary: DataQualitySummary;
  /** Analytics model (null if data insufficient). */
  analyticsModel: AnalyticsModel | null;
  /** BP analysis model (null if no BP targets). */
  bpModel: BpAnalysisModel | null;
  /** Optional: scenario comparison to include in the report. */
  scenarioComparison?: ScenarioComparison | null;
  /** Optional: operational scenario impact analysis. */
  scenarioImpact?: CustomerSkuImpact | null;
  /** Report type. */
  reportType: ReportType;
  /** Export format. */
  exportFormat: ExportFormat;
  /** Override current date for testability. */
  currentDate?: Date;
}

/**
 * Build a deterministic management report.
 *
 * Same input always produces the same output. No side effects.
 * No imports from services/**.
 */
export function buildManagementReport(
  input: ManagementReportInput,
): ManagementReport;
```

### 6.5 Determinism Guarantee

The report is deterministic because:
1. All inputs are plain data objects (no Dates except the optional `currentDate` override)
2. All computations are pure transformations
3. No random values, no `Math.random()`, no `Date.now()`
4. Array ordering is stable (sorted by deterministic keys)
5. String formatting uses fixed precision (e.g., `toFixed(1)`)

### 6.6 Markdown Export

```typescript
/**
 * Export a ManagementReport as a markdown string.
 *
 * Sections are rendered in priority order with H2 headers.
 * Tables use pipe-delimited markdown format.
 * Numbers use fixed precision (1 decimal for TWD, 1 decimal for percentages).
 */
export function exportReportAsMarkdown(report: ManagementReport): string;
```

### 6.7 JSON Export

```typescript
/**
 * Export a ManagementReport as a JSON-serializable object.
 *
 * All numbers use fixed precision. Dates are ISO 8601 strings.
 * The output is suitable for API consumption or AI prompt injection.
 */
export function exportReportAsJson(report: ManagementReport): Record<string, unknown>;
```

### 6.8 Relationship to Existing Modules

| Existing Module | How v1.45 Uses It |
|---|---|
| `workbench.ts` | Consumes `WorkbenchViewModel` as primary input |
| `dataQuality.ts` | Consumes `DataQualitySummary` for data confidence and fix suggestions |
| `analytics.ts` | Consumes `AnalyticsModel` for KPI metrics and trend data |
| `bpTargets.ts` | Consumes `BpAnalysisModel` for BP attainment sections |
| `scenarioEngine.ts` | Consumes `ScenarioComparison` for scenario comparison sections |
| `abnormalityIntelligence.ts` | Consumes `AbnormalityIntelligenceOutput` for risk ranking (v1.43) |
| `operationalScenario.ts` | Consumes `CustomerSkuImpact` for customer impact sections (v1.44) |

---

## 7. Integration with AI Copilot

### 7.1 New AI Copilot Tools (future)

The new modules enable additional deterministic tools for `aiCopilotTools.ts`:

| Tool | Module | Description |
|---|---|---|
| `explainAbnormalityIntelligence` | v1.43 | Returns ranked abnormalities with evidence citations and "why it matters" |
| `runOperationalScenario` | v1.44 | Runs a specified scenario type and returns comparison with impact |
| `generateManagementReport` | v1.45 | Generates a report in the requested format |

These tools follow the same `CopilotToolResult` interface as the existing 7 tools.
They import from the new core modules only (not from services).

### 7.2 AI Context Extension

The `AiCopilotContext` in `aiCopilotContext.ts` can be extended (in a future version)
to include:

```typescript
// Future extension to AiCopilotContext
readonly abnormalityIntelligence?: {
  mustActToday: Array<{ title: string; severityScore: number; whyItMatters: string }>;
  topCategory: string | null;
};
```

This does NOT modify `aiCopilotContext.ts` in v1.43-v1.45. It is noted here for
future planning only.

---

## 8. File Inventory

| File | Change Type | Version | Description |
|---|---|---|---|
| `frontend/src/core/abnormalityIntelligence.ts` | **New** | v1.43 | Taxonomy, severity ranker, evidence citation, narrative |
| `frontend/src/core/operationalScenario.ts` | **New** | v1.44 | Capacity shift, forecast adjustment, order disappearance, per-customer/SKU impact |
| `frontend/src/core/managementReport.ts` | **New** | v1.45 | Report builder, markdown/JSON export |
| `frontend/src/core/workbench.ts` | Read-only | -- | Consumed by all three modules; NOT modified |
| `frontend/src/core/scenarioEngine.ts` | Read-only | -- | Types and functions imported by v1.44; NOT modified |
| `frontend/src/core/dataQuality.ts` | Read-only | -- | `DataQualityIssue` reused by v1.43; NOT modified |
| `frontend/src/core/calculationEngine.ts` | Read-only | -- | `runCalculation` imported by v1.44; NOT modified |
| `frontend/src/core/bpTargets.ts` | Read-only | -- | Imported by v1.44 and v1.45; NOT modified |
| `frontend/src/core/analytics.ts` | Read-only | -- | Imported by v1.43 and v1.45; NOT modified |
| `frontend/src/core/riskAttribution.ts` | Read-only | -- | Evidence source for v1.43; NOT modified |
| `frontend/src/core/aiCopilotTools.ts` | Read-only | -- | Future extension point; NOT modified in v1.43-v1.45 |

---

## 9. Testing Strategy

### 9.1 Unit Tests (per module)

| Module | Test File | Key Test Cases |
|---|---|---|
| v1.43 | `abnormalityIntelligence.test.ts` | Taxonomy lookup, severity ranking order, evidence citation generation, narrative determinism |
| v1.44 | `operationalScenario.test.ts` | Capacity shift produces shifted months, forecast adjustment targets correct SKUs, order disappearance removes correct forecasts, customer/SKU impact matches deltas |
| v1.45 | `managementReport.test.ts` | Same input produces same output (determinism), markdown export contains all sections, JSON export is serializable, report sections ordered by priority |

### 9.2 Integration Tests

- v1.43 + v1.45: Generate report with abnormality intelligence section
- v1.44 + v1.45: Generate report with scenario comparison section
- v1.43 + v1.44: Run scenario, then rank abnormalities on scenario results

### 9.3 Smoke Tests

- Load project with sample data
- Call `buildAbnormalityIntelligence` -- verify ranked output is non-empty
- Call `runOperationalScenario` with each scenario type -- verify deltas are computed
- Call `buildManagementReport` -- verify report contains all expected sections

---

## 10. Migration Notes

### 10.1 No Breaking Changes

All existing modules remain unchanged. The new modules are additive:

- `workbench.ts` continues to produce `WorkbenchViewModel` as before
- `scenarioEngine.ts` continues to export `ScenarioMultipliers` and `computeScenarioComparison`
- `dataQuality.ts` continues to produce `DataQualitySummary`

### 10.2 Adoption Path

1. **v1.43**: Workbench page can optionally call `buildAbnormalityIntelligence` to
   enrich the abnormality panel. Existing behavior is unchanged if not called.
2. **v1.44**: Scenario Planning page can offer new scenario types alongside existing
   multiplier-based scenarios. Both paths produce `ScenarioComparison`.
3. **v1.45**: A new "Generate Report" button on the Workbench page calls
   `buildManagementReport` and offers download in markdown or JSON.

---

## 11. Open Questions

1. **v1.43 taxonomy size**: Should the taxonomy cover all possible DQ issue IDs
   statically, or should it gracefully handle unknown IDs with a default entry?
   **Recommendation**: Default entry for unknown IDs, with static entries for
   all known patterns.

2. **v1.44 shift range**: What is the maximum allowed `shiftMonths` value?
   **Recommendation**: Clamp to [-12, +12] months to prevent nonsensical scenarios.

3. **v1.45 weekly report**: Should the weekly report compare against the previous
   week's report, or is it a standalone snapshot?
   **Recommendation**: Standalone snapshot for v1.45; diffing can be added later.

4. **v1.45 report caching**: Should reports be cached or re-generated on every call?
   **Recommendation**: Re-generated (they are pure functions and fast to compute).
