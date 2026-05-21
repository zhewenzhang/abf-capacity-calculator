# UI Guidelines

## Ant Design Is the Single UI System

- **Only Ant Design.** Do not introduce MUI, shadcn/ui, Tailwind dashboard templates, or any other UI framework.
- All styling goes through `theme/antdTheme.ts` (design tokens) and shared components in `components/common/`.
- The `ConfigProvider` in `App.tsx` applies the theme globally.

## Theme Tokens

Defined in `frontend/src/theme/antdTheme.ts`:

- Primary color: `#1677ff`
- Border radius: `6px` (standard), `4px` (small), `8px` (large)
- Font size base: `14px`
- Table header background: `#fafafa`
- Table font size: `13px`
- Semantic colors: green `#52c41a`, warning `#faad14`, error `#ff4d4f`

Do not override these in individual components. Use the tokens through ConfigProvider or the shared components.

## Shared Components

| Component | File | Purpose |
|-----------|------|---------|
| `MetricCard` | `components/common/MetricCard.tsx` | KPI cards with consistent height and typography |
| `SectionCard` | `components/common/SectionCard.tsx` | Page section wrapper with consistent margins |
| `AppTable` | `components/common/AppTable.tsx` | Table wrapper with standard density and scroll |
| `ExperimentalBanner` | `components/common/ExperimentalBanner.tsx` | Warning banner for experimental pages |
| `PageHeader` | `components/common/PageHeader.tsx` | Consistent page title with optional actions |
| `StatusTag` | `components/common/StatusTag.tsx` | Severity-colored status tags |

## KPI Cards (MetricCard)

- Use `MetricCard` for all Dashboard and Results KPI cards.
- All cards have equal height via `dashboard-kpi-card` CSS class.
- Concise labels — use i18n keys, no hardcoded text.
- Color coding: green for good, red for problems, orange for warnings.

## Analysis Tables

### Layout Standard

- **Time columns left to right** — years/months run horizontally (2026 → 2027 → 2028).
- **Metrics/dimensions top to bottom** — Revenue, Forecast PCS, Core Demand, etc. as rows.
- **Fixed first column** — the metric label column is pinned left for horizontal scrolling.
- **Numeric alignment** — numbers right-aligned, labels left-aligned.

### CSS Classes

| Class | Purpose |
|-------|---------|
| `analysis-table` | Dashboard yearly health, Results capacity analysis |
| `matrix-table` | TimeMatrixTable (dimension × time matrices) |
| `app-table` | AppTable wrapper (general data tables) |
| `data-table` | CRUD tables (Products, Forecasts, Capacity) |
| `shortage-row` | Red background for rows with shortages |
| `warning-row` | Yellow background for warning-level rows |

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
| Utilization > 100% | Red tag |
| Utilization ≥ 85% | Orange tag |
| Utilization < 85% | Green tag |
| Shortage > 0 | Red/danger text |
| Bottleneck = BU | Red tag |
| Bottleneck = Core | Orange tag |
| No issues | Green tag |

## Experimental Pages

- **Capacity Lab** (`/capacity-lab`) — spreadsheet experiment for capacity editing.
- Must display `ExperimentalBanner` at the top.
- Do not replace production flows without approval.
- Do not suggest incremental tweaks — if improvements are needed, propose a full library replacement (e.g., AG Grid Community).

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
| CapacitySpreadsheet | Experimental spreadsheet editor (marked with ExperimentalBanner) |
