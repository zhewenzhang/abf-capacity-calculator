# ABF Capacity Calculator v1.43.0 to v1.45.0 Product Plan

Date: 2026-05-28
Author: Product Manager Agent
Branch: xiaomi/v1-41-ai-copilot-reliability-marathon

---

## 1. Current State Summary (as of v1.42)

v1.42 Daily Operations Workbench is complete and committed. The workbench provides:

- **Workflow stage stepper** with 7 stages (Products, Forecasts, Capacity, Parameters, BP Targets, Analysis, Scenario), each with derived status (ready/warning/blocked/notStarted).
- **Abnormality summary** grouped by domain (data, capacity, sales, bp, scenario), showing up to 10 insights sorted by severity.
- **Look-ahead focus panel** showing next 6 months with utilization > 85% or shortage.
- **Revenue/BP summary** with current revenue, target, attainment %, and gap.
- **Scenario shortcuts** with 5 presets (volume up/down, capacity up, price up, stress test).
- **Copilot quick actions** linking to AI Copilot page.
- **7 deterministic AI Copilot tools**: inspectDataQuality, explainCapacityRisk, explainBpGap, suggestDataFixes, explainScenarioImpact, buildLookAheadFocus, explainWorkbenchOverview.

Key existing modules:
- `workbench.ts` (703 lines) -- WorkbenchViewModel builder
- `dataQuality.ts` (493 lines) -- Data quality engine with 15+ issue types
- `scenarioEngine.ts` (187 lines) -- Global multiplier scenario comparison
- `aiCopilotTools.ts` (1025 lines) -- 7 deterministic diagnostic tools + keyword router
- `scenarioExport.ts` (254 lines) -- Sanitized JSON export

---

## 2. v1.43.0 -- Abnormality Intelligence Layer

### 2.1 User Value

The current workbench shows abnormalities as flat lists with basic severity tags. Users cannot quickly answer: "What is the single most important thing I should fix right now?" or "Why does this abnormality matter for today's planning decision?" v1.43 transforms the abnormality surface from a notification wall into a prioritized, evidence-backed decision queue.

### 2.2 Scope

#### 2.2.1 Abnormality Classification Taxonomy

Define a structured taxonomy with 5 domains and specific subtypes:

**Data Domain (6 subtypes)**:
1. `data:missing-sku-attributes` -- SKU has missing chipLengthMm, chipWidthMm, layerCount, sizeCategory, or unitPrice
2. `data:unsupported-currency` -- SKU uses currency outside USD/TWD/CNY
3. `data:zero-unit-price` -- SKU or forecast has unitPrice == 0
4. `data:missing-exchange-rate` -- TWD or CNY exchange rate missing for active forecast years
5. `data:orphan-forecast` -- Forecast references non-existent SKU
6. `data:partial-year-forecast` -- SKU has forecast for fewer than 12 months in a year

**Capacity Domain (5 subtypes)**:
1. `capacity:missing-months` -- Forecast demand exists but no capacity configuration for those months
2. `capacity:zero-capacity-with-demand` -- BU demand exists for layered SKUs but BU capacity is 0
3. `capacity:high-utilization` -- Core or BU utilization exceeds 90% in a month
4. `capacity:shortage` -- Core or BU shortage panels > 0 in a month
5. `capacity:bottleneck-concentration` -- Same process (Core or BU) is bottleneck for 3+ consecutive months

**Sales Domain (4 subtypes)**:
1. `sales:forecast-volume-spike` -- Month-over-month volume change exceeds +30%
2. `sales:forecast-volume-drop` -- Month-over-month volume change exceeds -30%
3. `sales:customer-concentration` -- Top customer contributes > 50% of total forecast volume
4. `sales:revenue-trend-declining` -- Quarterly revenue trend is decreasing across 2+ consecutive quarters

**BP Domain (3 subtypes)**:
1. `bp:target-missed` -- Attainment < 80% for a year with active BP target
2. `bp:target-at-risk` -- Attainment between 80-100% for a year with active BP target
3. `bp:missing-target-with-forecast` -- Forecast demand exists but no BP target configured for that year

**Scenario Domain (2 subtypes)**:
1. `scenario:sensitivity-high` -- A scenario preset produces > 10% revenue delta
2. `scenario:shortage-amplification` -- A scenario preset increases shortage month count by 2+

Total: 20 abnormality subtypes across 5 domains.

#### 2.2.2 Severity Ranking Algorithm

Each abnormality receives a composite score based on three factors:

| Factor | Weight | Calculation |
|--------|--------|-------------|
| Decision Impact | 40% | high=100, medium=60, low=20 |
| Time Sensitivity | 35% | current month=100, next 3 months=70, future=30 |
| Financial Exposure | 25% | Based on affected revenue in M TWD, scaled 0-100 |

Composite Score = (decisionImpact * 0.4) + (timeSensitivity * 0.35) + (financialExposure * 0.25)

Ranking rules:
- Score >= 80: critical (red)
- Score 50-79: warning (orange)
- Score < 50: info (blue)

Display order: critical first (highest score at top), then warning, then info.

#### 2.2.3 Evidence Citation

Every abnormality insight must include a structured evidence block:

```typescript
interface AbnormalityEvidence {
  // Numeric proof
  metrics: Record<string, number>;
  // Affected entities
  affectedMonths: string[];      // e.g., ["2026-07", "2026-08"]
  affectedSkuIds: string[];
  affectedCustomers: string[];
  // Source data reference
  sourceModule: string;          // e.g., "dataQuality", "calculationEngine"
  sourceIssueIds: string[];      // e.g., ["forecast-orphan-sku-abc123"]
}
```

Evidence rules:
- Every numeric claim must trace back to a specific field in the calculation or data quality output.
- No invented values. If data is missing, the evidence says "not available" rather than guessing.
- Evidence fields are shown as a collapsible detail panel beneath each abnormality card.

#### 2.2.4 "Why This Matters Today" Feature

Each critical or warning abnormality gets a one-sentence "why today" explanation generated from a deterministic template engine (no AI API call). The template selects context based on:

1. Which workflow stages are blocked or warning.
2. How many look-ahead months are affected.
3. Whether BP targets are at risk.

Example outputs:
- "This orphan forecast blocks revenue calculation for 3 months, directly reducing forecast reliability for the Q3 BP review."
- "BU capacity is zero for months with layered SKU demand -- analysis results for those months are unreliable."
- "Top customer contributes 62% of forecast volume; any demand change from this customer would materially impact revenue."

Template engine is deterministic: same input always produces same output.

#### 2.2.5 Copilot Tool Upgrade

Add a new tool `prioritizeAbnormalities(context)` that returns the top 5 abnormalities sorted by composite score, each with evidence citation and "why today" explanation. This tool is callable from the keyword router with keywords: "prioritize", "top issues", "most important", "urgent", "priority".

### 2.3 Scope Boundary

**In scope**:
- Abnormality taxonomy with 20 subtypes
- Composite scoring algorithm
- Evidence citation structure
- "Why this matters today" template engine
- Updated workbench UI with ranked abnormality cards
- New `prioritizeAbnormalities` copilot tool
- Unit tests for scoring algorithm and template engine
- I18n for all new strings (en, zhTW)

**Out of scope**:
- External AI API calls for explanation generation
- Abnormality persistence or history tracking
- Abnormality acknowledgment/dismiss workflow
- Custom user-defined abnormality rules
- Real-time streaming updates

### 2.4 Dependencies

- Depends on v1.42 workbench core (`workbench.ts`, `AbnormalityInsight` interface)
- Depends on v1.42 data quality engine (`dataQuality.ts`, `DataQualityIssue`)
- Depends on existing analytics model for sales domain signals
- No new Firestore schema required
- No new external dependencies

### 2.5 Risk of Scope Creep

**Medium**. The taxonomy definition (20 subtypes) is bounded and testable. Risk areas:
- Template engine for "why today" could grow complex if too many conditional branches are added. Mitigation: cap at 5 template patterns, use data-driven selection.
- Evidence citation could expand into full audit logging. Mitigation: evidence is display-only, not persisted.

### 2.6 Estimated Complexity

**M** (Medium). Core work:
- New module: `abnormalityClassifier.ts` (~300 lines)
- New module: `abnormalityScoring.ts` (~150 lines)
- New module: `abnormalityTemplates.ts` (~200 lines)
- Update: `workbench.ts` to use new classifier
- Update: `DailyOperationsWorkbench.tsx` for ranked card UI
- Update: `aiCopilotTools.ts` with new tool
- Tests: ~400 lines

### 2.7 Acceptance Criteria

1. All 20 abnormality subtypes are defined with a unique ID, domain, and description.
2. Composite scoring algorithm produces deterministic scores for any input dataset.
3. Abnormalities are displayed in score-descending order on the workbench page.
4. Each critical/warning abnormality shows an evidence panel with at least 2 data points traceable to source modules.
5. Each critical/warning abnormality shows a "why today" sentence that references blocked stages, affected months, or BP risk.
6. The `prioritizeAbnormalities` copilot tool returns the top 5 ranked abnormalities with evidence and "why today" text.
7. All new strings are available in en.ts and zhTW.ts.
8. Unit tests cover: scoring algorithm edge cases, template selection logic, evidence completeness.
9. No external API calls are introduced.
10. No new Firestore schema or collections are added.

---

## 3. v1.44.0 -- Scenario v2 / Operational What-if

### 3.1 User Value

v1.42 scenario planning only supports 4 global multipliers (forecast volume, unit price, core capacity, BU capacity). Real operational decisions are more granular: "What if the new BU line ramps 2 months late?" or "What if Customer A's forecast drops 20%?" or "What if we lose the Q4 order from Customer B entirely?" v1.44 extends the scenario engine from blunt multipliers to operational simulations that match how planners actually think.

### 3.2 Scope

#### 3.2.1 Simulation Types

**Type 1: Capacity Delay Simulation**
- User selects a capacity plan row (month + line) and shifts it forward by N months (1-6).
- Affected months: the original month loses capacity, the target month (original + N) gains capacity.
- Capacity values are redistributed, not scaled.
- UI: dropdown to select month, slider for N months delay.

**Type 2: Capacity Pull-Forward Simulation**
- Same as delay but shifts capacity backward by N months.
- Clamped so target month >= earliest configured month.
- UI: same controls as delay, reversed direction.

**Type 3: Forecast Increase/Decrease by Percentage**
- User selects a percentage (-50% to +50%) applied to all forecasts, or filtered by:
  - Specific SKU(s)
  - Specific customer(s) (if customer field exists on forecast)
  - Specific month range
- Unlike global multiplier, this supports per-dimension filtering.
- UI: percentage slider + optional SKU/customer/month filter chips.

**Type 4: Order Disappearance Simulation**
- User selects specific SKU-month combinations to zero out.
- Forecasts for selected combinations become 0.
- This simulates order cancellation or customer loss.
- UI: table of forecast rows with checkboxes to "remove" orders.

**Type 5: Customer/SKU Level Impact Analysis**
- Not a separate simulation type, but a reporting layer on top of any simulation.
- After running a simulation, the delta report breaks down impact by:
  - Per-customer revenue delta
  - Per-SKU revenue delta
  - Per-month revenue delta
  - Per-customer BP contribution delta
- UI: expandable breakdown table below the main delta report.

#### 3.2.2 Delta Reporting

For every simulation, produce a structured delta report:

```typescript
interface ScenarioV2Deltas {
  // Aggregate deltas (inherited from v1 scenario)
  totalRevenueUsd: DeltaMetric;
  totalForecastPcs: DeltaMetric;
  shortageMonthCount: DeltaMetric;
  bpAttainmentPct: DeltaMetric;
  bpGapMillionTwd: DeltaMetric;
  maxCoreUtilization: DeltaMetric;
  maxBuUtilization: DeltaMetric;

  // NEW: Dimension-level deltas
  byCustomer: Array<{
    customerId: string;
    customerName: string;
    revenueDelta: number;      // in USD
    revenueDeltaPercent: number;
  }>;
  bySku: Array<{
    skuId: string;
    skuCode: string;
    revenueDelta: number;
    revenueDeltaPercent: number;
  }>;
  byMonth: Array<{
    month: string;
    revenueDelta: number;
    utilizationDelta: number;  // change in max utilization
    shortageDelta: number;     // change in shortage panels
  }>;
}
```

#### 3.2.3 Scenario Engine Changes

Current engine (`scenarioEngine.ts`) applies multipliers in `applyScenarioMultipliers()`. v1.44 extends this with:

- `applyCapacityShift(capacityPlans, month, lineType, shiftMonths)` -- redistributes capacity
- `applyForecastFilter(forecasts, percentage, filters)` -- filtered percentage change
- `applyOrderRemoval(forecasts, removalSet)` -- zeros selected SKU-month combos
- `computeDimensionDeltas(baseResult, scenarioResult, skus)` -- per-customer/SKU/month breakdown

All functions remain pure, in-memory, no side effects.

#### 3.2.4 Preset Simulations

Add 3 new presets to the workbench scenario shortcuts:

| Preset ID | Label | Description |
|-----------|-------|-------------|
| `bu-delay-2m` | BU Line +2M Delay | Shift BU capacity forward 2 months |
| `top-customer-down-20` | Top Customer -20% | Reduce top customer forecast by 20% |
| `q4-order-loss` | Q4 Order Loss | Zero out all Q4 forecasts |

### 3.3 Scope Boundary

**In scope**:
- 4 simulation types (capacity delay, capacity pull-forward, filtered forecast %, order disappearance)
- Dimension-level delta reporting (by customer, by SKU, by month)
- 3 new preset simulations on workbench
- Updated ScenarioPlanning page with new simulation controls
- Updated scenario export to include dimension deltas
- Unit tests for each simulation type
- I18n for all new strings

**Out of scope**:
- Multi-scenario persistence (save/share/compare multiple scenarios)
- Scenario approval workflow
- Scenario attachment to snapshots
- Real-time collaborative scenario editing
- Scenario versioning
- Undo/redo for simulation steps

### 3.4 Dependencies

- Depends on v1.42 scenario engine (`scenarioEngine.ts`, `ScenarioMultipliers`)
- Depends on v1.42 workbench (`workbench.ts`, `ScenarioPreset`)
- Depends on existing `calculationEngine.ts` for re-running calculations
- Depends on existing `bpTargets.ts` for BP delta computation
- May depend on v1.43 abnormality scoring to highlight simulation-sensitive abnormalities
- No new Firestore schema required (scenarios remain in-memory)

### 3.5 Risk of Scope Creep

**High**. This is the most scope-creep-prone version because:
- "Dimension-level impact analysis" can expand to include arbitrary cross-dimensional breakdowns (customer x SKU x month).
- Capacity shift simulation needs careful edge-case handling (what if shift target exceeds data range?).
- UI for selecting specific SKU-month combinations for order removal could become a full spreadsheet editor.

Mitigation:
- Cap dimension breakdown to 3 fixed axes: customer, SKU, month. No cross-dimensional pivots.
- Capacity shift clamped to configured data range with clear error messages.
- Order removal UI uses a simple table with checkboxes, not an editable spreadsheet.
- Strict "no persistence" rule: all scenarios are in-memory only.

### 3.6 Estimated Complexity

**L** (Large). Core work:
- New module: `scenarioV2Engine.ts` (~400 lines)
- Update: `scenarioEngine.ts` with new simulation functions
- Update: `ScenarioPlanning.tsx` with new simulation controls (~300 lines new UI)
- Update: `scenarioExport.ts` to include dimension deltas
- Update: `workbench.ts` with 3 new presets
- Update: `DailyOperationsWorkbench.tsx` for new preset buttons
- Tests: ~600 lines

### 3.7 Acceptance Criteria

1. Capacity delay simulation shifts capacity forward by N months and re-runs calculation correctly.
2. Capacity pull-forward simulation shifts capacity backward by N months without exceeding data boundaries.
3. Filtered forecast percentage change applies only to selected SKU/customer/month combinations.
4. Order disappearance zeros selected SKU-month forecast combinations.
5. Dimension-level delta report shows per-customer, per-SKU, and per-month revenue deltas for any simulation.
6. All 3 new presets are accessible from the workbench and produce valid delta reports.
7. Scenario export JSON includes dimension-level deltas.
8. Scenario remains in-memory only; no data is persisted to Firestore.
9. All new strings are available in en.ts and zhTW.ts.
10. Unit tests cover: each simulation type with normal inputs, edge cases (zero capacity, empty filters, out-of-range shifts), and dimension delta accuracy.
11. Viewer role cannot modify simulation parameters (read-only guard).

---

## 4. v1.45.0 -- Management Report Pack

### 4.1 User Value

Planners currently have no way to produce a structured report summarizing the current operational state for management review. They manually copy numbers from multiple pages into emails or slides. v1.45 provides one-click report generation with deterministic numbers and optional AI narrative drafts, turning the workbench into a report production tool.

### 4.2 Scope

#### 4.2.1 Daily Review Report

Contents:
1. **Header**: Report date, workspace name, generation timestamp
2. **Pipeline Readiness Summary**: Table of 7 workflow stages with status (ready/warning/blocked)
3. **Data Quality Snapshot**: Confidence score, issue count by severity, top 3 high-impact issues
4. **Capacity Risk Summary**: Shortage month count, worst month, bottleneck type, utilization range
5. **Revenue vs BP Summary**: Current forecast revenue, BP target, attainment %, gap
6. **Top Abnormalities**: Ranked list of top 5 abnormalities from v1.43 with severity and "why today"
7. **Look-Ahead Focus**: Next 3 months with highest risk (utilization > 85% or shortage)
8. **Recommended Actions**: Top 3 prioritized actions from copilot tools

#### 4.2.2 Weekly Review Report

Contents includes everything in Daily Review Report, plus:
1. **Week-over-week trend**: Comparison with previous weekly report (if available, otherwise "first report")
2. **Scenario comparison section**: If a scenario was run, include baseline vs scenario delta table
3. **BP trajectory**: Quarterly BP forecast with trend direction
4. **Capacity utilization trend**: 3-month rolling average utilization
5. **Risk heat map**: Month x domain matrix showing risk severity

#### 4.2.3 Export Formats

**Markdown Export**:
```markdown
# ABF Capacity Planning Report
**Date:** 2026-05-28
**Workspace:** [workspace name]
**Generated:** 2026-05-28T14:30:00Z

## Pipeline Readiness
| Stage | Status | Issues |
|-------|--------|--------|
| Products | Ready | 0 |
| Forecasts | Warning | 2 |
...

## Data Quality
- Confidence: Medium (72/100)
- High-impact issues: 2
...

## Top Risks
1. [Critical] BU capacity shortage in 2026-07 (Core: 0 panels, BU: -1,200 panels)
...

## Required Fixes
1. [High] Fix orphan forecast for SKU-123 in 2026-08
...

## Recommended Actions
1. Prioritize BU capacity configuration for Q3 2026
...
```

**JSON Export**:
```json
{
  "reportType": "daily",
  "generatedAt": "2026-05-28T14:30:00Z",
  "workspaceName": "...",
  "pipelineReadiness": { ... },
  "dataQuality": { ... },
  "capacityRisk": { ... },
  "revenueBp": { ... },
  "topAbnormalities": [ ... ],
  "lookAhead": [ ... ],
  "recommendedActions": [ ... ],
  "scenarioComparison": null,
  "aiNarrative": null
}
```

#### 4.2.4 Report Sections Detail

**Top Risks Section**:
- Derived from v1.43 abnormality scoring
- Maximum 5 risks, sorted by composite score descending
- Each risk includes: domain, severity, title, affected months, financial exposure estimate
- Financial exposure = affected forecast revenue in M TWD

**Required Fixes Section**:
- Derived from data quality high-impact issues
- Each fix includes: issue ID, domain, title, recommended action, estimated confidence improvement
- Fixes are ordered by confidence score impact (highest improvement first)

**Scenario Comparison Section** (conditional):
- Only included if a scenario has been run in the current session
- Includes: multiplier settings, aggregate deltas, dimension-level deltas (from v1.44)
- Formatted as a comparison table: baseline | scenario | delta | delta %

**AI Narrative Draft** (conditional):
- Only included if BYOK provider is configured and active
- Uses `explainWorkbenchOverview` tool output as base
- Adds a 3-5 sentence narrative summarizing the operational state
- Marked as "AI-generated draft, requires human review"
- Includes all caveats from the copilot tool output
- Narrative is appended to the report, never replaces deterministic numbers

#### 4.2.5 Report Generation Module

New module `reportGenerator.ts`:
- Pure function, no side effects
- Consumes `WorkbenchViewModel`, optional `ScenarioComparison`, optional `CopilotToolResult`
- Produces `DailyReport` or `WeeklyReport` object
- Two export functions: `exportReportMarkdown(report)`, `exportReportJson(report)`
- Report is generated client-side, no server round-trip

### 4.3 Scope Boundary

**In scope**:
- Daily Review Report with 8 sections
- Weekly Review Report with 5 additional sections
- Markdown export with UTF-8 BOM
- JSON export with sorted keys
- Top risks section (from v1.43 scoring)
- Required fixes section (from data quality engine)
- Scenario comparison section (conditional, from v1.44)
- AI narrative draft (conditional, from BYOK provider)
- I18n for all report strings
- Unit tests for report generation and export formatting

**Out of scope**:
- Report scheduling or automated generation
- Email delivery of reports
- PDF export
- Report storage or history
- Custom report templates
- Report sharing via URL
- Charts or visualizations in reports (text/table only)
- Report approval workflow

### 4.4 Dependencies

- Depends on v1.42 workbench core (`WorkbenchViewModel`)
- Depends on v1.43 abnormality scoring (for top risks section)
- Depends on v1.44 scenario v2 (for dimension-level deltas in scenario comparison section)
- Depends on existing `scenarioExport.ts` patterns for JSON sanitization
- Depends on existing `aiCopilotTools.ts` for AI narrative draft
- No new Firestore schema required

### 4.5 Risk of Scope Creep

**Medium-High**. Risk areas:
- Report formatting could expand to include charts, PDF generation, or rich layouts.
- AI narrative could grow into full report authoring with multiple sections.
- Weekly report trend comparison requires storing previous report state.

Mitigation:
- Reports are text and tables only. No charts, no PDF.
- AI narrative is a single 3-5 sentence block, not section-by-section AI writing.
- Weekly trend comparison uses session-only state (no persistence). If no previous report exists, show "first report, no trend available."

### 4.6 Estimated Complexity

**M** (Medium). Core work:
- New module: `reportGenerator.ts` (~350 lines)
- New module: `reportExport.ts` (~150 lines)
- New component: `ReportPreview.tsx` (~200 lines)
- Update: `DailyOperationsWorkbench.tsx` with "Generate Report" button
- Update: `aiCopilotTools.ts` with `generateNarrativeDraft` function
- Tests: ~400 lines

### 4.7 Acceptance Criteria

1. Daily Review Report includes all 8 sections with deterministic numbers sourced from existing calculation modules.
2. Weekly Review Report includes all 13 sections (8 daily + 5 weekly additions).
3. Markdown export produces valid markdown with UTF-8 BOM encoding.
4. JSON export produces valid JSON with alphabetically sorted keys at every level.
5. Top risks section displays up to 5 risks sorted by v1.43 composite score.
6. Required fixes section displays data quality high-impact issues ordered by confidence score improvement.
7. Scenario comparison section appears only when a scenario has been run; otherwise shows "No scenario active."
8. AI narrative draft appears only when BYOK provider is active; otherwise section is omitted.
9. AI narrative draft includes the caveat "AI-generated draft, requires human review."
10. All report numbers are traceable to source calculation modules (no invented values).
11. Viewer role can generate and view reports but cannot modify report parameters.
12. All new strings are available in en.ts and zhTW.ts.
13. Unit tests cover: report structure completeness, export format validity, conditional section inclusion/exclusion.

---

## 5. Version Dependency Graph

```
v1.42 (Workbench MVP) -- already complete
    |
    v
v1.43 (Abnormality Intelligence)
    |
    +-- depends on: workbench.ts, dataQuality.ts, aiCopilotTools.ts
    |
    v
v1.44 (Scenario v2)
    |
    +-- depends on: scenarioEngine.ts, calculationEngine.ts
    +-- may use: v1.43 abnormality scoring for sensitivity analysis
    |
    v
v1.45 (Management Report Pack)
    |
    +-- depends on: v1.42 workbench, v1.43 scoring, v1.44 scenario deltas
    +-- depends on: aiCopilotTools.ts for AI narrative
```

## 6. Complexity Summary

| Version | Scope | Complexity | Key Risk | Estimated New Code |
|---------|-------|------------|----------|-------------------|
| v1.43.0 | Abnormality Intelligence | M | Template engine growth | ~1,050 lines + ~400 tests |
| v1.44.0 | Scenario v2 | L | Dimension breakdown scope creep | ~700 lines + ~600 tests |
| v1.45.0 | Management Report | M | Report formatting expansion | ~700 lines + ~400 tests |

## 7. Strategic Sequencing Rationale

**v1.43 before v1.44**: The abnormality intelligence layer provides the prioritization framework that makes scenario planning more actionable. Without it, users run scenarios blindly without knowing which abnormalities to test.

**v1.44 before v1.45**: The management report needs scenario comparison data from v1.44 to populate the scenario comparison section. Shipping v1.45 first would require a placeholder "no scenario data" section that gets replaced in the next version.

**All three versions share**: No new Firestore schema, no new external dependencies, no changes to core formulas. All modules are pure functions with unit tests. This preserves the project's existing architectural constraints.

## 8. Critical Files Reference

| File | Role | Used By |
|------|------|---------|
| `frontend/src/core/workbench.ts` | WorkbenchViewModel builder | v1.43, v1.44, v1.45 |
| `frontend/src/core/dataQuality.ts` | Data quality engine | v1.43, v1.45 |
| `frontend/src/core/scenarioEngine.ts` | Scenario comparison | v1.44 |
| `frontend/src/core/aiCopilotTools.ts` | 7 copilot tools | v1.43 (new tool), v1.45 (narrative) |
| `frontend/src/core/scenarioExport.ts` | Scenario JSON export | v1.44 (dimension deltas) |
| `frontend/src/core/calculationEngine.ts` | Core calculation | v1.44 (re-run) |
| `frontend/src/core/bpTargets.ts` | BP analysis | v1.44, v1.45 |
| `frontend/src/pages/DailyOperationsWorkbench.tsx` | Workbench UI | v1.43, v1.44, v1.45 |
| `frontend/src/pages/ScenarioPlanning.tsx` | Scenario UI | v1.44 |
| `frontend/src/i18n/en.ts` | English strings | v1.43, v1.44, v1.45 |
| `frontend/src/i18n/zhTW.ts` | Traditional Chinese strings | v1.43, v1.44, v1.45 |

## 9. Product Rules Preserved Across All Versions

1. No new Firestore collections or schema fields.
2. No external AI API calls without explicit BYOK configuration.
3. All numbers in reports are deterministic and traceable to calculation modules.
4. AI narrative is always marked as draft and requires human review.
5. Viewer role is read-only across all new features.
6. Scenarios remain in-memory only (no persistence in v1.43-v1.45).
7. BP target unit remains Million TWD.
8. No modifications to core calculation formulas.
9. All new modules are pure functions with no side effects.
10. All new strings must be available in both en.ts and zhTW.ts.
