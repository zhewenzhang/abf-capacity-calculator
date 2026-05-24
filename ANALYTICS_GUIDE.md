# Analytics Guide

## Dashboard Purpose

The Dashboard is an **executive summary** — it answers three questions at a glance:

1. **Which year has problems?** — Yearly Capacity Health matrix shows severity (red/orange/green) per year.
2. **How is revenue trending?** — Revenue trend arrow + peak revenue year.
3. **What is the bottleneck?** — Max Core/BU utilization + shortage month count.

## Results Purpose

The Calculation Results page is the **detailed analysis workbench**. It has five views:

### Risk Brief (Preferred Decision-Grade Tab)

The Risk Brief is calibrated as a **decision brief**, not a data listing. It distinguishes between Fact, Driver, Assumption, Data Caveat, and Recommended Attention.

- **Executive Summary** — 5-bullet overview: highest risk period, primary bottleneck, top driver (with share), BP risk, data confidence level.
- **Top Risk Periods** — Scored table: Period, Severity (red/orange/green), Bottleneck (Core/BU), Reason. Sorted by composite score (shortage months > over-capacity > near-capacity > BP gap).
- **Key Facts** — System-determined results with severity tags: revenue, bottleneck status, shortage count.
- **Driver Analysis** — Three separated panels (v1.17.0):
  - **Risk Period Attribution** — "Who drives pressure during shortage months." Aggregates demand by customer / SKU / size / application / layer bucket / product grade, restricted to shortage months only. Each driver shows value, share, severity, affected periods, and a reason.
  - **SKU Health Signals** — Deterministic MVP classification per SKU using revenue share vs. capacity-pressure share. Classes: `strategicGrowth`, `cashCow`, `capacityDrainer`, `lowValueHighLoad`, `watchList`, `dataIncomplete`. Thresholds: `HIGH_SHARE = 15%`, `LOW_SHARE = 5%`. **Not AI judgment, not final causal attribution.**
  - **Overall Contribution** — Tabbed view of 5 driver groups (Revenue, Core Capacity Pressure, BU Capacity Pressure, Shortage Exposure, BP Risk) across **all** periods. Provides context for the attribution layer.
- **BP Risk** — Warning alert when BP target miss detected (attainment %, gap in M TWD).
- **Data Confidence & Caveats** — Confidence tag with human-readable explanation. Collapsible caveats section showing top 5 of N total issues (by severity).
- **Assumptions** — List of modeling constraints: BP allocation method, fixed working days, USD normalization, BP in million TWD, core steps fixed.
- **Role-Based Attention** — 4-column action boards: Sales, Product Planning, Capacity Operations, Executive.
- **Metric Registry Reference** — Formula and definition table for all KPIs.

### Sales View

- Revenue by Customer × Year
- Forecast by Customer × Year
- Revenue by SKU × Year
- Shortage Exposure by Customer × Year (demand in shortage months only)

### Product Planning View

- Revenue/Core Demand/BU Demand by Size × Year
- Core/BU Demand by Application × Year
- Revenue/Core/BU Demand by Product Grade × Year
- Core/BU Demand by Layer Bucket × Year

### Capacity Analysis View

- **Yearly Health Matrix** — 10 metrics as rows, years as columns (horizontal layout).
  - Revenue, Forecast PCS, Core Demand/Capacity/Utilization, BU Demand/Capacity/Utilization, Shortage Months, Bottleneck.
  - Severity coloring: red (>100% util or shortage), orange (≥85%), green (OK).
- Monthly Core summary (demand/capacity/utilization/shortage by month).
- Monthly BU summary.
- Bottleneck Calendar (Core/BU/None by month).

### Raw Detail

- Per-SKU per-month calculation results (all intermediate values).
- Monthly capacity summary (aggregated demand, capacity, utilization, shortage).

## Key Metrics

| Metric | Description |
|--------|-------------|
| **Revenue** | `forecastPcs × unitPrice × (1 - yieldLoss)` per SKU per month |
| **Forecast PCS** | Customer demand forecast (units) |
| **Core Demand** | Core panel demand after yield adjustment |
| **Core Capacity** | Available Core panels per month |
| **Core Utilization** | `coreDemand / coreCapacity` (null = over capacity) |
| **BU Demand** | BU panel demand after yield adjustment |
| **BU Capacity** | Available BU panels per month |
| **BU Utilization** | `buDemand / buCapacity` (null = over capacity) |
| **Shortage** | `max(0, demand - capacity)` per month |
| **Bottleneck** | Which resource (Core/BU) is constraining each month |

## Matrix Layout Standard

All analysis matrices follow this layout:

```
Dimension/Metric     2026      2027      2028
─────────────────────────────────────────────
Customer A           ...       ...       ...
Customer B           ...       ...       ...
```

- **Rows**: dimensions (Customer, Size, Application, etc.) or metrics (Revenue, Demand, etc.)
- **Columns**: time periods (years, left-to-right)
- **Values**: aggregated totals per dimension per time period

## Analytics Model Structure

The `buildAnalyticsModel()` function in `core/analytics.ts` produces:

```typescript
interface AnalyticsModel {
  // Raw calculation results
  skuResults: SkuCalculationResult[];
  monthlySummaries: MonthlyCapacitySummary[];

  // Aggregated KPIs
  totalRevenue: number;
  totalForecastPcs: number;
  maxCoreUtil: number | null;
  maxBuUtil: number | null;
  shortageMonthCount: number;
  worstMonth: string | null;

  // Yearly health
  yearlyHealth: YearlyHealth[];

  // Chart data
  monthlyRevenue: { month: string; revenue: number }[];
  monthlyUtilization: { month: string; coreUtil: number | null; buUtil: number | null }[];

  // Dimension matrices (all follow DimensionRow[] pattern)
  revenueByCustomer: DimensionRow[];
  forecastByCustomer: DimensionRow[];
  revenueBySku: DimensionRow[];
  revenueBySize: DimensionRow[];
  coreDemandBySize: DimensionRow[];
  buDemandBySize: DimensionRow[];
  // ... and more
}
```

## YearlyHealthMatrix Component

Located at `components/analytics/YearlyHealthMatrix.tsx`.

- Renders metrics as rows, years as columns.
- Uses `metricType` on each row for cell formatting:
  - `revenue` — currency format (year-aware exchange rate).
  - `utilization` — percentage + severity Tag (red/orange/green).
  - `shortage` — danger text if > 0.
  - `bottleneck` — colored Tag (None/Core/BU).
- Fixed first column, horizontal scroll for many years.

## Shortage Exposure

Built by `buildShortageExposure()` in `analytics.ts`.

- Identifies months with Core or BU shortage.
- Sums up Core demand per customer per year **in shortage months only**.
- Shows which customers are most affected by capacity constraints.

## Dashboard Highlights

Built by `getDashboardHighlights()` in `analytics.ts`.

- **worstYear**: year with most shortage months or highest utilization.
- **revenueTrend**: up/down/flat based on first-half vs second-half average.
- **peakRevenueYear**: year with highest total revenue.
- **bottleneckDriver**: Core or BU (whichever has more bottleneck months).
- **topCustomer**: highest total revenue customer.
- **topSizeCategory**: highest total revenue size category.

## Adding New Analytics-Emitted Messages (v1.19.0+)

Core analytics modules (`riskBrief.ts`, `riskAttribution.ts`, `dataQuality.ts`) emit
text intended for the UI. These modules must **not** call React i18n hooks
directly. Instead, follow this 3-step recipe so every emitted message renders in
both English and Traditional Chinese:

1. **Define the key in both dictionaries.** Add the same key to
   `src/i18n/en.ts` and `src/i18n/zhTW.ts`. Use `{placeholder}` tokens for any
   dynamic values (number, percentage, period, SKU code). The `i18nKeys.test.ts`
   parity test will fail if the two dictionaries diverge.
2. **Emit a `LocalizedMessage` from the core module.** Use the local `msg()`
   helper:
   ```ts
   const m = msg('mySection.someTitle', { share: 42, months: 3 });
   ```
   When refactoring an existing field, keep the legacy English string field as
   well (e.g., `title` + `titleMessage`) so callers that haven't migrated still
   render valid English.
3. **Render via `t()` in the UI.** In `CalculationResults.tsx` (or any consumer
   component) use `t(item.titleMessage)` — `t()` accepts both raw key strings
   and `LocalizedMessage` objects. For dynamic dictionary lookups (e.g.,
   classification → tag label), prefer template-literal keys like
   `` t(`health.${classification}`) ``.

The `i18nOutputs.test.ts` suite asserts that every Risk Brief / Data Quality
message resolves to a non-empty string in both languages and contains no
unresolved `{placeholder}` tokens. Run it (or the full `npx vitest run` gate)
after adding new keys.

## Weighted Pressure Index (v1.20.0)

`core/riskAttribution.ts` now produces two parallel capacity-pressure metrics per SKU:

| Field | Formula | Purpose |
|-------|---------|---------|
| `capacityPressureIndex` (raw, v1.17.0) | `shortageCoreDemand + shortageBuDemand` | Backward-compatible unweighted proxy. |
| `weightedPressureIndex` (v1.20.0) | `shortageCoreDemand × coreWeight + shortageBuDemand × buWeight` | Default weights: `coreWeight = 1.3`, `buWeight = 1.0`. Reflects the assumption that Core constraints are harder to relieve operationally. |

Both shares (`rawCapacityPressureShare` and `capacityPressureShare`) are kept on `SkuHealthSignal` so callers can compare. **Weighting is analysis-only**: it does not modify capacity / demand / shortage / utilization / revenue formulas. Weights are configurable through `PressureWeightConfig` and the active configuration is exposed on `RiskAttributionModel.weightConfig` and `payload.riskAttribution.weightConfig`.

## Scenario Methodology (v1.20.0)

`core/impactAnalysis.ts` provides two read-only scenario engines used by `payload.priceImpact` and `payload.capacityImpact`.

### Read-only invariant

Both engines **deep-clone** the input SKUs, forecasts, and capacity plans before running the existing `buildAnalyticsModel` / `buildBpAnalysis` pipeline. Originals are never mutated — tests assert deep equality of inputs before and after scenario runs. This means you can call them repeatedly inside a `useMemo` without side effects on the live editing state.

### Price scenarios

- Deltas: `[-0.10, -0.05, +0.05, +0.10]`
- Applied to every SKU's `unitPrice` (currency preserved — TWD/CNY still convert to USD via the existing exchange-rate pipeline).
- Per scenario, per year: `baseRevenueUsd`, `scenarioRevenueUsd`, `baseAttainment`, `scenarioAttainment`, `attainmentDelta` (in percentage points).
- `mostSensitiveYear` = the year with the largest `|attainmentDelta|` across all scenarios.

### Capacity scenarios

- Scenarios: `capacity_core_+10pct`, `capacity_bu_+10pct`, `capacity_both_+10pct`.
- Applied to every `CapacityPlan`'s `corePanelPerDay` / `buPanelPerDay`.
- Per scenario: `resolvedShortageMonths`, `remainingShortageMonths`, `maxCoreUtilBefore/After`, `maxBuUtilBefore/After`.
- `bestScenarioId` = scenario that resolves the most shortage months. Falls back to `null` when +10% is insufficient (the UI shows "No scenario fully resolves the bottleneck within +10%" in that case).

## BP Gap Attribution (v1.20.0)

`core/bpAttribution.ts` answers: *"For each period that missed BP, which customers/SKUs/sizes/applications carried what share of the gap?"*

- Granularity: `yearly`, `quarterly`, `monthly`.
- Dimensions: `customer`, `sku`, `size`, `application`.
- `shareOfGap(driver, period) = driver_revenue / period_revenue`
- `gapContributionMillionTwd = period_gap × shareOfGap` — sums back to the period gap within rounding.
- `topDrivers` is capped at 5 across all granularities.

**Proportional, not causal.** The reason text says so explicitly ("比例歸因，非嚴格因果" / "proportional attribution, not strict causal") — a customer carrying 30% of a year's revenue is *assigned* 30% of that year's BP gap, but this does not mean reducing their revenue would close the gap proportionally.

## Key Findings (v1.20.0)

`core/keyFindings.ts` provides a deterministic top-5 cross-module summary, sorted by severity rank (`critical < warning < info < positive`) then by stable `id`. Sources: data quality (high impact), capacity shortage/remedy, BP miss/top driver, price sensitivity, SKU health drainers. See `ANALYSIS_CONTRACT.md` §9.5 for the trigger matrix.

`MAX_FINDINGS = 5` is a hard cap. Same inputs always yield the same list.
