# ABF Capacity Calculator 產品成熟度總評審書 (PRODUCT_MATURITY_REVIEW.md)

本文件作為項目從快速迭代向長期維護、多人協作過渡的**產品成熟度審查白皮書**，由旁路審查官（AGY）對系統的核心定位、當前成熟度、已經做得好的優勢、與成熟產品的差距、以及大盤 30 個核心風險進行多維度深度剖析。

---

## 1. 一句話產品定位與成熟度總點評 (Product Position & Rating)

### 1.1 一句話產品定位
**ABF Capacity Calculator** 是一款面向 ABF 載板產業，整合多用戶共享 Workspace 協作、多幣別（USD/TWD/CNY）高精折算、以及決策級決定性（Deterministic）產能/BP 敏感度診斷，並配備安全脫敏 AI 離線分析護欄的企業級產能規劃與業績達成沙盤。

### 1.2 產品成熟度綜合評分：**`7.5 / 10 分`**
* **已經做得好的地方（成熟產品特徵）**：
  - **核心計算超強健**：產能物理重算（`calculationEngine.ts`）高決定性，無任何隨機性，單元測試極為完備（320+ Cases）。
  - **幣別與 BP 防火牆完備**：安全隔離了 USD 營收折算與百萬 TWD BP 標的，匯率參數化配置。
  - **多人協作安全落地**：Firebase 共享/個人數據路徑清晰，Owner/Editor/Viewer 角色權限已由 Rules 硬性卡死。
  - **AI 離線數據安全第一**：採用 Sanitization 脫敏擦除隱私 JSON，注入 BOM 下载，內建 F-A-I-R 與品質降級等離線 Prompt 護欄，實現零 API 洩漏風險。
* **還不像成熟產品的地方（待優化缺口）**：
  - **缺少版本變更對決 (Forecast Versioning)**：目前版本微調後無法秒級直觀比對「Delta 變更影響」（正在 Phase 6 籌備中）。
  - ** Spreadsheet 輸入效率受限**：大量 SKU 的 tabular 數據編輯體驗尚不夠流暢，Spreadsheet Lab 仍是實驗性質。
  - **缺少 Scenario 沙盤虛擬化**：用戶若想模擬 sandbox 場景，必須修改實體 production 數據，缺乏乾淨的虛擬沙盤克隆機制。

---

## 2. 最大 10 個產品風險矩陣 (Top 10 Product Risks)

| 序號 | 產品風險 (Risk Area) | 影響模組/頁面 | 影響使用者 | 會造成的錯誤決策 / 開發風險 | 處理建議 (CC/AGY) | 是否現在做 | 不做風險 |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **1** | **歷史快照版本篡改**：快照建立後數據被悄悄編輯。 | `workspaces/.../snapshots` | Executive | 高管基於被篡改的快照做出錯誤的歷史比對決策，信任坍塌。 | **CC** | **是** | 歷史無法追溯，失去快照防禦價值。 |
| **2** | **離線大模型算術幻覺**：外部 AI 擅自捏造數據。 | AI Brief Export | Planner | AI 在解讀 JSON 時擅自填充缺失數值，誤導規劃人員。 | **AGY** | **是** | AI 解讀結論失真。 |
| **3** | **快照命名與描述混亂**：用戶大量建立 `test1` 等垃圾命名。 | Snapshot List | Executive | 快照列表被垃圾命名撐滿，高管無法識別核心變更背景。 | **CC** | **否**<br>(建議中) | 快照可讀性極差。 |
| **4** | **Proportional Attainment 誤讀**：高管將營收佔比當做 Gap 責任。 | Risk / BP Brief | Executive | 錯誤地將某個高營收客戶當做 BP Miss 的罪魁禍首，破壞合作。 | **AGY** | **是**<br>(已標明免責) | 決策方向性偏離。 |
| **5** | **多幣別與匯率參數漂移**：未鎖定匯率導致 Attainment 波動。 | Global Params | Sales | 當匯率參數在月中變更，歷史大盤營收數據悄悄漂移，業績失真。 | **CC** | **是** | 前後數據無法拉平比對。 |
| **6** | **Blocked 數據下越界決策**：在髒數據下盲目跟從 AI 建議。 | AI Brief Export | Executive | 髒數據引發嚴重的算術偏差，高管基於 AI 越界建議盲目投資設備。 | **AGY** | **是** | 投資失誤，造成重大財務虧損。 |
| **7** | **未做人類雙重核對**：過度採信 AI 給出的擴產策略。 | AI Brief Export | Executive | 高管直接根據 AI 的 role action 下單設備，線下工廠無力消化。 | **AGY** | **是** | 項目營運失控。 |
| **8** | **Spreadsheet 卡頓導致放棄**：大數據量下 tabular 輸入延遲。 | Forecasts Tab | Product Planner | 用戶因大數據量卡頓放棄系統，重新退回使用本地 Excel 孤島。 | **CC** | **否**<br>(建議中) | 項目日活（DAU）歸零。 |
| **9** | **Weighted Pressure 乘回實體**：將加權值誤認物理數量。 | Risk Brief | Capacity Planner | 錯誤地將加權 Core×1.3 壓力當做實體短缺 panels，下單過量原料。 | **AGY** | **是** | 造成嚴重的原材料庫存積壓。 |
| **10**| **Scenario 克隆丟失 inputs**：沙盤模擬時將 production 數據損壞。 | Price / Capacity Scenarios | Planner | 模擬時失誤覆寫了 production 真實預測，真實數據損毀。 | **CC** | **是**<br>(防禦隔離) | 真實規劃數據丟失。 |

---

## 3. 最大 10 個工程風險矩陣 (Top 10 Engineering Risks)

| 序號 | 工程風險 (Risk Area) | 影響模組/頁面 | 影響使用者 | 會造成的錯誤開發 / 運維風險 | 處理建議 | 是否現在做 | 不做風險 |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **1** | **Firestore 1MB 文檔限制**：快照數據撐爆單個 document。 | Snapshots Collection | Developer | 用戶保存大快照時 Firebase 直接拋出超限 Error，保存中斷。 | **CC** | **是** | 大快照無法存儲。 |
| **2** | **Raw vs Derived 計算漂移**：公式代碼升級導致歷史重算失真。 | Snapshot Compare | Developer | 歷史 inputs 用新公式算出了不同的 derived，快照失去「時間膠囊」意義。 | **CC** | **是** | 歷史快照數據失效。 |
| **3** | **Viewer 模擬寫入越界**：安全 rules 未能徹底攔截 Viewer 寫入。 | Shared Workspace Snapshots | Developer | Viewer 通過 API 模擬 Editor 成功改寫快照，共享安全坍塌。 | **CC** | **是** | 安全性形同虛設。 |
| **4** | **BOM 字符 ESLint 報錯**：不規則空白 `'﻿'` 導致 Linter 阻塞 CI/CD。 | `aiBriefExport.ts` | Developer | 項目 CI/CD 因 ESLint `no-irregular-whitespace` 直接掛起，阻礙熱修復。 | **AGY** | **是**<br>(已用\ufeff修復) | 項目代碼無法提交或編譯。 |
| **5** | **ObjectURL 內存洩漏**：下載 JSON 後未調用 `revokeObjectURL`。 | CalculationResults Download | Developer | 頻繁下載導出包導致瀏覽器內存暴增，網頁崩潰或卡死。 | **AGY** | **是**<br>(已修復) | 瀏覽器標籤頁崩潰。 |
| **6** | **i18n key parity 丟失**：新增 core 指標卻漏掉翻譯 key。 | `i18nOutputs.ts` | User (zh-TW) | 前端直接爆出 raw `.key` 英文符號或 `{placeholder}` 殘留，專業感暴跌。 | **CC** | **是** | 多語言界面殘缺。 |
| **7** | **Bundle Size 超限警告**：Webpack / Vite 打包 chunk size 過大。 | Web Application | User | 首次加載網頁耗時太長，窄頻/移動端用戶等待超時直接關閉頁面。 | **CC** | **否**<br>(中期) | 首屏加載（FCP）緩慢。 |
| **8** | **隨意引入 Supabase 三方庫**：增加不必要的後端鏈條。 | Firebase Service Layer | Developer | 數據庫分散，導致 Firestore Rules 與 PostgreSQL 雙重維護，極易引發權限洩漏。 | **CC/AGY** | **是**<br>(嚴禁Supabase) | 系統複雜度失控，維護成本暴增。 |
| **9** | **單元測試只覆蓋表面**：未覆蓋極端 Panel layout 錯誤邊界。 | calculationEngine.ts | Developer | 修改 layout 算法時未發覺 chip dimensions 為負值直接觸發 white screen 崩潰。 | **CC** | **是** | 生產環境白屏崩潰。 |
| **10**| **軟刪除 metadata 混淆**：Editor 物理刪除他人建立的快照。 | Snapshots Collection | Developer | 成員誤刪項目重大歷史節點，導致快照比較基線徹底丟失，歷史無法還原。 | **CC** | **是** | 歷史資料丟失。 |

---

## 4. 最大 10 個 UI / UX 風險矩陣 (Top 10 UI/UX Risks)

| 序號 | UI / UX 風險 (Risk Area) | 影響頁面/模組 | 影響使用者 | 會造成的錯誤體驗 / 決策風險 | 處理建議 | 是否現在做 | 不做風險 |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **1** | **Results 與 Dashboard 職責重疊**：大盤指標分散在兩處。 | Results / Dashboard | Executive | 高管在兩邊看到微幅不對等的圖表，對數據準確性產生懷疑，放棄採信。 | **CC** | **否**<br>(中期) | 決策層信任度下降。 |
| **2** | **資訊層級高度擁擠**：Risk Brief 缺乏排版留白。 | Results Page | Executive | 高管無法迅速定位前三大風險，被大量 SKU text 淹沒，錯失決策時間。 | **CC** | **是** | 大量核心決策拖延。 |
| **3** | **移動端/窄屏下 Table 撐爆**：表格無橫向滾動。 | Capacity / Forecasts Tab | Product Planner | 表格超寬被硬性擠壓，數據重疊，無法輸入或看清 utilization。 | **CC** | **是** | 外出移動辦公無法使用。 |
| **4** | **Compare 同快照自比對**：下拉選擇了同一個快照。 | Change Review Panel | Planner | 渲染出全為 `0` 的 Delta 指標卡，用戶誤以為系統發生計算故障。 | **CC** | **是** | 用戶對計算品質產生疑慮。 |
| **5** | **中文字眼不自然/漏翻**：術語生硬（如抄錄英文）。 | Risk Brief 中文版 | User (zh-TW) | 載板廠規劃人員看不懂專用中文繙譯，退回紙質Excel核對。 | **CC** | **是** | 本地化用戶體驗差。 |
| **6** | **缺乏 One-Snapshot-Only 提示**：僅建立 1 個快照時直接空置。 | Change Review Panel | Planner | 用戶不知道為什麼無法對比，誤以為系統對比功能損壞。 | **CC** | **是** | 功能認知度障礙。 |
| **7** | **Spreadsheet 缺少 keyboard shortcuts**：不支持 Ctrl+C 批量粘貼。 | Forecasts Spreadsheet | Product Planner | 規劃人員耗費數小時手動逐個輸入 SKU，怨聲載道。 | **CC** | **否**<br>(建議中) | 數據錄入效率極低。 |
| **8** | **花哨的大型 UI Redesign**：盲目引入絢麗的 3D/動畫。 | Dashboard | Executive | 系統運行卡頓，高管投屏到大屏幕時加載超時，演示失敗。 | **CC/AGY** | **是**<br>(禁止大改) | 加載超時與系統穩定性崩潰。 |
| **9** | **Settings 頁面參數入口過深**：匯率與 BP 目標隱藏。 | Parameters Tab | Sales | 銷售人員找不到匯率折算參數，錯誤地直接口頭算術換算，導致價格報偏。 | **CC** | **是** | 價格報價偏離，丟失大訂單。 |
| **10**| **缺乏決定性 Scenarios 高亮**：未提示用戶這是 deterministic 模擬。 | Scenario Planning Tab | Executive | 高管誤以為 ±10% 價格變動已經實體寫回了 Firebase 數據庫，引發團隊恐慌。 | **CC** | **是** | 數據真實性產生信任崩脅。 |

---

## 5. 值得保留的產品主線與砍掉/延後的方向

### 🟢 必須堅決保留的「成熟產品主線」：
1. **Sanitized JSON + 離線 Prompt 的旁路 AI 鏈路**：
   - 這是整個專案在隱私與公式安全上的核心護城河。
   - 在沒有得到極為嚴苛的安全審計前，**絕對不可**改為前端直接對接 AI 實體 API，維持離線 Sanitized Pack 拷貝粘貼設計。
2. **多用戶共享 Workspace 作用域隔離**：
   - 這一層的代碼已經非常成熟，是支持多帳戶協作的底座，必須完整保留。
3. **決定性計算引擎 (Deterministic Core)**：
   - `core/` 下的純 JavaScript 決定性物理算術必須完整保留，禁止一切將其 AI 化或統計學化的提議。

### 🔴 必須果斷砍掉或延期的方向：
1. ** Supabase 導入建議**：
   - **理由**：Firebase 已經完美支持了多人協作、唯讀Viewer限制及 Hosting。引入 Supabase 是嚴重的過度工程化，會造成嚴重的數據同步崩潰與安全 rules 漏洞，**必須物理砍掉**。
2. **立即內建 AI API**：
   - **理由**：直接從前端呼叫 AI 會造成嚴重的 Firebase 金鑰外洩風險，且無法進行 Server-side sanitization。在 Phase 8 之前，**絕對不考慮實作**。
3. **花哨的大型 UI Redesign**：
   - **理由**：花哨的重構無法帶來任何實質決策價值，還會破壞系統現有的 Ant Design 極簡一致性，**必須推遲或否決**。
