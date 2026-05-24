# Phase 6 Forecast Versioning & Change Impact MVP 核心測試案例庫

本文件定義了用於驗證 `v1.22.0 MVP` 版本快照對決精度與防禦性的 **8 個核心測試案例（Test Cases）**。每個案例均包含具體的測試數據特徵、期待的 Delta 計算響應及防錯驗收重點。

---

## 1. 測試案例清冊 (Test Cases Scope)

### 📊 8 大基準測試案例矩陣：

```text
Case 1: Baseline vs Minor Forecast Increase ------> 驗證基礎 Fact Delta 計算
Case 2: Forecast Creates New Shortage Month ------> 驗證產能短缺月份觸發與 Bottleneck 位移
Case 3: Price Increase Improves BP Target -------> 驗證 attainment 提升與產能公式隔離
Case 4: Capacity Increase Reduces Util -----------> 驗證設備擴展下的稼動率下降與營收隔離
Case 5: BP Target Increase Worsens Attainment -----> 驗證 BP Attainment 與 BP Gap Delta 精準度
Case 6: Mixed Currency SKU Price Change ----------> 驗證多幣別折算匯率防火牆
Case 7: Dirty Snapshot / Missing SKU Data --------> 驗證 blocked 信心等級下的語氣降級與禁產決策
Case 8: Workspace Viewer Action Block ------------> 驗證 Viewer 角色寫入攔截權限
```

---

## 2. 案例詳細規格 (Case Specifications)

### 🚨 Case 1: Healthy baseline vs minor forecast increase (基準 vs 微幅預測追加)
* **測試目的**：驗證系統在輸入微幅 Forecast 變更時，Fact Delta 的算術基礎精度。
* **Base 快照特徵**：2026年預測總量 50k pcs，營收 USD 1,000,000，無產能短缺月份。
* **Target 快照特徵**：僅在 2026-03 追加 TSMC-001 預測 1k pcs（單價 100 USD），其餘 inputs 100% 保持一致。
* **期待 Delta**：
  - `revenueDeltaUsd` $= +100,000$ USD (營收增加 10 萬 USD)。
  - `shortageMonthDelta` $= 0$ (未觸發任何新短缺)。
  - `attainmentDelta` $\ge 0$ (BP 達成率有微幅上升或持平)。
* **不應出現的錯誤結論**：AI 或系統斷言「產能發生短缺」或「營收減少」。
* **驗收重點**：確保指標卡片精確渲染 `+$100,000 USD`，且為綠色正向箭頭。

### 🚨 Case 2: Forecast increase creates new shortage month (預測追加觸發新短缺月份)
* **測試目的**：驗證產能短缺月份的變更響應（shortage month delta）及 bottleneck 瓶頸分析。
* **Base 快照特徵**：2026-03 稼動率為 95%（Core），無短缺月份（shortageMonthCount = 0）。
* **Target 快照特徵**：在 2026-03 追加 TSMC-001 預測 10k pcs，遠遠超過 Core 額定 panel 容量。
* **期待 Delta**：
  - `shortageMonthDelta` $= +1$ (新增 1 個短缺月份)。
  - `Core utilization delta` $\ge +5\%$ (Core 最高稼動率爆表超載)。
  - `worstBottleneckMonth` 從原本的 `null` 位移並鎖定為 `"2026-03"`。
* **不應出現的錯誤結論**：AI 忽視短缺月的出現，依然判定產能健康，或將 Core 1.3 權重錯誤乘回實體需求。
* **驗收重點**：核對 Shortage Delta 卡片渲染為 `+1 Month`（紅色負向），且瓶頸分析定位精確。

### 🚨 Case 3: Price increase improves BP but does not affect capacity (單價上漲提升 BP 但不影響產能)
* **測試目的**：驗證價格變動對 BP 達成率的獨立拉動，以及價格變動與產能公式的**物理隔離**。
* **Base 快照特徵**：2026 年預測總量 50k pcs，單價 100 USD，BP attainment 為 90%。
* **Target 快照特徵**：將 SKU 單價上漲為 110 USD（+10%），**預測數量與產能計劃 100% 不變**。
* **期待 Delta**：
  - `revenueDeltaUsd` $= +100,000$ USD。
  - `BP attainment delta` $= +9\%$ (达成率上升 9 pp)。
  - `Core/BU utilization delta` $= 0$ (稼動率 100% 保持不變，未發生任何產能變化)。
* **不應出現的錯誤結論**：AI 幻想「單價上漲導致工廠稼動率上升或產能短缺」。
* **驗收重點**：確信對決面板的稼動率 Delta 為 `0%`，隔離完備。

### 🚨 Case 4: Capacity increase reduces utilization but revenue unchanged (設備擴展使稼動率下降但營收不變)
* **測試目的**：驗證產能計劃（Capacity Plan）變更後的稼動率稀釋，以及產能變更對 Forecast 營收的隔離。
* **Base 快照特徵**：Core panel capacity 為 1,000 panels/day，Core max utilization 為 90%，預測營收 USD 1,000,000。
* **Target 快照特徵**：將 Core 產能擴充為 1,100 panels/day（+10%），**SKU 單價與預測數量 100% 不變**。
* **期待 Delta**：
  - `Core utilization delta` $\approx -8.18\%$ (稼動率因分母變大而稀釋降低)。
  - `revenueDeltaUsd` $= 0$ (營收毫無變動，因為 Forecast inputs 未改)。
* **不應出現的錯誤結論**：AI 誇大其詞，解讀為「產能增加拉動了 10% 的銷量和營收」。
* **驗收重點**：核對營收 Delta 是否精準鎖定在 `$0 USD`。

### 🚨 Case 5: BP target increase worsens attainment (BP 目標提高導致達成率惡化)
* **測試目的**：驗證 BP Attainment 與 BP Gap Delta 的精準度。
* **Base 快照特徵**：預測營收折算為 TWD 3,000 萬，BP Target 為 TWD 3,000 萬，attainment = 100%，gap = 0。
* **Target 快照特徵**：將 BP Target 調升為 TWD 3,500 萬（+16.67%），其餘 inputs 100% 不變。
* **期待 Delta**：
  - `BP attainment delta` $\approx -14.28\%$ (達成率下降)。
  - `BP gap delta` $= -5,000,000$ TWD (Gap 擴大 500 萬 TWD)。
  - `revenueDeltaUsd` $= 0$。
* **不應出現的錯誤結論**：直接比較 TWD 目標與 USD 營收數字本身，或算術符號（正負號）顛倒。
* **驗收重點**：核對 BP gap delta 卡片渲染為 `-5.0M TWD`（紅色負向）。

### 🚨 Case 6: Mixed currency SKU price change (多幣別 SKU 調價下的匯率折算精度)
* **測試目的**：驗證多幣別 SKU 調價時，匯率折算防火牆是否完美生效。
* **Base 快照特徵**：某 SKU 價格單位為 `CNY` 或者是 `TWD`。
* **Target 快照特徵**：調升該 SKU 價格 10%，大盤預測營收（USD 歸一化後）與 BP（TWD 比較）發生變更。
* **期待 Delta**：
  - `revenueDeltaUsd` 精確按定義的匯率換算成 USD 差值顯示。
  - `BP gap delta` 精確按匯率換算成百萬 TWD 差值顯示。
* **不應出現的錯誤結論**：AI 發生貨幣直接比對錯誤，或未用定義匯率直接進行算術拼湊。
* **驗收重點**：數理折算精度與 `currency.test.ts` 的標準完全吻合。

### 🚨 Case 7: Dirty snapshot / missing SKU data (數據缺失 blocked 狀態下的系統強健度)
* **測試目的**：驗證數據缺失 blocked 狀態下的系統容錯度與 AI 測評 Rubric 的防禦性。
* **Base 快照特徵**：數據乾淨，`quality.confidence` 为 `"medium"`。
* **Target 快照特徵**：將部分 SKU 尺寸設為空或負值，觸發計算錯誤或 `quality.confidence` 降為 `"blocked"`。
* **期待 Delta**：
  - 系統在前台應正常加載，對決面板頂端顯示醒目的 **「⚠️ 數據品質 Blocked 警告」**。
  - 離線導出 Change Impact Pack 的 JSON 中，`quality.confidence` 為 `"blocked"`。
* **不應出現的錯誤結論**：系統在前台崩潰（White Screen），或 AI 依然給出激進決策建議。
* **驗收重點**：前端不崩潰，AI Rubric 強制防守 blocked 紅線。

### 🚨 Case 8: Workspace viewer action block (工作區 Viewer 角色寫入攔截權限)
* **測試目的**：驗證多人協作環境下，唯讀角色（Viewer）的寫入攔截權限。
* **Base 快照特徵**：當前登入帳戶為當前 Workspace 的 **`viewer`**。
* **Target 快照特徵**：該帳戶嘗試點擊「儲存快照」或通過 Postman 模擬寫入快照路徑。
* **期待 Delta**：
  - 前端 UI 的「建立快照」按鈕處於禁用（Disabled）狀態，滑鼠懸浮提示「您無此權限」。
  - 模擬後台寫入時，Firebase 安全規則（Firestore Rules）應直接拒絕（FirebaseError: Permission Denied）。
* **不應出現的錯誤結論**：Viewer 成功建立了快照，或者能夠刪除別人的快照。
* **驗收重點**：權限防火牆完全阻絕非法寫入。
