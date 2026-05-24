# Phase 6 Forecast Versioning & Change Impact Review MVP 質量驗收清單

本驗收清單用於在 CC 完成 `v1.22.0 MVP` 開發交付後，引導測試人員與項目負責人進行逐項功能、邊界與安全驗收，判定是否滿足上線發布標準。

---

## 1. 驗收核對清單 (Acceptance Checklists)

### 1.1 Scope 檢查 (Scope Boundary Check)
- [ ] **無 AI API 接入**：整個功能未直接發送任何 HTTP 請求至外部 LLM 實體 API，維持離線 Sanitized Pack 拷貝設計。
- [ ] **無 Cloud Functions / 後端新增**：系統維持 Serverless / 僅依賴 Firestore 原生查詢，未新增任何後端節點或 Node.js Functions。
- [ ] **公式完整隔離**：並未改動 `core/calculationEngine.ts` 中任何 capacity/demand/shortage 物理核心計算公式。
- [ ] **無 Refine 恢復**：維持系統計量決定性，無任何 Refine 折返計算。
- [ ] **多用戶作用域支援**：
  - [ ] 支援 Personal 作用域快照（儲存於個人 path 下）。
  - [ ] 支援 Shared Workspace 共享工作區作用域快照。

### 1.2 快照功能檢查 (Snapshot Functional Check)
- [ ] **建立快照 (Create)**：用戶輸入快照名稱與描述後能成功保存。
- [ ] **快照名稱與描述校驗**：UI 表單強製校驗「快照名稱不得為空」，防止出現無名快照。
- [ ] **核心元數據快照**：
  - [ ] `createdAt` (精確寫入 ISO 8601 時間戳)。
  - [ ] `createdBy` (精確寫入當前登入用戶 UID，防止匿名快照)。
  - [ ] `sourceAppVersion` (精確記錄當時應用版本號如 `v1.22.0`)。
- [ ] **Raw Inputs 快照完整性**：
  - [ ] 快照的 `rawInputs` 中完整封裝了當時的 SKUs、Forecasts、Capacity Plans、Parameters、BP Targets 數組。
- [ ] **Derived Highlights KPI 鎖定**：
  - [ ] 快照的 `derivedHighlights` 欄位中，靜態且不可篡改地寫入了當時的 `totalRevenueUsd`、`maxCoreUtilization`、`maxBuUtilization`、`shortageMonthCount`、`worstBottleneckMonth`、`bpAttainment`、`bpGapMillionTwd` 等核心大盤 KPI。
- [ ] **快照列表與刪除 (List & Delete)**：
  - [ ] 頁面能以列表形式拉取並渲染所有已保存快照。
  - [ ] 快照擁有物理刪除或軟刪除按鈕，能釋放 Firestore 存儲空間。
- [ ] **Workspace 共享角色約束**：
  - [ ] **Owner (所有者)**：可自由建立、刪除共享快照。
  - [ ] **Editor (編輯者)**：可建立共享快照，但**僅能刪除自己建立的快照**，刪除他人快照時前端應進行攔截。
  - [ ] **Viewer (觀察者)**：唯讀，**禁止建立或刪除快照**。
- [ ] **不可篡改性 (Immutable)**：快照一旦建立，**絕對不允許 Update 修改**任何數據（除描述備註可選外），前端無編輯按鈕。

### 1.3 比較功能檢查 (Compare Functional Check)
- [ ] **Base 快照選擇器**：下拉列表能正常載入當前工作區下的快照。
- [ ] **Target 快照選擇器**：下拉列表能正常載入除 Base 以外的快照。
- [ ] **自對比阻絕**：當用戶在 Base 和 Target 中選擇同一個快照時，前端應禁用「開始對決」按鈕或彈出提示「不可對比同一個快照」。
- [ ] **空快照狀態處理 (No Snapshot)**：當前項目無快照時，UI 渲染乾淨的 AntD `<Empty>` 占位圖，並提示「請先建立版本快照」。
- [ ] **單快照狀態處理 (Single Snapshot)**：當只有 1 個快照時，對比下拉框應進行引導提示「至少需要 2 個快照方可進行變更影響審查」。

### 1.4 Change Impact 核心指標檢查 (Metrics Check)
- [ ] **12 個 Delta 指標渲染**：對決面板上能精確渲染 12 大指標卡片（數值差值、百分點變動等）。
- [ ] **Top Changed Customers / SKUs**：對比表能按變動絕對值從大到小排序，精確定位核心驅動源。
- [ ] **Price-driven vs Quantity-driven 差值隔離**：
  - [ ] 分離計算 Price 變更與 Quantity 變更，不將兩者混同。
  - [ ] 在 UI 明確加註標籤標明此為 Inference (數理推論) 性質。
- [ ] **歸因免責聲明**：在 Attribution 歸因模塊（如 worst period / top changed drivers）下方，必須有顯眼的免責標註：*「比例歸因，非嚴格因果關係」*。

### 1.5 Export Pack 離線導出檢查 (Export & Sanitization)
- [ ] **拷貝 AI 離線包 (Copy Change Impact Pack)**：
  - [ ] 一鍵拷貝，剪貼板包含 Delta 比較 Highlights JSON 及內置的 Prompt 引導詞。
  - [ ] 支援 textarea 備用 fallback 拷貝路徑（針對舊版瀏覽器或非 https 環境）。
- [ ] **離線 JSON 下載 (Download JSON)**：
  - [ ] 點擊下載，JSON 數據前置注入了 UTF-8 BOM `\ufeff` 字符。
  - [ ] 下載完成後，程式碼已正確調用 `revokeDownloadUrl` 釋放 Object URL。
- [ ] **敏感隱私數據擦除 (Sanitization)**：
  - [ ] 導出的 JSON 中**絕對不包含**成員 UID、email、Firestore 私有 Token 密鑰及 workspace ID 等敏感標識。
- [ ] **內置 DeepSeek 護欄**：導出包的 `guardrails` 字段中已寫入 F-A-I-R 分類與 Proportional Attribution 歸因限制說明。

### 1.6 UI / UX 檢查 (UI consistency)
- [ ] **Ant Design 風格一致性**：使用標準 AntD 卡片、表格、統計組件，整體字體與按鈕樣式與 v1.21.1 完美一致。
- [ ] **頁面不擁擠 (No Clutter)**：結果頁面佈局清晰，Change Review Tab 內容按柵格合理排布，無視覺重疊或溢出。
- [ ] **響應式佈局 (Mobile friendly)**：
  - [ ] 在窄屏或平板寬度下，Delta 指標卡片能自動向下折行排版。
  - [ ] 對決表格支持 `<Table scroll={{ x: true }}>` 橫向滾動，無寬度撐爆現象。

---

## 2. Go / Conditional Go / No-Go 上線判定門檻 (Verdict Gate)

驗收測試結束後，必須根據以下標準進行上線決策判定：

| 驗收結論 | 判定門檻條件 (Acceptance Gates) | 後續處理規程 |
| :--- | :--- | :--- |
| **🟢 GO (批准上線)** | - 所有 6 大驗收維度 **100% 通過**，無任何勾選項遺漏。<br>- 雙版本對決數理計算精度 100% 與核心公式一致，無任何算術偏離。<br>- 權限控制與 Immutable 唯讀限制完全生效。 | 允許將代碼 merge 入 main，升級版本並部署發布。 |
| **🟡 CONDITIONAL GO<br>(條件性有條件通過)** | - 核心 Snapshot/Compare 功能完全通過。<br>- UI 佈局在極端窄屏下有微幅錯位，或某個非核心 Delta 表格排序有微小瑕疵（不影響數理精度）。<br>- 零 Veto 級缺陷。 | 記錄已知 Minor Issues，允許限期修復後直接發布，或發布補丁包。 |
| **🔴 NO-GO (不予通過)** | - 觸犯任何 **Veto 否決紅線**（如 Viewer 依然能寫入/刪除快照、歷史快照可以被 Update 修改篡改、BOM 導出亂碼等）。<br>- 雙版本 Delta 計算發生嚴重的算術公式偏離。<br>- 出現內存洩漏（未調用 revokeDownloadUrl）或隱私洩漏。 | **一票否決**。打回重做，CC 必須針對漏網缺陷進行代碼級返工。 |
