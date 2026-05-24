# 新 AI Agent 與開發同事接手專案必讀白皮書

歡迎你接手 **ABF Capacity Calculator** 項目！為了確保你能在 20 分鐘內完全融入專案、繼承既往的高標準質量工程，並**絕對不偏離專案的長期技術軌道**，請你必須一字不漏地完整閱讀並嚴格遵守本白皮書。

---

## 🚨 九大零信任紅線防火牆 (Handoff Redlines)
作為新加入的 AI Agent 或開發同事，以下 9 條紅線在任何情況下都**絕對不可逾越**。違反任何一條都將被視為對項目架構的重大破壞：

1. **固定後端防火牆 (No Backend Changes)**：
   - 專案的唯一固定後端是 **Firebase (Auth & Firestore & Hosting)**。
   - **嚴禁**嘗試引入 Supabase、Node.js Express 後端、或任何額外的 SQL/NoSQL 數據源。
2. **零實體 AI API 對接 (No AI API Integration)**：
   - 目前的 AI 分析定位是 **Offline-First (離線貼上數據包)**。
   - **嚴禁**在未獲得產品負責人明確書面授權前，擅自在前端調用任何外部 LLM（如 OpenAI, Gemini）的實體 API。
3. **物理核心公式禁區 (No Formula Modification)**：
   - 位於 `frontend/src/core/calculationEngine.ts` 中的產能、短缺、利用率等物理核心計算公式是決定性的，代表了載板廠的真實算術物理。
   - **嚴禁**改動這些核心公式，亦禁止大模型「發明」新的非物理折算公式。
4. **拒絕 Refine 迭代 (No Refine Restoring)**：
   - 歷史版本中的 `Refine` 算法因極易導致無窮遞歸計算崩潰，已被**物理移除**。
   - **嚴禁**嘗試恢復 Refine，保持系統的 deterministic 單向計算。
5. **多人協作權限與安全 rules 不可破壞 (Workspace Security)**：
   - `workspaces/{wid}/...` 下的多人共享 Workspace 數據結構與權限判定是系統的基石。
   - **嚴禁**破壞 Owner (管理所有權)、Editor (可寫)、Viewer (唯讀比對) 的角色防火牆。
6. **貨幣與 BP 計算規則不可混淆 (No Currency Mix-up)**：
   - 預測單價/營收一律自動歸一折算為 **USD**，而 BP 業績目標一律保持為 **百萬 TWD**。
   - 任何比對必須使用參數定義的匯率換算，**絕對禁止**直接將 USD 數字與 TWD 數字直接做算術運算。
7. **修改必須跑通質量三部曲 (Quality Parity)**：
   - 任何前端產品代碼的修改，在提交前必須在 `frontend` 目錄下跑通以下三部曲：
     - `npm run test` (單元測試必須 100% 綠過)
     - `npm run lint -- --quiet` (Linter 必須零 Error 零 Warning)
     - `npm run build` (Vite 項目生產編譯必須順利打包通過)
8. **標準部署流程 (Hosting Only)**：
   - 項目正式發布一律部署在 Firebase Hosting。部署前必須經過嚴格的白名單狀態自查，禁止將未測試的臨時代碼推向生產環境。
9. **語言規範：所有思考、任務與報告一律使用中文**：
   - 所有思考過程、任務清單（task.md）、代碼註釋、提交 commit 日誌以及最終向用戶彙報的報告，**必須全程使用中文**（優先使用簡體中文回复用戶）。

---

## ⚡ 9 大專案核心技術風險與緩解策略 (Risk & Mitigations)

我們梳理了專案當下面臨的 9 大深水區技術與業務風險，並為你準備了明確的緩和與解決方案：

### 1. Snapshot size & Firestore 1MB limit (快照體積限制)
- **風險**：Firestore 單個文檔的最大體積限制為 **1MB**。如果快照頻繁備份完整的 SKU detail 和每月的龐大數據矩陣，極易撐爆 Firestore 文檔，導致寫入失敗。
- **Mitigation**：採用 **Hybrid 混合存盤策略**（詳見 docs/phase6/）。只快照輕量化的原始 inputs 數組，將 derived outputs 提煉為 <5KB 的 Highlights KPI 摘要 metadata 快照，物理隔離並拋棄龐大的月度庫存大表。

### 2. Workspace Permissions Leak (權限洩漏與越界)
- **風險**：多人共享工作區中，Viewer 角色可能通過前端 JS 調試或 Postman 直接繞過 UI 寫入/刪除快照，造成越界數據污染。
- **Mitigation**：嚴格在 Firestore Rules 中卡死權限防火牆（Viewer allow write: if false），並在 MVP 驗收中加入專門的 role security 單元測試（拒絕 Viewer 的物理/模擬寫入）。

### 3. AI Hallucination & Trust Boundary (AI 幻覺與信任邊界)
- **風險**：用戶將數據包貼給外部模型時，AI 容易幻想不存在的數據趨勢，或者給出不切實際的自動化決策建議。
- **Mitigation**：在 `buildChineseAiBriefPrompt` 與 `DEEPSEEK_CHANGE_IMPACT_PROMPT` 中寫入極度嚴苛的「6 大禁止事項」，包括 blocked 品質阻絕、F-A-I-R 結論後綴分類標籤，並在測評中內建 Veto（一票否決）機制。

### 4. Currency/BP unit mix-up (幣別混淆)
- **風險**：外部大模型或新開發人員在計算時，可能將營收的 USD 數字與 TWD BP Target 直接對比，造成 32 倍的計算偏差。
- **Mitigation**：代碼層與 Prompt 層硬性實施貨幣防禦火牆。在 AI Brief Sanitized JSON 中明確導出 `currencyHandling` 指示，並在打分卡中將「幣別直接比對」列為 P0 Veto 否決紅線。

### 5. Formula Drift (代碼/公式漂移)
- **風險**：隨著應用版本（App version）升級，物理公式微調，重新跑舊版 inputs 快照會算出與歷史不一致的數據。
- **Mitigation**：快照建立時，直接將當時算出的 KPI Highlights 靜態硬編碼寫入快照，讀取歷史快照時**直接加載靜態 Highlights，禁止在後台用新版公式重新計算歷史**。

### 6. Docs/Code Drift (文檔與代碼脫節)
- **風險**：隨手改代碼，卻忘記同步更新 specs，導致文檔與實體代碼脫節。
- **Mitigation**：實施嚴格的 `ANALYSIS_CONTRACT.md` 數據契約約束。任何 interface 的變更，必須同步在數據契約中進行版本號（如 v1.1）與 schema 規格的書面更新，保持文檔與代碼的 100% 同步。

### 7. Spreadsheet Input UX (電子表格輸入體驗)
- **風險**：`Products Spreadsheet Lab` 因包含大量 AntD 與 handsontree-like 編輯，在處理上百行 SKU 時，前端可能發生微幅交互卡頓，用戶體驗打折。
- **Mitigation**：優化 React 渲染週期，對 spreadsheet 行組件實施 `React.memo` 淺層比對，或在未來 Phase 9 中引入標準化的批量 Excel 導入與導出。

### 8. Overengineering (過度工程化)
- **風險**：盲目引入複雜的三方狀態管理庫（如 Redux）、或大型圖表庫，撐大前端 bundle size。
- **Mitigation**：嚴格恪守 KISS（Keep It Simple, Stupid）原則，優先選擇當前階段最簡單、最可維護的 Vanilla React + AntD 組件方案，保持 Bundle 的輕量與秒開。

### 9. External Model Output Trust (外部模型輸出信任危機)
- **風險**：用戶盲目採信外部大模型給出的「天花亂墜」的擴產投資建議，導致決策失誤。
- **Mitigation**：在所有 AI Brief Export 模塊中，強制要求大模型輸出 **「人類雙重確認 Checklist」**，聲明 AI 分析僅供決策參考，最終實體擴產與財務採購必須由人類專家在線下進行雙重核對！
