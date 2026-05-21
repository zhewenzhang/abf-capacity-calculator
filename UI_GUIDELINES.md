# UI Guidelines

## Dashboard KPI Cards

- **Consistent height** — all 6 KPI cards in the top row have equal height via `dashboard-kpi-card` class.
- **Concise labels** — use i18n keys, no hardcoded text.
- **No overcrowding** — each card has one primary value + optional secondary text below.
- **Color coding** — green for good, red for problems, orange for warnings.

## Analysis Tables

### Layout Standard

- **Time columns left to right** — years/months run horizontally (2026 → 2027 → 2028).
- **Metrics/dimensions top to bottom** — Revenue, Forecast PCS, Core Demand, etc. as rows.
- **Fixed first column** — the metric label column is pinned left for horizontal scrolling.
- **Numeric alignment** — numbers right-aligned, labels left-aligned.

### Formatting

| Type | Format | Precision |
|------|--------|-----------|
| Revenue | Plain number (currency-converted) | 2 decimals (USD), 0 (TWD) |
| Quantities (PCS, demand, capacity) | `toLocaleString()` | Integer |
| Utilization | Tag with % | 1 decimal |
| Shortage months | Number or danger text | Integer |
| Bottleneck | Tag (None/Core/BU) | — |

### Severity Coloring

| Condition | Color |
|-----------|-------|
| Utilization > 100% | Red |
| Utilization ≥ 85% | Orange |
| Utilization < 85% | Green |
| Shortage > 0 | Red/danger text |
| Bottleneck = BU | Red tag |
| Bottleneck = Core | Orange tag |
| No issues | Green tag |

### CSS Classes

- `analysis-table` — Dashboard yearly health, Results capacity analysis.
- `matrix-table` — TimeMatrixTable (dimension × time matrices).
- `data-table` — CRUD tables (Products, Forecasts, Capacity).
- `shortage-row` — red background for rows with shortages.
- `warning-row` — yellow background for warning-level rows.

## Language

- **Supported**: English, Traditional Chinese (繁體中文).
- **No mixed labels** — never hardcode English text in a page that uses `t()`.
- **Fallback** — if a key is missing in zhTW, the English value is used.
- **Key naming** — `section.subsection.key` (e.g., `results.yearlyHealth`, `dashboard.totalRevenue`).

## Currency

- **Input prices are always USD** — product unit price, forecasts, etc.
- **Display currency** — user can switch between USD and TWD in the header or Parameters page.
- **Currency conversion is display-layer only** — Firestore stores USD values.
- **Plain numbers** — no `$` or `NT$` prefixes on amounts. Use `formatCurrency()` for consistency.
- **Year-aware rates** — when "Yearly" exchange rate mode is selected, each year uses its own USD→TWD rate.

## Experimental Pages

- **Capacity Lab** (`/capacity-lab`) — spreadsheet experiment for capacity editing.
- Must display warning banner with "EXPERIMENT" tag.
- Do not replace production flows without approval.
- Do not suggest incremental tweaks — if improvements are needed, propose a full library replacement (e.g., AG Grid Community).

## Charts

- Use `@ant-design/charts` Line component for trend visualization.
- Y-axis labels use `formatCurrencyShort()` for revenue charts.
- Utilization charts show percentage values.
- Chart height: 250px, autoFit enabled.

## Page Structure

| Page | Purpose |
|------|---------|
| Dashboard | Executive summary, yearly health, revenue/utilization trends, key insights |
| Products | CRUD for SKUs, template import/export |
| Forecasts | Monthly demand forecasts, bulk edit |
| CapacityPlan | Capacity management by factory/month |
| CalculationResults | Detailed analysis workbench (Sales / Product Planning / Capacity Analysis / Raw Detail) |
| Parameters | Project settings, working days, currency/exchange rate, factory setup |
| CapacitySpreadsheet | Experimental spreadsheet editor |
