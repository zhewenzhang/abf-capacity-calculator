# v1.38.0 AI Data Copilot MVP 範圍與邊界審查 (Scope Review)

> **版本**: v1.38.0 MVP
> **狀態**: Approved spec
> **前導決策**: 基於 KISS 原則與無伺服器架構，本版本定位為「用戶端輔助型決策 Copilot」。其主要任務是幫助規劃師以無副作用的形式進行數據質量診斷和 What-If 分析提案，而非接管生產決策。

---

## 一、 MVP 可以實作的範圍 (In-Scope for v1.38.0)

為了在 4 小時內高效完成實作並保障工程質量，v1.38.0 AI Copilot 的實作必須且僅能包含以下模組：

### 1. 🎛️ 用戶端 Copilot 抽屜/面板 (Copilot Panel / Drawer)
* 位於 Dashboard 或 Analysis 頁面的可收合側邊抽屜（Drawer）或懸浮 Card。
* 提供純前端的對話交互 UI。
* 使用 Ant Design 5.x 內建模組，保持系統一致的 premium 視覺美學。

### 2. ⚡ 快速提問按鈕組 (Quick Question Buttons)
* 提供預設的常用高頻提問快捷按鈕，例如：
  * *「當前有哪些高優先度的資料品質缺陷？」*
  * *「我的營收差距 (BP Gap) 主要是由哪些客戶驅動的？」*
  * *「如果我想消除 6 月的產能短缺，有哪些優化建議？」*

### 3. 🔍 本地確定性診斷引擎 (Deterministic Local Answer Engine)
* AI Copilot 底層**必須優先依賴**本地確定性的 JS 診斷工具，例如：
  * 直接分析 `buildDataQualitySummary()` 回傳的 issues 列表。
  * 調用 `computeChangeImpact()` 分析產能和價格的歸因數據。
* **核心原則**：在沒有配置 AI API Key 的情況下，Copilot 依然能依賴本地診斷引擎給予精確的文字分析和修復指引。

### 4. 🗃️ 確定性上下文建構器 (AI Context Builder)
* 負責在內存中打包當前工作區數據作為 Prompt 上下文（Context Payload）。
* 打包內容包含：SKU 宏觀統計、月度預測匯總、當前產能短缺月份、以及資料品質缺陷概要。
* **強硬要求**：在打包前，必須在內存中將數據完全 Sanitized（清洗），濾除任何 `uid`、`email` 等用戶隱私。

### 5. 📋 情境 Prompt 與數據包導出 (Prompt & Export Pack)
* 提供「複製分析 Prompt (Copy Prompt)」或「導出 Prompt 數據包」功能。
* 當用戶沒有配置或不希望直連 AI 時，允許用戶一鍵複製已經在本地 Sanitized 的全量數據 Context，並粘貼到外部的獨立 AI 工具中進行無洩露分析。

### 6. 📝 本地修復草稿生成 (Suggested Fix Draft)
* 當 AI Copilot 給出修復建議時，以「修復草稿 (Suggested Fix Draft)」的形式在前端渲染（例如：展示一個修改 SKU 單價的 Table 草稿）。
* 用戶可以在前端直觀看到修改 Before/After 的預估變化。

### 7. 👤 真人二次確認修改模型 (No-Write Human Confirmation Model)
* AI Copilot 絕不直接調用 save 服務。
* 用戶點擊「套用修復」時，系統彈出二次確認 Modal，將草稿數據轉交給現有的 `save` 流程手動寫入，實現 Human-in-the-loop 的安全決策。

---

## 二、 MVP 絕對禁止實作的範圍 (Out of Scope / Strictly Forbidden)

以下功能在 v1.38.0 中**絕對禁止實作**。CC/MiMo 應當將其從本版本的開發清單中徹底剔除，否則直接判定為 **Scope Creep** 並在驗收時予以攔截：

| 禁用項目 (Strictly Forbidden) | 排除理由 (Rationale) | 預計版本 |
|---|---|---|
| **❌ 默認 AI API 自動直連** | 避免在前端默認發起無 Key 請求或需要後端代理，增加密鑰洩露與網絡開銷風險。 | v1.39+ |
| **❌ 伺服器端密鑰儲存 (Server-side Key Storage)** | 本項目為純前端靜態托管 + 內存沙盒架構，嚴禁引入伺服器數據庫儲存密鑰，避免安全防線崩塌。 | 永不實作 |
| **❌ Cloud Functions 後端轉發** | 增加多餘的 API 網關與轉發轉接成本，不符合 KISS 輕量級原則。 | 無限期 |
| **❌ AI 自動保存 (Auto-Save)** | 違反「不污染正式工作區」底線，AI 的任何生成結果必須有真人的顯式點擊確認。 | 永不實作 |
| **❌ AI 自動修改數據庫資料** | 絕不允許 AI 擁有繞過 UI 直接調用 `services/*.ts` 寫入 API 的能力。 | 永不實作 |
| **❌ AI 自動重構數理公式** | 產能算法涉及嚴密的工業工程邏輯，不容許 AI 通過隨機性文本修改既有公式。 | 永不實作 |
| **❌ 實時自動優化引擎** | 自動尋找最大產能利用率的最優解具有高數理風險，目前應依賴確定性 Delta 計算。 | 無限期 |
| **❌ 長期會話記憶 (Long-term Chat Memory)** | 增加瀏覽器 IndexedDB 或 Firestore 額外狀態維護負擔。MVP 情境下「即問即答，刷新即逝」完全滿足決策需要。 | v1.39+ |
| **❌ 工作區全局 AI 審計日誌** | 需要在 Firestore 新建 Collection 並修改 Security Rules，增加工程負擔。 | v1.39+ |
| **❌ 自主商業決策 (Autonomous Decisions)** | 嚴防 AI 獨立發出採購、排產或調價指令，AI 僅定位為輔助決策。 | 永不實作 |
