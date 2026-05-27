# V1.43 Scenario Preset Simulation -- Future Specification

**Version**: 1.43.0 (future)
**Date**: 2026-05-27
**Author**: Scenario Shortcut Agent (Agent 6)
**Status**: Future Spec (not yet scheduled for implementation)
**Depends on**: V1.42 Daily Operations Workbench

---

## 1. Problem Statement

The v1.42 Workbench introduces static scenario presets that launch the Scenario
Planning page (`/scenario`) with pre-configured multiplier values. However, the
current implementation has several limitations:

1. **No URL-based preset loading** -- clicking a preset card on the Workbench
   cannot pass configuration to `/scenario` via the URL; the user must manually
   set sliders after navigating.
2. **Only 4 global multipliers** -- `forecastVolume`, `unitPrice`, `coreCapacity`,
   `buCapacity` are applied uniformly to all SKUs, forecasts, and capacity plans.
   There is no way to simulate per-SKU or per-customer changes.
3. **In-memory only** -- scenario configurations are lost on page refresh. There
   is no way to save, name, or share a scenario.
4. **Single scenario comparison** -- the user can only compare one scenario against
   the baseline. There is no way to compare multiple scenarios side by side.
5. **No narrative** -- the system shows raw deltas but does not explain what the
   numbers mean in business terms.

This document specifies how to address each of these gaps in a future release.

---

## 2. Current State (v1.42)

### 2.1 ScenarioEngine Interface

The scenario engine (`frontend/src/core/scenarioEngine.ts`) defines:

```typescript
export interface ScenarioMultipliers {
  forecastVolume: number;   // multiplier on all forecast PCS
  unitPrice: number;        // multiplier on all unit prices
  coreCapacity: number;     // multiplier on all corePanelPerDay
  buCapacity: number;       // multiplier on all buPanelPerDay
}
```

All multipliers are clamped to [0.5, 2.0] by `clampMultipliers()`. The engine
produces a `ScenarioComparison` with full baseline and scenario calculation
results plus a `ScenarioDeltas` object covering 7 key metrics.

### 2.2 Scenario Planning Page

`frontend/src/pages/ScenarioPlanning.tsx`:
- Loads SKU, forecast, capacity, and parameter data from Firestore (read-only).
- Provides sliders and numeric inputs for each multiplier (range 0.5 -- 2.0).
- Runs comparison on button click; displays delta cards for revenue, forecast
  volume, utilization, shortage months, BP attainment, and BP gap.
- All state is in-memory (`useState`); nothing is persisted.

### 2.3 Workbench Presets (v1.42)

The Workbench architecture defines 5 static presets in `workbench.ts`:

| Preset ID | Multiplier Changes | Business Meaning |
|---|---|---|
| `volume-up-10` | forecastVolume: 1.1 | Demand increases 10% |
| `volume-down-10` | forecastVolume: 0.9 | Demand decreases 10% |
| `capacity-up-20` | coreCapacity: 1.2, buCapacity: 1.2 | Capacity expands 20% |
| `price-up-5` | unitPrice: 1.05 | Average price increases 5% |
| `stress-test` | forecastVolume: 1.2, unitPrice: 0.95 | Volume surge with price pressure |

These are defined as `ScenarioPreset` objects with `id`, `label`, `description`,
and `params` fields. In v1.42, clicking a preset card navigates to `/scenario`
but the preset values are not passed through the URL.

---

## 3. Proposed Solution

### 3.1 URL Query Parameter Contract

The `/scenario` route should accept query parameters to pre-configure the
multiplier panel. This enables the Workbench (and future features like bookmarks,
AI Copilot links, and shared scenarios) to deep-link into a pre-configured
scenario.

**Query parameter format:**

```
/scenario?preset=<presetId>
  or
/scenario?fv=1.1&up=1.0&cc=1.0&bc=1.0
  or
/scenario?fv=1.1&up=1.0&cc=1.0&bc=1.0&autorun=1
```

| Param | Type | Default | Description |
|---|---|---|---|
| `preset` | string | (none) | Preset ID; looks up the preset and applies its params. If present, overrides `fv/up/cc/bc`. |
| `fv` | number (0.5--2.0) | 1.0 | `forecastVolume` multiplier |
| `up` | number (0.5--2.0) | 1.0 | `unitPrice` multiplier |
| `cc` | number (0.5--2.0) | 1.0 | `coreCapacity` multiplier |
| `bc` | number (0.5--2.0) | 1.0 | `buCapacity` multiplier |
| `autorun` | 0 or 1 | 0 | If 1, automatically run the scenario comparison after data loads (skip manual "Run Scenario" click) |

**Implementation sketch (ScenarioPlanning.tsx):**

```typescript
import { useSearchParams } from 'react-router-dom';

// Inside the component:
const [searchParams] = useSearchParams();

useEffect(() => {
  const presetId = searchParams.get('preset');
  if (presetId) {
    const preset = SCENARIO_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setMultipliers(clampMultipliers(preset.params));
      setScenarioActive(true);
    }
  } else {
    const fv = parseFloat(searchParams.get('fv') ?? '1.0');
    const up = parseFloat(searchParams.get('up') ?? '1.0');
    const cc = parseFloat(searchParams.get('cc') ?? '1.0');
    const bc = parseFloat(searchParams.get('bc') ?? '1.0');
    const hasCustom = fv !== 1.0 || up !== 1.0 || cc !== 1.0 || bc !== 1.0;
    if (hasCustom) {
      setMultipliers(clampMultipliers({ forecastVolume: fv, unitPrice: up, coreCapacity: cc, buCapacity: bc }));
      setScenarioActive(true);
    }
  }
}, [searchParams]);

// Auto-run after data loads if autorun=1 and multipliers are non-default:
useEffect(() => {
  if (searchParams.get('autorun') === '1' && scenarioActive && hasData && !comparison) {
    handleRunScenario();
  }
}, [scenarioActive, hasData]);
```

**Workbench preset card navigation:**

```typescript
// In WorkbenchPage, when a preset card is clicked:
navigate(`/scenario?preset=${preset.id}&autorun=1`);
```

### 3.2 Five Scenario Presets with Business Context

The v1.42 presets are simplified for initial delivery. This section defines the
full set of 5 business-meaningful presets with richer descriptions, recommended
multiplier values, and the decisions each preset supports.

#### Preset 1: `capacityDelay` -- Capacity Ramp Delayed

**Business scenario:** A supply chain disruption (e.g., equipment delivery delay,
construction permit hold-up, COVID lockdown at supplier site) causes the planned
capacity ramp to be delayed by N months. During the delay period, available
capacity is lower than planned.

**Multiplier configuration:**

```typescript
{
  id: 'capacityDelay',
  label: 'scenario.preset.capacityDelay',
  description: 'scenario.preset.capacityDelay.desc',
  params: {
    forecastVolume: 1.0,    // demand unchanged
    unitPrice: 1.0,         // pricing unchanged
    coreCapacity: 0.8,      // core capacity at 80% (delayed ramp)
    buCapacity: 0.8,        // BU capacity at 80% (delayed ramp)
  },
}
```

**What to watch in results:**
- `shortageMonthCount` increase -- how many additional shortage months does the
  delay create?
- `maxCoreUtilization` / `maxBuUtilization` spike -- does utilization exceed
  safe thresholds (>85%)?
- `bpAttainmentPct` drop -- does the delay cause BP targets to be missed?
- `totalRevenueUsd` impact -- what is the revenue cost of the delay?

**Decisions supported:**
- Should we expedite equipment delivery (at additional cost)?
- Should we shift orders to alternative production lines?
- Should we communicate revised delivery timelines to customers?
- What is the maximum acceptable delay before BP targets are missed?

---

#### Preset 2: `capacityPullForward` -- Capacity Ramp Accelerated

**Business scenario:** An opportunity arises to accelerate capacity ramp --
e.g., equipment vendor offers early delivery, a new production line comes online
ahead of schedule, or overtime shifts are approved. The question is whether the
accelerated capacity creates meaningful business value.

**Multiplier configuration:**

```typescript
{
  id: 'capacityPullForward',
  label: 'scenario.preset.capacityPullForward',
  description: 'scenario.preset.capacityPullForward.desc',
  params: {
    forecastVolume: 1.0,    // demand unchanged
    unitPrice: 1.0,         // pricing unchanged
    coreCapacity: 1.2,      // core capacity +20% (accelerated)
    buCapacity: 1.2,        // BU capacity +20% (accelerated)
  },
}
```

**What to watch in results:**
- `shortageMonthCount` decrease -- does the accelerated ramp eliminate shortages?
- `bpAttainmentPct` improvement -- does it push BP attainment above target?
- `maxCoreUtilization` / `maxBuUtilization` change -- does utilization drop to
  comfortable levels (<70%)?
- Whether the capacity increase actually translates to revenue increase (it
  only does if demand exists to fill the capacity)

**Decisions supported:**
- Is the cost of early delivery justified by the revenue gain?
- Should we commit to overtime shifts for the accelerated timeline?
- Is there enough demand to absorb the additional capacity?
- Does pulling forward capacity resolve the critical bottleneck?

---

#### Preset 3: `forecastIncrease` -- Demand Surge

**Business scenario:** A major customer increases their forecast, a new product
launch drives unexpected demand, or a competitor exits the market. Forecast
volumes increase across the board, testing whether current capacity plans can
handle the surge.

**Multiplier configuration:**

```typescript
{
  id: 'forecastIncrease',
  label: 'scenario.preset.forecastIncrease',
  description: 'scenario.preset.forecastIncrease.desc',
  params: {
    forecastVolume: 1.15,   // demand +15%
    unitPrice: 1.0,         // pricing unchanged
    coreCapacity: 1.0,      // capacity unchanged
    buCapacity: 1.0,        // capacity unchanged
  },
}
```

**What to watch in results:**
- `shortageMonthCount` increase -- how many new shortage months appear?
- `maxCoreUtilization` / `maxBuUtilization` -- does utilization exceed 100%
  (meaning unfulfillable demand)?
- `totalRevenueUsd` increase -- does higher volume translate to higher revenue,
  or is it capped by capacity?
- `bpAttainmentPct` -- does the demand surge push us above BP targets?

**Decisions supported:**
- Do we need to expand capacity to meet the increased demand?
- Should we prioritize high-margin SKUs when capacity is constrained?
- Should we renegotiate delivery commitments with the customer?
- What is the revenue opportunity cost of not expanding capacity?

---

#### Preset 4: `forecastDecrease` -- Demand Drop

**Business scenario:** A key customer reduces orders, a product is approaching
end-of-life, or macroeconomic conditions weaken demand. Forecast volumes
decrease, potentially leaving excess capacity.

**Multiplier configuration:**

```typescript
{
  id: 'forecastDecrease',
  label: 'scenario.preset.forecastDecrease',
  description: 'scenario.preset.forecastDecrease.desc',
  params: {
    forecastVolume: 0.85,   // demand -15%
    unitPrice: 1.0,         // pricing unchanged
    coreCapacity: 1.0,      // capacity unchanged
    buCapacity: 1.0,        // capacity unchanged
  },
}
```

**What to watch in results:**
- `maxCoreUtilization` / `maxBuUtilization` drop -- does utilization fall below
  profitable thresholds?
- `totalRevenueUsd` decrease -- what is the revenue impact?
- `bpAttainmentPct` drop -- does the demand decrease cause BP miss?
- `bpGapMillionTwd` -- how large is the gap to BP targets?

**Decisions supported:**
- Should we reduce capacity commitments (lay off shifts, return equipment)?
- Should we pursue new customers to fill excess capacity?
- Should we adjust pricing to stimulate demand?
- What is the minimum demand level that keeps the operation profitable?

---

#### Preset 5: `orderDisappearance` -- Customer/SKU Order Loss

**Business scenario:** A specific customer cancels their program, a product is
discontinued, or a trade restriction eliminates a market. This models the
complete loss of a revenue stream, which is different from a uniform demand
decrease because it may disproportionately affect specific capacity lines.

**Multiplier configuration (global approximation):**

```typescript
{
  id: 'orderDisappearance',
  label: 'scenario.preset.orderDisappearance',
  description: 'scenario.preset.orderDisappearance.desc',
  params: {
    forecastVolume: 0.7,    // demand -30% (approximation of losing a major customer)
    unitPrice: 1.0,         // pricing unchanged for remaining orders
    coreCapacity: 1.0,      // capacity unchanged
    buCapacity: 1.0,        // capacity unchanged
  },
}
```

**Important limitation:** The current engine applies multipliers globally. A true
"order disappearance" simulation would need per-SKU or per-customer multipliers
(see Section 5). The global approximation of -30% is a rough proxy. A more
precise implementation would require the user to select specific SKUs or
customers to exclude.

**What to watch in results:**
- `totalRevenueUsd` decrease -- absolute revenue loss
- `maxCoreUtilization` / `maxBuUtilization` -- does losing the customer free
  capacity for other orders?
- `bpAttainmentPct` drop -- does the loss cause BP targets to be missed?
- Whether the freed capacity could be reallocated to other customers

**Decisions supported:**
- Should we offer retention pricing to the departing customer?
- Can we backfill the lost volume with new customer wins?
- Should we downsize capacity or redeploy it to other products?
- What is the minimum customer base needed to cover fixed costs?

---

### 3.3 Preset Registry

All presets are defined as a static array in `frontend/src/core/workbench.ts`
(and re-exported for use by `ScenarioPlanning.tsx`). The registry pattern:

```typescript
export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'capacityDelay',
    label: 'scenario.preset.capacityDelay',
    description: 'scenario.preset.capacityDelay.desc',
    params: { forecastVolume: 1.0, unitPrice: 1.0, coreCapacity: 0.8, buCapacity: 0.8 },
  },
  {
    id: 'capacityPullForward',
    label: 'scenario.preset.capacityPullForward',
    description: 'scenario.preset.capacityPullForward.desc',
    params: { forecastVolume: 1.0, unitPrice: 1.0, coreCapacity: 1.2, buCapacity: 1.2 },
  },
  {
    id: 'forecastIncrease',
    label: 'scenario.preset.forecastIncrease',
    description: 'scenario.preset.forecastIncrease.desc',
    params: { forecastVolume: 1.15, unitPrice: 1.0, coreCapacity: 1.0, buCapacity: 1.0 },
  },
  {
    id: 'forecastDecrease',
    label: 'scenario.preset.forecastDecrease',
    description: 'scenario.preset.forecastDecrease.desc',
    params: { forecastVolume: 0.85, unitPrice: 1.0, coreCapacity: 1.0, buCapacity: 1.0 },
  },
  {
    id: 'orderDisappearance',
    label: 'scenario.preset.orderDisappearance',
    description: 'scenario.preset.orderDisappearance.desc',
    params: { forecastVolume: 0.7, unitPrice: 1.0, coreCapacity: 1.0, buCapacity: 1.0 },
  },
];

export function findPresetById(id: string): ScenarioPreset | undefined {
  return SCENARIO_PRESETS.find(p => p.id === id);
}
```

### 3.4 Baseline vs Scenario Comparison

The current `computeScenarioComparison` function already produces a full
comparison. The delta metrics it returns are:

| Metric | What it measures | Business significance |
|---|---|---|
| `totalRevenueUsd` | Total forecast revenue change | Top-line impact |
| `totalForecastPcs` | Total forecast volume change | Demand signal |
| `maxCoreUtilization` | Peak Core process utilization | Bottleneck risk |
| `maxBuUtilization` | Peak BU process utilization | Bottleneck risk |
| `shortageMonthCount` | Number of months with capacity shortage | Delivery risk |
| `bpAttainmentPct` | BP target attainment change | Strategic target compliance |
| `bpGapMillionTwd` | Gap to BP targets in million TWD | Financial shortfall |

Each delta includes `base`, `scenario`, `delta`, and `deltaPercent` values,
enabling both absolute and relative comparison.

**Recommended UI enhancements for preset context:**

1. Show the preset name and description alongside the delta cards.
2. Highlight the most business-relevant deltas for the specific preset (e.g.,
   for `capacityDelay`, emphasize `shortageMonthCount` and `maxCoreUtilization`).
3. Add a "What does this mean?" tooltip per preset that explains the business
   context and recommended next steps.

---

### 3.5 Multi-Scenario Comparison (Future)

To compare multiple scenarios side by side, extend the engine to accept an array
of scenario configurations:

```typescript
export interface MultiScenarioComparison {
  baseline: ScenarioBaseline;
  scenarios: Array<{
    id: string;
    label: string;
    multipliers: ScenarioMultipliers;
    result: ScenarioComparison;
  }>;
}
```

**UI layout:** A table with rows for each delta metric and columns for baseline
plus each scenario. This enables answering questions like:
- "Which scenario best preserves BP attainment?"
- "What is the revenue difference between delaying capacity by 1 month vs 3 months?"
- "Does a 10% demand increase or a 20% capacity increase have a bigger impact on shortage months?"

**Implementation considerations:**
- Each scenario requires a full `runCalculation` call. With N scenarios, the
  computation cost is N+1 (baseline + N scenarios).
- The current `runCalculation` is synchronous and runs in the browser. For 3-5
  scenarios this is acceptable (<1 second total). For more, consider Web Workers.
- The multi-scenario table should be scrollable horizontally on mobile.

---

## 4. Current Limitations

### 4.1 In-Memory Only, No Persistence

All scenario state lives in React `useState`. Refreshing the page loses the
scenario configuration and results. This is acceptable for sandbox exploration
but prevents:
- Saving named scenarios for later review
- Sharing scenario configurations with colleagues
- Tracking scenario analysis history for audit purposes

### 4.2 Four Global Multipliers

The `ScenarioMultipliers` interface has exactly 4 fields, all applied globally:

```typescript
interface ScenarioMultipliers {
  forecastVolume: number;  // applied to ALL forecasts
  unitPrice: number;       // applied to ALL SKU prices AND forecast prices
  coreCapacity: number;    // applied to ALL capacity plans' corePanelPerDay
  buCapacity: number;      // applied to ALL capacity plans' buPanelPerDay
}
```

This means:
- Cannot simulate a price change for one product family while keeping others constant.
- Cannot model a capacity expansion on one production line only.
- Cannot exclude specific SKUs or customers from a demand change.
- Cannot model time-phased changes (e.g., capacity delay for 3 months then recovery).

### 4.3 No Conditional Logic

The engine applies multipliers unconditionally. It cannot express:
- "If utilization exceeds 90%, shift overflow demand to next month."
- "If a SKU's forecast exceeds capacity, cap it at available capacity."
- "Phase in the demand increase over 3 months, not all at once."

### 4.4 Clamp Range [0.5, 2.0]

Multipliers are clamped to 50% -- 200%. This prevents modeling extreme scenarios
like:
- Complete demand loss (0%) -- must use 0.5 as a proxy for "halved demand."
- 3x capacity expansion -- must cap at 2.0.
- Negative pricing pressure beyond -50%.

---

## 5. Per-SKU and Per-Customer Simulation

### 5.1 What Would Need to Change

To support per-SKU simulation, `ScenarioMultipliers` would need to become a map:

```typescript
interface PerSkuMultipliers {
  /** Default multipliers for SKUs not in the overrides map. */
  defaults: ScenarioMultipliers;
  /** Per-SKU overrides, keyed by SKU ID. */
  skuOverrides: Record<string, Partial<ScenarioMultipliers>>;
}
```

Similarly, per-customer simulation would require:

```typescript
interface PerCustomerMultipliers {
  defaults: ScenarioMultipliers;
  /** Per-customer overrides, keyed by customer name. */
  customerOverrides: Record<string, Partial<ScenarioMultipliers>>;
}
```

### 5.2 Changes Required in `scenarioEngine.ts`

The `applyScenarioMultipliers` function currently iterates all items uniformly:

```typescript
const scenarioForecasts = forecasts.map((f) => ({
  ...f,
  forecastPcs: f.forecastPcs * m.forecastVolume,
  unitPrice: f.unitPrice * m.unitPrice,
}));
```

With per-SKU support, this would become:

```typescript
const scenarioForecasts = forecasts.map((f) => {
  const skuOverride = multipliers.skuOverrides?.[f.skuId];
  const fv = skuOverride?.forecastVolume ?? m.forecastVolume;
  const up = skuOverride?.unitPrice ?? m.unitPrice;
  return {
    ...f,
    forecastPcs: f.forecastPcs * fv,
    unitPrice: f.unitPrice * up,
  };
});
```

### 5.3 Impact on ScenarioComparison

The `ScenarioDeltas` would remain the same (global deltas), but an additional
per-dimension breakdown would be valuable:

```typescript
interface ScenarioDeltas {
  // ... existing global deltas ...

  /** Per-SKU revenue delta (top 10 by absolute delta). */
  skuRevenueDeltas: Array<{
    skuId: string;
    skuName: string;
    baseRevenue: number;
    scenarioRevenue: number;
    delta: number;
  }>;

  /** Per-customer revenue delta (top 10 by absolute delta). */
  customerRevenueDeltas: Array<{
    customer: string;
    baseRevenue: number;
    scenarioRevenue: number;
    delta: number;
  }>;
}
```

### 5.4 UI Implications

Per-SKU simulation requires a SKU selector in the scenario panel. Options:
1. **Dropdown with multi-select** -- user picks which SKUs the multiplier applies to.
2. **Table with inline multipliers** -- each SKU row has its own multiplier input.
3. **Filter + multiplier** -- user filters by customer/product family, then sets
   a multiplier for the filtered set.

Option 1 is the simplest and sufficient for most use cases.

---

## 6. Firestore Schema for Saved Scenarios (Future)

### 6.1 Collection Structure

```
projects/{projectId}/scenarios/{scenarioId}
```

### 6.2 Document Schema

```typescript
interface SavedScenarioDocument {
  /** User-visible name for the scenario. */
  name: string;
  /** Optional description or notes. */
  description: string;
  /** The preset ID if this scenario was created from a preset, null otherwise. */
  presetId: string | null;
  /** The multiplier configuration. */
  multipliers: {
    forecastVolume: number;
    unitPrice: number;
    coreCapacity: number;
    buCapacity: number;
  };
  /** Snapshot of the delta results at save time. */
  savedDeltas: {
    totalRevenueUsd: { base: number; scenario: number; delta: number; deltaPercent: number };
    totalForecastPcs: { base: number; scenario: number; delta: number; deltaPercent: number };
    maxCoreUtilization: { base: number | null; scenario: number | null; delta: number | null };
    maxBuUtilization: { base: number | null; scenario: number | null; delta: number | null };
    shortageMonthCount: { base: number; scenario: number; delta: number };
    bpAttainmentPct: { base: number | null; scenario: number | null; delta: number | null };
    bpGapMillionTwd: { base: number | null; scenario: number | null; delta: number | null };
  };
  /** Who created this scenario. */
  createdBy: string;
  /** When it was created. */
  createdAt: FirebaseFirestore.Timestamp;
  /** When it was last modified. */
  updatedAt: FirebaseFirestore.Timestamp;
  /** When the baseline data was last modified (to detect staleness). */
  baselineDataVersion: FirebaseFirestore.Timestamp | null;
  /** Tags for organization (e.g., "Q2-review", "capacity-planning"). */
  tags: string[];
}
```

### 6.3 Staleness Detection

Saved scenarios store a `baselineDataVersion` timestamp. When loading a saved
scenario, compare against the latest modification time of the project's SKU,
forecast, capacity, and parameter data. If the baseline has changed since the
scenario was saved, show a warning:

> "The underlying data has changed since this scenario was saved. Results may be
> outdated. Re-run the scenario to see updated deltas."

### 6.4 Security Rules

```
match /projects/{projectId}/scenarios/{scenarioId} {
  allow read: if isAuthenticated() && hasProjectAccess(projectId);
  allow write: if isAuthenticated() && hasProjectAccess(projectId) && canEdit(projectId);
}
```

### 6.5 Index Requirements

A composite index on `projects/{projectId}/scenarios`:
- `createdBy` ASC, `createdAt` DESC -- for "my scenarios" listing.
- `tags` ARRAY_CONTAINS, `createdAt` DESC -- for tag-based filtering.

---

## 7. AI Copilot Integration

### 7.1 Explaining Scenario Results

The AI Copilot can explain scenario results by receiving the `ScenarioComparison`
object as context. The Copilot should be able to answer questions like:

- "What does this scenario mean for our Q3 delivery commitments?"
- "Which months will have capacity shortages in this scenario?"
- "How does this scenario affect our BP attainment?"
- "What actions would you recommend based on these results?"

### 7.2 Copilot Tool Extension

A new Copilot tool `explainScenario` could be added to `aiCopilotTools.ts`:

```typescript
{
  name: 'explainScenario',
  description: 'Explain the results of a scenario comparison in business terms',
  parameters: {
    comparison: ScenarioComparison,  // the full comparison object
    presetId: string | null,         // the preset that was used, if any
    userQuestion: string,            // the user's specific question
  },
  handler: (context, params) => {
    // Build a prompt that includes:
    // 1. The preset description (if applicable)
    // 2. The delta metrics
    // 3. The user's question
    // Return a structured explanation
  },
}
```

### 7.3 Proactive Scenario Suggestions

The Copilot could proactively suggest scenarios based on observed abnormalities:

- If `shortageMonthCount > 0`: "I see capacity shortages in the baseline. Would
  you like me to run a scenario with +10% capacity to see if that resolves them?"
- If `bpAttainmentPct < 80%`: "BP attainment is below 80%. Would you like to
  explore scenarios that could close the gap?"
- If a specific customer contributes >50% of revenue: "Revenue is heavily
  concentrated in one customer. Would you like to see what happens if their
  orders decrease by 30%?"

---

## 8. Implementation Roadmap

### Phase 1 (v1.43): URL-Based Preset Loading

- Add `useSearchParams` to `ScenarioPlanning.tsx` to read `preset`, `fv`, `up`,
  `cc`, `bc`, `autorun` query params.
- Define the 5 business presets in `workbench.ts` and import them in
  `ScenarioPlanning.tsx`.
- Update Workbench preset cards to navigate with `?preset=<id>&autorun=1`.
- Add i18n keys for preset labels and descriptions.
- Estimated effort: 1-2 days.

### Phase 2 (v1.44): Per-SKU Simulation

- Extend `ScenarioMultipliers` to support per-SKU overrides.
- Add SKU selector to the scenario panel.
- Add per-SKU revenue delta breakdown to the comparison view.
- Estimated effort: 3-5 days.

### Phase 3 (v1.45): Saved Scenarios

- Add Firestore collection `projects/{projectId}/scenarios`.
- Add save/load/delete UI for scenarios.
- Add staleness detection.
- Add shareable links.
- Estimated effort: 5-7 days.

### Phase 4 (v1.46): Multi-Scenario Comparison

- Extend engine to support multiple scenarios.
- Add comparison table UI.
- Add export to CSV/Excel.
- Estimated effort: 3-5 days.

### Phase 5 (v1.47): AI Copilot Scenario Integration

- Add `explainScenario` Copilot tool.
- Add proactive scenario suggestions.
- Estimated effort: 2-3 days.

---

## 9. Testing Strategy

### 9.1 Unit Tests

- `findPresetById` returns correct preset for valid ID, undefined for invalid.
- URL parameter parsing handles missing params (defaults), out-of-range values
  (clamped), and invalid values (ignored, use defaults).
- `autorun` flag triggers scenario execution only when data is loaded and
  multipliers are non-default.

### 9.2 Integration Tests

- Navigate from Workbench preset card to `/scenario?preset=capacityDelay&autorun=1`
  and verify the comparison renders with correct deltas.
- Manually adjust sliders after preset load; verify the URL does not change
  (URL is read-only input, not bidirectional sync).
- Test with empty data (no SKUs/forecasts) -- preset should activate but
  comparison should show the "no data" guard.

### 9.3 E2E Smoke Test

- Load project with sample data.
- Click each of the 5 preset cards on the Workbench.
- Verify each navigates to `/scenario` with correct preset applied and
  comparison auto-rendered.
- Verify delta cards show non-null values for all 7 metrics.

---

## 10. I18n Keys

```typescript
// English (en.ts)
'scenario.preset.capacityDelay': 'Capacity Delay',
'scenario.preset.capacityDelay.desc': 'Simulate a supply chain delay reducing available capacity by 20%. Watch for increased shortage months and utilization spikes.',
'scenario.preset.capacityPullForward': 'Capacity Acceleration',
'scenario.preset.capacityPullForward.desc': 'Simulate an accelerated capacity ramp with 20% more capacity. Check if the additional capacity translates to revenue growth.',
'scenario.preset.forecastIncrease': 'Demand Surge (+15%)',
'scenario.preset.forecastIncrease.desc': 'Simulate a 15% increase in forecast demand. Identify new capacity constraints and revenue opportunities.',
'scenario.preset.forecastDecrease': 'Demand Drop (-15%)',
'scenario.preset.forecastDecrease.desc': 'Simulate a 15% decrease in forecast demand. Assess the impact on BP attainment and capacity utilization.',
'scenario.preset.orderDisappearance': 'Major Order Loss (-30%)',
'scenario.preset.orderDisappearance.desc': 'Simulate the loss of a major customer representing ~30% of volume. Evaluate revenue impact and capacity reallocation options.',
```

---

## Appendix A: Decision Matrix

| Decision Question | Relevant Preset | Key Metric |
|---|---|---|
| Can we absorb a 2-month capacity delay? | `capacityDelay` | `shortageMonthCount`, `bpAttainmentPct` |
| Is early equipment delivery worth the cost? | `capacityPullForward` | `totalRevenueUsd` delta vs equipment cost |
| Do we need to expand capacity for the new forecast? | `forecastIncrease` | `maxCoreUtilization`, `maxBuUtilization` |
| Should we downsize operations for lower demand? | `forecastDecrease` | `totalRevenueUsd`, `bpGapMillionTwd` |
| What is the revenue risk if we lose Customer X? | `orderDisappearance` | `totalRevenueUsd`, `bpAttainmentPct` |
| Which scenario best preserves BP targets? | Multi-scenario comparison | `bpAttainmentPct` across all scenarios |

---

## Appendix B: File Inventory (Planned)

| File | Change Type | Description |
|---|---|---|
| `frontend/src/core/workbench.ts` | Modify | Add 5 business preset definitions with `findPresetById` helper |
| `frontend/src/pages/ScenarioPlanning.tsx` | Modify | Add `useSearchParams` for URL-based preset loading and `autorun` support |
| `frontend/src/i18n/en.ts` | Modify | Add preset label and description i18n keys |
| `frontend/src/i18n/zhTW.ts` | Modify | Add Traditional Chinese translations for preset keys |
| `frontend/src/core/scenarioEngine.ts` | Modify (Phase 2) | Extend `ScenarioMultipliers` for per-SKU overrides |
| `frontend/src/core/workbench.test.ts` | Modify | Add tests for `findPresetById` and preset validation |
| `frontend/src/pages/ScenarioPlanning.test.tsx` | Modify | Add tests for URL parameter parsing and autorun |
