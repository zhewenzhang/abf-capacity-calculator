# v1.30 UI System Foundation — 驗收清單 & 審查報告

## 一、驗收背景與狀態

- **目標版本**：`v1.30.0`
- **當前分支**：`agy/ui-system-visual-qa`
- **Main 分支版本**：`1.29.0`（截至 2026-05-25）
- **發布審查結論**：**尚未驗收 (Pending)**
  - *原因說明*：目前 `origin/main` 分支的最新 commit 版本仍為 `1.29.0`，`v1.30.0` 尚未合併至 `main`。因此，本報告主要提供 `v1.30` 的預期驗收清單與測試腳本，待後續 `v1.30.0` 發布後可供 CC 直接執行驗收。

---

## 二、v1.30 UI System 驗收核對清單 (Acceptance Checklist)

### 1. CSS Utilities 基礎樣式驗收
本項旨在驗收 `index.css` 中新增的基礎 CSS utility 類是否符合預期，且未造成樣式衝突。

- [ ] **頁面佈局類驗收**
  - `.abf-page` 是否提供一致的左右 4px 或 8px padding。
  - `.abf-page-header` 是否有適當的外距 (margin-bottom: 16px)，使頁頭與內容有清晰區隔。
- [ ] **區塊間距類驗收**
  - `.abf-section` 是否帶有 16px 的底外距；多個 `.abf-section` 之間是否有重疊或過寬的問題。
  - `.abf-section-title` 是否為 14px 粗體，顏色為標準 rgba(0,0,0,0.88)。
- [ ] **Toolbar 類驗收**
  - `.abf-toolbar` 的背景色 (預設 #fff)、圓角 (6px)、邊框是否與 Ant Card 視覺一致。
  - 窄屏下 `.abf-toolbar` 是否能完美換行，且按鈕無溢出。
- [ ] **表格與 Flex 輔助類驗收**
  - `.spreadsheet-wrapper` 能否在窄屏下使格點表格產生獨立的橫向滾動條。
  - `.abf-flex-gap-sm` (8px) 與 `.abf-flex-gap-md` (12px) 在彈性佈局下間距是否正確。
  - 表格套用 `.abf-table-compact` 後，Td 內距是否收縮至緊湊風格 (padding: 6px 8px)。

---

### 2. Common Components (共用組件) 驗收
本項旨在驗收 `components/common/` 目錄下新封裝的 6 個基礎 UI 組件。

- [ ] **PageHeader 組件**
  - 驗收項目：傳入 title 與 description 時，字型與顏色是否符合規範。
  - 驗收項目：傳入 actions 按鈕時，按鈕是否靠右對齊且垂直居中。
- [ ] **ActionBar 組件**
  - 驗收項目：組件左側的按鈕 Space 是否有合理的 wrap 行為。
  - 驗收項目：右側傳入 `info` 屬性時，字體是否為 13px 且呈灰字 `rgba(0,0,0,0.45)`。
- [ ] **UnitText 組件**
  - 驗收項目：是否預設在文字兩側加上括號，如 `(Million TWD)`。
  - 驗收項目：配置 `parentheses={false}` 時是否不顯示括號。
  - 驗收項目：字體大小是否為 12px 且呈灰字。
- [ ] **EmptyState 組件**
  - 驗收項目：在無數據渲染時，EmptyState 的插圖、標題、描述文字是否居中對齊。
  - 驗收項目：配置 actionLabel 時是否正確顯示按鈕，且點擊能執行對應的 onAction 回呼。
- [ ] **ExperimentalBanner 組件**
  - 驗收項目：背景與文字色彩是否符合實驗性提示黃色/橙色。
  - 驗收項目：是否能完美適配窄屏，文字折行且圖標居中。
- [ ] **MetricCard 組件**
  - 驗收項目：卡片標題與數值的字型、字號、高亮色彩是否一致。
  - 驗收項目：傳入 suffix 時，單位是否靠右且大小合適。
- [ ] **StatusTag 組件**
  - 驗收項目：配置不同 severity (`green`/`orange`/`red`) 時是否顯示對應的背景色與文字色。

---

### 3. 試點頁面 (Pilot Pages) 驗收
驗收 v1.30.0 第一階段已套用新架構的兩個頁面是否表現完美。

- [ ] **營業目標頁面 (`BpTargets.tsx`)**
  - [ ] 頁面使用 `abf-page` 容器，邊距對齊完美。
  - [ ] 頂部已使用 `ActionBar` 共用組件，Save/Discard 按鈕靠左相鄰。
  - [ ] 單位顯示使用 `UnitText` 且 `parentheses={false}`。
  - [ ] 表格包裹於 `.spreadsheet-wrapper`，橫向滾動正常。
- [ ] **預測格點實驗室 (`ForecastsSpreadsheetLab.tsx`)**
  - [ ] 頁面頂部載入了 `ExperimentalBanner` 共用組件。
  - [ ] 唯讀警示使用 `.abf-alert-section`，樣式對齊良好。

---

### 4. 資料邏輯與安全約束驗收
**核心安全要求**：UI 基礎建設重構**不得碰觸任何底層資料邏輯**。

- [ ] **只讀行為 100% 不變**
  - [ ] 在 `viewer` 權限下，所有 input 依然不可點擊。
  - [ ] 唯讀模式下，表格單元格依然無法被 paste 修改（True Read-only 攔截依舊生效）。
- [ ] **業務計算邏輯 100% 不變**
  - [ ] 產能規劃、利用率公式無任何修改。
  - [ ] SKU 各項 derive 計算與驗證規則依然正確。
- [ ] **資料結構與 Firestore 100% 安全**
  - [ ] `firestore.rules` 檔案未被改動。
  - [ ] 儲存參數時，其他非 BP Targets / Panel Params 的屬性無意外丟失。

---

### 5. 多國語言 (i18n) 驗收
- [ ] **語系切換驗收**
  - [ ] 切換為「English」時，所有新 UI 元件文字（如 PageHeader actions, ActionBar, EmptyState, BpTargets 等）完美切換為英文，無硬編碼中文。
  - [ ] 切換為「繁體中文」時，所有翻譯精確，無 mojibake 亂碼，無硬編碼英文。
- [ ] **翻譯 Key 對齊**
  - [ ] 驗收新增組件的翻譯 Key 均定義在 `zhTW.ts` 與 `en.ts` 中，無 Undefined error。

---

### 6. Responsive 響應式佈局驗收
- [ ] **窄屏 Toolbar 折行**
  - [ ] 將瀏覽器寬度縮小至 375px（手機視口），`.abf-toolbar` 或試點頁面按鈕能自動換行排列，無溢出視窗之外。
- [ ] **表格滾動條**
  - [ ] 在窄屏下，表格能產生獨立的橫向滾動條，且能順暢拖拽，不撐大整個頁面寬度。

---

### 7. 自動化與編譯構建驗收
- [ ] **單元測試 (Unit Tests)**
  - [ ] 執行 `npm run test`，所有測試（440+ 筆）必須 100% 通過。
- [ ] **語法與風格檢查 (ESLint)**
  - [ ] 執行 `npm run lint -- --quiet`，無語法或風格警告。
- [ ] **生產編譯 (Vite Build)**
  - [ ] 執行 `npm run build`，應成功編譯出生產包 (dist/)，無 tsc 類型出錯，且 chunk 大小無異常。

---

## 三、CC 工程師下一步行動建議

1. **認領 UI 不一致性 Backlog**：
   - CC 可以直接將 `docs/design-system/UI_INCONSISTENCY_BACKLOG_2026_05_25.md` 拆分為具體的 JIRA 或開發任務，優先修復嚴重的 P1 體驗缺陷（如 Results 的 KPI 窄屏適配與 Products Lab 的全英文硬編碼）。
2. **遵守 ABF UI Design Rules v2 進行後續頁面套用**：
   - 當 CC 開始執行 `v1.31` 對 `Parameters.tsx`、`Dashboard.tsx` 與 `CalculationResults.tsx` 的 UI 深化時，**必須**參考 `ABF_UI_DESIGN_RULES_V2.md` 的 Page Layout、ActionBar 擺放順序、Loading 遮罩與唯讀模式強警示規範。
3. **使用本 Acceptance Checklist 進行 v1.30 發布驗收**：
   - 待 v1.30.0 代碼準備合併 main 時，CC 可直接參考本清單進行逐項 manual 驗證與自動化校驗。
