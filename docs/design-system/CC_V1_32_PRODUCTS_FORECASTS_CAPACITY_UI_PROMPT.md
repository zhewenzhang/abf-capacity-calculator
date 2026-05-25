# CC 任務指令：v1.32 核心數據輸入頁面 UI 標準化重構

請全程使用中文回覆，在獨立的工作區與分支中執行本任務。

---

## 任務定位

這是一項 **UI 視覺與交互標準化重構任務**。你的目標是將 `v1.30.0 UI System Foundation` 的樣式規範與組件，完美套用到 **Products (產品)**、**Forecasts (需求預測)** 與 **Capacity (產能規劃)** 三大數據錄入頁面及其實驗室 Lab 頁面中，以達成全產品 **100% 的 UI/UX 一致性**。

重構的重點在於：**最外層容器與頁頭導入、ActionBar 按鈕靠左相鄰對齊、表格欄位數值靠右對齊與千分位格式化、i18n 零硬編碼、以及窄屏 responsive 局部滾動防護**。

---

## ⚠️ 嚴格開發紅線 (Red Lines)

本重構任務嚴禁跨越以下安全紅線，確保不對任何業務邏輯造成改動：

1. **🔴 嚴禁修改核心業務公式 (Core Formulas)**：不得改動 `月產能 = 日產能 * 工作天數` 公式；不得改動 UPP 與良率估算匹配矩陣邏輯。
2. **🔴 嚴禁修改資料庫存儲結構 (Firestore Schema & Rules)**：不得修改 `firestore.rules`，不得變更 SKU、預測、產能的資料庫格式或欄位型態。
3. **🔴 嚴禁改動 Service 層 API**：不得改動 `skuService.ts`、`forecastService.ts`、`capacityService.ts` 中與後端交互的批次保存/刪除邏輯。

---

## 開發任務清單 (CC Step-by-Step)

### 第一步：產品管理模組重構 (`Products.tsx` / `ProductsSpreadsheetLab.tsx`)
1. **外層佈局**：
   - 兩個頁面最外層套用 `className="abf-page"`。
   - 頂部引入 `<PageHeader>` 組件，標題與描述綁定 i18n 翻譯。
2. **數字欄位右對齊與格式化**：
   - SKU Table 表格中的單價 (`unitPrice`) 欄位配置 `align: 'right'`。
   - 單價金額展示調用 `formatCurrency()`，支持千分位，響應 prefs 貨幣切換，**消除裸數字與貨幣符號拼接**。
3. **ActionBar 與按鈕對齊**：
   - 實驗室頁面整合共用 `<ActionBar>` 組件。
   - `Save`（主要藍色）與 `Discard`（次要灰色）按鈕相鄰靠左放置，且在數據無修改時均為 `disabled`；有修改時 `Save` 顯示修改個數，如 `Save (2)`。
4. **只讀與滾動防護**：
   - 唯讀模式下，頂部渲染 `className="abf-alert-page"`，`type` 統一為 `info`。
   - Grid 外部包裹於 `.spreadsheet-wrapper` 內，窄屏下局部滾動正常。

### 第二步：需求預測模組重構 (`Forecasts.tsx` / `ForecastsSpreadsheetLab.tsx`)
1. **篩選面板標準化**：
   - 篩選工具欄卡片套用 `.abf-toolbar` 樣式，Row 設置 `wrap={true}` 避免窄屏溢出。
   - 視圖切換控件全部重構為 `<Segmented>` 元件。
2. **按鈕與 ActionBar 整合**：
   - 引入 `<ActionBar>`，`Save` 與 `Discard` 按鈕靠左相鄰放置。
   - 實驗室頁面頂部套用 `<ExperimentalBanner>`，移除原 Toolbar 中多餘的橘色 Experiment Tag。
3. **只讀與 i18n 深化**：
   - 唯讀警告統一為 `type="info"` 與 `abf-alert-page`。
   - 100% 消除 Forecasts 頁面中的硬編碼英文字串，全部使用 `t()`。

### 第三步：產能規劃模組重構與 Discard 補強 (`CapacityPlan.tsx` / `CapacitySpreadsheet.tsx`)
1. **唯讀警告樣式標準化**：
   - 刪除原內聯 padding 與 margin 樣式，統一使用 `className="abf-alert-page"`，`type` 統一為 `info`。
2. **ActionBar 整合與 Discard 功能補強**：
   - 頁面整合 `<ActionBar>`。
   - **關鍵補強**：為 `CapacityPlan.tsx` 實作 `handleDiscard` 放棄變更按鈕（將格點數據還原為加載時的 saved 快照），提升系統交互的安全性。
3. **表格與數字格式化**：
   - 產能日產能數值列在表格中配置 `align: 'right'`，並調用 `formatNumber()` 顯示千分位。
   - 產能單位旁使用 `<UnitText>` 渲染 `(panels/day)`。

---

## 驗收標準 (CC Self-Check)

- **自動化校驗**：
  - `npm run test` 100% 通過。
  - `npm run lint -- --quiet` 零警告、零錯誤。
  - `npm run build` 成功打包編譯，無 TypeScript 類型錯誤。
- **手動視覺與功能校驗**：
  - [ ] 切換多國語言，六個頁面無任何硬編碼字串殘留，中英文切換完美。
  - [ ] 縮小視窗至 `375px` 行動端寬度，DataSheetGrid 表格局部橫向滾動正常，文字無重疊擠壓。
  - [ ] 唯讀模式下，頂部警示 Alert 樣式高度一致，所有輸入元件與寫按鈕為 disabled。
  - [ ] 修改產能數據後，點擊 ActionBar 中的 `Discard` 按鈕能成功將數據一鍵還原為修改前的值。
