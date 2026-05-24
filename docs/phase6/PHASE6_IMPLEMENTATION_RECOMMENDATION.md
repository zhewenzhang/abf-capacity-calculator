# Phase 6 實作推薦、UI/UX 與 AI 使用邊界指南

本文件為 **Phase 6: Forecast Versioning & Change Impact Review**（預測版本控制與變更影響審查）提供具體的實作推薦、UI/UX 佈局設計、Change Impact 核心指標，以及外部 AI（DeepSeek V4-Flash）離線解讀的 Prompt 護欄與 8 大核心風險防範策略。

---

## 1. Change Impact Metrics (對決指標設計)

變更影響審查（Change Impact Review）的靈魂在於「雙版本對決指標」的設計。我們為第一代實作設計了 **12 個核心比較指標**，並嚴格劃分其屬性類別，堅決捍衛「比例歸因 $\neq$ 直接因果」的核心數理邊界：

### 12 大對決指標（Delta Metrics）：

| 指標名稱 | 計算公式 / 算法描述 | 屬性分類 |
| :--- | :--- | :--- |
| **1. Revenue Delta** | $Revenue_{snapB} - Revenue_{snapA}$ | **Fact (事實)** |
| **2. BP Attainment Delta** | $Attainment_{snapB} - Attainment_{snapA}$ (百分點 pp) | **Fact (事實)** |
| **3. BP Gap Delta** | $Gap_{snapB} - Gap_{snapA}$ (百萬 TWD) | **Fact (事實)** |
| **4. Core Utilization Delta** | $MaxCoreUtil_{snapB} - MaxCoreUtil_{snapA}$ | **Fact (事實)** |
| **5. BU Utilization Delta** | $MaxBuUtil_{snapB} - MaxBuUtil_{snapA}$ | **Fact (事實)** |
| **6. Shortage Month Delta** | $ShortageMonths_{snapB} - ShortageMonths_{snapA}$ (個) | **Fact (事實)** |
| **7. Top Changed Customer** | 雙版本對比中，營收 Delta 絕對值最大的客戶 | **Attribution (比例歸因)** |
| **8. Top Changed SKU** | 雙版本對比中，營收 Delta 絕對值最大的 SKU | **Attribution (比例歸因)** |
| **9. Top Changed Month** | 雙版本對比中，稼動率或短缺變動最激烈的月份 | **Attribution (比例歸因)** |
| **10. Price-Driven Revenue Delta** | $\sum (Qty_{snapA} \times (Price_{snapB} - Price_{snapA}))$ | **Inference (數理推論)** |
| **11. Quantity-Driven Revenue Delta**| $\sum (Price_{snapA} \times (Qty_{snapB} - Qty_{snapA}))$ | **Inference (數理推論)** |
| **12. Capacity-Driven Util Delta** | 當產能 Plan 變更時，由產能變更直接導致的稼動率變更 | **Inference (數理推論)** |

### ⚠️ 比例歸因與因果防守邊界：
在系統設計中，**絕對不可**將「Attribution (比例歸因)」與「Causality (直接因果)」混淆：
- **Attribution 邊界**：系統在指出 *「客戶 TSMC 貢獻了本次 BP Gap 變動的 60%」* 時，UI 與導出數據必須明確加註免責說明：*「此為營收比例歸因，指 TSMC 在變動期間的營收份額佔比最大。這不表示 TSMC 的單一調整對該差距負有完全因果責任。」*
- **隔離幻覺**：在計算 *Price-Driven* 與 *Quantity-Driven* 時，系統使用的是基於 snapshot A 的**敏感度係數推導**，這屬於數理推論（Inference），而非歷史既定事實，必須在 UI 中清晰分開展示。

---

## 2. UI / UX 佈局與元件設計 (Ant Design Style)

為了保持系統整體的極簡與克制，Phase 6 的 UI 實作推薦**完全在現有 Ant Design 體系內無感嵌入**，不進行破壞性的大型改版：

```text
+-------------------------------------------------------------------------+
| [Workspace Switcher]                     ABF Capacity Calculator v1.21.1|
+-------------------------------------------------------------------------+
| [Dashboard]  [Capacity Plan]  [Forecasts]  [Risk Brief]  [*Change Review*]|
+-------------------------------------------------------------------------+
|  快照管理與對決面板                                                        |
|  Compare: [快照選擇器 A (Base)  V]  vs  [快照選擇器 B (Target) V] [對決按鈕]  |
|                                                                         |
|  +-------------------+  +-------------------+  +-------------------+    |
|  | Revenue Delta     |  | BP Attainment pp  |  | Shortage Month    |    |
|  | +$2.5M USD        |  | +8.2%             |  | -1 Month          |    |
|  +-------------------+  +-------------------+  +-------------------+    |
|                                                                         |
|  [*變更影響報告 (Change Review)*] [月度對比表] [客戶/SKU對比表]           |
|  ---------------------------------------------------------------------  |
|  [Fact] 2026-08 因 Core 產能擴展 10%，解除 1 個月短缺。                 |
|  [Inference] TSMC 追加預測為本次 attainment 提升的主要驅動者。           |
|                                                                         |
|  [按鈕: 導出 Change Impact Pack (DeepSeek 離線包)]                       |
+-------------------------------------------------------------------------+
```

### 🛠️ 核心 AntD 元件與排版推薦：
1. **快照選擇器 (Compare Selector)**：
   - 使用 AntD `<Select>` 元件，動態拉取當前 Workspace 下已保存的 Snapshot List。
   - 使用 `<Button type="primary">` 觸發雙快照對決比對，渲染下方的 Delta 視圖。
2. **對決指標卡 (Delta Indicators)**：
   - 使用 AntD `<Card>` 搭配 `<Statistic>`，以**綠色（上升/正向）**或**紅色（下降/負向）**的顏色標記變更率，並附帶箭頭圖標（如 `<ArrowUpOutlined>`）。
3. **客戶/SKU Delta 對比表 (Delta Table)**：
   - 使用 AntD `<Table>`，欄位包含 `Customer/SKU`、`Base Value`、`Target Value`、`Delta`、`Percentage`，支持點擊列頭按 Delta 絕對值排序，一目了然定位核心波動源。
4. **離線包導出按鈕 (Export Button)**：
   - 在 Change Review 標籤頁底部放置「**導出 Change Impact Pack**」按鈕，觸發離線 JSON 下載（統一注入 UTF-8 BOM `\ufeff` 避開亂碼，並使用 `revokeDownloadUrl` 生命週期管理）。

---

## 3. AI / DeepSeek V4-Flash 使用邊界與 Prompt 護欄

用戶在獲取前後快照的對決數據後，會使用 **DeepSeek V4-Flash** 進行離線解讀。為了防止 AI 在面對版本差異時胡言亂語，我們為 CC 設計了以下 **Change Impact Pack 格式與離線 Prompt 護欄**：

### 📁 Change Impact Pack 格式建議 (Sanitized JSON)：
下載的 Change Impact 數據包不包含任何 Firebase 私有密鑰，僅包含脫敏後的雙版本 Delta 數據：

```json
{
  "compareVersion": "1.0",
  "baseSnapshot": { "id": "snap_A", "name": "V1.0 Base" },
  "targetSnapshot": { "id": "snap_B", "name": "V1.1 TSMC Adjust" },
  "deltas": {
    "revenueDeltaUsd": 2500000,
    "bpAttainmentDeltaPp": 8.2,
    "shortageMonthDelta": -1,
    "worstBottleneckShift": { "from": "2026-03", "to": "2026-08" },
    "skuDeltas": [
      { "skuCode": "TSMC-001", "revenueDeltaUsd": 2000000, "utilizationDelta": 0.05 }
    ]
  },
  "guardrails": [
    "DO NOT interpret revenue proportional share as causal responsibility for BP miss.",
    "DO NOT create or assume any data outside the provided comparison JSON.",
    "ALWAYS classify your claims under F-A-I-R."
  ]
}
```

### 🛡️ 離線 Prompt 護欄約束模版 (Prompt Guardrails)：
```text
你現在是 ABF 載板預測版本控制與變更影響審查專家。
以下是兩個版本快照之間的對比數據 JSON，請嚴格遵守以下限制進行分析：

1. 嚴禁篡改任何產能計算物理公式，禁止發明非 JSON 提供的數據差異。
2. 必須嚴格隔離「比例歸因」與「直接因果」！如果 TSMC 的營收 Delta 佔了總變更的 80%，你只能指出「[Attribution] TSMC 貢獻了營收變動的 80%」，絕對不可表述為「[Causality] TSMC 造成了全部業績波動的因果責任」。
3. 必須強制遵守 F-A-I-R 分類！你的回答中，每一段結論都必須在末尾清晰標註：
   - [Fact / 事實]、[Assumption / 假設]、[Inference / 推論]、[Recommendation / 建議]。
4. 針對 DeepSeek V4-Flash 的解讀，你的報告必須嚴格包含以下四大章節：
   - 第一章：雙版本大盤 Delta 核心事實 (Facts)
   - 第二章：產能瓶頸與 max utilization 位移分析 (Bottleneck Shifts)
   - 第三章：客戶與 SKU 風險歸因診斷 (Driver Attribution)
   - 第四章：基於 F-A-I-R 的下一階段行動建議 (Action Recommendations)
```

---

## 4. 8 大核心風險與反思緩解策略 (Risk & Mitigations)

我們主動對 Phase 6 Forecast Versioning 進行對抗性挑戰，發掘了 8 大核心技術與業務風險，並給出了具體的緩解（Mitigation）方案：

### 🚨 8 大風險與緩解矩陣：

| 序號 | 核心風險 (Risk Area) | 緩和與解決策略 (Mitigation Strategy) |
| :--- | :--- | :--- |
| **1** | **快照體積過大**：频繁存儲導致 Firebase 數據爆滿。 | **混合快照策略 (Hybrid)**：只快照輕量 inputs 數據與精選 derived 摘要，物理隔離龐大庫存矩陣，文檔體積控制在 <100KB。 |
| **2** | **Firestore 成本劇增**：頻繁讀寫與計費超標。 | **前端快照防抖與批次寫入**：限制單個項目在 24 小時內最多建立 50 個快照，且僅在用戶點擊「保存快照」時手動寫入，禁止背景自動實時存盤。 |
| **3** | **多人協作權限衝突**：Editor 誤刪 Owner 存檔。 | **嚴格的 Creator-Only 權限控制**：在安全規則中硬性卡死——Editor 僅能唯讀比較、或刪除「自己建立」的快照，全局快照管理權歸 Owner 所有。 |
| **4** | **應用版本漂移 (Raw Drift)**：當公式升級，歷史 raw 重算結果失真。 | **Derived Highlights 鎖定**：建立快照時直接靜態硬編碼寫入當時核心 derived metrics。展示歷史時直接讀取 metadata，禁止在背景用新版公式重新計算歷史，以此保障不可篡改性。 |
| **5** | **交叉歸因混淆**：價格與數量同時波動時，比例歸因算法失真。 | **差值歸因隔離**：在 Change Impact 指標中，將 Price-Driven 和 Quantity-Driven 的計算路徑完全分離展示，避免合併計算，並標明此為 Inference 數理推論。 |
| **6** | **使用者版本命名混亂**：用戶建立大量 test_1, test_2 快照破壞協作。 | **強制元數據驗證**：建立快照時，UI 表單強制校驗快照名稱不得為空，且 description 必須包含調整理由或變更人標籤。 |
| **7** | **比較結果造成高管錯誤決策**：因小數點或幣別誤認導致判斷失準。 | **Delta 指標標籤化**：在指標卡上強製標註單位 (如 `M TWD` 或 `USD`)，在匯率換算變動處使用高亮 Badge 提示，阻絕算術盲區。 |
| **8** | **AI 過度解讀版本差異**：DeepSeek 離線分析產生幻覺，誇大微幅變動。 | **Change Impact Rubric 限制**：在 AI 測評中內建專屬評分 Rubric，嚴格打壓過度發散的 AI 行動建議，當 Delta 值低於 1% 時強制 AI 使用保守的 Fact-Only 語氣。 |
