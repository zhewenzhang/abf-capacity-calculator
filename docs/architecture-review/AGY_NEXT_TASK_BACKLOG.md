# AGY 下一輪平行任務積壓清冊 (AGY_NEXT_TASK_BACKLOG.md)

本文件建立了 **10 個高度具體、可與 CC 平行推進的 AGY 旁路評測與品質防禦任務積壓 (Backlog)**。這套 Backlog 詳述了每個任務的目標、輸入輸出、並行度、以及不做該任務會面臨的實際業務風險。

---

## 📅 10 個核心任務積壓清冊

### 1. 🚨 任務 1：DeepSeek V4-Flash Change Impact 首輪實測與打分
* **核心目標**：在 CC 實作完 v1.22.0 MVP 後，第一時間使用離線 Change Pack 對 DeepSeek 進行盲測並產出評估報告。
* **影響模組**：`Change Review Panel` / 離線 Change Pack 導出。
* **影響使用者**：Executive / Planner。
* **業務與開發風險**：不測不知道大模型的真實因果防禦性。如果大模型直接胡言亂語、混淆因果，會造成高管錯誤擴產決策。
* **處理建議**：**AGY 處理**。
* **是否現在做**：否（需等待 CC 完成 v1.22.0 MVP 交付後啟動）。
* **如果不做風險**：AI 決策輔助流流於形式，缺乏實質安全把關。
* **任務屬性**：只讀評測 / 填寫打分 scorecard。
* **輸入文件**：`PHASE6_DEEPSEEK_SCORECARD.md` / 導出的比較 JSON。
* **輸出文件**：`20260524_DeepSeek-V4-Flash_Change_Impact_Scorecard.md` (評分報告)。

### 2. 🚨 任務 2：多幣別 SKU 調價 (Case 6) 的數據邊界自動化單元測試編寫
* **核心目標**：為多幣別 SKU 調價時的匯率高精折算編寫 100% 綠過的單元測試用例。
* **影響模組**：`core/currency.ts` / `aiBriefExport.ts`。
* **影響使用者**：Sales / Executive。
* **業務與開發風險**：匯率折算精度發生 1/32 的偏差，導致大盤營收數據出錯，銷售報價偏離丟失大單。
* **處理建議**：**AGY / CC 協作** (AGY 寫測試，CC 改代碼)。
* **是否現在做**：是。
* **如果不做風險**：多幣別數據在快照對決時無法精確對齊。
* **任務屬性**：可平行與 CC 開發 / 生成標準單元測試。
* **輸入文件**：`aiBriefExport.test.ts` / `PHASE6_MVP_TEST_CASES.md`。
* **輸出文件**：`aiBriefExport.test.ts` 中的 Case 6 測試用例代碼。

### 3. 🚨 任務 3：對抗性 Firestore Rules 的本地模擬器安全阻絕單元測試
* **核心目標**：編寫對抗性安全測試，斷言 Viewer 模擬寫入與 Editor 刪除他人快照時被 Firestore Rules 強制 Permission Denied。
* **影響模組**：`firestore.rules` / `services/firestore.ts`。
* **影響使用者**：Owner / Viewer / Editor。
* **業務與開發風險**：權限防火牆被繞過，Viewer 惡意修改或擦除共享工作區快照，數據安全崩潰。
* **處理建議**：**AGY 處理**。
* **是否現在做**：是。
* **如果不做風險**：多用戶共享環境下隱私數據容易外洩或損毀。
* **任務屬性**：只讀安全審查 / 生成 Rules 單元測試。
* **輸入文件**：`docs/WORKSPACE_COLLABORATION.md` / `PHASE6_FORECAST_VERSIONING_REVIEW.md`。
* **輸出文件**：`firestoreRules.test.ts` (Rules 安全阻絕測試用例)。

### 4. 🚨 任務 4：Spreadsheet tabular 行組件的 React.memo 性能優化測試與設計
* **核心目標**：提出對 tabular 編輯面板的渲染防抖與 memo 淺層比對設計，排除 SKU 上百行時的交互卡頓。
* **影響模組**：`pages/Forecasts.tsx` / `components/Spreadsheet`。
* **影響使用者**：Product Planner。
* **業務與開發風險**：規劃人員因 tabular 卡頓體驗極差而放棄系統，重新退回使用本地 Excel 孤島。
* **處理建議**：**CC 實作**，AGY 提供優化 Specs。
* **是否現在做**：否 (建議中期)。
* **如果不做風險**：大量預測輸入時用戶體驗極差。
* **任務屬性**：只讀設計 / 性能優化 Specs。
* **輸入文件**：`DEVELOPMENT.md` / `UI_GUIDELINES.md`。
* **輸出文件**：`docs/architecture-review/SPREADSHEET_PERFORMANCE_OPTIMIZATION.md`。

### 5. 🚨 任務 5：大模型 Change Review [Fact] vs [Inference] 隔離引導詞微調
* **核心目標**：微調離線 Prompt 護欄，強制 DeepSeek 嚴防將價格/數量拉動差值推論誤判為事實（Fact）。
* **影響模組**：`DEEPSEEK_CHANGE_IMPACT_PROMPT.md`。
* **影響使用者**：Executive。
* **業務與開發風險**：高管將 AI 的數理推論解讀為百分之百發生事實，做出過度悲觀或樂觀的投資決定。
* **處理建議**：**AGY 處理**。
* **是否現在做**：是。
* **如果不做風險**：AI 解讀報告的歸因防线崩潰。
* **任務屬性**：純 Prompt 設計 / 提示詞生成。
* **輸入文件**：`DEEPSEEK_CHANGE_IMPACT_PROMPT.md`。
* **輸出文件**：`docs/phase6/DEEPSEEK_CHANGE_IMPACT_PROMPT_V2.md`。

### 6. 🚨 任務 6：快照 100KB 體積控制 (Hybrid 存盤) 算法單元測試
* **核心目標**：編寫單元測試斷言快照文檔體積，確保 `rawInputs` + `derivedHighlights` 快照文檔在極端大數據量下不超過 100KB。
* **影響模組**：`services/firestore.ts` / `core/analytics.ts`。
* **影響使用者**：Developer。
* **業務與開發風險**：快照超過 Firestore 1MB 物理超限直接寫入失敗，整個項目無法進行版本比較。
* **處理建議**：**AGY 寫測試，CC 改代碼**。
* **是否現在做**：是 (平行並行)。
* **如果不做風險**：數據爆滿引發 Firestore 計費超標或寫入崩潰。
* **任務屬性**：可平行與 CC 開發 / 生成體積測試案例。
* **輸入文件**：`PHASE6_FORECAST_VERSIONING_REVIEW.md`。
* **輸出文件**：`snapshotsSize.test.ts` (快照體積斷言測試)。

### 7. 🚨 任務 7：第一代 Excel 批量導入導出服務 Specs 規格設計
* **核心目標**：起草 Phase 7 導入導出 standard Excel 文檔的 JSON 數據契約格式與雙向解析技術規格。
* **影響模組**：`services/xlsx` / 數據契約。
* **影響使用者**：Product Planner / Capacity Planner。
* **業務與開發風險**：線下 Excel 規劃大表無法導入，Planner 只能花費數小時手動重新輸入上百行數據，效率低下。
* **處理建議**：**AGY 設計**。
* **是否現在做**：否 (建議中期)。
* **如果不做風險**：無法打通線下到線上的數據閉環。
* **任務屬性**：只讀規格設計。
* **輸入文件**：`ANALYSIS_CONTRACT.md` / `DEVELOPMENT.md`。
* **輸出文件**：`docs/project/EXCEL_IMPORT_EXPORT_SPECIFICATION.md`。

### 8. 🚨 任務 8：雙語對齊中文字眼「Attainment / Attentions」本地化微調與斷言
* **核心目標**：在雙語 key parities 測試中，將生硬的中文字眼統一修改為流暢、自然的繁體術語，防止繙譯漏洞。
* **影響模組**：`frontend/src/i18n/zhTW.ts` / `i18nOutputs.test.ts`。
* **影響使用者**：User (zh-TW)。
* **業務與開發風險**：規劃人員看不懂生硬的翻譯字眼，對系統專業度產生質疑，降低日常使用頻率。
* **處理建議**：**AGY / CC 協作**。
* **是否現在做**：是。
* **如果不做風險**：中文界面呈現不夠專業，體驗打折。
* **任務屬性**：可與 CC 平行 / i18n 鏡像對齊。
* **輸入文件**：`zhTW.ts` / `en.ts`。
* **輸出文件**：修補後的 `zhTW.ts` 檔案與 Parity 斷言。

### 9. 🚨 任務 9：手動 QA Go/No-Go 驗收 checklist 自動化腳本起草
* **核心目標**：起草手動冒煙測試腳本，自動化跑通對決卡片的 loading, empty 狀態檢查。
* **影響模組**：`Change Review Tab`。
* **影響使用者**：QA / Tester。
* **業務與開發風險**：上線前未做邊界檢查，用戶在只有 1 個快照時直接點擊 Compare 導致 React 拋錯白屏。
* **處理建議**：**AGY 處理**。
* **是否現在做**：否 (需等 CC MVP 交付)。
* **如果不做風險**：前端交互存在崩潰隱患。
* **任務屬性：**自動化測試腳本起草。
* **輸入文件**：`PHASE6_MVP_ACCEPTANCE_CHECKLIST.md`。
* **輸出文件**：`docs/phase6/PHASE6_MVP_SMOKE_TEST_RUNBOOK.md`。

### 10. 🚨 任務 10：Phase 8 AI API Proxy 安全隔離伺服器架構規格起草
* **核心目標**：前瞻性起草後台代理服務器架構 Specs，保障實體 AI API 對接時，金鑰絕不暴露在前台，且實施強制脱敏。
* **影響模組**：Firebase Cloud Functions / Proxy Server。
* **影響使用者**：Developer。
* **業務與開發風險**：前端直接呼叫大模型，Firebase API Key 隨 JavaScript 直接洩露給惡意攻擊者，產生天價賬單。
* **處理建議**：**AGY 處理**。
* **是否現在做**：否 (建議長期)。
* **如果不做風險**：存在嚴重的金鑰外洩與網絡安全隱患。
* **任務屬性**：只讀安全架構設計。
* **輸入文件**：`FIREBASE_ARCHITECTURE.md`。
* **輸出文件**：`docs/project/AI_API_PROXY_SECURITY_SPECIFICATION.md`。
