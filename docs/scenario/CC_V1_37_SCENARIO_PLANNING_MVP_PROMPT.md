# CC v1.37.0 Scenario Planning MVP -- 實作指令

> **Target developer:** CC (Claude Code)
> **Branch:** `agy/v1-37-scenario-planning-mvp`
> **Base:** current `main` (v1.36.0)
> **Estimated effort:** ~800-1000 LOC across 10 files
> **Last updated:** 2026-05-27

---

## 一、核心實作紅線 (10 Golden Rules)

| # | Rule | Rationale |
|---|------|-----------|
| 1 | **不新增 Firestore collection / schema** | Scenario state is ephemeral; lives only in React state/context |
| 2 | **不修改 calculationEngine.ts / analytics.ts / bpTargets.ts / currency.ts** | These are the calculation core; scenario engine calls them, never edits them |
| 3 | **不新增 npm dependency** | All UI is Ant Design + React already in package.json |
| 4 | **Scenario state 只存在 React state/context，不觸及 service 層** | No writes to any `services/*.ts` file |
| 5 | **Baseline data 不可被 mutation (clone first)** | Follow the same `cloneForecasts`/`cloneSkus`/`cloneCapacityPlans` pattern from `impactAnalysis.ts` |
| 6 | **不做 silent auto-save** | User explicitly creates/destroys scenarios; no background persistence |
| 7 | **Viewer 無法建立/編輯 scenario** | Use `canEdit(scope.role)` from `services/projectScope.ts` |
| 8 | **所有 i18n 必須 EN + zh-TW** | Both `en.ts` and `zhTW.ts` must have identical key sets (enforced by `i18nKeys.test.ts`) |
| 9 | **延續 v1.35/v1.36 的 useMemo/cache 模式** | No new state management libraries; React.useState + useMemo + useCallback |
| 10 | **不使用 window.location.reload** | Use React state transitions for all UI updates |

---

## 二、Architecture Context (Read Before Implementing)

### Existing calculation pipeline

```
runCalculation(skus, forecasts, capacityPlans, params)          → CalculationResult
    ↓
buildAnalyticsModel(skus, forecasts, capacityPlans, params)     → AnalyticsModel
    ↓
buildBpAnalysis(skuResults, skus, monthlySummaries, targets, currencySettings) → BpAnalysisModel
```

**Key types** (from `types/index.ts`):
```ts
interface CalculationResult {
  skuResults: SkuCalculationResult[];
  monthlySummaries: MonthlyCapacitySummary[];
  totalRevenue: number;
  totalForecastPcs: number;
  maxCoreUtilization: number | null;
  maxBuUtilization: number | null;
  shortageMonthCount: number;
  worstBottleneckMonth: string | null;
}
```

**SnapshotKind already includes `'scenario'`** (see `types/snapshot.ts` line 17). This is for future persistence; MVP does not persist.

### Existing clone-and-rerun pattern (from `impactAnalysis.ts`)

```ts
// Price scenario: clone forecasts with multiplier
function cloneForecasts(forecasts: Forecast[], deltaPct: number): Forecast[] {
  return forecasts.map(f => ({
    ...f,
    unitPrice: f.unitPrice * (1 + deltaPct),
  }));
}

// Capacity scenario: clone capacity plans with multiplier
function cloneCapacityPlans(capacityPlans: CapacityPlan[], coreDelta: number, buDelta: number): CapacityPlan[] {
  return capacityPlans.map(cp => ({
    ...cp,
    corePanelPerDay: cp.corePanelPerDay * (1 + coreDelta),
    buPanelPerDay: cp.buPanelPerDay * (1 + buDelta),
  }));
}
```

The scenario engine must follow this exact pattern -- never mutate originals.

### Role enforcement pattern (from `services/projectScope.ts`)

```ts
function canEdit(role: WorkspaceRole): boolean {
  return role === 'owner' || role === 'editor';
}
```

### Existing UI patterns

- Pages receive `scope: ProjectScope` as prop (see `BpTargets.tsx`)
- `useI18n()` hook provides `t(key)` for translations
- `MetricCard` from `components/common` for KPI display
- Lazy-loaded routes in `App.tsx` via `React.lazy()`
- Ant Design 5.x components (Card, Row, Col, Slider, InputNumber, Button, Typography, Space, Alert, Tooltip, Tag)

---

## 三、MVP 任務拆解 (Task Breakdown)

### Task 1: `frontend/src/core/scenarioEngine.ts` -- Core scenario engine

**Dependencies:** None (foundation task)
**Estimated LOC:** ~180

**Implement the following interfaces and functions:**

```ts
// --- Types ---

/** Multipliers applied to baseline data. All default to 1.0 (no change). */
interface ScenarioMultipliers {
  /** Forecast quantity multiplier (e.g., 1.1 = +10% volume) */
  forecastVolume: number;
  /** Unit price multiplier (e.g., 0.95 = -5% price) */
  unitPrice: number;
  /** Core capacity multiplier */
  coreCapacity: number;
  /** BU capacity multiplier */
  buCapacity: number;
}

/** Snapshot of a single scenario's computed results. */
interface ScenarioSnapshot {
  id: string;
  name: string;
  multipliers: ScenarioMultipliers;
  calcResult: CalculationResult;
  bpModel: BpAnalysisModel;
  analyticsModel: AnalyticsModel;
}

/** Comparison between baseline and scenario. */
interface ScenarioComparison {
  baseline: ScenarioSnapshot;
  scenario: ScenarioSnapshot;
  deltas: ScenarioDeltas;
}

/** Key metric deltas. */
interface ScenarioDeltas {
  totalRevenueUsd: DeltaMetric;
  totalForecastPcs: DeltaMetric;
  maxCoreUtilization: DeltaMetric;
  maxBuUtilization: DeltaMetric;
  shortageMonthCount: DeltaMetric;
  bpAttainment: DeltaMetric;       // yearly overall
  bpGapMillionTwd: DeltaMetric;
}

interface DeltaMetric {
  base: number | null;
  scenario: number | null;
  delta: number | null;          // scenario - base
  deltaPercent: number | null;   // (delta / base) * 100
}

// --- Functions ---

/** Create default multipliers (all 1.0). */
function defaultMultipliers(): ScenarioMultipliers;

/** Deep-clone inputs and apply multipliers. Returns new arrays, never mutates originals. */
function applyMultipliers(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  multipliers: ScenarioMultipliers
): { skus: SKU[]; forecasts: Forecast[]; capacityPlans: CapacityPlan[] };

/** Build a complete scenario snapshot by cloning, applying multipliers, and running the full pipeline. */
function buildScenarioSnapshot(
  id: string,
  name: string,
  multipliers: ScenarioMultipliers,
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters,
  bpTargetsMillionTwd: Record<string, number>,
  currencySettings: CurrencySettings
): ScenarioSnapshot;

/** Compute deltas between baseline and scenario snapshots. */
function computeScenarioDeltas(
  baseline: ScenarioSnapshot,
  scenario: ScenarioSnapshot
): ScenarioDeltas;
```

**Implementation notes:**
- `applyMultipliers` must clone each array element via spread (`{ ...item, field: item.field * multiplier }`)
- `forecastVolume` multiplies `Forecast.forecastPcs`
- `unitPrice` multiplies both `Forecast.unitPrice` and `SKU.unitPrice` (matches `impactAnalysis.ts` pattern)
- `coreCapacity` / `buCapacity` multiply `CapacityPlan.corePanelPerDay` / `CapacityPlan.buPanelPerDay`
- `buildScenarioSnapshot` calls `runCalculation` -> `buildBpAnalysis` in sequence (same as `impactAnalysis.ts` lines 93-106)
- `computeScenarioDeltas` handles null values gracefully (null - null = null, number - null = null)
- Import `runCalculation` from `./calculationEngine`
- Import `buildBpAnalysis` from `./bpTargets`
- Import `buildAnalyticsModel` from `./analytics`
- All revenue is USD internally; BP targets are million TWD

---

### Task 2: Scenario state context provider

**Dependencies:** Task 1
**Estimated LOC:** ~120
**File:** `frontend/src/context/ScenarioContext.tsx`

**Implement:**

```ts
interface ScenarioContextValue {
  /** Current multipliers being edited (not yet applied to a named scenario) */
  draftMultipliers: ScenarioMultipliers;
  setDraftMultipliers: (m: ScenarioMultipliers) => void;
  /** Named saved scenarios (in-memory only, not persisted) */
  scenarios: ScenarioSnapshot[];
  /** Add a scenario snapshot to the list */
  addScenario: (snapshot: ScenarioSnapshot) => void;
  /** Remove a scenario by id */
  removeScenario: (id: string) => void;
  /** Currently selected scenario for comparison view */
  activeScenarioId: string | null;
  setActiveScenarioId: (id: string | null) => void;
  /** Reset all scenario state */
  resetAll: () => void;
}
```

**Implementation notes:**
- Use `React.createContext` + `useReducer` or `useState` for state management
- Provider wraps the scenario page only (not the entire app -- keep it scoped)
- `draftMultipliers` defaults to `defaultMultipliers()` from Task 1
- No localStorage, no sessionStorage, no Firestore -- purely in-memory
- Export `ScenarioProvider` and `useScenario` hook

---

### Task 3: `frontend/src/pages/ScenarioPlanning.tsx` -- Main page

**Dependencies:** Tasks 1, 2, 4, 5, 6, 7, 8
**Estimated LOC:** ~200

**Implement the main scenario planning page:**

```tsx
interface ScenarioPlanningProps {
  scope: ProjectScope;
}
```

**Page layout (top to bottom):**
1. **Page header** with title from i18n (`scenario.title`) and role-gated "New Scenario" button
2. **Baseline summary row** -- 4x MetricCard showing baseline total revenue, total forecast PCS, max core util, shortage months
3. **ScenarioMultiplierPanel** (Task 4) -- slider controls for multipliers
4. **"Run Scenario" button** -- triggers `buildScenarioSnapshot`, stores result via context
5. **ScenarioComparisonView** (Task 5) -- comparison dashboard (only visible when a scenario exists)
6. **Saved scenarios list** -- simple table/cards listing saved scenarios, with delete and compare actions

**Data loading pattern (follow BpTargets.tsx):**
```tsx
const [loading, setLoading] = useState(true);
const [skus, setSkus] = useState<SKU[]>([]);
const [forecasts, setForecasts] = useState<Forecast[]>([]);
const [capacityPlans, setCapacityPlans] = useState<CapacityPlan[]>([]);
const [params, setParams] = useState<ProjectParameters | null>(null);

const loadData = useCallback(async () => {
  setLoading(true);
  try {
    const [skuData, fcData, cpData, paramData] = await Promise.all([
      getSKUs(scope),
      getForecasts(scope),
      getCapacityPlans(scope),
      getParameters(scope),
    ]);
    setSkus(skuData);
    setForecasts(fcData);
    setCapacityPlans(cpData);
    setParams(paramData);
  } catch (err) {
    setError(String(err));
  } finally {
    setLoading(false);
  }
}, [scope]);
```

**Role gating:**
```tsx
const writable = canEdit(scope.role);
// Disable multiplier controls and "Run Scenario" button when !writable
```

**Baseline computation (memoized):**
```tsx
const baselineSnapshot = useMemo(() => {
  if (!params || skus.length === 0) return null;
  return buildScenarioSnapshot(
    'baseline', 'Baseline',
    defaultMultipliers(),
    skus, forecasts, capacityPlans, params,
    bpTargetsMillionTwd, currencySettings
  );
}, [skus, forecasts, capacityPlans, params, bpTargetsMillionTwd, currencySettings]);
```

---

### Task 4: `frontend/src/components/scenario/ScenarioMultiplierPanel.tsx` -- Multiplier controls

**Dependencies:** Task 1 (types only)
**Estimated LOC:** ~130

**Implement a panel with 4 multiplier controls:**

```tsx
interface ScenarioMultiplierPanelProps {
  multipliers: ScenarioMultipliers;
  onChange: (m: ScenarioMultipliers) => void;
  disabled: boolean;  // true when viewer or no data loaded
}
```

**UI per multiplier row:**
- Label (i18n key, e.g., `scenario.multiplier.forecastVolume`)
- Slider (Ant Design `Slider`, range 0.5 - 1.5, step 0.01)
- InputNumber (Ant Design, synced with slider, shows current value as percentage, e.g., "+10%")
- Reset button (resets that multiplier to 1.0)

**Layout:** Use Ant Design `Card` with `Row`/`Col` grid. 2 columns on desktop, stacked on mobile.

**Display format:**
- Show multiplier as percentage: `(multiplier * 100).toFixed(0)` + `%`
- Color code: green for beneficial changes, red for detrimental (based on domain knowledge -- e.g., price decrease = red, capacity increase = green)

---

### Task 5: `frontend/src/components/scenario/ScenarioComparisonView.tsx` -- Comparison dashboard

**Dependencies:** Tasks 1, 6
**Estimated LOC:** ~180

**Implement the comparison dashboard:**

```tsx
interface ScenarioComparisonViewProps {
  baseline: ScenarioSnapshot;
  scenario: ScenarioSnapshot;
  deltas: ScenarioDeltas;
}
```

**Layout:**
1. **Header row:** "Baseline" vs "Scenario Name" labels
2. **Delta cards row:** 4-7x `ScenarioDeltaCard` (Task 6) showing key metric deltas
3. **BP Attainment table:** Year-by-year comparison (reuse `BpPeriodRecord` structure from `bpTargets.ts`)
   - Columns: Year | Baseline Attainment | Scenario Attainment | Delta (pp)
4. **Monthly detail table (collapsible):** Month-by-month comparison
   - Columns: Month | Baseline Revenue | Scenario Revenue | Revenue Delta | Core Util (base) | Core Util (scenario) | BU Util (base) | BU Util (scenario)

**Implementation notes:**
- Use `useMemo` to compute table data from `baseline` and `scenario` snapshots
- Format numbers using `formatNumber`, `formatCurrency` from `core/formatters.ts`
- Use `formatNumberWithSign` for delta values to show +/- prefix
- Ant Design `Table` for tabular data, `Collapse` for the monthly detail section

---

### Task 6: `frontend/src/components/scenario/ScenarioDeltaCard.tsx` -- Delta metric card

**Dependencies:** None (leaf component)
**Estimated LOC:** ~70

**Implement a reusable delta metric card:**

```tsx
interface ScenarioDeltaCardProps {
  title: string;
  baseValue: number | null;
  scenarioValue: number | null;
  delta: number | null;
  deltaPercent: number | null;
  format: 'number' | 'currency' | 'percent' | 'integer';
  /** If true, positive delta is good (green). If false, negative delta is good. */
  positiveIsGood: boolean;
  prefix?: string;
  suffix?: string;
}
```

**Visual design:**
- Based on existing `MetricCard` component (`components/common/MetricCard.tsx`)
- Show base value and scenario value side by side
- Delta shown with arrow icon (UpOutlined/DownOutlined from Ant Design icons)
- Color: green (`#3f8600`) when delta is positive and `positiveIsGood`, red (`#cf1322`) when opposite
- Gray (`#8c8c8c`) when delta is null or zero

**Format helpers:**
```tsx
function formatDeltaValue(value: number | null, format: string): string {
  if (value === null) return MISSING; // from core/formatters.ts
  switch (format) {
    case 'currency': return formatCurrency(value, 'USD');
    case 'percent': return `${value.toFixed(1)}%`;
    case 'integer': return Math.round(value).toLocaleString();
    default: return formatNumber(value, { precision: 1 });
  }
}
```

---

### Task 7: Route + navigation integration

**Dependencies:** Task 3
**Estimated LOC:** ~25 (changes to App.tsx)
**File:** `frontend/src/App.tsx` (modification)

**Changes required:**

1. Add lazy import:
   ```tsx
   const ScenarioPlanningPage = lazy(() => import('./pages/ScenarioPlanning'));
   ```

2. Add to `menuItems` array in `AppSider`:
   ```tsx
   { key: 'scenario', icon: <ExperimentOutlined />, label: t('menu.scenario') },
   ```
   Place after `bp-targets` and before `results`.

3. Add to `validKeys` array in `AppContent`:
   ```tsx
   const validKeys = ['dashboard', 'products', 'products-sheet-lab', 'forecasts', 'forecasts-lab', 'capacity', 'capacity-lab', 'parameters', 'bp-targets', 'scenario', 'results'];
   ```

4. Add to `pageTitles`:
   ```tsx
   scenario: t('scenario.title'),
   ```

5. Add route in `<Routes>`:
   ```tsx
   <Route path="/scenario" element={<ScenarioPlanningPage key={routeKey} scope={scope} />} />
   ```
   Place before the catch-all `*` route.

---

### Task 8: i18n keys

**Dependencies:** None (can be done in parallel)
**Estimated LOC:** ~80 (40 per file)
**Files:** `frontend/src/i18n/en.ts`, `frontend/src/i18n/zhTW.ts`

**Add the following keys to BOTH files:**

```ts
// en.ts additions:
'menu.scenario': 'Scenario Planning',
'scenario.title': 'Scenario Planning',
'scenario.description': 'Run what-if scenarios by adjusting forecast volume, pricing, and capacity multipliers.',
'scenario.newScenario': 'New Scenario',
'scenario.runScenario': 'Run Scenario',
'scenario.resetAll': 'Reset All',
'scenario.noData': 'No baseline data available. Please add SKUs, forecasts, and capacity plans first.',
'scenario.viewerReadOnly': 'Viewers cannot create or edit scenarios.',
'scenario.baselineSummary': 'Baseline Summary',
'scenario.comparison': 'Scenario Comparison',
'scenario.savedScenarios': 'Saved Scenarios',
'scenario.deleteScenario': 'Delete',
'scenario.compareScenario': 'Compare',
'scenario.noSavedScenarios': 'No saved scenarios yet.',
'scenario.confirmDelete': 'Delete this scenario?',
'scenario.multiplier.forecastVolume': 'Forecast Volume',
'scenario.multiplier.unitPrice': 'Unit Price',
'scenario.multiplier.coreCapacity': 'Core Capacity',
'scenario.multiplier.buCapacity': 'BU Capacity',
'scenario.multiplier.reset': 'Reset',
'scenario.delta.totalRevenue': 'Total Revenue',
'scenario.delta.totalForecastPcs': 'Total Forecast PCS',
'scenario.delta.maxCoreUtil': 'Max Core Utilization',
'scenario.delta.maxBuUtil': 'Max BU Utilization',
'scenario.delta.shortageMonths': 'Shortage Months',
'scenario.delta.bpAttainment': 'BP Attainment',
'scenario.delta.bpGap': 'BP Gap',
'scenario.bpComparison': 'BP Attainment Comparison',
'scenario.monthlyDetail': 'Monthly Detail',
'scenario.monthlyDetailToggle': 'Show/Hide Monthly Detail',
'scenario.vs': 'vs',
'scenario.yearly': 'Yearly',
'scenario.month': 'Month',
'scenario.revenue': 'Revenue',
'scenario.coreUtil': 'Core Util.',
'scenario.buUtil': 'BU Util.',
```

```ts
// zhTW.ts additions:
'menu.scenario': '情境規劃',
'scenario.title': '情境規劃',
'scenario.description': '透過調整預測量、價格與產能乘數來執行假設情境分析。',
'scenario.newScenario': '新增情境',
'scenario.runScenario': '執行情境',
'scenario.resetAll': '全部重設',
'scenario.noData': '無可用的基線資料。請先新增 SKU、預測與產能規劃。',
'scenario.viewerReadOnly': '檢視者無法建立或編輯情境。',
'scenario.baselineSummary': '基線摘要',
'scenario.comparison': '情境比較',
'scenario.savedScenarios': '已儲存情境',
'scenario.deleteScenario': '刪除',
'scenario.compareScenario': '比較',
'scenario.noSavedScenarios': '尚無已儲存的情境。',
'scenario.confirmDelete': '確定刪除此情境？',
'scenario.multiplier.forecastVolume': '預測量',
'scenario.multiplier.unitPrice': '單價',
'scenario.multiplier.coreCapacity': 'Core 產能',
'scenario.multiplier.buCapacity': 'BU 產能',
'scenario.multiplier.reset': '重設',
'scenario.delta.totalRevenue': '總營收',
'scenario.delta.totalForecastPcs': '總預測 PCS',
'scenario.delta.maxCoreUtil': '最大 Core 稼動率',
'scenario.delta.maxBuUtil': '最大 BU 稼動率',
'scenario.delta.shortageMonths': '缺口月數',
'scenario.delta.bpAttainment': 'BP 達成率',
'scenario.delta.bpGap': 'BP 差距',
'scenario.bpComparison': 'BP 達成率比較',
'scenario.monthlyDetail': '月度明細',
'scenario.monthlyDetailToggle': '顯示/隱藏月度明細',
'scenario.vs': '比較',
'scenario.yearly': '年度',
'scenario.month': '月份',
'scenario.revenue': '營收',
'scenario.coreUtil': 'Core 稼動率',
'scenario.buUtil': 'BU 稼動率',
```

**IMPORTANT:** Keys must be in identical order and count in both files. The existing `i18nKeys.test.ts` enforces key parity.

---

### Task 9: Unit tests

**Dependencies:** Task 1
**Estimated LOC:** ~200
**File:** `frontend/src/core/scenarioEngine.test.ts`

**Test cases to implement:**

```
describe('scenarioEngine', () => {

  describe('defaultMultipliers', () => {
    it('returns all 1.0')
  })

  describe('applyMultipliers', () => {
    it('does not mutate input arrays')
    it('does not mutate input objects')
    it('applies forecastVolume multiplier to forecastPcs')
    it('applies unitPrice multiplier to Forecast.unitPrice')
    it('applies unitPrice multiplier to SKU.unitPrice')
    it('applies coreCapacity multiplier to CapacityPlan.corePanelPerDay')
    it('applies buCapacity multiplier to CapacityPlan.buPanelPerDay')
    it('handles multipliers of 1.0 (identity, no cloning side effects)')
    it('handles zero multiplier edge case')
  })

  describe('buildScenarioSnapshot', () => {
    it('produces valid CalculationResult for default multipliers')
    it('produces different results when forecastVolume is 1.2')
    it('produces different results when unitPrice is 0.9')
    it('produces different results when coreCapacity is 1.1')
    it('snapshot includes bpModel and analyticsModel')
    it('returns empty results when no SKUs provided')
  })

  describe('computeScenarioDeltas', () => {
    it('returns zero deltas when baseline === scenario (same multipliers)')
    it('computes positive revenue delta when price increases')
    it('computes negative revenue delta when price decreases')
    it('handles null values gracefully (null - null = null)')
    it('handles mixed null/number (number - null = null)')
    it('computes deltaPercent correctly')
    it('deltaPercent is null when base is 0')
  })
})
```

**Test data setup (follow `impactAnalysis.test.ts` pattern):**
```ts
function makeSku(overrides: Partial<SKU> = {}): SKU { ... }
function makeForecast(overrides: Partial<Forecast> = {}): Forecast { ... }
function makeCapacity(overrides: Partial<CapacityPlan> = {}): CapacityPlan { ... }
const defaultParams: ProjectParameters = { ... };
const currencySettings: CurrencySettings = { ... };
```

---

### Task 10: Integration verification

**Dependencies:** All previous tasks
**Estimated LOC:** 0 (manual verification)

**Verification steps:**
1. `npm run test` -- all tests pass (including existing + new)
2. `npm run lint --quiet` -- no lint errors
3. `npm run build` -- production build succeeds
4. Manual smoke test:
   - Navigate to `/scenario` from sidebar
   - Verify baseline metrics load correctly
   - Adjust multipliers and click "Run Scenario"
   - Verify comparison view shows correct deltas
   - Verify viewer role cannot create scenarios
   - Switch language to zh-TW, verify all text renders
   - Refresh page -- verify scenario state resets (expected, in-memory only)

---

## 四、允許修改的檔案 (Allowed Files)

| File | Action | Justification |
|------|--------|---------------|
| `frontend/src/core/scenarioEngine.ts` | **NEW** | Core scenario computation engine |
| `frontend/src/core/scenarioEngine.test.ts` | **NEW** | Unit tests for scenario engine |
| `frontend/src/context/ScenarioContext.tsx` | **NEW** | React context for scenario state |
| `frontend/src/pages/ScenarioPlanning.tsx` | **NEW** | Main scenario planning page |
| `frontend/src/components/scenario/ScenarioComparisonView.tsx` | **NEW** | Comparison dashboard component |
| `frontend/src/components/scenario/ScenarioMultiplierPanel.tsx` | **NEW** | Multiplier control panel |
| `frontend/src/components/scenario/ScenarioDeltaCard.tsx` | **NEW** | Delta metric card component |
| `frontend/src/App.tsx` | **MODIFY** | Add route, menu item, lazy import (~25 LOC changed) |
| `frontend/src/i18n/en.ts` | **MODIFY** | Add ~40 scenario i18n keys |
| `frontend/src/i18n/zhTW.ts` | **MODIFY** | Add ~40 scenario i18n keys (must match en.ts exactly) |
| `frontend/src/components/common/index.ts` | **MODIFY** (optional) | Export scenario components if needed by other modules |

---

## 五、禁止修改的檔案 (Forbidden Files)

| File | Reason |
|------|--------|
| `frontend/src/core/calculationEngine.ts` | Calculation core -- scenario engine calls it read-only |
| `frontend/src/core/analytics.ts` | Analytics layer -- scenario engine calls it read-only |
| `frontend/src/core/bpTargets.ts` | BP analysis -- scenario engine calls it read-only |
| `frontend/src/core/currency.ts` | Currency conversion -- used internally by engine |
| `frontend/src/core/impactAnalysis.ts` | Existing impact analysis -- scenario is a separate feature |
| `frontend/src/core/keyFindings.ts` | Key findings -- not in MVP scope |
| `frontend/src/services/*` | All service files -- no new Firestore operations |
| `frontend/src/types/snapshot.ts` | Snapshot types -- 'scenario' kind already exists |
| `frontend/src/types/index.ts` | Core types -- no new types needed at this level |
| `firestore.rules` | Security rules -- no new collections |
| `frontend/package.json` | No new dependencies |

---

## 六、測試要求 (Testing Requirements)

### Unit tests (required)

- **File:** `frontend/src/core/scenarioEngine.test.ts`
- **Coverage target:** All exported functions from `scenarioEngine.ts`
- **Pattern:** Follow `impactAnalysis.test.ts` -- use `describe`/`it`/`expect` from vitest
- **Key assertions:**
  - Immutability: input arrays/objects are never mutated
  - Correctness: multiplier application matches expected arithmetic
  - Null safety: delta computation handles null base/scenario values
  - Pipeline: `buildScenarioSnapshot` produces valid `CalculationResult`, `BpAnalysisModel`, `AnalyticsModel`

### No new E2E tests for MVP

- Scenario state is in-memory only; no persistence to verify
- Manual smoke test sufficient for MVP

### Regression tests (required)

- Run `npm run test` after all changes
- Ensure `i18nKeys.test.ts` passes (key parity between en.ts and zhTW.ts)
- Ensure no existing tests break

---

## 七、Release Checklist

- [ ] `npm run test` -- all tests pass
- [ ] `npm run lint --quiet` -- no lint errors
- [ ] `npm run build` -- production build succeeds
- [ ] `i18nKeys.test.ts` passes (EN/zh-TW key parity)
- [ ] Manual smoke test on local dev server
- [ ] Viewer role correctly blocked from scenario creation
- [ ] All new files follow existing code style (2-space indent, single quotes, trailing commas)
- [ ] Version bump: update `APP_VERSION` in `App.tsx` from `'v1.36.0'` to `'v1.37.0'`
- [ ] Firebase deploy (if applicable)

---

## 八、Rollback Plan

### Immediate rollback (if scenario feature causes issues)

1. **Revert `App.tsx` changes** -- remove the lazy import, menu item, route entry, and page title for `scenario`. This completely hides the feature with zero impact on existing pages.
2. **Delete new files** -- all scenario files are new and self-contained. Removing them has no side effects on existing code.
3. **Revert i18n changes** -- remove the added keys from `en.ts` and `zhTW.ts`. The `i18nKeys.test.ts` will fail if only one file is reverted, so revert both.

### Feature flag approach (if needed)

If a partial release is desired, wrap the menu item and route in a simple constant check:

```tsx
// In App.tsx
const SCENARIO_PLANNING_ENABLED = true; // Set to false to hide feature

// In menuItems:
...(SCENARIO_PLANNING_ENABLED
  ? [{ key: 'scenario', icon: <ExperimentOutlined />, label: t('menu.scenario') }]
  : []),

// In Routes:
...(SCENARIO_PLANNING_ENABLED
  ? [<Route path="/scenario" element={<ScenarioPlanningPage key={routeKey} scope={scope} />} />]
  : []),
```

This requires no environment variables, no Firebase remote config, and can be toggled with a single boolean.

### Data impact

- **Zero data impact** -- scenario state is in-memory only, no Firestore writes
- **No schema changes** -- no migration needed
- **No service changes** -- existing CRUD operations unaffected

---

## 九、Implementation Order

Execute tasks in this order for optimal parallelism:

```
Phase 1 (parallel):
  Task 1: scenarioEngine.ts
  Task 8: i18n keys

Phase 2 (after Task 1):
  Task 2: ScenarioContext.tsx
  Task 6: ScenarioDeltaCard.tsx (leaf component, no deps)
  Task 9: Unit tests

Phase 3 (after Tasks 1, 2, 6, 8):
  Task 4: ScenarioMultiplierPanel.tsx
  Task 5: ScenarioComparisonView.tsx

Phase 4 (after Tasks 4, 5):
  Task 3: ScenarioPlanning.tsx (main page)

Phase 5 (after Task 3):
  Task 7: Route + navigation in App.tsx

Phase 6:
  Task 10: Integration verification
```

---

## 十、File Template Reference

### New page template (follow `BpTargets.tsx` pattern)

```tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, Button, Alert, Typography, Space } from 'antd';
import type { ProjectScope, SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';
import { getSKUs } from '../services/skuService';
import { getForecasts } from '../services/forecastService';
import { getCapacityPlans } from '../services/capacityService';
import { getParameters } from '../services/parameterService';
import { canEdit } from '../services/projectScope';
import { useI18n } from '../i18n';
import { MetricCard, PageLoading } from '../components/common';
import { ScenarioProvider, useScenario } from '../context/ScenarioContext';
import { ScenarioMultiplierPanel } from '../components/scenario/ScenarioMultiplierPanel';
import { ScenarioComparisonView } from '../components/scenario/ScenarioComparisonView';
import { buildScenarioSnapshot, defaultMultipliers, computeScenarioDeltas } from '../core/scenarioEngine';

const { Title, Text } = Typography;

interface ScenarioPlanningProps {
  scope: ProjectScope;
}

const ScenarioPlanningInner: React.FC<ScenarioPlanningProps> = ({ scope }) => {
  const { t } = useI18n();
  const writable = canEdit(scope.role);
  // ... implementation
};

const ScenarioPlanningPage: React.FC<ScenarioPlanningProps> = (props) => (
  <ScenarioProvider>
    <ScenarioPlanningInner {...props} />
  </ScenarioProvider>
);

export default ScenarioPlanningPage;
```

### New component template

```tsx
import React from 'react';
import { Card, Typography } from 'antd';
import { useI18n } from '../../i18n';

interface MyComponentProps {
  // ...
}

export const MyComponent: React.FC<MyComponentProps> = ({ ... }) => {
  const { t } = useI18n();
  return (
    <Card>
      {/* content */}
    </Card>
  );
};
```

---

## Appendix: Key Existing Code References

| What | Where | Why it matters |
|------|-------|----------------|
| `runCalculation` | `core/calculationEngine.ts:69` | Main calculation entry point |
| `buildAnalyticsModel` | `core/analytics.ts:123` | Analytics pipeline |
| `buildBpAnalysis` | `core/bpTargets.ts:84` | BP attainment analysis |
| `cloneForecasts` / `cloneCapacityPlans` | `core/impactAnalysis.ts:53,173` | Clone-and-rerun pattern to follow |
| `canEdit` | `services/projectScope.ts:57` | Role check for viewer gating |
| `MetricCard` | `components/common/MetricCard.tsx` | Reusable KPI card |
| `SnapshotKind` | `types/snapshot.ts:16` | Already includes `'scenario'` |
| `formatNumber` / `formatNumberWithSign` | `core/formatters.ts:34,53` | Number formatting helpers |
| `useI18n` | `i18n/index.ts` | i18n hook |
| `i18nKeys.test.ts` | `i18n/i18nKeys.test.ts` | Enforces EN/zh-TW key parity |
| `APP_VERSION` | `App.tsx:45` | Must bump to `v1.37.0` |
| Context pattern | `context/WorkspaceContext.tsx` | Reference for context implementation |
