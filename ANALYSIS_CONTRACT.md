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

> **Data scope (v1.18.0):** all inputs are read through the active `ProjectScope` (personal vs shared workspace). The contract structure and calculation engine are scope-agnostic — the same payload shape comes out whether the source is `users/{uid}/...` or `workspaces/{wid}/...`. See [docs/WORKSPACE_COLLABORATION.md](docs/WORKSPACE_COLLABORATION.md).

> **i18n contract (v1.19.0):** every UI-facing string produced by `core/riskBrief.ts`, `core/riskAttribution.ts`, and `core/dataQuality.ts` is emitted twice — as a legacy English string (`title`, `detail`, `reason`, ...) for backward compatibility and as a `LocalizedMessage = { key: string; params?: Record<string, string|number> }` (`titleMessage`, `detailMessage`, `reasonMessage`, ...). The UI must consume the `*Message` fields via `t(message)` so output respects the user's language (`en` / `zh-TW`). Core analysis modules must never call React i18n hooks directly — instead use the `msg(key, params?)` helper and let the UI resolve them. Tests (`i18nOutputs.test.ts`) enforce that every emitted message resolves in both languages without leaving raw `.key` strings or unresolved `{placeholder}` tokens.

---

## 5. Deterministic Risk Brief (v1.17.0 — Risk Driver Attribution)

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

### 5.5 Risk Attribution vs Overall Contribution (v1.17.0)

The Risk Brief now distinguishes three layers of "who matters":

| Layer | Question Answered | Source |
|-------|-------------------|--------|
| **Overall Contribution** | Who is biggest across ALL periods? | `matrices.*` (revenue, demand by customer/SKU/size/application) |
| **Risk Period Attribution** | Who drives pressure during **shortage months only**? | `riskAttribution.drivers` (`riskAttribution.ts`) |
| **SKU Health Signals** | Which SKUs are strategicGrowth / cashCow / capacityDrainer / lowValueHighLoad / watchList / dataIncomplete? | `riskAttribution.skuHealthSignals` (deterministic MVP) |

#### Shortage-month definition

A month qualifies as a shortage month if either Core or BU side meets:

- `coreShortage > 0` (unmet Core demand), or
- `coreUtilization === null` while `totalCorePanelDemand > 0` (capacity = 0 with demand), or
- The same conditions on the BU side.

Attribution then aggregates `skuResults` restricted to shortage months only — sliced by customer, SKU, size, application, layer bucket, and product grade. Each driver is sorted deterministically (value desc, label asc) and truncated to top-N.

#### Capacity Pressure Index (MVP)

`capacityPressureIndex = shortageCoreDemand + shortageBuDemand` (unweighted). This is a proxy, not a final causal model. Future work may weight Core vs BU and incorporate yield risk.

#### SKU Health Signal thresholds

These are MVP assumptions, documented for transparency:

- `HIGH_SHARE = 15` — high enough to dominate a dimension
- `LOW_SHARE = 5` — low enough to be considered minor

Classification rules (in priority order):

| Class | Rule |
|-------|------|
| `dataIncomplete` | SKU missing required attributes (chip size, layer count, size category, unit price). |
| `strategicGrowth` | `revenueShare >= HIGH_SHARE` AND `pressureShare >= HIGH_SHARE`. |
| `cashCow` | `revenueShare >= HIGH_SHARE` AND `pressureShare < HIGH_SHARE`. |
| `lowValueHighLoad` | `revenueShare <= LOW_SHARE` AND `pressureShare >= HIGH_SHARE`. |
| `capacityDrainer` | `pressureShare >= HIGH_SHARE` AND `revenueShare < pressureShare`. |
| `watchList` | Any pressure exposure without a stronger rule, OR moderate revenue without shortage. |

These signals are deterministic and explainable — **not AI judgment** and **not final causal attribution**.

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

---

## 9. Analysis Contract v1.1 — Decision Analysis Depth (v1.20.0)

Phase 5.3B bumps `AnalysisContractPayload.version` from `'1.0'` to **`'1.1'`** and adds four new fields plus a `decisionImpact` enrichment on every Data Quality issue. **No changes** to capacity/BP/currency core formulas, Firestore schema, or AI integration scope.

### 9.1 Schema additions (v1.1)

| Field | Type | Source module | Purpose |
|-------|------|---------------|---------|
| `bpAttribution` | `BpAttributionModel` | `core/bpAttribution.ts` | Proportional breakdown of BP gap by customer/SKU/size/application at year/quarter/month granularity. Includes `topDrivers` (≤5). |
| `priceImpact` | `PriceImpactModel` | `core/impactAnalysis.ts` | Read-only ±5% / ±10% price scenarios — per year base vs scenario revenue/attainment + `mostSensitiveYear`. |
| `capacityImpact` | `CapacityImpactModel` | `core/impactAnalysis.ts` | Read-only +10% Core / +10% BU / +10% Both capacity scenarios — resolved shortage months, max-util shifts, `bestScenarioId`. |
| `keyFindings` | `KeyFinding[]` | `core/keyFindings.ts` | Deterministic top-5 cross-module summary sorted by severity rank → id. |
| `riskAttribution.weightConfig` | `PressureWeightConfig` | `core/riskAttribution.ts` | Exposes `coreWeight` and `buWeight` used to compute `weightedPressureIndex`. Defaults: `{ coreWeight: 1.3, buWeight: 1.0 }`. |

Every `DataQualityIssue` also gains an optional `decisionImpact: 'high' | 'medium' | 'low'` field (id-pattern derived, with severity fallback). This drives Key Findings filtering and `results.dq.*` UI badges.

### 9.2 Weighted Pressure Index (analysis-only)

The v1.17.0 `capacityPressureIndex = shortageCoreDemand + shortageBuDemand` is preserved (renamed `rawCapacityPressureShare` / kept under `capacityPressureIndex`). v1.20.0 adds a parallel **`weightedPressureIndex`**:

```
weightedPressureIndex = shortageCoreDemand * coreWeight + shortageBuDemand * buWeight
```

Defaults: `coreWeight = 1.3`, `buWeight = 1.0` — reflecting the assumption that Core constraints are operationally harder to relieve than BU constraints. **This is ranking-only**:

- Capacity, demand, revenue, shortage, BP gap, and utilization formulas are **unchanged**.
- Weighting only re-orders attribution drivers and SKU pressure shares in the Risk Brief.
- The raw (unweighted) share is preserved alongside the weighted share so consumers can compare.

### 9.3 BP Gap Attribution (proportional, not causal)

`bpAttribution` answers: *"For each period that missed BP, which customers/SKUs/sizes/applications carried what share of the gap?"*

```
shareOfGap(driver, period)        = driver_revenue / period_revenue
gapContributionMillionTwd(driver) = period_gap_million_twd * shareOfGap(driver, period)
Σ gapContributionMillionTwd       ≈ period_gap_million_twd   (within rounding)
```

This is **proportional attribution**: a driver's share of revenue in that period maps to a share of the gap. It is **not a causal model** — the reason text (`bpAttr.driver.reason`) explicitly states "比例歸因，非嚴格因果" / "(proportional attribution, not strict causal)". `topDrivers` is capped at 5 across all granularities to keep the UI digestible.

### 9.4 Price & Capacity Impact (read-only deterministic scenarios)

Both modules deep-clone SKUs, forecasts, and capacity plans, run them through the existing `buildAnalyticsModel` / `buildBpAnalysis` pipeline, and report deltas vs base:

- **Price scenarios**: `[-0.10, -0.05, +0.05, +0.10]` applied to every SKU's `unitPrice` (currency preserved). Output: per-year `baseRevenueUsd`, `scenarioRevenueUsd`, `baseAttainment`, `scenarioAttainment`, `attainmentDelta`, plus `mostSensitiveYear` (largest |attainmentDelta|).
- **Capacity scenarios**: `capacity_core_+10pct`, `capacity_bu_+10pct`, `capacity_both_+10pct` applied to every `CapacityPlan`'s `corePanelPerDay` / `buPanelPerDay`. Output: `resolvedShortageMonths`, `remainingShortageMonths`, `maxCoreUtilBefore/After`, `maxBuUtilBefore/After`, plus `bestScenarioId` (most shortage months resolved, falls back to `null` when +10% is insufficient).

**Read-only guarantee**: originals are never mutated. Tests assert deep equality of inputs before and after scenario runs.

### 9.5 Key Findings (deterministic top-5)

`buildKeyFindings(input)` collects candidate findings from six sources, ranks them by severity (`critical=0 < warning=1 < info=2 < positive=3`) then by stable `id`, and returns the top 5.

| Source | Trigger | Severity |
|--------|---------|----------|
| Data Quality | `decisionImpact === 'high'` issue | `critical` or `warning` (issue's own) |
| Capacity (shortage) | Any shortage months — `critical` if ≥6, else `warning` | dynamic |
| Capacity (remedy) | A capacity scenario resolves shortage | `positive` |
| BP miss | Worst-attainment year < 100% | `critical` |
| BP top driver | `bpAttribution.topDrivers[0]` carries ≥30% of gap | `warning` |
| Price sensitivity | `|mostSensitiveYear.attainmentDelta|` ≥ 10 pp | `warning` |
| SKU Health | Any SKU classified `capacityDrainer` or `lowValueHighLoad` | `warning` |

Hard cap: `MAX_FINDINGS = 5`. Order is fully deterministic — same inputs always yield the same list.

### 9.6 New assumption lines (v1.1)

Three lines added to `payload.assumptions` to make the new semantics explicit to downstream consumers:

1. `assumptions.weightedPressure` — "Weighted Pressure Index uses Core×{coreWeight} + BU×{buWeight}. Analysis-only; does not change demand or capacity formulas."
2. `assumptions.bpAttribution` — "BP Gap Attribution is proportional (revenue-share-based), not a causal model."
3. `assumptions.impactScenarios` — "Price and Capacity Impact scenarios are read-only: inputs are cloned and re-run through the existing calculation engine."

### 9.7 i18n coverage

All v1.1 output strings — `bpAttr.driver.reason`, every `keyFindings.*` title/detail, and the Results-page section labels — ship with both `en.ts` and `zhTW.ts` entries. `i18nKeys.test.ts` enforces key parity; `i18nOutputs.test.ts` asserts both languages render with no leftover `{placeholder}` tokens and no raw `.key` echo.
