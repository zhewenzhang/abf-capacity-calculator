# Analysis Contract & Decision-Grade Foundation Specification

This document defines the interface specifications, metric registries, data quality checking criteria, and deterministic risk analysis logic for the **Decision-Grade Analysis Foundation** (Phase 5 MVP).

---

## 1. Goal & Purpose

The **Decision-Grade Analysis Foundation** aims to elevate raw capacity planning numbers into highly actionable, trusted, and well-structured risk summaries for product analysts and capacity managers. It bridges the gap between pure engineering outputs and business decision-making.

By formalizing an **Analysis Contract**, the system ensures that:
- Core KPI calculation methodologies are explicit and documented (**Metric Registry**).
- Data integrity, potential risks, and missing parameters are checked systematically before presentation (**Data Quality Checker**).
- The complete domain state is packed into a clean, typed schema for deterministic modeling (**Analysis Contract Payload**).
- Dynamic operational suggestions are directed to specific user personas based on constraints (**Deterministic Risk Brief**).

---

## 2. Metric Registry Specification

All decision-grade KPIs are defined with strict formulaic bounds, data sources, and organizational ownership.

| Metric ID | Label Key | Unit | Calculation Formula | Target Persona / Owner | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `forecastPcs` | `results.forecastPcs` | pcs | Input by SKU and month | Sales, Executive | Customer monthly sales forecast volume. |
| `revenueUsd` | `results.revenue` | usd | `forecastPcs * unitPriceUsd` | Sales, Executive | Forecasted revenue normalized to USD. Original price can be entered in USD, TWD, or CNY, then normalized. |
| `coreDemand` | `results.coreDemand` | panel | `ceil(ceil(forecastPcs / yieldRate) / pcsPerPanel) * 1` | Product Planning, Capacity | Core panel demand after yield adjustments. |
| `buDemand` | `results.buDemand` | panel | `ceil(ceil(forecastPcs / yieldRate) / pcsPerPanel) * buSteps` | Product Planning, Capacity | Build-up panel demand. `buSteps = max(layerCount / 2 - 1, 0)`. |
| `coreCapacity` | `results.coreCapacity` | panel | `sum(corePanelPerDay * workingDays) per factory` | Capacity Operations | Total monthly Core panels capacity. |
| `buCapacity` | `results.buCapacity` | panel | `sum(buPanelPerDay * workingDays) per factory` | Capacity Operations | Total monthly BU panels capacity. |
| `coreUtilization` | `results.coreUtil` | percent | `coreDemand / coreCapacity` | Capacity, Executive | Capacity utilization rate for Core panels. |
| `buUtilization` | `results.buUtil` | percent | `buDemand / buCapacity` | Capacity, Executive | Capacity utilization rate for BU panels. |
| `coreShortage` | `results.coreShortage` | panel | `max(coreDemand - coreCapacity, 0)` | Capacity Operations | Unfilled Core panel demand. |
| `buShortage` | `results.buShortage` | panel | `max(buDemand - buCapacity, 0)` | Capacity Operations | Unfilled BU panel demand. |
| `bottleneck` | `results.bottleneck` | text | `Core (if coreUtil > buUtil) / BU / None` | Capacity, Executive | Active constraining resource. |
| `bpTargetMillionTwd` | `bp.target` | millionTwd | User-defined yearly targets | Sales, Executive | Annual business plan target revenue. |
| `bpForecastMillionTwd` | `bp.forecast` | millionTwd | `(monthlyRevenueUsd * usdToTwdRate) / 1,000,000` | Sales, Executive | Normalized USD revenue converted to TWD. |
| `bpAttainment` | `bp.attainment` | percent | `bpForecastMillionTwd / bpTargetMillionTwd` | Sales, Executive | Achievement rate against targets. |
| `bpGapMillionTwd` | `bp.gap` | millionTwd | `bpForecastMillionTwd - bpTargetMillionTwd` | Sales, Executive | Difference between forecast and targets. |

### Hard Bounds and Calculations:
1. **Multi-Currency Pricing**: Products and Forecasts can specify prices in **USD**, **TWD**, or **CNY**. The calculation engine normalizes all values to **USD** base for primary metrics, but converts back to **TWD** for TWD business targets comparison.
2. **BU Steps Derivation**: BU steps are derived as `max(layerCount / 2 - 1, 0)` based on physical layer configuration.
3. **Zero Capacity / Zero Pricing Handling**: When `buCapacity = 0` but `buDemand > 0`, it indicates a high operational constraint. The system flags this as a critical error but does not fail the calculation (represented as `confidence: low`).

---

## 3. Data Quality & Confidence Matrix

Data is continuously evaluated using a multi-tiered inspection mechanism:

### 1. Severity Levels:
- **Error**: Potential calculations blockers or critical missing parameters.
- **Warning**: Data inconsistencies or logical anomalies (e.g. zero price, partial-year data).
- **Info**: Documentational parameters (e.g. working day defaults, target allocation methods).

### 2. Evaluated Quality Domains:
- **Products**: Validates SKU dimensions, chip sizes, layers, pricing support.
- **Forecast**: Evaluates forecast completeness, orphan SKU references, unit pricing.
- **Capacity**: Analyzes month-over-month factory plans, checks for missing configs.
- **Currency**: Checks exchange rates availability against demanded SKUs.
- **BP**: Audits targets vs forecast demand consistency.

### 3. Confidence Status:
- **Blocked**: No active SKUs or forecasts loaded (`confidence = 'blocked'`).
- **Low**: Critical errors present. Calculations proceed, but results are not recommended for capital expenditure decisions (`confidence = 'low'`).
- **Medium**: Warnings present, such as partial year records or zero pricing (`confidence = 'medium'`).
- **High**: Perfect data integration without any warning/error (`confidence = 'high'`).

---

## 4. Analysis Contract Payload

The Analysis Contract outputs a standardized, future-proof payload `AnalysisContractPayload` encompassing:
- **Time ranges** (months, years).
- **Metric Definitions** (re-exporting registry specifications).
- **Data Quality Summary** (complete list of errors/warnings/info).
- **Assumptions** (explicit modeling constraints).
- **KPI Summary** (global aggregated metrics).
- **Matrices** (pre-grouped tables for customer/sku/application analysis).

---

## 5. Deterministic Risk Brief (v1.16.1 — Decision-Grade Calibration)

The Risk Brief generates high-level summaries and actionable role-specific directives without relying on external AI API integrations.

### 5.1 Structure — Fact / Driver / Assumption / Data Caveat / Recommended Attention

The Risk Brief is organized into clear sections that distinguish between:

| Section | Purpose |
|---------|---------|
| **Executive Summary** | 5-bullet decision overview: highest risk period, primary bottleneck, top driver, BP risk, confidence level. |
| **Facts** | System-determined results with severity tags (critical / warning / info / positive). Each fact has a title, detail, and optional evidence. |
| **Top Risk Periods** | Periods scored by severity: shortage months (×100) > utilization >100% (×50) > utilization ≥85% (×20) > BP gap (capped at ×30). Sorted by score descending. |
| **Driver Analysis** | Drivers separated into 5 groups: Revenue, Core Capacity Pressure, BU Capacity Pressure, Shortage Exposure, BP Risk. Each item includes value, share (% of group total), and reason. |
| **BP Risk** | Dedicated section for BP target miss with attainment %, gap in M TWD, and statement. |
| **Data Confidence & Caveats** | Confidence level with human-readable explanation. Caveats limited to top 5 (by severity), with total count displayed. |
| **Assumptions** | Explicit modeling constraints: BP allocation, working days, USD normalization, BP TWD, core steps. |
| **Role-Based Attention** | Action items for Sales, Product Planning, Capacity Operations, and Executive. |

### 5.2 Driver Ranking Logic

Drivers are ranked within each group by total value (descending) across all time periods:

1. **Revenue Drivers** — from `revenueByCustomer` matrix, top 5, with share of total revenue.
2. **Core Pressure Drivers** — from `coreDemandBySize` matrix, top 5, with share of total Core demand.
3. **BU Pressure Drivers** — from `buDemandBySize` matrix, top 5, with share of total BU demand.
4. **Shortage Exposure Drivers** — only shown when shortage exists; from `coreDemandBySize`, top 3.
5. **BP Risk Drivers** — only shown when BP miss/watch years exist; lists period, gap, and attainment.

### 5.3 Confidence Logic

| Confidence | Condition | Explanation Template |
|------------|-----------|---------------------|
| `blocked` | No SKUs and no forecasts loaded | "No active data loaded. Please import products and monthly forecasts." |
| `high` | No errors, no warnings | "All data inputs are complete and consistent. No errors or warnings found." |
| `medium` | Warnings present, no errors | "N warning-level issue(s) found: [top 3 warning titles]." |
| `low` | Errors present | "N error-level issue(s) found: [top 3 error titles]. Results may not be reliable for capital decisions." |

### 5.4 Current Non-AI Deterministic Status

Risk Brief text is compiled using strict structural rules on the frontend. Zero data is transmitted to external servers. No LLM API integration exists or is planned for this phase.

---

## 6. Out of Scope (AI Non-Scope)

To ensure operational stability, data privacy, and deterministic analysis, **no external LLM APIs (e.g., OpenAI, Anthropic, Gemini, DeepSeek) are integrated** in this phase.
- Risk Brief text is compiled using strict structural rules on the frontend.
- Zero data is transmitted to external servers.
- Conversational chat boxes are excluded.

---

## 7. Multi-Currency & BP Alignment Rules

1. **Normalized Forecast Pricing**: Generated forecasts prioritize SKU unit prices during bulk generation. If no price is defined, the system cascades back to previous year forecasts.
2. **TWD Target Conversion**: For BP attainment calculations, USD revenue must first be multiplied by the designated USD→TWD exchange rate before comparison.
3. **Display vs Calculation Currency**: Display currency settings (TWD, CNY, USD) only affect presentation strings (`formatCurrency`). Designated currency conversions (e.g. `convertFromUsd(amount, 'TWD')`) always execute accurately based on real parameters, unaffected by the display toggle.

---

## 8. Future Roadmap & Extensions

- **Price Impact Sensitivity**: Analyze how unit price fluctuations affect overall BP attainment.
- **Capacity Scenario Planning**: Dynamically adjust factory shift parameters or introduce hypothetical plants to simulate bottleneck relief.
- **SKU Intelligence**: Introduce structural yield matrices that dynamically adapt yield predictions based on historical manufacturing feedback.
