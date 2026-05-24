# Phase 6 Forecast Versioning 產品定位與資料模型審查

本文件對即將開展開發的 **Phase 6: Forecast Versioning & Change Impact Review**（預測版本控制與變更影響審查）進行產品定位、Snapshot 數據模型、Workspace 共享權限以及核心存檔邊界的前瞻性審查。

---

## 1. 產品定位與角色痛點分析 (Product Positioning)

在 ABF 載板產能規劃中，預測資料（Forecasts）、單價（Prices）、產能計畫（Capacity Plans）以及 BP 目標（BP Targets）是隨市場動態高頻變更的。
Phase 6 旨在解決一個核心痛點：**「當輸入數據發生微調或版本疊代後，決策者無法客觀、量化地回答前後版本之間的差異及影響。」**

我們從以下四個關鍵決策角色出發，分析版本對決的核心價值與痛點：

### 1. Sales (業務與銷售)
* **面臨痛點**：客戶（如 TSMC、Intel）突然追加或削減了某個月份的某款 SKU 預測，或者業務調整了某些單價。銷售難以立刻向管理層交代：「這次調整對我們全年的營收拉動是多少？對 BP 達成率的貢獻是多少？是價格變動拉動的還是數量追加拉動的？」
* **版本對決決策**：Sales 需要比對 **「快照 A (調整前)」** 與 **「快照 B (調整後)」**，明確找出營收變動的驅動源是特定客戶還是特定 SKU，並將此作為與客戶談判、向高層彙報業績波動的實質依據。

### 2. Product Planning (產品規劃)
* **面臨痛點**：產品線非常複雜（包含多種層數 layerCount、晶片尺寸 sizeCategory 等）。產品經理微調了 SKU mix（產品組合）後，很難量化：「微調後，我們的戰略成長型（strategicGrowth）和產能耗用型（capacityDrainer）SKU 分佈發生了什麼漂移？是否優化了利潤組合？」
* **版本對決決策**：Product Planning 需要比對前後版本的 SKU Derived Signals，評估微調是否成功優化了高毛利、低產能佔用的 SKU 營收 share，從而引導產品戰略微調。

### 3. Capacity Planning (產能與工廠規劃)
* **面臨痛點**：一旦 Forecast 追加，工廠最頭疼的是產能過載。產能規劃人員無法快速回答：「這次 Forecast 追加後，是否引發了新的 Core/BU 產能短缺？ worst bottleneck month 是否發生了位移？ max utilization 提升了多少？+10% 產能改善情境的效果是否被削弱了？」
* **版本對決決策**：Capacity Planning 需要立刻比對前後版本的產能短缺月份數（shortageMonthCount）與 max utilization。這能幫助他們決定是否需要立刻開啟新的產能擴充情境模擬，或是向設備廠下單採購新機台。

### 4. Executive (決策與高管層)
* **面臨痛點**：高層不關心瑣碎的 SKU 變更，只關心宏觀指標。每次更新版本，Executive 都會問：「這次版本微調後，全年的 BP Attainment 達成率是升高還是降低了？主要差距（Gap）縮小了多少？我們面臨的整體風險級別發生了什麼質變？」
* **版本對決決策**：Executive 需要一個最乾淨的「雙版本大盤 Delta 指標卡」，直接向股東或董事會交代業績預測的最新達成現狀，鎖定核心 BP attaintment 波動。

---

## 2. Snapshot MVP 範圍與存檔辯證 (Snapshot Archive Strategy)

為了實施版本快照（Snapshot），我們必須對「存檔什麼數據」進行深度辯證，以求在 **「性能/成本」** 與 **「可追溯性/數據完整度」** 之間取得最優解。

### 📊 存檔策略三路徑辯證：

| 存檔策略 | 優點 | 缺點 | 審查結論 |
| :--- | :--- | :--- | :--- |
| **路徑 A: 僅保存 Raw Inputs**<br>(保存 SKUs, Forecasts, Capacity, Params, BP raw 數據) | - 數據體積極小，Firestore 存儲成本低。<br>- 快照寫入極快。 | - 比對時必須在前端對歷史版本進行即時重新計算（Re-run calculation）。<br>- 當應用程式碼版本升級、物理計算公式變更時，歷史快照的計算結果會發生漂移（Drift），破壞歷史不可篡改性。 | **不建議單獨採用**。 |
| **路徑 B: 僅保存 Derived Outputs**<br>(保存 AnalyticsModel, RiskBrief, Attributions 等計算結果) | - 不需要重算，直接讀取快照即可在 UI 渲染比對結果。<br>- 絕對不受未來公式升級的干擾，保證了歷史數據的「時間膠囊」真實性。 | - 數據體積較大。<br>- 無法追溯當時是哪個 SKU 的 unitPrice 發生了微調（遺失了 inputs 詳細脈絡）。 | **不建議單獨採用**。 |
| **路徑 C: 混合存盤策略 (Hybrid Strategy)**<br>(保存核心 Raw Inputs + derived outputs 關鍵 KPI 摘要) | - **兩全其美**：既保留了 Raw Inputs 供追溯，又把 derived outputs 中最關鍵的 Attainment, revenue, utilization, KeyFindings 提煉成輕量化的 derived metadata 存檔。 | - 需要精確定義 derived metadata 結構，確保不存儲宂餘的中間矩陣（如龐大的月度庫存大表）。 | **🌟 MVP 強烈推薦採用**。 |

### 💡 Snapshot MVP 實體數據模型設計：
我們建議快照文檔（Snapshot Document）必須包含以下核心字段：

```json
{
  "snapshotId": "snap_20260524_v1",
  "name": "2026 Q2 TSMC 追加預測版",
  "description": "TSMC 於 5/24 追加 2026Q3 封裝載板預測 10k，單價維持 100 USD",
  "createdAt": "2026-05-24T08:00:00Z",
  "createdBy": "user_uid_12345",
  "sourceAppVersion": "v1.21.1",
  "projectScope": { "projectId": "project_abc", "workspaceId": "ws_xyz" },
  
  // 1. Raw Inputs Snapshot (輕量化核心 raw inputs)
  "rawInputs": {
    "skus": [],          // 當時的所有 SKU 清單
    "forecasts": [],     // 當時的所有 Forecast 預測條目
    "capacityPlans": [], // 當時的產能規劃
    "parameters": {},    // 匯率等核心參數
    "bpTargets": []      // BP 標的
  },
  
  // 2. Derived Highlights (精選核心計算結論，用於 UI 秒開比對)
  "derivedHighlights": {
    "totalRevenueUsd": 12500000,
    "maxCoreUtilization": 0.92,
    "maxBuUtilization": 0.81,
    "shortageMonthCount": 3,
    "worstBottleneckMonth": "2026-08",
    "bpAttainment": 0.91,
    "bpGapMillionTwd": -90,
    "keyFindingsCount": 5
  }
}
```

---

## 3. Firestore 數據路徑與 Workspace 共享權限 (Data Path & Security)

在多用戶協作（Workspace Collaboration）環境下，Snapshot 的數據歸屬與權限控制是系統的生命線。我們必須硬性界定以下路徑與權限：

### 📂 Firestore 數據存儲路徑建議：

1. **個人作用域快照 (Personal Scope)**
   ```text
   users/{uid}/projects/{projectId}/snapshots/{snapshotId}
   ```
2. **共享工作區作用域快照 (Shared Workspace Scope)**
   ```text
   workspaces/{workspaceId}/projects/{projectId}/snapshots/{snapshotId}
   ```

### 🔐 Workspace 角色權限矩陣 (RACI Matrix for Snapshots)：

在同一個共享工作區下，成員的角色權限必須嚴格遵守以下限制，未來在實作 Firestore Rules 時應精準卡死：

| 權限項目 | Owner (所有者) | Editor (編輯者) | Viewer (觀察者) | 權限設計要點與紅線 |
| :--- | :---: | :---: | :---: | :--- |
| **建立快照 (Create)** | **YES** | **YES** | **NO** | Viewer 僅能唯讀瀏覽，**絕對不可**建立快照，避免消耗資料庫寫入 quota。 |
| **讀取/比較快照 (Read/Compare)** | **YES** | **YES** | **YES** | 所有成員均可讀取快照並進行雙版本比較。 |
| **刪除快照 (Delete)** | **YES** | **CONDITIONAL** | **NO** | - Owner 擁有一鍵全局刪除快照的最高特權。<br>- Editor **僅能刪除自己建立的快照**，禁止刪除他人快照，防止惡意破壞。<br>- Viewer 嚴禁刪除。 |
| **不可篡改性保障 (Immutable)** | **YES** | **YES** | **YES** | - **核心紅線**：快照一旦建立，**禁止任何 Update 寫入**！<br>- Firestore rule 必須限制為：`allow update: if false;`。<br>- 任何人（包括 Owner）若要調整描述，必須刪除重建，以此保證「歷史時間膠囊」不會被悄悄修改。 |
| **軟刪除機制 (Soft Delete)** | **YES** | **YES** | **NO** | - 快照一旦物理刪除，無法找回。<br>- 建議 MVP 採用物理刪除。如未來有審計需求，可引入 `isDeleted: true` 軟刪除標記。 |
