# v1.37.0 Scenario Planning MVP 架構設計

> Author: Agent B (Architecture / Data Flow)
> Status: Design Draft
> Depends on: v1.35.0 DQ Visibility, v1.36.0 DQ Remediation
> Related decision: `docs/product/AI_BRIEF_V2_VS_SCENARIO_PLANNING_DECISION.md`

---

## 目錄

1. [前端內存 Scenario State 設計 (In-Memory State)](#一前端內存-scenario-state-設計-in-memory-state)
2. [Baseline Clone 策略 (Baseline Cloning)](#二baseline-clone-策略-baseline-cloning)
3. [Immutable Baseline 原則 (Baseline Immutability)](#三immutable-baseline-原則-baseline-immutability)
4. [Scenario Edits 套用到 Cloned Data (Applying Edits)](#四scenario-edits-套用到-cloned-data-applying-edits)
5. [復用 buildAnalyticsModel / buildBpAnalysis / computeChangeImpact (Reuse Strategy)](#五復用-buildanalyticsmodel--buildbpanalysis--computechangeimpact-reuse-strategy)
6. [為什麼不新增 Firestore Schema (No Firestore Changes)](#六為什麼不新增-firestore-schema-no-firestore-changes)
7. [為什麼不新增 Backend / Cloud Functions (No Backend)](#七為什麼不新增-backend--cloud-functions-no-backend)
8. [如何避免 Deep Clone 性能問題 (Performance)](#八如何避免-deep-clone-性能問題-performance)
9. [如何避免 Scenario State 寫回 Firestore (Safety Guard)](#九如何避免-scenario-state-寫回-firestore-safety-guard)
10. [如何處理 Multi-Currency / BP million TWD / DQ Caveats (Edge Cases)](#十如何處理-multi-currency--bp-million-twd--dq-caveats-edge-cases)
11. [Appendix A: 完整 Data Flow Diagram](#appendix-a-完整-data-flow-diagram)
12. [Appendix B: 檔案清單與實作順序](#appendix-b-檔案清單與實作順序)

---

## 一、前端內存 Scenario State 設計 (In-Memory State)

### 1.1 核心設計原則

Scenario State 完全存在於 React component tree 中 (Context / useReducer)，
不經過 Redux、不寫入 Firestore、不發送到任何 backend service。
使用者關閉瀏覽器 tab 或離開 Scenario 頁面，所有 scenario 資料即消失。

### 1.2 ScenarioState Interface

```typescript
// frontend/src/types/scenario.ts

import type { SKU, Forecast, CapacityPlan, ProjectParameters } from './index';
import type { AnalyticsModel } from '../core/analytics';
import type { BpAnalysisModel } from '../core/bpTargets';
import type { ChangeImpactResult } from '../core/changeImpact';
import type { DataQualitySummary } from '../core/dataQuality';
import type { RiskBrief } from '../core/riskBrief';

/**
 * Multiplier model. All values are ratios where 1.0 = no change.
 * MVP: global multipliers only (no per-SKU or per-month granularity).
 */
export interface ScenarioMultipliers {
  /** Scale all forecast quantity (forecastPcs) by this factor. Default 1.0 */
  forecastQtyMultiplier: number;
  /** Scale all unit prices by this factor. Default 1.0 */
  priceMultiplier: number;
  /** Scale all capacity (corePanelPerDay, buPanelPerDay) by this factor. Default 1.0 */
  capacityMultiplier: number;
}

/**
 * Metadata describing the scenario for display purposes.
 */
export interface ScenarioMetadata {
  /** Unique scenario ID (client-generated UUID) */
  id: string;
  /** User-provided name, e.g. "Price -5% + Capacity +10%" */
  name: string;
  /** Optional description */
  description?: string;
  /** ISO timestamp when scenario was created */
  createdAt: string;
}

/**
 * Frozen baseline snapshot cloned from live Firestore data.
 * Once created, this object is NEVER mutated.
 */
export interface BaselineSnapshot {
  skus: SKU[];
  forecasts: Forecast[];
  capacityPlans: CapacityPlan[];
  parameters: ProjectParameters;
  /** Pre-computed analytics for baseline (computed once, cached) */
  analytics: AnalyticsModel;
  /** Pre-computed BP analysis for baseline */
  bpAnalysis: BpAnalysisModel;
  /** Pre-computed DQ summary for baseline (shown as caveat banner) */
  dataQuality: DataQualitySummary;
}

/**
 * Computed scenario results. Rebuilt every time multipliers change.
 */
export interface ScenarioResults {
  /** Analytics model computed from scenario-adjusted data */
  analytics: AnalyticsModel;
  /** BP analysis computed from scenario-adjusted data */
  bpAnalysis: BpAnalysisModel;
  /** DQ summary for scenario data */
  dataQuality: DataQualitySummary;
  /** Risk brief from scenario analysis */
  riskBrief: RiskBrief;
  /** Change impact comparing baseline → scenario */
  changeImpact: ChangeImpactResult;
}

/**
 * Complete scenario state held in React context.
 *
 * This is the SINGLE SOURCE OF TRUTH for everything scenario-related
 * in the current browser session. It is NOT persisted anywhere.
 */
export interface ScenarioState {
  /** Whether scenario mode is currently active */
  isActive: boolean;

  /**
   * Frozen baseline data. Null until user activates scenario mode
   * for the first time (lazy cloning pattern).
   */
  baseline: BaselineSnapshot | null;

  /**
   * The single in-memory scenario. MVP supports exactly ONE scenario at a time.
   * No scenario list, no branching, no rename/delete/switch.
   */
  scenario: ScenarioEntry | null;
}

/**
 * A single scenario entry combining user multipliers and computed results.
 * There is only ever ONE of these in memory at a time.
 */
export interface ScenarioEntry {
  multipliers: ScenarioMultipliers;
  /** Computed results. Null until first calculation completes. */
  results: ScenarioResults | null;
  /** True while engine is computing (for loading spinner) */
  isComputing: boolean;
}

/** Default multipliers: everything at 1.0 (no change from baseline). */
export const DEFAULT_MULTIPLIERS: ScenarioMultipliers = {
  forecastQtyMultiplier: 1.0,
  priceMultiplier: 1.0,
  capacityMultiplier: 1.0,
};
```

### 1.3 React Context 擺放位置

ScenarioProvider 為 WorkspaceProvider 的 child（scenario 需讀取 WorkspaceContext.scope）：

```
App → WorkspaceProvider → ScenarioProvider → <Routes> → ScenarioWorkspace (+ existing pages)
```

### 1.4 ScenarioContext Interface

```typescript
// frontend/src/context/ScenarioContext.tsx

interface ScenarioContextValue {
  state: ScenarioState;
  activateScenarioMode: () => void;          // Triggers baseline clone, creates single scenario
  deactivateScenarioMode: () => void;        // Discard scenario data, exit mode
  updateMultipliers: (multipliers: ScenarioMultipliers) => void;  // Update the single scenario
  resetMultipliers: () => void;              // Reset to DEFAULT_MULTIPLIERS
}
```

---

## 二、Baseline Clone 策略 (Baseline Cloning)

### 2.1 為什麼需要 Clone

現有的計算引擎函數簽名為：

```typescript
// calculationEngine.ts — 已存在的 pure function
runCalculation(skus: SKU[], forecasts: Forecast[], capacityPlans: CapacityPlan[], params: ProjectParameters): CalculationResult
```

這些函數不會修改輸入參數，但 scenario 需要修改數據後再送入引擎計算。
為了確保原始 Firestore 數據永遠不被污染，我們必須在進入 scenario 模式時
clone 一份獨立副本。

### 2.2 Deep Clone vs Shallow Clone

**結論：使用 shallow clone (spread operator)。**

SKU、Forecast、CapacityPlan 都是 flat interface，沒有 nested object reference。
`ProjectParameters` 有 nested 的 `yieldMatrix`/`panelParams`/`currencySettings`/`bpTargets`，
但 scenario 不修改 parameters，只需傳 reference。Shallow clone 對 1000+ SKU 在 1-3ms 內完成，
遠優於 JSON.parse/JSON.stringify (50-100ms) 或 structuredClone (20-40ms)。

### 2.3 Clone 實作

```typescript
// frontend/src/core/scenarioClone.ts

import type { SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';

export interface ClonedInputs {
  skus: SKU[];
  forecasts: Forecast[];
  capacityPlans: CapacityPlan[];
  parameters: ProjectParameters;  // shallow ref — never mutated
}

/**
 * Clone raw inputs for scenario use.
 *
 * SKU, Forecast, CapacityPlan: shallow clone each element (flat objects).
 * Parameters: reference only (scenario never mutates parameters).
 *
 * Performance: ~1-3ms for 1000 SKUs + 12000 forecasts on modern hardware.
 */
export function cloneBaselineInputs(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  parameters: ProjectParameters
): ClonedInputs {
  return {
    skus: skus.map((s) => ({ ...s })),
    forecasts: forecasts.map((f) => ({ ...f })),
    capacityPlans: capacityPlans.map((cp) => ({ ...cp })),
    parameters, // intentional shared reference
  };
}
```

### 2.4 Clone 觸發時機

```
使用者點擊 "Enter Scenario Mode" 按鈕
  → ScenarioContext.activateScenarioMode()
    → 讀取 WorkspaceContext.scope
    → 調用 projectService.getAllData(scope) 取得最新 Firestore 數據
    → cloneBaselineInputs(skus, forecasts, capacityPlans, params)
    → runCalculation + buildAnalyticsModel + buildBpAnalysis (baseline 快取)
    → 更新 ScenarioState.baseline
```

**不是**在 app 啟動時就 clone。只有在使用者明確進入 scenario 模式時才觸發。

---

## 三、Immutable Baseline 原則 (Baseline Immutability)

### 3.1 為什麼 Immutable 是硬性約束

如果 scenario 修改了 baseline 數據，將導致：
1. 退出 scenario 模式後，Firestore 頁面顯示被篡改的數據。
2. 同 workspace 的其他協作者看到被汙染的即時數據。
3. BP 分析和 Risk Brief 產生錯誤的比較基準。

### 3.2 保護機制

- **防線 1: Clone-on-entry** — scenario 操作的永遠是 cloned array，不是 Firestore reference。
- **防線 2: Module import isolation** — scenario 檔案不 import service 層（見第九節）。
- **防線 3: UI 無 Save 按鈕** — scenario 頁面只有 "Exit Scenario Mode"，丟棄一切。
- **防線 4: 單元測試** — test baseline object identity unchanged after scenario mutation。

### 3.3 TypeScript 型別防線

`Forecast[]` 型別在 scenario 和 production 中完全相同，型別系統本身無法阻止
意外傳入 service.save*()。因此我們依賴 module import isolation（見第九節）：
scenario 相關檔案不 import 任何 service module，save function 根本不在 scope 內。
若未來需要更強的防線，可建立 branded type (`Forecast & { readonly __scenario: unique symbol }`)，
但 MVP 階段不需要。

---

## 四、Scenario Edits 套用到 Cloned Data (Applying Edits)

### 4.1 Multiplier 模型

MVP 採用三個全域乘數：

```typescript
interface ScenarioMultipliers {
  forecastQtyMultiplier: number;  // 影響 Forecast.forecastPcs
  priceMultiplier: number;        // 影響 Forecast.unitPrice + SKU.unitPrice
  capacityMultiplier: number;     // 影響 CapacityPlan.corePanelPerDay + buPanelPerDay
}
```

**不包含 parameters 乘數**，因為 yieldMatrix 和 panelParams 的 what-if
分析需要更複雜的 UI（例如拖曳矩陣格子），不適合 MVP。

### 4.2 Multiplier 套用函數

```typescript
// frontend/src/core/scenarioApply.ts

import type { ClonedInputs } from './scenarioClone';
import type { ScenarioMultipliers } from '../types/scenario';

/**
 * Apply multipliers to cloned inputs and return new arrays.
 *
 * IMPORTANT: This function returns NEW arrays (does not mutate the cloned inputs).
 * This allows React to detect changes via reference equality.
 */
export function applyMultipliers(
  inputs: ClonedInputs,
  multipliers: ScenarioMultipliers
): ClonedInputs {
  const { forecastQtyMultiplier, priceMultiplier, capacityMultiplier } = multipliers;

  // If all multipliers are 1.0, return inputs unchanged (no-op optimization)
  const isNoOp =
    forecastQtyMultiplier === 1.0 &&
    priceMultiplier === 1.0 &&
    capacityMultiplier === 1.0;

  if (isNoOp) return inputs;

  return {
    skus: inputs.skus.map((sku) => ({
      ...sku,
      unitPrice: sku.unitPrice * priceMultiplier,
    })),
    forecasts: inputs.forecasts.map((fc) => ({
      ...fc,
      forecastPcs: fc.forecastPcs * forecastQtyMultiplier,
      unitPrice: fc.unitPrice * priceMultiplier,
    })),
    capacityPlans: inputs.capacityPlans.map((cp) => ({
      ...cp,
      corePanelPerDay: cp.corePanelPerDay * capacityMultiplier,
      buPanelPerDay: cp.buPanelPerDay * capacityMultiplier,
    })),
    parameters: inputs.parameters, // never modified
  };
}
```

### 4.3 為什麼 SKU.unitPrice 也需要乘 priceMultiplier

`calculationEngine.ts` 會優先使用 `Forecast.unitPrice`，
但 fallback 到 `SKU.unitPrice`。對兩者同時施加 priceMultiplier 確保一致性。

### 4.4 Granularity: 全域 vs Per-SKU vs Per-Month

| 層級 | MVP | 未來 v2 |
|---|---|---|
| Global multiplier | ✅ 三個全域乘數 | ✅ 保留 |
| Per-SKU multiplier | ❌ 不做 | ✅ 每個 SKU 獨立調整 |
| Per-month multiplier | ❌ 不做 | ✅ 每月獨立調整 |
| Per-customer multiplier | ❌ 不做 | ✅ 按客戶批量調整 |

MVP 只做 global 的理由：
1. 80% 的 what-if 場景只需要全域調整（整體降價 5%、產能擴張 10%）。
2. UI 複雜度低，三個 slider 即可完成。
3. 確保 scenario 計算在 200ms 內完成（乘數套用 + 引擎重算）。

---

## 五、復用 buildAnalyticsModel / buildBpAnalysis / computeChangeImpact (Reuse Strategy)

### 5.1 核心洞察：引擎是 pure function

所有核心計算函數都是 **純函數** (pure functions)，不依賴任何全域狀態：

```
runCalculation(skus, forecasts, capacityPlans, params) → CalculationResult
buildAnalyticsModel(skus, forecasts, capacityPlans, params) → AnalyticsModel
buildBpAnalysis(skuResults, skus, monthlySummaries, bpTargets, currencySettings) → BpAnalysisModel
buildDataQualitySummary({ skus, forecasts, capacityPlans, params }) → DataQualitySummary
```

這代表我們只需要：
1. 對 baseline 數據呼叫一次引擎 → baseline results
2. 對 scenario 數據呼叫一次引擎 → scenario results
3. 比較兩者的差異 → change impact

### 5.2 Scenario 計算流程

```typescript
// frontend/src/core/scenarioCompute.ts

import type { ClonedInputs } from './scenarioClone';
import type { ScenarioMultipliers, ScenarioResults, BaselineSnapshot } from '../types/scenario';
import { applyMultipliers } from './scenarioApply';
import { buildAnalyticsModel } from './analytics';
import { buildBpAnalysis } from './bpTargets';
import { buildDataQualitySummary } from './dataQuality';
import { buildRiskBrief } from './riskBrief';
import { buildAnalysisContractPayload } from './analysisContract';
import { buildScenarioChangeImpact } from './scenarioChangeImpact';
import { DEFAULT_CURRENCY_SETTINGS } from './currency';

/**
 * Compute scenario results by running the engine on adjusted data,
 * then comparing with baseline.
 * Reuses 100% of existing engine functions — zero new calculation logic.
 */
export function computeScenarioResults(
  baseline: BaselineSnapshot,
  clonedInputs: ClonedInputs,
  multipliers: ScenarioMultipliers
): ScenarioResults {
  const adjusted = applyMultipliers(clonedInputs, multipliers);

  const scenarioAnalytics = buildAnalyticsModel(
    adjusted.skus, adjusted.forecasts, adjusted.capacityPlans, adjusted.parameters
  );

  const bpTargets = adjusted.parameters.bpTargets?.yearlyRevenueTargetsMillionTwd ?? {};
  const curSettings = adjusted.parameters.currencySettings ?? DEFAULT_CURRENCY_SETTINGS;

  const scenarioBp = buildBpAnalysis(
    scenarioAnalytics.skuResults, adjusted.skus,
    scenarioAnalytics.monthlySummaries, bpTargets, curSettings
  );

  const scenarioDq = buildDataQualitySummary({
    skus: adjusted.skus, forecasts: adjusted.forecasts,
    capacityPlans: adjusted.capacityPlans, params: adjusted.parameters,
  });

  const contract = buildAnalysisContractPayload(
    adjusted.skus, adjusted.forecasts, adjusted.capacityPlans,
    adjusted.parameters, scenarioAnalytics, scenarioBp, 'v1.37.0-scenario'
  );

  const changeImpact = buildScenarioChangeImpact(baseline, {
    skus: adjusted.skus, forecasts: adjusted.forecasts,
    capacityPlans: adjusted.capacityPlans, parameters: adjusted.parameters,
    analytics: scenarioAnalytics, bpAnalysis: scenarioBp,
  });

  return {
    analytics: scenarioAnalytics,
    bpAnalysis: scenarioBp,
    dataQuality: scenarioDq,
    riskBrief: buildRiskBrief(contract),
    changeImpact,
  };
}
```

### 5.3 ChangeImpact 適配

`computeChangeImpact()` 目前接受 `Snapshot` 型別（Firestore snapshot）。
我們建立一個 adapter 函數 `buildScenarioChangeImpact()`，
從 in-memory data 建構 Snapshot-compatible objects：

```typescript
// frontend/src/core/scenarioChangeImpact.ts

import type { Snapshot, SnapshotRawInputs, SnapshotDerivedHighlights } from '../types/snapshot';
import type { BaselineSnapshot } from '../types/scenario';
import type { AnalyticsModel } from './analytics';
import type { BpAnalysisModel } from './bpTargets';
import { computeChangeImpact } from './changeImpact';

/**
 * Build a lightweight Snapshot-compatible object from in-memory data.
 * NOT a real Firestore snapshot — just enough to satisfy computeChangeImpact's type contract.
 */
function toSnapshotCompat(
  id: string,
  name: string,
  rawInputs: SnapshotRawInputs,
  analytics: AnalyticsModel,
  bpAnalysis: BpAnalysisModel
): Snapshot {
  const yearlyBp = bpAnalysis.yearly;
  const totalTarget = yearlyBp.reduce((s, r) => s + (r.targetMillionTwd ?? 0), 0);
  const totalForecast = yearlyBp.reduce((s, r) => s + r.forecastMillionTwd, 0);

  const derivedHighlights: SnapshotDerivedHighlights = {
    totalRevenueUsd: analytics.totalRevenue,
    totalForecastPcs: analytics.totalForecastPcs,
    maxCoreUtilization: analytics.maxCoreUtil,
    maxBuUtilization: analytics.maxBuUtil,
    shortageMonthCount: analytics.shortageMonthCount,
    worstBottleneckMonth: analytics.worstMonth,
    bpAttainment: totalTarget > 0 ? totalForecast / totalTarget : null,
    bpGapMillionTwd: totalTarget > 0 ? totalForecast - totalTarget : null,
    keyFindingsCount: 0,
    skuCount: rawInputs.skus.length,
    forecastMonthCount: rawInputs.forecasts.length,
  };

  return {
    id, name, createdAt: new Date(), createdBy: 'scenario-engine',
    sourceAppVersion: 'v1.37.0', scope: 'personal',
    rawInputs, derivedHighlights, metadata: { kind: 'scenario' },
  };
}

/**
 * Compute change impact between baseline and scenario.
 */
export function buildScenarioChangeImpact(
  baseline: BaselineSnapshot,
  scenario: { skus: SnapshotRawInputs['skus']; forecasts: SnapshotRawInputs['forecasts'];
    capacityPlans: SnapshotRawInputs['capacityPlans']; parameters: SnapshotRawInputs['parameters'];
    analytics: AnalyticsModel; bpAnalysis: BpAnalysisModel; }
) {
  const baseSnap = toSnapshotCompat('baseline', 'Baseline (Production)',
    { skus: baseline.skus, forecasts: baseline.forecasts,
      capacityPlans: baseline.capacityPlans, parameters: baseline.parameters },
    baseline.analytics, baseline.bpAnalysis);

  const scenarioSnap = toSnapshotCompat('scenario', 'Scenario',
    { skus: scenario.skus, forecasts: scenario.forecasts,
      capacityPlans: scenario.capacityPlans, parameters: scenario.parameters },
    scenario.analytics, scenario.bpAnalysis);

  return computeChangeImpact(baseSnap, scenarioSnap);
}
```

### 5.4 函數復用對照表

| 已有函數 | Scenario 用途 | 是否需要修改 |
|---|---|---|
| `runCalculation()` | 計算 scenario 的 SKU results 和 monthly summaries | ❌ 不需要 |
| `buildAnalyticsModel()` | 建構 scenario 的全維度分析矩陣 | ❌ 不需要 |
| `buildBpAnalysis()` | 計算 scenario 的 BP 達成率 | ❌ 不需要 |
| `buildDataQualitySummary()` | 評估 scenario 數據的 DQ 狀態 | ❌ 不需要 |
| `buildAnalysisContractPayload()` | 打包 scenario 分析供 riskBrief 使用 | ❌ 不需要 |
| `buildRiskBrief()` | 生成 scenario 的風險摘要 | ❌ 不需要 |
| `computeChangeImpact()` | 比較 baseline vs scenario 差異 | ❌ 不需要 |
| `buildKeyFindings()` | 提取 scenario 的 top findings | ❌ 不需要 |

**結論：零修改現有計算引擎。Scenario MVP 的所有計算邏輯 100% 復用。**

---

## 六、為什麼不新增 Firestore Schema (No Firestore Changes)

Scenario 數據天然是 **暫時的 (ephemeral)**。使用者不會想永久保存一個
「如果降價 10% 會怎樣」的假設情境到 production database。

不 persist 的好處：零 schema migration、零 security rule 變更、
零 data pollution 風險、零 backup/restore 複雜度、即時可用。

如果未來使用者需要保存，v2 可以匯出 PDF/Excel，v3 可以只存
`{ name, multipliers }` 極小 payload（不存 clone 數據），回復時重新 clone + re-apply。

---

## 七、為什麼不新增 Backend / Cloud Functions (No Backend)

所有計算都是純前端 JavaScript：`runCalculation()` → `buildAnalyticsModel()`
→ `buildBpAnalysis()` → `computeChangeImpact()`，全程零網路呼叫。
1000 SKU x 36 months 在現代瀏覽器中 < 200ms。
不需要 Cloud Function 做計算（client 更快）、不需要做持久化（MVP 不 persist）、
不需要做 AI 分析（確定性公式比較）。

---

## 八、如何避免 Deep Clone 性能問題 (Performance)

### 8.1 性能基準測試 (預估)

| Workspace 規模 | Clone 方法 | 預估時間 |
|---|---|---|
| 100 SKU, 1200 forecasts | spread operator | < 1ms |
| 500 SKU, 6000 forecasts | spread operator | 2-5ms |
| 1000 SKU, 12000 forecasts | spread operator | 5-10ms |
| 1000 SKU, 12000 forecasts | JSON.parse/JSON.stringify | 50-100ms |
| 1000 SKU, 12000 forecasts | structuredClone | 20-40ms |

**結論：spread operator (shallow clone) 在所有規模下都遠優於深拷貝方案。**

### 8.2 Lazy Cloning (Clone-on-demand)

```
App 啟動
  → 不做任何 clone
  → 使用者正常使用 production 數據

使用者點擊 "Enter Scenario Mode"
  → 首次觸發 cloneBaselineInputs()
  → 首次觸發 buildAnalyticsModel() for baseline
  → baseline 快取到 ScenarioState.baseline

使用者調整 multiplier
  → 只重新計算 scenario (baseline 不變)
  → 使用 applyMultipliers() + runCalculation()
  → 1000 SKU × 36 months: ~100-200ms

使用者退出 Scenario Mode
  → ScenarioState 歸零，cloned 數據被 GC 回收
```

### 8.3 Baseline 結果 Memoization

`BaselineSnapshot` 除了 raw data 外，還包含預先計算好的 `analytics`、
`bpAnalysis`、`dataQuality`。這些結果在 scenario session 中只計算一次，
之後 scenario 的比較都直接引用快取，不需要重跑 baseline 引擎。

### 8.4 Debounced Re-computation

當使用者拖曳 multiplier slider 時，不應該每個 pixel 都觸發重算。

```typescript
// frontend/src/hooks/useDebouncedScenario.ts

import { useEffect, useState } from 'react';

/**
 * Debounce multiplier changes to avoid excessive re-computation
 * during slider drag.
 */
export function useDebouncedScenario(
  multipliers: ScenarioMultipliers,
  delayMs: number = 150
): ScenarioMultipliers {
  const [debounced, setDebounced] = useState(multipliers);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(multipliers), delayMs);
    return () => clearTimeout(timer);
  }, [multipliers, delayMs]);

  return debounced;
}
```

在 ScenarioWorkspace 頁面中使用 `useDebouncedScenario(entry.multipliers, 150)`，
debounced 結果改變時才觸發 `computeScenarioResults()`。

### 8.5 Web Worker 可選優化

MVP 不需要。如果未來 workspace 規模超過 5000 SKU，可將 `computeScenarioResults()` 搬到 Web Worker。

---

## 九、如何避免 Scenario State 寫回 Firestore (Safety Guard)

### 9.1 三層防線架構

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Module Import Isolation (靜態分析)          │
│                                                     │
│ ScenarioContext.tsx 不 import 任何 service module。  │
│ ScenarioWorkspace.tsx 不 import 任何 service module。│
│ scenarioCompute.ts   不 import 任何 service module。 │
│                                                     │
│ → 即使是意外的 function call 也不可能發生，          │
│   因為 save function 根本不在 scope 內。             │
├─────────────────────────────────────────────────────┤
│ Layer 2: UI 層面 (無 Save 按鈕)                     │
│                                                     │
│ Scenario 頁面只有：                                  │
│ - Multiplier sliders                                │
│ - "Exit Scenario Mode" button (丟棄一切)             │
│ - "Compare" toggle (顯示 baseline vs scenario)       │
│                                                     │
│ 沒有 "Save"、"Export to Workspace"、"Apply" 按鈕。   │
│ 沒有 Scenario List、Rename、Delete、Switch。         │
│ 只有 ONE scenario in memory。                        │
├─────────────────────────────────────────────────────┤
│ Layer 3: Runtime Guard (可選)                        │
│                                                     │
│ 在 ScenarioProvider 的 deactivateScenarioMode() 中， │
│ 明確將 baseline 和 scenario 設為 null。              │
│ React 的 state 更新會觸發 GC 回收 cloned 數據。      │
└─────────────────────────────────────────────────────┘
```

### 9.2 Import 規則

Code review 檢查清單：以下檔案不得 import `../services/*`：
- `context/ScenarioContext.tsx`
- `pages/ScenarioWorkspace.tsx`
- `core/scenarioClone.ts`、`core/scenarioApply.ts`
- `core/scenarioCompute.ts`、`core/scenarioChangeImpact.ts`

可選：在 `.eslintrc.js` 中新增 import restriction rule 來自動化此約束。

### 9.3 ScenarioContext 的實作保障

`deactivateScenarioMode()` dispatch `DEACTIVATE_SCENARIO_MODE`，
reducer 將 state 設為 `{ isActive: false, baseline: null, scenario: null }`，
cloned 數據失去所有引用，GC 可回收。

---

## 十、如何處理 Multi-Currency / BP million TWD / DQ Caveats (Edge Cases)

### 10.1 Multiplier 套用順序

**Multipliers 施加在 raw values 上，在 currency normalization 之前。**

```
原始數據 (Firestore)          Scenario 調整後               引擎計算中
─────────────────────    ──────────────────────    ──────────────────────
Forecast.unitPrice: 100   × priceMultiplier: 0.95   → 95 (raw currency)
Forecast.forecastPcs: 500 × qtyMultiplier: 1.10     → 550 (pcs)
CapacityPlan.core: 100    × capacityMultiplier: 1.10 → 110 (panels/day)

引擎內部：
  1. normalizePriceToUsd(95, 'TWD', settings, year) → USD revenue
  2. 550 pcs × USD unit price → revenue
  3. convertFromUsd(revenue, 'TWD', settings, year) → TWD revenue
  4. TWD revenue / 1,000,000 → million TWD (for BP comparison)
```

這確保了：
- Price multiplier 影響的是「原始報價貨幣」下的數值，然後才被 currency conversion 處理。
- 如果 SKU 價格是 TWD，priceMultiplier=0.95 表示「TWD 報價降 5%」，
  引擎會先降 5% 再轉 USD，語義正確。

### 10.2 BP 百萬 TWD 比較

Scenario 和 baseline 使用完全相同的匯率設定 (CurrencySettings)。
流程：`runCalculation()` → USD revenue → `convertFromUsd(revenue, 'TWD', settings, year)`
→ `/ 1,000,000` → million TWD → 與 `bpTargets.yearlyRevenueTargetsMillionTwd` 比較。
`buildBpAnalysis()` 內建此流程，scenario 直接復用，不需額外處理。

### 10.3 DQ Caveats 處理

如果 baseline 數據有 DQ 問題，scenario 比較報告必須顯示 caveat banner。
在 ScenarioWorkspace 頁面中，用 `useMemo` 檢查 `baseline.dataQuality`：

- `confidence === 'low'` → 提示「Baseline data has low confidence. Comparisons may be unreliable.」
- `confidence === 'blocked'` → 提示「Scenario mode requires valid production data.」
- 有 `decisionImpact === 'high'` 的 issues → 提示「N high-impact DQ issue(s) detected. Interpret with caution.」

### 10.4 Scenario 計算結果中的 DQ 狀態

Scenario 數據也可能產生新的 DQ 問題（例如 quantity multiplier 過大導致異常值）。
`buildDataQualitySummary()` 會被同時應用於 scenario 數據，
UI 應顯示 scenario 特有的 DQ 警告。

### 10.5 匯率 What-If

**MVP 不做匯率 what-if。** 匯率調整通常由 CFO 層級決定，且做匯率 what-if
需要 clone parameters（打破 parameters immutability），增加實作複雜度。
使用者可以先在 Parameters 頁面調整匯率，再進 scenario 模式。
未來 v2 若需要，可新增第四個 multiplier `exchangeRateMultiplier`。

---

## Appendix A: 完整 Data Flow Diagram

### A.1 整體 Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        Scenario Mode                             │
│                                                                  │
│  Firestore ──→ cloneBaselineInputs() ──→ BaselineSnapshot (frozen)│
│                    │                                             │
│                    │  ┌─ applyMultipliers(multiplier)            │
│                    ├──→ adjusted data                            │
│                    │    ├─ buildAnalyticsModel() → Analytics      │
│                    │    ├─ buildBpAnalysis()     → BP             │
│                    │    ├─ buildDataQualitySummary() → DQ         │
│                    │    └─ buildRiskBrief()       → Risk          │
│                    │                                             │
│                    └─ buildScenarioChangeImpact(baseline, scenario)│
│                         └─ computeChangeImpact() → Delta         │
│                                                                  │
│  UI: ScenarioPlanning (single-scenario page)                    │
│    ├─ Multiplier Sliders (price / qty / capacity)               │
│    ├─ Comparison Dashboard (baseline → scenario deltas)         │
│    └─ DQ Caveat Banner (if baseline has DQ issues)              │
│                                                                  │
│  Exit → deactivateScenarioMode() → state = null → GC            │
└──────────────────────────────────────────────────────────────────┘
```

### A.2 Scenario 啟動流程

```
使用者點擊 "Scenario Mode"
  → activateScenarioMode()
    → projectService.getAllData(scope)     ← Firestore read
    → cloneBaselineInputs(skus, fc, cp, params)  ← shallow clone
    → buildAnalyticsModel + buildBpAnalysis + buildDataQualitySummary  ← baseline cache
    → dispatch(SET_BASELINE)               ← ScenarioState.baseline = frozen
```

### A.3 Scenario 編輯流程

```
使用者調整 price slider to -5%
  → updateMultipliers({ priceMultiplier: 0.95 })
    → dispatch(UPDATE_MULTIPLIERS)
    → useDebouncedScenario(multipliers, 150ms)
      → applyMultipliers(cloned, debounced)
      → computeScenarioResults(baseline, cloned, debounced)
        → buildAnalyticsModel → buildBpAnalysis → buildDataQualitySummary
        → buildRiskBrief → buildScenarioChangeImpact → computeChangeImpact
      → dispatch(SET_RESULTS)
```

### A.4 UI 渲染

```
ScenarioPlanning 頁面 (single-scenario)
  ├─ 頂部: Scenario Mode Banner (orange border) + "Exit Scenario" button
  ├─ 中央: Price / Quantity / Capacity sliders + "Run Scenario" button
  └─ 下方: Comparison Dashboard (baseline vs single scenario)
       ├─ Revenue / BP Attainment / Shortage Months deltas
       ├─ Top Changed Customers / SKUs / Months tables
       └─ DQ Caveat Banner (if applicable)
```

---

## Appendix B: 檔案清單與實作順序

### B.1 新增檔案 (13 files, ~1355 lines total)

| # | 檔案路徑 | 用途 | ~Lines |
|---|---|---|---|
| 1 | `types/scenario.ts` | 型別定義 | 80 |
| 2 | `core/scenarioClone.ts` | Baseline clone | 40 |
| 3 | `core/scenarioApply.ts` | Multiplier 套用 | 50 |
| 4 | `core/scenarioCompute.ts` | 計算主流程 | 80 |
| 5 | `core/scenarioChangeImpact.ts` | ChangeImpact adapter | 80 |
| 6 | `context/ScenarioContext.tsx` | React Context + reducer (single-scenario) | 120 |
| 7 | `hooks/useDebouncedScenario.ts` | Debounce hook | 25 |
| 8 | `pages/ScenarioPlanning.tsx` | 主頁面 (single-scenario) | 250 |
| 9-12 | `components/scenario/*` | Banner / Sliders / Comparison / DQCaveat | 400 |

### B.2 修改檔案

`App.tsx` — 新增 ScenarioProvider 包裹 + `/scenario` route。

### B.3 不修改的檔案

Scenario MVP 對現有計算引擎 **零修改**。以下檔案直接復用：
`calculationEngine.ts`、`analytics.ts`、`bpTargets.ts`、`changeImpact.ts`、
`impactAnalysis.ts`、`keyFindings.ts`、`riskBrief.ts`、`dataQuality.ts`、
`analysisContract.ts`、`currency.ts`。Scenario 也不使用任何 `services/*.ts`，
不修改 `firestore.rules`。`SnapshotKind` 已包含 `'scenario'`，無需變更 `snapshot.ts`。

### B.4 建議實作順序

```
Phase 1: Core Logic (可獨立測試，不涉及 UI)
  1. types/scenario.ts
  2. core/scenarioClone.ts + test
  3. core/scenarioApply.ts + test
  4. core/scenarioCompute.ts + test
  5. core/scenarioChangeImpact.ts + test

Phase 2: State Management
  6. context/ScenarioContext.tsx
  7. hooks/useDebouncedScenario.ts

Phase 3: UI Components
  8. components/scenario/* (banner, list, sliders, comparison, DQ caveat)
  9. pages/ScenarioWorkspace.tsx
  10. App.tsx route + provider wiring

Phase 4: Integration Test
  11. E2E: enter scenario → adjust slider → verify comparison → exit
  12. Performance test: 1000 SKU workspace clone + compute < 500ms
```

---

## Appendix C: Key Design Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Scenario cardinality | **Single scenario only** | MVP simplicity; no list/rename/delete/switch; v1.38+ may add multi-scenario |
| State location | React Context | Ephemeral what-if data; no persistence needed |
| Clone strategy | Safe shallow clone (spread + targeted object clone) | Flat objects; 1-3ms for 1000 SKUs; no structuredClone |
| Parameters | Shared reference, never mutated | No rate what-if in MVP |
| Multiplier granularity | Global only (3 multipliers) | 80% use case coverage; simplest UI |
| Engine reuse | 100% reuse, zero modifications | All core functions are pure |
| ChangeImpact | Adapter builds Snapshot-compatible objects | Avoids modifying computeChangeImpact() |
| Persistence | None | Ephemeral by design; avoids schema/rule changes |
| Backend | None | Client-side pure JS; < 200ms for 1000 SKUs |
| Currency | Multipliers apply before normalization | Semantic correctness |
| Safety guard | Module import isolation + no save buttons + GC on exit | Three-layer defense |
| Performance | Lazy clone + memoized baseline + debounced recompute | < 500ms total |
