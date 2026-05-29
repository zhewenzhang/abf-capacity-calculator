# Scenario and What-if Review

**Review Date**: 2026-05-28
**Reviewer**: Agent 8 — Scenario and What-if Agent
**Scope**: v1.37 Scenario Planning + v1.44 Operational What-if
**Duration**: ~15 minutes

---

## 1. Architecture Comparison

### v1.37 Scenario Planning (scenarioEngine.ts)

**Approach**: Multiplier-based scenario engine

- Uses `ScenarioMultipliers` interface with four multiplier fields: `forecastVolume`, `unitPrice`, `coreCapacity`, `buCapacity`
- Multiplier range: [0.5, 2.0] (clamped via `clampMultipliers`)
- Applies multipliers to create new arrays via spread operator (`{ ...item }`)
- Runs `runCalculation` on both baseline and scenario data
- Builds `ScenarioComparison` with deltas for 7 metrics

**Key Functions**:
- `applyScenarioMultipliers()` — creates new arrays with multiplied values
- `computeScenarioComparison()` — orchestrates baseline vs scenario comparison
- `computeDelta()` — calculates delta and deltaPercent

**UI**: `ScenarioPlanning.tsx` page with sliders for each multiplier

### v1.44 Operational What-if (operationalScenario.ts)

**Approach**: Scenario-type-based engine with data transformation

- Supports 4 scenario types: `capacityDelay`, `capacityPullForward`, `forecastAdjustment`, `orderDisappearance`
- Each scenario type has its own transformation logic
- Uses `deepCloneArray()` for input isolation
- Adds per-customer and per-SKU impact analysis (`CustomerSkuImpact`)
- Includes "what-if projection" caveats in all results

**Key Functions**:
- `runOperationalScenario()` — entry point, dispatches to type-specific handlers
- `shiftCapacityPlans()` — shifts capacity entries by N months
- `adjustForecastVolume()` — applies percentage adjustment to matching forecasts
- `removeMatchingForecasts()` — filters out matching forecasts
- `computeCustomerSkuImpact()` — aggregates revenue deltas by customer/SKU

**UI**: Integrated into `DailyOperationsWorkbench.tsx`

### Relationship

v1.44 **extends** v1.37 without modifying it:
- Imports `defaultMultipliers` and type definitions from `scenarioEngine.ts`
- Reuses `ScenarioComparison` and `ScenarioDeltas` types
- Implements its own `buildComparisonFromTransformedData()` for non-multiplier scenarios
- Both engines call the same `runCalculation()` from `calculationEngine.ts`

---

## 2. Verification Results

### 2.1 Baseline Immutable

**Status: PASS**

Both engines create new arrays/objects before transformation:

**v1.37** (`applyScenarioMultipliers`, line 70-87):
```typescript
const scenarioSkus = skus.map((s) => ({
  ...s,
  unitPrice: s.unitPrice > 0 ? s.unitPrice * m.unitPrice : s.unitPrice,
}));
```

**v1.44** (all scenario handlers):
```typescript
const clonedSkus = deepCloneArray(skus);
const clonedForecasts = deepCloneArray(forecasts);
const clonedCapacityPlans = deepCloneArray(capacityPlans);
```

**Risk Assessment**: Low. The types (`SKU`, `Forecast`, `CapacityPlan`) are flat objects with primitive values (strings, numbers, optional Date). The spread operator (`{ ...item }`) is sufficient for these types.

**Note**: `deepCloneArray` uses `{ ...item }` which is a shallow clone. This is acceptable because:
- No nested objects in the type definitions
- `Date` objects are optional and not modified by any transformation
- All transformations create new primitive values (multiplication, string manipulation)

**Tests**: 
- `scenarioEngine.test.ts`: 3 tests verify no mutation
- `operationalScenario.test.ts`: 3 tests verify no mutation (capacity delay, forecast adjustment, order disappearance)

### 2.2 In-memory Only

**Status: PASS**

No persistence mechanisms found in any scenario file:
- No `localStorage` / `sessionStorage` calls
- No Firestore imports (`addDoc`, `setDoc`, `updateDoc`)
- No `indexedDB` usage
- No service imports (explicitly forbidden in `operationalScenario.ts`)

**scenarioExport.ts** provides export-to-clipboard and download-as-file functionality, but these are user-initiated actions, not automatic persistence.

### 2.3 No Persistence

**Status: PASS**

Confirmed no save operations in:
- `scenarioEngine.ts`
- `operationalScenario.ts`
- `ScenarioPlanning.tsx`
- `DailyOperationsWorkbench.tsx`

The `ScenarioExportPack` interface includes `scenarioNotCommitted: boolean` (always `true`) to explicitly mark results as in-memory only.

### 2.4 Capacity Delay/Pull-forward

**Status: PASS with caveat**

**Semantic Correctness**:
- `capacityDelay` shifts months forward (positive shift): `2026-01` → `2026-03` (with +2)
- `capacityPullForward` shifts months backward (negative shift): `2026-01` → `2025-12` (with -1)
- Out-of-range entries (outside forecast date range) are dropped correctly
- `shiftMonthString()` handles year boundaries correctly (e.g., `2026-01` - 1 = `2025-12`)

**Caveat**: The `capacityShiftTarget` parameter (`'core' | 'bu' | 'both'`) is accepted but **not used** in `shiftCapacityPlans()` (line 322: `_target: 'core' | 'bu' | 'both'`). All capacity entries are shifted regardless of target setting.

**Tests**:
- Capacity delay by 2 months: verifies shift and out-of-range dropping
- Capacity pull-forward by 1 month: verifies backward shift
- Clamp bounds: verifies [-12, +12] range

### 2.5 Forecast Increase/Decrease

**Status: PASS**

**Semantic Correctness**:
- `adjustForecastVolume()` applies: `forecastPcs * (1 + adjustPercent / 100)`
- Positive percent increases volume, negative decreases
- Filter matching uses AND logic across dimensions (customers, skuIds, skuCodes, months)
- Non-matching forecasts are left unchanged

**Tests**:
- Forecast increase 10%: verifies positive delta in revenue and forecastPcs
- Forecast decrease 20%: verifies negative delta
- Clamp bounds: verifies [-50%, +100%] range

### 2.6 Order Disappearance

**Status: PASS**

**Semantic Correctness**:
- `removeMatchingForecasts()` filters out forecasts matching ALL set filter fields (AND logic)
- Supports filtering by: `customer`, `skuId`, `skuCode`, `month`
- Empty filter fields are ignored (no match)
- Original forecasts array is not modified

**Tests**:
- Order disappearance by customer: verifies removal and negative deltas
- No mutation test: verifies original array unchanged

### 2.7 Revenue/BP/Utilization Delta

**Status: PASS**

**Direction Consistency**:
- `computeDelta()` calculates: `delta = scenario - base`
- `deltaPercent = (delta / base) * 100` (handles base=0 gracefully)
- Revenue: positive delta = increase (green in UI)
- Utilization: negative delta = improvement (green in UI, since lower utilization is better)
- Shortage months: negative delta = improvement (fewer shortages)
- BP attainment: positive delta = improvement (closer to target)

**Tests**:
- Default multiplier (1.0) produces zero deltas
- Volume/price increase produces positive revenue delta

### 2.8 CustomerSkuImpact

**Status: PASS**

**Per-customer/SKU Deltas**:
- `aggregateByCustomer()`: aggregates revenue by `sku.customer` field
- `aggregateBySku()`: aggregates revenue by `skuId`
- Both calculate: `delta = scenario - base`, `deltaPercent = (delta / base) * 100`
- Sorted by absolute delta descending
- `top20Sku` limited to 20 entries

**Tests**:
- Verifies positive deltas for 10% forecast increase
- Verifies sorting by absolute delta descending
- Verifies `top20Sku.length <= 20`

---

## 3. Test Coverage Gaps

### 3.1 scenarioEngine.test.ts

**Coverage**: Good for core functionality

**Gaps**:
- No test for `unitPrice: 0` edge case (should be preserved, not multiplied)
- No test for negative multiplier values (should be clamped to 0.5)
- No test for `Infinity` handling in utilization deltas (line 137-140)
- No integration test with `ScenarioPlanning.tsx` UI component

### 3.2 operationalScenario.test.ts

**Coverage**: Good for happy paths and mutation prevention

**Gaps**:
- No test for `shiftMonthString()` with invalid format (e.g., `"2026"`, `"abc"`)
- No test for `shiftMonthString()` at year boundaries (e.g., `2026-01` - 1 = `2025-12`)
- No test for `shiftCapacityPlans()` with `factoryIds` filtering
- No test for `matchesForecastFilterWithSkus()` with multiple filter dimensions (AND logic)
- No test for `matchesOrderFilterWithSkus()` with multiple filter fields (AND logic)
- No test for `deepCloneArray()` with Date objects
- No test for empty filter arrays (should mean "no filter")
- No test for `capacityShiftTarget` parameter (currently unused)
- No test for `forecastFilter.months` filtering
- No test for `orderFilter.skuCode` filtering

### 3.3 scenarioExport.test.ts

**Coverage**: Comprehensive for export functionality

**Gaps**:
- No test for `copyScenarioJson()` (clipboard API)

---

## 4. Risk Assessment

### P0 (Critical)

None identified.

### P1 (High)

**1. Unused `capacityShiftTarget` parameter**
- **Location**: `operationalScenario.ts`, line 322
- **Issue**: `shiftCapacityPlans()` accepts `_target: 'core' | 'bu' | 'both'` but never uses it
- **Impact**: Capacity shift applies to both core and BU regardless of user selection
- **Risk**: Users may expect to shift only core or only BU capacity
- **Recommendation**: Implement target-specific filtering or remove the parameter

**2. Shallow clone for Date objects**
- **Location**: `operationalScenario.ts`, line 760 (`deepCloneArray`)
- **Issue**: `{ ...item }` creates a shallow clone; Date objects are shared references
- **Impact**: If a transformation modifies a Date field, the original would be affected
- **Risk**: Low (no current transformation touches Date fields), but fragile
- **Recommendation**: Use `structuredClone()` or explicit Date cloning if Date mutations are added

### P2 (Medium)

**1. Duplicated helper functions**
- **Location**: `scenarioEngine.ts` lines 162-186, `operationalScenario.ts` lines 223-247
- **Issue**: `computeDelta`, `computeBpAttainmentPct`, `computeBpGap` are duplicated
- **Impact**: Maintenance burden, potential for divergence
- **Recommendation**: Extract shared helpers to a common module

**2. No test for edge cases in month shifting**
- **Location**: `operationalScenario.ts`, line 715 (`shiftMonthString`)
- **Issue**: No tests for invalid month formats, year 2000/2099 boundaries
- **Impact**: Potential silent failures with malformed data
- **Recommendation**: Add edge case tests

**3. Clamp range mismatch**
- **Location**: `scenarioEngine.ts` (multipliers: 0.5-2.0) vs `operationalScenario.ts` (forecast: -50% to +100%)
- **Issue**: Different clamp ranges for similar operations
- **Impact**: Confusing UX if users switch between scenario types
- **Recommendation**: Document the rationale for different ranges

### P3 (Low)

**1. No undo/history for scenario changes**
- **Impact**: Users cannot revert to previous scenario configurations
- **Recommendation**: Consider adding scenario history (in-memory only)

**2. No export functionality for operational scenarios**
- **Impact**: v1.44 scenarios cannot be exported like v1.37 scenarios
- **Recommendation**: Extend `scenarioExport.ts` to support operational scenarios

---

## 5. Recommendations

### Immediate (P1)

1. **Implement or remove `capacityShiftTarget`**
   - If intended: add filtering logic to shift only core or BU capacity
   - If not intended: remove the parameter from the interface and UI

2. **Improve deep clone safety**
   - Replace `{ ...item }` with `structuredClone()` (available in modern browsers)
   - Or add explicit Date handling if Date mutations are planned

### Short-term (P2)

3. **Extract shared helpers**
   - Move `computeDelta`, `computeBpAttainmentPct`, `computeBpGap` to a shared module
   - Update imports in both `scenarioEngine.ts` and `operationalScenario.ts`

4. **Add edge case tests**
   - `shiftMonthString()` with invalid formats
   - `shiftCapacityPlans()` with factory ID filtering
   - `matchesForecastFilterWithSkus()` with multiple dimensions
   - `matchesOrderFilterWithSkus()` with multiple fields

5. **Document clamp range rationale**
   - Add comments explaining why multipliers use [0.5, 2.0] and forecast uses [-50%, +100%]

### Long-term (P3)

6. **Add scenario history**
   - In-memory stack of previous configurations
   - Undo/redo functionality

7. **Extend export to operational scenarios**
   - Add `OperationalScenarioExportPack` interface
   - Support export for all 4 scenario types

---

## 6. Summary

| Verification Point | Status | Notes |
|-------------------|--------|-------|
| Baseline immutable | PASS | Spread operator sufficient for flat types |
| In-memory only | PASS | No persistence mechanisms found |
| No persistence | PASS | No save operations |
| Capacity delay/pull-forward | PASS | Correct semantics, but `target` param unused |
| Forecast increase/decrease | PASS | Correct percentage adjustment |
| Order disappearance | PASS | Correct AND-logic filtering |
| Revenue/BP/utilization delta | PASS | Direction consistent |
| CustomerSkuImpact | PASS | Correct per-customer/SKU aggregation |

**Overall Assessment**: The scenario system is well-designed with strong immutability guarantees and no persistence risks. The main concern is the unused `capacityShiftTarget` parameter (P1) which may confuse users. Test coverage is good for happy paths but could be improved for edge cases.

---

**End of Review**
