# Phase 6: Forecast Versioning & Change Impact Review (開發前準備)

**狀態**：準備階段（Pre-Implementation）
**建立日期**：2026-05-24
**目的**：定義 Phase 6 產品方向與待審查問題，等待 AGY 產品與資料模型風險審查後再實作。

---

## 1. Phase 6 產品目標

### 1.1 Forecast Versioning

讓系統能保存資料快照（Snapshot），記錄特定時間點的完整 dataset 狀態。

**用途**：
- 保存重大決策前的基準資料
- 追蹤資料變更歷史
- 支援「如果...會怎樣」的比較分析

### 1.2 Snapshot Compare

比較兩個版本的資料，識別具體變更項目。

**比較維度**：
- Forecast 數量變化（by SKU / customer / month）
- Price 變化（unit price 調整）
- Capacity 變化（Core / BU 產能調整）
- BP Target 變化

### 1.3 Change Impact Review

回答「改動後，哪些年份、月份、SKU、客戶、產能瓶頸與 BP 達成風險發生了變化」。

**預期輸出**：
- 哪些月份從「無短缺」變成「有短缺」
- 哪些客戶的 Core 需求佔比上升/下降
- 哪些 SKU 從「策略成長型」變成「產能耗用型」
- BP 達成率變化多少 pp
- Top changed customers / SKUs / months

### 1.4 Future AI / DeepSeek Analysis Input

Change Impact Pack 可作為後續 AI 分析的輸入：
- 「這次改動對風險的影響是什麼？」
- 「哪些變化需要注意？」

**重要**：本階段**不接 AI API**，只準備資料格式。

---

## 2. 本階段不做什麼

| 限制 | 說明 |
|------|------|
| 不接 AI API | 不呼叫外部 AI 服務，不自動產生分析報告 |
| 不做自動決策 | 只呈現資料變化，不給出「應該做什麼」的建議 |
| 不改核心公式 | capacity / BP / utilization / revenue 計算公式不變 |
| 不做大型 UI redesign | 以現有 Results / Dashboard 頁面擴充為主 |
| 不改多人 Workspace 架構 | Snapshot 功能沿用現有 workspace 權限模型 |

---

## 3. 建議 MVP 範圍

### 3.1 核心功能

| 功能 | 說明 |
|------|------|
| 保存 snapshot | 將目前 dataset（products, forecasts, capacity, BP）序列化並存檔 |
| Snapshot list | 列出所有已保存的 snapshot，顯示名稱、時間、建立者 |
| Compare two snapshots | 選擇兩個 snapshot，計算差異 |
| Compare forecast revenue | 比較兩版本的營收預測差異（by year / quarter / month / customer / SKU） |
| Compare BP attainment | 比較兩版本的 BP 達成率變化 |
| Compare capacity utilization | 比較 Core / BU 稼動率變化 |
| Compare shortage months | 比較短缺月份數與具體月份變化 |
| Top changed items | 列出變化最大的 customers / SKUs / months |
| Export Change Impact Pack | 匯出變更影響包（JSON），供未來 AI 分析使用 |

### 3.2 建議命名

- Snapshot name：使用者自訂，例如「2026 Q2 Budget Baseline」
- Snapshot description：選填說明
- Snapshot timestamp：自動記錄建立時間

### 3.3 建議儲存方式（待審查）

| 方案 | 優點 | 缺點 |
|------|------|------|
| 存 Firestore | 即時同步、支援 workspace 共享 | 可能增加讀寫成本、需考慮資料大小限制 |
| 存本地 localStorage | 簡單快速、無後端成本 | 無法跨裝置、無法多人共享 |
| 存 Firebase Storage | 適合大型 JSON、成本較低 | 需額外處理權限與存取邏輯 |

---

## 4. 待 AGY 審查的問題

### 4.1 資料範圍

1. **Snapshot 應包含哪些資料？**
   - Products (SKUs)
   - Forecasts
   - Capacity config
   - BP targets
   - Parameters (exchange rate, working days)
   - 是否包含計算結果（yearlyHealth, riskAttribution, etc.）？

2. **Snapshot 是否應存 Firestore？**
   - 若存 Firestore，需考慮 document size limit (1MB) 與讀寫成本
   - 若不存 Firestore，需選擇替代儲存方案

### 4.2 權限與共享

3. **Workspace 共享資料下 snapshot owner / editor 權限如何處理？**
   - 只有 owner 可以建立 snapshot？
   - editor 可以建立但不能刪除他人的 snapshot？
   - viewer 可以查看但不能建立？

4. **Snapshot 是否可共享？**
   - 一人建立的 snapshot 是否對其他 workspace 成員可見？

### 4.3 資料大小與效能

5. **如何避免 snapshot 過大？**
   - 是否需限制 snapshot 數量？
   - 是否需自動清理舊 snapshot？
   - 是否需壓縮 JSON？

### 4.4 變更偵測邏輯

6. **如何定義 price change vs forecast quantity change？**
   - 兩者分開呈現？
   - 兩者混合呈現但標記類型？

7. **如何處理新增/刪除的 SKU？**
   - 新增 SKU 視為「新增」還是「變化」？
   - 刪除 SKU 如何呈現？

### 4.5 分析與呈現

8. **如何避免把 proportional attribution 說成 causality？**
   - Change Impact Review 應使用「佔比變化」而非「造成變化」的語言
   - 需要類似 AI Brief Export 的 guardrails

9. **是否需要支援三版本比較？**
   - 例如：Baseline → Budget → Actual
   - 或只支援兩兩比較？

---

## 5. CC 暫不實作的原因

1. **需要 AGY 先做產品與資料模型風險審查**
   - Snapshot 儲存方式影響成本與效能
   - Workspace 權限處理需確認安全邊界
   - Change Impact 的分析語言需避免因果誤解

2. **需要確認 Phase 6 的優先順序**
   - 是否有其他更緊急的功能需求？
   - Phase 6 是否需要與其他功能協調？

3. **需要設計 API contract**
   - Snapshot 資料結構
   - Compare API 輸入輸出格式
   - Change Impact Pack 規格

---

## 6. 下一步

1. **AGY 審查本文件**
   - 確認 MVP 範圍
   - 回答待審查問題
   - 確認 Phase 6 優先順序

2. **AGY 提供 Phase 6 功能設計合約**
   - 類似 `Analysis Contract v1.1` 的正式規格
   - 包含資料結構、API、UI wireframe

3. **CC 收到合約後開始實作**
   - 預計實作時間：待確認
   - 預計版本：v1.22.0 或依 AGY 指定

---

## 7. 相關文件

- [ANALYSIS_CONTRACT.md](../ANALYSIS_CONTRACT.md) - Analysis Contract 規格
- [docs/ai-eval/README.md](../ai-eval/README.md) - AI Eval Kit
- [docs/AI_BRIEF_EXPORT.md](../AI_BRIEF_EXPORT.md) - AI Brief Export 文檔
