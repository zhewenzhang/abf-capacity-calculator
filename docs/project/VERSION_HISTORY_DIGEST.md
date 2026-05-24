# ABF Capacity Calculator 大版本演進精要

本文件記錄了 **ABF Capacity Calculator** 項目從最初的產能重算小工具，一步步演進為如今多用戶協作、具備決策級深度分析與 AI 離線安全護欄的企業級產能規劃沙盤的歷史里程碑。

---

## 📅 版本演進軌跡與產品里程碑

### 1. `v1.14.x` - 基礎算術與數據品質整理
* **主要目標**：打通產品、預測與產能的基礎算術路徑，提供第一代 Dashboard 及初步的 Data Quality 數據品質 Caveats 機制。
* **核心交付**：
  - `calculationEngine.ts` 物理重算邏輯確立。
  - Dashboard 基礎圖表與月度數據表。
  - 第一代 Data Quality Issues 機制（提示 missing capacity 等）。
* **能力提升**：實現了從「手動 Excel 核算」向「Web 化決定性物理重算」的零突破。

### 2. `v1.15.0` - 多幣別轉換防火牆 (Multi-Currency)
* **主要目標**：支持跨國業務中的多幣別報價，防止規劃人員手動換算匯率出錯。
* **核心交付**：
  - `currency.ts` 模組，支持 SKU 單價為 USD、TWD、CNY。
   - 營收大盤自動折算歸一為 USD，而 BP Target 獨立保持百萬 TWD。
   - 項目全局 parameters 新增匯率配置欄位。
* **能力提升**：成功在代碼層建立了貨幣與 BP 計算的安全物理防火牆，業務無感折算。

### 3. `v1.17.0` - 比例風險歸因與 SKU Derived 訊號 (Risk Attribution)
* **主要目標**：細化風險拆解，區分「誰在平時總量最大」與「誰在短缺月份造成的產能壓力最大」。
* **核心交付**：
  - **Risk Driver Attribution**：僅在 shortage 發生月份進行 demand 聚合。
  - **SKU Health Signals**：內建了 `cashCow` (金牛型)、`strategicGrowth` (戰略成長)、`capacityDrainer` (產能耗用) 等 5 大 derived 標籤，閾值硬編碼為 `15%` 與 `5%`。
* **能力提升**：規劃人員首次獲得了「短缺月份精準比例歸因」的能力，業務分析深度大幅增加。

### 4. `v1.18.x` - 多人共享協作作用域 (Shared Workspace)
* **主要目標**：支持多個 Google 帳戶在同一個 ABF 數據集上進行協同工作，建立權限防火牆。
* **核心交付**：
  - 接入 Firebase Auth 登入管理。
  - 設計 `users/{uid}/...` (個人) 與 `workspaces/{wid}/...` (共享工作區) 嵌套數據路徑。
  - 設計 **Owner、Editor、Viewer** 角色，並在 Firestore Rules 實施精準阻絕。
* **能力提升**：專案從「單機版工具」升級為「多人共享協作平台」，具備了企業級安全權限控制。

### 5. `v1.19.0` - 繁中與決策面板本地化 (Localization)
* **主要目標**：提供流暢的雙語切換（英文與繁體中文），實現 Risk Brief 面板的完全本地化。
* **核心交付**：
  - 引入 `i18n` 機制（EN 与 zh-TW 對齊）。
  - 單元測試新增 `i18nKeys.test.ts` 與 `i18nOutputs.test.ts`，強制 key 100% 鏡像對齊，拒絕 `{placeholder}` 殘留。
* **能力提升**：大幅優化了亞洲載板製造廠規劃人員的本地化操作體驗，確保 i18n 配置零瑕疵。

### 6. `v1.20.0` & `v1.20.1` - 決策級深度分析 (Decision Depth)
* **主要目標**：在不接入任何 AI 的前提下，打通決策級決定性（Deterministic）分析的深水區。
* **核心交付**：
  - **Weighted Pressure Index**：引入 Core×1.3 + BU×1.0 風險加權排序（物理公式完全隔離，僅用於排序）。
  - **BP Gap Attribution**：營收份額比例歸因算法，明確標註「比例歸因，非嚴格因果」。
  - **Deterministic Scenarios**：決定性離線 ±10% 價格敏感度與 +10% 產能改善情境模擬。
  - **Key Findings**：跨模組 deterministic top-5 優先級問題隊列。
  - **Analysis Contract v1.1**：將以上所有分析聚合為單一 Payload 導出。
* **能力提升**：達成了「決策級（Decision-grade）分析」的核心里程碑，系統具備了強大的 deterministic 沙盤診斷力。

### 7. `v1.21.0` & `v1.21.1` - AI 離線導出與安全護欄 (AI Brief Export Hardening)
* **主要目標**：安全導出數據包，引入嚴厲的大模型離線安全護欄，修復 discrete P0 漏洞。
* **核心交付**：
  - 一鍵拷貝 `Combined AI Brief Pack` (Prompt + Sanitized JSON)。
  - **BOM 離線亂碼修復 (P0-3)**：JSON 下載前置注入 `\ufeff` (BOM)，並調用 `revokeDownloadUrl` 釋放 URL 生命週期資源。
  - **Key Findings 參數保留 (P0-2)**：採用方案 A，完整保留 Message Descriptor 結構，防範 params (如 `{ count: 2 }`) 遺失。
  - ** Prompt 安全護欄**：寫入 F-A-I-R 分類標籤、Weighted 警告及 blocked 數據降級（blocked 時禁止 AI 給決策，僅能列出缺口與修復步驟）護欄。
  - 交付了完整 AI Eval Kit (Scorecards, Rubric, 測試案例)。
* **能力提升**：在**零 API 隱私風險**的前提下，完美駕馭外部 AI（如 DeepSeek）進行離線決策輔助，成功發布最安全、品質最硬的 `v1.21.1` 硬化版。

### 8. `Phase 6 prep` (當前階段) - 預測版本控制與對決設計
* **主要目標**：為 `v1.22.0 MVP` 的預測版本控制與變更對決提供架構設計、12 大 Delta 指標、UI草案、離線 DeepSeek 護欄及第一代 Change Impact Rubric 驗收包。
* **核心交付**：
  - `PHASE6_FORECAST_VERSIONING_REVIEW.md`
  - `PHASE6_IMPLEMENTATION_RECOMMENDATION.md`
  - `PHASE6_CHANGE_IMPACT_RUBRIC.md`
  - `PHASE6_MVP_ACCEPTANCE_CHECKLIST.md` 等 7 個文檔。
* **能力提升**：為下一階段「雙版本快照對決」的代碼開發提供了極佳的架構鋪路與質量驗收保障。
