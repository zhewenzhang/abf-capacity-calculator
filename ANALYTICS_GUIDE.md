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
- **Driver Analysis** — Tabbed view with 5 driver groups: Revenue, Core Capacity Pressure, BU Capacity Pressure, Shortage Exposure, BP Risk. Each driver shows value, share (%), and reason.
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
