# v1.37.0 Scenario Planning MVP 產品規格書

> **版本**: v1.37.0 MVP
> **日期**: 2026-05-27
> **狀態**: Draft
> **前序版本**: v1.36.0 (Data Quality Remediation Entry Points)
> **核心理念**: 將現有的 `runCalculation()` 無狀態計算引擎與 `changeImpact.ts` 對比引擎，
> 包裹進一個「零資料庫汙染」的前端內存**單情境沙盒 (Single-Scenario In-Memory Sandbox)**，
> 讓使用者在不影響正式工作區的前提下，建立一個 What-If 情境、調整乘數、
> 與 baseline 進行確定性的數理對比。

---

## 一、使用者是誰 (Target Users)

### 1.1 主要角色

| 角色 | 英文稱謂 | 典型職級 | 核心職責 |
|:---|:---|:---|:---|
| 營運規劃師 | Operations Planner | 資深專員 / 主任 | 負責月度產能排程、預測數量彙整、SKU 資料維護 |
| 事業部主管 | BU Head / Business Unit Lead | 經理 / 協理 | 負責所轄事業部的營收目標 (BP) 達成與客戶關係 |
| 財務分析師 | Finance Analyst | 資深分析師 / 課長 | 負責年度預算 (BP) 目標設定、匯率假設、營收差距分析 |

### 1.2 使用者需要做的決策

1. **預測敏感度評估**：「如果大客戶 Apple 要求 Q3 降價 8%，且下單量同步萎縮 12%，我們全年 BP 達成率會掉幾個百分點？」
2. **產能擴充評估**：「如果我把 Core 產能在瓶頸月份提升 10%，能消滅幾個 Shortage Month？BU 端是否同步受益？」
3. **目標缺口填補**：「CFO 要求今年營收達到 1500M TWD，現有預測只到 1350M，我需要在哪些月份、哪些客戶拉到多少增量才能補上缺口？」
4. **良率改善影響**：「如果良率矩陣的 Large-16-20L 從 0.85 提升到 0.90，能釋放多少面板需求，對總營收的邊際貢獻是多少？」

### 1.3 為什麼不能用 Excel 做這件事

| 痛點 | Excel 的問題 | Scenario Planning 的解法 |
|:---|:---|:---|
| **公式鏈脆弱** | Excel 的 VLOOKUP/INDEX 鏈在多情境切換時極易斷鏈或引用錯誤 | 前端內存克隆 + `runCalculation()` 純函數重算，零公式錯誤 |
| **多人協作衝突** | 多人同時在 Excel What-If 場景表上作業，版本混亂 | 每個 Scenario 是獨立內存快照，不互相干擾，也不影響正式工作區 |
| **歸因分析缺失** | Excel 手動對比兩列數字，難以自動辨識「價格驅動 vs 數量驅動」的營收變化 | `computeChangeImpact()` 自動產出 Price/Quantity Attribution |
| **資料源不同步** | Excel 複製的基線資料很快就和系統正式資料脫節 | Scenario 以當下即時載入的正式資料為 Baseline，零脫節 |
| **結果不可信** | Excel 裡的自訂公式無法被同事或主管驗證 | 計算引擎 100% 複用正式系統的 `calculationEngine.ts`，結果完全可複現 |

---

## 二、核心使用場景 (Core Use Cases)

### UC-1：預測數量調整情境

**使用者故事**：

> As an operations planner,
> I want to see what happens to revenue, BP attainment, and capacity utilization
> if I increase the forecast quantity by 15% for all products in Q3 2026,
> so that I can assess whether the factory can absorb a sudden demand surge.

**驗收標準**：

- [ ] Given 使用者在 Scenario Builder 中選取 `Forecast Qty` 乘數，設定 `+15%`
- [ ] And 使用者將作用範圍限定為 `Quarter: 2026-Q3`
- [ ] When 使用者點擊「套用並比較 (Apply & Compare)」
- [ ] Then 系統在 2 秒內完成計算（以 500 SKU * 24 個月為基準）
- [ ] And 顯示 Baseline vs Scenario 對比面板，包含：
  - 全年營收 (USD) 與 BP 達成率 (%) 的 Delta
  - 產能利用率 Core/BU 的最大值 Delta
  - Shortage Month 數量 Delta
  - 受影響月份列表（含新增或消除的 Shortage Month 標記）
- [ ] And Scenario 資料未被寫入 Firestore（確認 `collection(db, ...)` 未被呼叫）

### UC-2：價格下降情境

**使用者故事**：

> As a BU head,
> I want to simulate a -5% price reduction on all SKUs for customer "Apple"
> and see the impact on yearly revenue gap and BP attainment,
> so that I can prepare a negotiation brief for the sales team.

**驗收標準**：

- [ ] Given 使用者在 Scenario Builder 中選取 `Unit Price` 乘數，設定 `-5%`
- [ ] And 使用者將作用範圍限定為 `Customer: Apple`
- [ ] When 使用者套用情境
- [ ] Then 系統顯示 Apple 客戶的營收變化 Delta
- [ ] And 顯示全公司層級的 BP 達成率與 Gap 變化
- [ ] And Price/Quantity Attribution 中 `priceDrivenDeltaUsd` 準確反映 -5% 價格驅動的影響
- [ ] And 受影響 SKU 列表僅包含 Customer = Apple 的 SKU

### UC-3：產能擴充情境

**使用者故事**：

> As a finance analyst,
> I want to simulate a +10% increase in Core panel capacity for bottleneck months only
> and see how many shortage months are resolved,
> so that I can justify the capital expenditure request to the CFO.

**驗收標準**：

- [ ] Given 使用者在 Scenario Builder 中選取 `Core Capacity` 乘數，設定 `+10%`
- [ ] And 使用者將作用範圍限定為 `Shortage Months Only`（系統自動識別瓶頸月份）
- [ ] When 使用者套用情境
- [ ] Then 系統顯示 Shortage Month 數量的 Before/After 對比
- [ ] And 列出被消除的 Shortage Month（`resolvedShortageMonths`）
- [ ] And 列出仍然存在的 Shortage Month（`remainingShortageMonths`）
- [ ] And 顯示最大 Core/BU 利用率的 Before/After 變化

### UC-4：複合情境（多乘數同時調整）

**使用者故事**：

> As a BU head,
> I want to simulate a scenario where forecast quantity increases by 10% for all SKUs
> AND unit price decreases by 3% across the board AND BU capacity increases by 5%,
> so that I can evaluate a realistic "aggressive growth with price concession" strategy.

**驗收標準**：

- [ ] Given 使用者同時設定三個乘數：
  - Forecast Qty: `+10%`（全 SKU）
  - Unit Price: `-3%`（全 SKU）
  - BU Capacity: `+5%`（全月份）
- [ ] When 使用者套用情境
- [ ] Then 系統按照正確的克隆順序套用所有乘數（先 SKU 屬性，再 Forecast 數量/價格，最後 Capacity）
- [ ] And 對比面板同時反映三個乘數的綜合影響
- [ ] And Price/Quantity Attribution 歸因準確區分價格驅動與數量驅動的營收變化

### UC-5：情境重置與基線恢復

**使用者故事**：

> As an operations planner,
> I want to reset my current scenario back to baseline with one click,
> so that I can quickly start a fresh what-if analysis without reloading the page.

**驗收標準**：

- [ ] Given 使用者已套用一個或多個乘數
- [ ] When 使用者點擊「重置為基線 (Reset to Baseline)」按鈕
- [ ] Then 所有乘數歸零，對比面板消失或顯示「無差異」
- [ ] And 系統不觸發任何 Firestore 讀取（從記憶體中的原始 Baseline 快照恢復）
- [ ] And 重置操作在 200ms 內完成

---

## 三、MVP 範圍 (MVP Scope)

### 3.1 v1.37.0 交付清單

- [ ] **Scenario Builder 面板**（`ScenarioBuilder.tsx`）
  - 位於 Dashboard 頁面頂部，可收合的 Card 區塊
  - 乘數滑桿 / 數值輸入器：Forecast Qty、Unit Price、Core Capacity、BU Capacity
  - 範圍篩選器：Year、Quarter、Customer（optional）
  - 「套用並比較」與「重置為基線」兩個主操作按鈕

- [ ] **In-Memory Scenario State**（`useScenarioState.ts` hook）
  - 以 React Context 管理 scenario 的乘數設定與計算結果
  - 內部持有 baselineInputs（原始載入）與 scenarioInputs（乘數套用後）
  - 提供 `applyScenario()`、`resetToBaseline()`、`isDirty` 狀態

- [ ] **Scenario Calculation Engine**（`scenarioEngine.ts`）
  - 輸入：baselineInputs + multipliers → 輸出：clonedInputs（套用乘數後的 SKU/Forecast/CapacityPlan 陣列）
  - 複用現有的 `cloneForecasts()`、`cloneSkus()`、`cloneCapacityPlans()` 模式（參考 `impactAnalysis.ts`）
  - 調用 `runCalculation()` 取得 `CalculationResult`
  - 調用 `buildBpAnalysis()` 取得 `BpAnalysisModel`

- [ ] **Baseline vs Scenario Comparison Panel**（`ScenarioComparison.tsx`）
  - 複用 `computeChangeImpact()` 的 Delta 計算邏輯
  - 顯示 KPI 卡片：Revenue Delta、BP Attainment Delta、Core Utilization Delta、BU Utilization Delta、Shortage Month Delta
  - Top Changed Customers 表格（前 5 名）
  - Top Changed SKUs 表格（前 5 名）
  - Price vs Quantity Attribution 圓環圖

- [ ] **DQ Confidence Warning**（`ScenarioDqBanner.tsx`）
  - 當 baseline 資料的 `DataQualitySummary.confidence` 為 `'low'` 或 `'blocked'` 時，
    在 Scenario Builder 頂部顯示警告 Banner
  - 警告內容：「Baseline 資料存在 N 個資料品質問題，情境分析結果可能不準確」

- [ ] **Viewer Role Guard**
  - Viewer 角色：Scenario Builder 面板以唯讀模式顯示，隱藏乘數調整與操作按鈕
  - Editor / Owner 角色：完整存取權限

- [ ] **No-Pollution UX**
  - 頁面頂部常駐 Banner：「情境分析在瀏覽器記憶體中運行，不會修改正式資料」
  - 離開頁面前的 `beforeunload` 警告（當 `isDirty === true` 時）
  - 頁面刷新後 scenario 狀態自動清除（`useEffect` cleanup）

- [ ] **Dashboard 整合入口**
  - 在 Dashboard 頁面頂部新增「情境分析 (Scenario Analysis)」可收合區域
  - 使用者可展開 Scenario Builder，調整乘數，直接在下方看到 Dashboard 數字的即時變化
  - Dashboard 的 KPI 卡片在 scenario 模式下同時顯示 Baseline 值與 Scenario 值

- [ ] **計算結果頁面整合**
  - 在 CalculationResults 頁面新增「與情境比較 (Compare with Scenario)」入口
  - 點擊後導向 Scenario Comparison 面板，以當前 CalculationResults 為 Baseline

### 3.2 技術交付清單

- [ ] 新增 `src/core/scenarioEngine.ts`（純函數，無副作用）
- [ ] 新增 `src/context/ScenarioContext.tsx`（React Context + Provider）
- [ ] 新增 `src/components/scenario/ScenarioBuilder.tsx`
- [ ] 新增 `src/components/scenario/ScenarioComparison.tsx`
- [ ] 新增 `src/components/scenario/ScenarioDqBanner.tsx`
- [ ] 新增 `src/components/scenario/MultiplierSlider.tsx`（共用乘數元件）
- [ ] 修改 `src/pages/Dashboard.tsx`（整合 Scenario Builder 與 Comparison）
- [ ] 修改 `src/pages/CalculationResults.tsx`（新增 Scenario 入口）
- [ ] 新增 `src/core/scenarioEngine.test.ts`（單元測試）
- [ ] 新增 `src/components/scenario/__tests__/ScenarioBuilder.test.tsx`（元件測試）

---

## 四、非 MVP 範圍 (Explicitly Out of Scope)

以下功能在 v1.37.0 中**明確不實作**，列為未來版本候選：

| 排除項目 | 排除理由 | 預計版本 |
|:---|:---|:---|
| **多情境分支管理**（同時儲存多個命名 Scenario 並切換） | 需要前端狀態管理機制大幅擴展，且 MVP 先驗證單情境使用價值 | v1.38+ |
| **Firestore Scenario 持久化**（將 Scenario 儲存到資料庫） | MVP 驗證 In-Memory 方案的可用性；持久化需要新增 Firestore Collection 與 Security Rules | v1.38+ |
| **Scenario 分享 / 審批工作流** | 依賴持久化先行完成 | v1.39+ |
| **AI API / 最佳化引擎**（自動建議最佳乘數組合） | 高技術風險、隨機性不適合工業決策場景 | 無限期 |
| **Cloud Functions**（後端觸發計算） | 現有引擎為純前端，不需後端介入 | 無限期 |
| **自動商業決策**（自動套用 Scenario 到正式資料） | 違反「不汙染資料庫」核心原則 | 永不實作 |
| **良率矩陣調整乘數** | 良率矩陣結構為 `Record<SizeCategory, Record<LayerBucket, number>>`，乘數 UX 複雜度高，留待 v1.38 驗證 | v1.38+ |
| **匯率假設調整** | 匯率設定涉及 `yearlyUsdToTwdRates` 的多年度映射，需獨立 UX 流程 | v1.38+ |
| **匯出 Scenario 比較報告（PDF/Excel）** | 非核心決策價值，可後補 | v1.39+ |

---

## 五、Scenario 建立流程 (Scenario Creation Flow)

### 5.1 流程總覽

```
[Dashboard 頁面載入]
        │
        ▼
[正常顯示 Baseline 數據]
        │
        ▼
[使用者點擊「情境分析」展開按鈕]
        │
        ▼
┌───────────────────────────────────────────┐
│ Scenario Builder 面板                     │
│                                           │
│  ① 系統自動將當前載入的資料                │
│     snapshot 為 baselineInputs            │
│                                           │
│  ② 使用者調整乘數（滑桿或數值輸入）        │
│     - Forecast Qty:   [====●====] +15%    │
│     - Unit Price:     [==●======] -5%     │
│     - Core Capacity:  [====●====] +10%    │
│     - BU Capacity:    [========●] +0%     │
│                                           │
│  ③ 使用者選擇作用範圍（optional）          │
│     - Year:    [2026 ▼]                   │
│     - Quarter: [All ▼]  or [Q3 ▼]        │
│     - Customer:[All ▼]  or [Apple ▼]      │
│                                           │
│  ④ 使用者點擊「套用並比較」                │
└───────────────────────────────────────────┘
        │
        ▼
[Scenario Engine: clone → multiply → calculate]
        │
        ▼
[Scenario Comparison 面板顯示 Baseline vs Scenario]
```

### 5.2 Baseline Snapshot 機制

當 Scenario Builder 面板首次展開時，系統自動執行：

```typescript
// scenarioEngine.ts 中的邏輯
interface ScenarioBaseline {
  skus: SKU[];           // 深拷貝自頁面載入時的 SKU 資料
  forecasts: Forecast[]; // 深拷貝自頁面載入時的 Forecast 資料
  capacityPlans: CapacityPlan[]; // 深拷貝自頁面載入時的 CapacityPlan 資料
  params: ProjectParameters;     // 深拷貝自頁面載入時的 Parameters
  bpTargetsMillionTwd: Record<string, number>;
  currencySettings: CurrencySettings;
}
```

**重要約束**：
- Baseline Snapshot 透過 **safe shallow clone + targeted object clone** 建立（spread operator clone 陣列，逐物件 clone 複雜欄位），與頁面 State 完全獨立
- **禁止** 對全量 workspace 做 `structuredClone` 或 `JSON.parse(JSON.stringify())` deep clone（性能風險）
- **禁止** mutation 任何 baseline 物件
- Baseline Snapshot **不會**在使用者修改頁面上的正式資料時自動同步
- 若使用者在 Scenario 模式中同時修改了正式資料（透過其他頁面的 Quick Fix 等），系統顯示提示：「偵測到正式資料已變更，請重置情境以同步最新資料」
- 這條偵測透過比較 baseline snapshot 的 `skuCount` 與當前頁面 state 的 `skuCount` 實現（輕量級）

### 5.3 可調整的參數（MVP）

| 參數 | 乘數範圍 | 步進 | 預設值 | 作用對象 |
|:---|:---|:---|:---|:---|
| **Forecast Qty** | -50% ~ +100% | 1% | 0%（不調整） | `Forecast.forecastPcs` |
| **Unit Price** | -50% ~ +50% | 1% | 0%（不調整） | `Forecast.unitPrice` 及 `SKU.unitPrice` |
| **Core Capacity** | -50% ~ +100% | 1% | 0%（不調整） | `CapacityPlan.corePanelPerDay` |
| **BU Capacity** | -50% ~ +100% | 1% | 0%（不調整） | `CapacityPlan.buPanelPerDay` |

**乘數套用邏輯**（參照 `impactAnalysis.ts` 的 `cloneForecasts` / `cloneCapacityPlans` 模式）：

```typescript
// 偽代碼
function applyMultipliers(baseline: ScenarioBaseline, multipliers: ScenarioMultipliers): ScenarioInputs {
  // Safe shallow clone: spread operator for arrays, targeted clone for objects
  const cloned = {
    skus: baseline.skus.map(s => ({ ...s })),
    forecasts: baseline.forecasts.map(f => ({ ...f })),
    capacityPlans: baseline.capacityPlans.map(c => ({ ...c })),
    params: baseline.params, // reference only, never mutated
  };

  // Step 1: 套用 SKU 單價乘數
  if (multipliers.unitPricePct !== 0) {
    for (const sku of cloned.skus) {
      if (sku.unitPrice > 0) {
        sku.unitPrice *= (1 + multipliers.unitPricePct / 100);
      }
    }
  }

  // Step 2: 套用 Forecast 數量與價格乘數
  for (const f of cloned.forecasts) {
    if (multipliers.forecastQtyPct !== 0) {
      f.forecastPcs = Math.round(f.forecastPcs * (1 + multipliers.forecastQtyPct / 100));
    }
    if (multipliers.unitPricePct !== 0 && f.unitPrice > 0) {
      f.unitPrice *= (1 + multipliers.unitPricePct / 100);
    }
  }

  // Step 3: 套用 Capacity 乘數（僅套用於作用範圍內的月份）
  for (const cp of cloned.capacityPlans) {
    if (isInScope(cp.month, multipliers.scope)) {
      if (multipliers.coreCapacityPct !== 0) {
        cp.corePanelPerDay *= (1 + multipliers.coreCapacityPct / 100);
      }
      if (multipliers.buCapacityPct !== 0) {
        cp.buPanelPerDay *= (1 + multipliers.buCapacityPct / 100);
      }
    }
  }

  return cloned;
}
```

### 5.4 作用範圍篩選 (Scope Filter)

| 篩選維度 | 選項 | 影響 |
|:---|:---|:---|
| **Year** | `All` / 個別年度（如 `2026`, `2027`） | Forecast Qty、Unit Price、Capacity 僅套用於該年度的月份 |
| **Quarter** | `All` / `Q1`~`Q4` | 結合 Year，精確限定月份範圍 |
| **Customer** | `All` / 個別客戶名稱 | Forecast Qty、Unit Price 僅套用於該客戶的 SKU 對應的 Forecast |

**預設值**：所有篩選維度均為 `All`（全範圍套用）。

### 5.5 UI 元件需求

| 元件 | 類型 | 位置 | 說明 |
|:---|:---|---:|:---|
| `ScenarioBuilder` | `Card`（可收合） | Dashboard 頁面頂部 | 主容器，預設收合 |
| `MultiplierSlider` | `Slider` + `InputNumber` | ScenarioBuilder 內部 | 每個乘數一組，支援拖曳與精確輸入 |
| `ScopeFilter` | `Select` * 3 | ScenarioBuilder 內部 | Year / Quarter / Customer 下拉選單 |
| `ApplyButton` | `Button` (primary) | ScenarioBuilder 底部 | 觸發計算，disabled 當所有乘數均為 0% |
| `ResetButton` | `Button` (default) | ScenarioBuilder 底部 | 歸零所有乘數並清除 Comparison |
| `ScenarioDqBanner` | `Alert` (warning) | ScenarioBuilder 頂部 | 當 baseline 有 DQ issue 時顯示 |

---

## 六、Scenario 編輯流程 (Scenario Editing Flow)

### 6.1 乘數調整與即時預覽

MVP 採用**手動觸發計算**（點擊「套用並比較」），而非即時預覽。理由：

1. **計算成本**：以 500 SKU * 24 個月為基準，`runCalculation()` 耗時約 100-300ms。拖曳滑桿時每幀觸發計算會造成 UI 卡頓。
2. **UX 清晰度**：明確的「套用」動作讓使用者知道何時觸發了計算，避免「數字在跳」的不確定感。
3. **KISS 原則**：即時預覽需要 debounce、loading state、計算取消機制，增加不必要的複雜度。

**替代方案**：在 Scenario Builder 乘數區域下方顯示一行灰色提示文字：「調整完成後，點擊「套用並比較」查看影響」。

### 6.2 驗證規則

| 欄位 | 驗證規則 | 錯誤提示 |
|:---|:---|:---|
| Forecast Qty 乘數 | -50 ≤ value ≤ 100 | 「預測數量乘數需介於 -50% 至 +100%」 |
| Unit Price 乘數 | -50 ≤ value ≤ 50 | 「單價乘數需介於 -50% 至 +50%」 |
| Core Capacity 乘數 | -50 ≤ value ≤ 100 | 「Core 產能乘數需介於 -50% 至 +100%」 |
| BU Capacity 乘數 | -50 ≤ value ≤ 100 | 「BU 產能乘數需介於 -50% 至 +100%」 |
| 所有乘數均為 0% | 禁用「套用並比較」按鈕 | 按鈕 tooltip：「請至少調整一個乘數」 |
| Capacity 乘數為負且導致 capacity ≤ 0 | 攔截並提示 | 「調整後產能將降為零或負值，請重新檢視」 |

**Forecast Qty 乘數套用後的額外驗證**：
- 若 `forecastPcs * multiplier` 結果 < 0，自動 clamp 至 0
- 若結果為小數，四捨五入至整數

### 6.3 重置為基線 (Reset to Baseline)

行為定義：
1. 所有乘數滑桿歸零
2. 範圍篩選器重置為 `All`
3. Scenario Comparison 面板清除（或顯示「未套用情境」空狀態）
4. Dashboard KPI 卡片恢復為純 Baseline 顯示
5. `isDirty` 標記設為 `false`

**重要**：重置操作**不需要**重新從 Firestore 載入資料。Baseline Snapshot 始終保留在 `ScenarioContext` 的記憶體中，重置只是清除 scenarioInputs 並還原 baselineInputs。

### 6.4 乘數變更追蹤

ScenarioContext 維護以下狀態：

```typescript
interface ScenarioState {
  // 是否處於情境模式（Scenario Builder 已展開）
  isActive: boolean;

  // Baseline 快照（首次展開時建立，期間不變更）
  baseline: ScenarioBaseline | null;

  // 當前乘數設定
  multipliers: ScenarioMultipliers;

  // 作用範圍
  scope: ScenarioScope;

  // 套用後的計算結果（null 表示尚未套用）
  scenarioResult: CalculationResult | null;
  scenarioBp: BpAnalysisModel | null;

  // 是否有未套用的乘數變更
  isDirty: boolean;

  // 是否正在計算中
  isComputing: boolean;

  // 資料品質警告
  dqConfidence: 'high' | 'medium' | 'low' | 'blocked';
  dqIssueCount: number;
}
```

---

## 七、Baseline vs Scenario 比較視圖 (Comparison View)

### 7.1 比較的指標

| 指標 | Baseline 值 | Scenario 值 | Delta | Delta % | 說明 |
|:---|:---:|:---:|:---:|:---:|:---|
| **全年營收 (USD)** | $12,345,678 | $13,456,789 | +$1,111,111 | +9.0% | 來自 `CalculationResult.totalRevenue` |
| **BP 達成率 (%)** | 87.3% | 95.1% | +7.8pp | — | 來自 `BpAnalysisModel.yearly[].attainment` |
| **BP 缺口 (M TWD)** | -180.5 | -56.2 | +124.3 | — | 來自 `BpAnalysisModel.yearly[].gapMillionTwd` |
| **最大 Core 利用率** | 112% | 98% | -14pp | — | 來自 `CalculationResult.maxCoreUtilization` |
| **最大 BU 利用率** | 88% | 95% | +7pp | — | 來自 `CalculationResult.maxBuUtilization` |
| **Shortage Month 數** | 5 | 2 | -3 | — | 來自 `CalculationResult.shortageMonthCount` |
| **SKU 數** | 487 | 487 | 0 | — | Scenario 不增減 SKU |
| **預測月份數** | 24 | 24 | 0 | — | Scenario 不增減月份 |

### 7.2 視圖佈局

```
┌──────────────────────────────────────────────────────────────┐
│ [情境分析] Scenario: Forecast Qty +15%, Price -5%           │
│ Baseline: 2026-05-27 14:30 的正式資料 snapshot              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 營收 Delta│ │BP達成率Δ │ │Core利用率Δ│ │Shortage Δ│       │
│  │ +$1.1M   │ │ +7.8pp   │ │ -14pp    │ │ -3 months│       │
│  │ (↑ 9.0%) │ │ (↑ 7.8%) │ │ (↓改善)  │ │ (↓改善)  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Price vs Quantity Attribution                       │    │
│  │ [████████████████░░░░░░] Price: 68% | Qty: 32%     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────┐ ┌──────────────────────┐          │
│  │ Top 5 Changed        │ │ Top 5 Changed        │          │
│  │ Customers            │ │ SKUs                 │          │
│  │ (Revenue Delta排序)  │ │ (Revenue Delta排序)  │          │
│  └──────────────────────┘ └──────────────────────┘          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 月度趨勢對比 (Monthly Trend Comparison)             │    │
│  │ [折線圖: Baseline vs Scenario 營收走勢]              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 7.3 視覺設計規範

| 元素 | 設計規範 |
|:---|:---|
| **正向 Delta（改善）** | 綠色 (`#52c41a`)，帶上箭頭 ↑ |
| **負向 Delta（惡化）** | 紅色 (`#ff4d4f`)，帶下箭頭 ↓ |
| **零 Delta（無變化）** | 灰色 (`#8c8c8c`)，短橫線 — |
| **Delta 百分比** | 格式為 `+9.0%` 或 `-3.2%`，正號顯式顯示 |
| **BP 達成率 Delta** | 以百分點 (pp) 為單位，如 `+7.8pp` |
| **KPI 卡片** | 複用現有 `MetricCard` 元件，新增 `baselineValue` 與 `deltaValue` props |
| **表格列** | 差異最大的列使用淺色高亮背景（`#fffbe6`） |

### 7.4 月度趨勢對比圖

- **圖表類型**：折線圖（使用 `@ant-design/charts` 的 `Line` 元件，與 Dashboard 一致）
- **X 軸**：月份（YYYY-MM）
- **Y 軸**：營收 (USD)
- **兩條線**：
  - Baseline 線：實線，藍色 (`#1890ff`)
  - Scenario 線：虛線，橙色 (`#fa8c16`)
- **懸浮提示**：顯示該月份的 Baseline 值、Scenario 值、Delta 與 Delta %

---

## 八、Viewer / Editor / Owner 權限 (Role-Based Access)

### 8.1 權限矩陣

| 操作 | Viewer | Editor | Owner |
|:---|:---:|:---:|:---:|
| 查看 Scenario Builder 面板 | ✅（唯讀展開） | ✅ | ✅ |
| 調整乘數滑桿 | ❌（隱藏） | ✅ | ✅ |
| 選擇作用範圍 | ❌（隱藏） | ✅ | ✅ |
| 點擊「套用並比較」 | ❌（隱藏） | ✅ | ✅ |
| 點擊「重置為基線」 | ❌（隱藏） | ✅ | ✅ |
| 查看 Scenario Comparison 面板 | ✅ | ✅ | ✅ |
| 查看月度趨勢對比圖 | ✅ | ✅ | ✅ |
| 導出比較結果 | ✅（未來版本） | ✅（未來版本） | ✅（未來版本） |

### 8.2 UI 實作方式

**Viewer 的 Scenario Builder 外觀**：

```
┌──────────────────────────────────────────────────────────────┐
│ 🔒 情境分析 (Scenario Analysis)                    [唯讀模式] │
│                                                              │
│ 您目前的角色為 Viewer，無法建立或調整情境。                    │
│ 如需使用情境分析功能，請聯繫工作區 Owner 升級您的權限。       │
│                                                              │
│ [套用並比較]  ← disabled, tooltip: "Viewer 無法建立情境"      │
└──────────────────────────────────────────────────────────────┘
```

**權限檢查位置**：
1. `ScenarioContext`：在 `applyScenario()` 與 `resetToBaseline()` 函數開頭檢查 `scope.role`
2. `ScenarioBuilder.tsx`：根據 `canEdit(scope.role)` 決定是否渲染乘數調整區域
3. Firestore Security Rules：Scenario 為純前端，不觸及 Firestore，因此不需要新增 Rules

### 8.3 與現有權限系統的整合

現有的 `projectScope.ts` 提供 `canEdit(role)` 與 `isViewer(role)` 函數，Scenario 功能直接複用：

```typescript
// ScenarioBuilder.tsx
const { scope } = useProjectScope();
const writable = canEdit(scope.role);

// 乘數調整區域
{writable && (
  <div className="scenario-controls">
    <MultiplierSlider ... />
    <ScopeFilter ... />
    <Button onClick={applyScenario}>套用並比較</Button>
    <Button onClick={resetToBaseline}>重置為基線</Button>
  </div>
)}

// Comparison 面板對所有角色可見
<ScenarioComparison ... />
```

---

## 九、不污染資料庫的 UX 提示 (No-Pollution UX)

### 9.1 常駐 Banner

**位置**：Scenario Builder 面板頂部（展開後可見）

**內容**：

```
┌──────────────────────────────────────────────────────────────┐
│ ℹ️ 情境分析在您的瀏覽器記憶體中運行。所有調整僅影響當前頁面   │
│ 的顯示結果，不會修改正式資料庫中的任何資料。刷新頁面或導航     │
│ 至其他頁面後，情境設定將自動清除。                           │
└──────────────────────────────────────────────────────────────┘
```

**樣式**：`Alert` 元件，`type="info"`，可關閉（關閉後本次 session 不再顯示）

### 9.2 頁面離開警告

**觸發條件**：`isDirty === true`（使用者已調整乘數但未重置）

**行為**：
1. **瀏覽器刷新 / 關閉**：透過 `window.addEventListener('beforeunload', handler)` 顯示瀏覽器原生確認對話框
2. **React Router 導航**：透過 `usePrompt` (react-router-dom v6) 或自訂 `useBeforeNavigate` hook 顯示自訂確認 Modal

**確認 Modal 內容**：

```
┌──────────────────────────────────────────────────────────────┐
│ ⚠️ 離開情境分析                                              │
│                                                              │
│ 您目前有一個未重置的情境（Forecast Qty +15%, Price -5%）。    │
│ 離開此頁面後，情境設定將自動清除，且無法恢復。               │
│                                                              │
│ [取消]                          [確認離開並清除情境]          │
└──────────────────────────────────────────────────────────────┘
```

### 9.3 資料變更偵測提示

**場景**：使用者在 Scenario 模式中，透過其他瀏覽器分頁或 Quick Fix 修改了正式資料。

**偵測機制**：
- ScenarioContext 在 `baseline.snapshotTime` 記錄 baseline 建立的時間戳
- Dashboard 的 `loadData()` 每次載入時比較新資料的 `updatedAt` 與 `snapshotTime`
- 若偵測到變更，在 Scenario Builder 頂部顯示提示：

```
┌──────────────────────────────────────────────────────────────┐
│ ⚠ ️偵測到正式資料已變更。您當前的情境基線可能不是最新版本。  │
│ [重置情境並同步最新資料]                                      │
└──────────────────────────────────────────────────────────────┘
```

### 9.4 行動裝置 / 小螢幕注意事項

- Scenario Builder 面板在螢幕寬度 < 768px 時，乘數滑桿改為垂直排列
- Comparison 面板的 KPI 卡片從四欄改為兩欄
- Top Changed 表格改為卡片式堆疊佈局

---

## 十、空狀態 / 錯誤狀態 / DQ 不可信狀態 (Edge Cases)

### 10.1 空狀態

**場景 A：Scenario Builder 已展開但尚未套用任何乘數**

```
┌──────────────────────────────────────────────────────────────┐
│ 📊 情境分析                                                  │
│                                                              │
│ 調整上方的乘數參數，然後點擊「套用並比較」查看 Baseline       │
│ 與 Scenario 的差異分析。                                     │
│                                                              │
│ 💡 提示：您可以同時調整多個乘數，模擬複合情境的影響。        │
└──────────────────────────────────────────────────────────────┘
```

**場景 B：無 SKU 或無 Forecast 資料**

```
┌──────────────────────────────────────────────────────────────┐
│ ⚠ ️無法執行情境分析                                          │
│                                                              │
│ 目前工作區尚無產品資料或預測資料。請先在「產品管理」和        │
│ 「月度預測」頁面匯入資料後，再使用情境分析功能。             │
│                                                              │
│ [前往產品管理]  [前往月度預測]                                │
└──────────────────────────────────────────────────────────────┘
```

**場景 C：所有乘數均為 0%**

- 「套用並比較」按鈕 disabled
- Tooltip 提示：「請至少調整一個乘數以執行情境分析」

### 10.2 錯誤狀態

**場景 D：計算過程發生錯誤**

若 `runCalculation()` 拋出異常（例如 Panel Layout Error for SKU XXX）：

```
┌──────────────────────────────────────────────────────────────┐
│ ❌ 情境計算失敗                                              │
│                                                              │
│ 在套用乘數後的計算過程中發生錯誤：                           │
│ "Panel layout error for SKU ABC-123: chip dimensions exceed  │
│  panel size"                                                 │
│                                                              │
│ 這可能表示某些 SKU 在調整後的數量下觸發了邊界條件。          │
│ 請嘗試減小乘數範圍，或檢查受影響的 SKU 資料。               │
│                                                              │
│ [重置為基線]                    [查看受影響 SKU]              │
└──────────────────────────────────────────────────────────────┘
```

**場景 E：計算超時**

若計算耗時超過 5 秒（以 2000 SKU * 36 個月為極端測試基準）：

```
┌──────────────────────────────────────────────────────────────┐
│ ⏱ ️情境計算耗時較長                                          │
│                                                              │
│ 資料量較大（N 個 SKU × M 個月），計算仍在進行中。            │
│ 請稍候... [載入動畫]                                         │
└──────────────────────────────────────────────────────────────┘
```

**實作**：`useScenarioState` 中的 `applyScenario()` 使用 `requestIdleCallback` 或 `setTimeout` 分批計算，避免阻塞主線程。若資料量 < 500 SKU * 24 月，直接同步計算。

### 10.3 DQ 不可信狀態

**場景 F：Baseline 資料存在高優先度 DQ 問題**

當 `buildDataQualitySummary()` 回傳的 `confidence` 為 `'low'` 或 `'blocked'` 時：

```
┌──────────────────────────────────────────────────────────────┐
│ ⚠ ️情境結果可能不準確                                        │
│                                                              │
│ Baseline 資料存在 3 個資料品質問題（含 1 個高優先度問題）：  │
│ - 🔴 5 筆預測資料缺少對應的 SKU 產品資料（高優先度）        │
│ - 🟡 2 筆 SKU 缺少單價資訊                                  │
│ - 🟡 1 個月份缺少產能規劃資料                               │
│                                                              │
│ 建議先修正資料品質問題後再執行情境分析，以確保結果可靠。     │
│                                                              │
│ [前往資料品質修正]          [繼續查看情境結果（可能不準確）]  │
└──────────────────────────────────────────────────────────────┘
```

**規則**：
- `confidence === 'blocked'`（無資料）：顯示空狀態（見場景 B），不允許執行情境分析
- `confidence === 'low'`（高優先度 DQ 問題存在）：顯示上述警告 Banner，允許繼續但明確標示不準確
- `confidence === 'medium'`（僅中/低優先度問題）：顯示簡短提示（`Alert type="warning"`），不阻擋操作
- `confidence === 'high'`：不顯示任何 DQ 相關提示

**DQ 警告的技術實作**：

```typescript
// ScenarioDqBanner.tsx
interface ScenarioDqBannerProps {
  dqSummary: DataQualitySummary;
  onNavigateToDq: () => void;
}

const ScenarioDqBanner: React.FC<ScenarioDqBannerProps> = ({ dqSummary, onNavigateToDq }) => {
  if (dqSummary.confidence === 'high') return null;

  const errorCount = dqSummary.issues.filter(i => i.severity === 'error').length;
  const warningCount = dqSummary.issues.filter(i => i.severity === 'warning').length;

  if (dqSummary.confidence === 'blocked') {
    return <Alert type="error" message="Baseline 資料不足，無法執行情境分析" ... />;
  }

  if (dqSummary.confidence === 'low') {
    return (
      <Alert
        type="warning"
        message={`Baseline 資料存在 ${errorCount} 個高優先度問題，情境結果可能不準確`}
        action={<Button onClick={onNavigateToDq}>前往修正</Button>}
      />
    );
  }

  // confidence === 'medium'
  return (
    <Alert
      type="info"
      message={`Baseline 資料存在 ${warningCount} 個品質問題，情境結果可能略有偏差`}
      showIcon
    />
  );
};
```

### 10.4 效能警告

**場景 G：資料量過大**

當 SKU 數 > 1000 或 Forecast 月數 > 36 時：

```
┌──────────────────────────────────────────────────────────────┐
│ ⚡ 資料量較大，計算可能需要數秒                              │
│                                                              │
│ 當前資料規模：1,247 個 SKU × 36 個月。情境計算預估耗時      │
│ 約 3-5 秒。                                                  │
└──────────────────────────────────────────────────────────────┘
```

**實作**：在 `applyScenario()` 開頭估算 `skuCount * monthCount`，若超過閾值（1000 * 36 = 36,000），顯示上述提示。

### 10.5 其他邊界情況

| 場景 | 行為 |
|:---|:---|
| 使用者在 Scenario 模式下嘗試透過 Quick Fix 修改 SKU 資料 | 允許修改正式資料，但在 Scenario Builder 中顯示「偵測到正式資料已變更」提示 |
| 匯率設定為 `yearly` 模式且不同年度匯率差異大 | Scenario 不調整匯率，Comparison 結果基於原始匯率設定，DQ Banner 中不額外警告 |
| Capacity Plan 資料為空陣列 | Scenario 的 Capacity 乘數調整無效（不顯示錯誤，僅 Capacity 相關指標顯示為 N/A） |
| BP Targets 未設定 | BP 達成率相關指標顯示為「未設定」，不影響其他指標的比較 |
| 使用者快速連續點擊「套用並比較」 | 第二次點擊在第一次計算完成前觸發時，取消第一次計算（AbortController 或 isComputing 守衛） |

---

## 附錄 A：技術架構概覽

### A.1 模組依賴關係

```
ScenarioPlanning.tsx (single-scenario page)
    ├── useScenarioContext() (from ScenarioContext.tsx)
    │       ├── scenarioEngine.ts
    │       │       ├── cloneBaselineInputs() (safe shallow clone)
    │       │       ├── applyMultipliers() (clone + multiply)
    │       │       ├── runCalculation() (from calculationEngine.ts)
    │       │       └── buildBpAnalysis() (from bpTargets.ts)
    │       └── computeChangeImpact() (from changeImpact.ts)
    │               └── MetricDelta, TopChangedItem, etc.
    ├── ScenarioComparisonView.tsx
    │       ├── MetricCard (from components/common)
    │       └── Delta visualization
    ├── ScenarioDqBanner.tsx
    │       └── buildDataQualitySummary() (from dataQuality.ts)
    └── ScenarioMultiplierPanel.tsx
            └── Ant Design Slider + InputNumber
```

### A.2 與現有模組的整合點

| 現有模組 | 整合方式 | 需要修改？ |
|:---|:---|:---:|
| `calculationEngine.ts` | Scenario Engine 直接調用 `runCalculation()` | 否 |
| `bpTargets.ts` | Scenario Engine 直接調用 `buildBpAnalysis()` | 否 |
| `changeImpact.ts` | Comparison 面板複用 Delta 計算邏輯 | 否 |
| `dataQuality.ts` | DQ Banner 調用 `buildDataQualitySummary()` | 否 |
| `projectScope.ts` | 權限檢查複用 `canEdit()` | 否 |
| `Dashboard.tsx` | 新增 Scenario Builder 與 Comparison 區域 | **是** |
| `CalculationResults.tsx` | 新增 Scenario 入口按鈕 | **是** |

### A.3 新增檔案清單

| 檔案路徑 | 類型 | 說明 |
|:---|:---|:---|
| `src/core/scenarioEngine.ts` | 純函數 | Scenario 乘數套用與計算邏輯 |
| `src/core/scenarioEngine.test.ts` | 測試 | scenarioEngine 單元測試 |
| `src/context/ScenarioContext.tsx` | Context | Scenario 狀態管理 |
| `src/components/scenario/ScenarioBuilder.tsx` | 元件 | Scenario Builder 面板 |
| `src/components/scenario/ScenarioComparison.tsx` | 元件 | Comparison 視圖 |
| `src/components/scenario/ScenarioDqBanner.tsx` | 元件 | DQ 警告 Banner |
| `src/components/scenario/MultiplierSlider.tsx` | 元件 | 乘數滑桿元件 |
| `src/components/scenario/__tests__/ScenarioBuilder.test.tsx` | 測試 | ScenarioBuilder 元件測試 |

---

## 附錄 B：i18n 鍵值參考

| 鍵值 | 繁體中文 | English |
|:---|:---|:---|
| `scenario.title` | 情境分析 | Scenario Analysis |
| `scenario.builder.expand` | 展開情境分析 | Expand Scenario Analysis |
| `scenario.builder.collapse` | 收合情境分析 | Collapse Scenario Analysis |
| `scenario.multiplier.forecastQty` | 預測數量 | Forecast Quantity |
| `scenario.multiplier.unitPrice` | 單價 | Unit Price |
| `scenario.multiplier.coreCapacity` | Core 產能 | Core Capacity |
| `scenario.multiplier.buCapacity` | BU 產能 | BU Capacity |
| `scenario.scope.year` | 年度範圍 | Year |
| `scenario.scope.quarter` | 季度範圍 | Quarter |
| `scenario.scope.customer` | 客戶篩選 | Customer |
| `scenario.scope.all` | 全部 | All |
| `scenario.action.apply` | 套用並比較 | Apply & Compare |
| `scenario.action.reset` | 重置為基線 | Reset to Baseline |
| `scenario.banner.noPollution` | 情境分析在您的瀏覽器記憶體中運行，不會修改正式資料庫中的任何資料。 | Scenario analysis runs in your browser memory. No changes will be made to the production database. |
| `scenario.banner.dataChanged` | 偵測到正式資料已變更，請重置情境以同步最新資料。 | Production data has changed. Please reset the scenario to sync with the latest data. |
| `scenario.dq.lowConfidence` | Baseline 資料存在品質問題，情境結果可能不準確 | Baseline data has quality issues; scenario results may be unreliable |
| `scenario.comparison.revenueDelta` | 營收差異 | Revenue Delta |
| `scenario.comparison.bpAttainmentDelta` | BP 達成率差異 | BP Attainment Delta |
| `scenario.comparison.bpGapDelta` | BP 缺口差異 | BP Gap Delta |
| `scenario.comparison.coreUtilDelta` | Core 利用率差異 | Core Utilization Delta |
| `scenario.comparison.buUtilDelta` | BU 利用率差異 | BU Utilization Delta |
| `scenario.comparison.shortageDelta` | 短缺月份差異 | Shortage Month Delta |
| `scenario.comparison.topChangedCustomers` | 受影響最大的客戶 | Top Changed Customers |
| `scenario.comparison.topChangedSkus` | 受影響最大的 SKU | Top Changed SKUs |
| `scenario.comparison.priceDriven` | 價格驅動 | Price-Driven |
| `scenario.comparison.quantityDriven` | 數量驅動 | Quantity-Driven |
| `scenario.viewer.readonly` | 您目前的角色為 Viewer，無法建立或調整情境。 | Your current role is Viewer. You cannot create or edit scenarios. |
| `scenario.confirm.leave.title` | 離開情境分析 | Leave Scenario Analysis |
| `scenario.confirm.leave.message` | 離開此頁面後，情境設定將自動清除，且無法恢復。 | Scenario settings will be cleared and cannot be recovered after leaving this page. |
| `scenario.error.calcFailed` | 情境計算失敗 | Scenario calculation failed |
| `scenario.warning.largeData` | 資料量較大，計算可能需要數秒 | Large dataset; calculation may take a few seconds |

---

## 附錄 C：驗收測試場景總表

| ID | 場景 | 前置條件 | 操作 | 預期結果 | 對應 UC |
|:---|:---|:---|:---|:---|:---:|
| AT-01 | 基本數量調整 | 500 SKU, 24 月資料 | Forecast Qty +15%, 全範圍 | 營收 Delta ≈ +15%, 計算 < 2s | UC-1 |
| AT-02 | 客戶限定價格調整 | 有 Apple 客戶 SKU | Price -5%, Customer=Apple | 價格歸因準確, 非 Apple SKU 無影響 | UC-2 |
| AT-03 | 瓶頸月份產能擴充 | 有 5 個 Shortage Month | Core +10%, Shortage Months only | Shortage 數量減少, resolved 列表正確 | UC-3 |
| AT-04 | 複合情境 | 有完整資料 | Qty +10%, Price -3%, BU +5% | 三個乘數正確疊加, Attribution 正確 | UC-4 |
| AT-05 | 重置為基線 | 已套用任何情境 | 點擊 Reset | 所有乘數歸零, Comparison 清除 | UC-5 |
| AT-06 | Viewer 只讀 | Viewer 角色 | 展開 Scenario Builder | 乘數調整區域隱藏, Comparison 可見 | UC-1~5 |
| AT-07 | DQ 警告 | Baseline 有 error 級 DQ issue | 展開 Scenario Builder | 顯示 DQ 警告 Banner | Edge-F |
| AT-08 | 空資料 | 無 SKU 且無 Forecast | 展開 Scenario Builder | 顯示空狀態提示, 無法套用 | Edge-B |
| AT-09 | 離開警告 | isDirty=true | 嘗試導航至其他頁面 | 顯示確認 Modal | Section 9.2 |
| AT-10 | 計算錯誤 | SKU 有異常 chip 尺寸 | 套用觸發 Panel Layout Error | 顯示錯誤訊息, 提供 Reset 選項 | Edge-D |
| AT-11 | 資料變更偵測 | Scenario 已套用 | 其他分頁修改了 SKU 資料 | 顯示「資料已變更」提示 | Section 9.3 |
| AT-12 | 負乘數邊界 | — | Forecast Qty -50% | forecastPcs 不低於 0, 計算成功 | Section 6.2 |
| AT-13 | 大資料量效能 | 1500 SKU, 36 月 | 套用任何情境 | 顯示效能提示, 計算 < 10s | Edge-G |
| AT-14 | BP 未設定 | 無 BP Targets | 套用情境 | BP 達成率顯示 N/A, 其餘指標正常 | Edge |
| AT-15 | 連續點擊防護 | — | 快速連按兩次「套用」 | 僅觸發一次計算, 無重複渲染 | Edge |
