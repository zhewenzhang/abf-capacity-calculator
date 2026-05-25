# v1.32 數據輸入頁面 (Products/Forecasts/Capacity) 驗收清單

本文檔為 `v1.32.0` 的 UI 標準化驗收清單，旨在確保產品管理、需求預測與產能規劃等數據錄入頁面及其實驗室版本，在視覺一致性重構後表現無懈可擊，且 100% 守住業務數據安全。

---

## 1. 產品管理頁面 (`Products.tsx` / `ProductsSpreadsheetLab.tsx`) 驗收

- [ ] **1.1 頁面容器與頁頭標準化**
  - [ ] `Products.tsx` 與 `ProductsSpreadsheetLab.tsx` 最外層套用 `className="abf-page"`。
  - [ ] 頂部引入 `<PageHeader>` 組件，標題與描述使用 i18n 多國語言翻譯。
- [ ] **1.2 表格對齊與格式化**
  - [ ] 列表中的 SKU 單價 (`unitPrice`) 欄位右對齊 (`align: 'right'`)。
  - [ ] 單價金額展示調用 `formatCurrency()`，支持千分位，並響應 prefs 貨幣切換。
  - [ ] 層數與尺寸等數字列靠右或居中對齊一致。
- [ ] **1.3 ActionBar 整合**
  - [ ] `ProductsSpreadsheetLab.tsx` 整合了共用 `<ActionBar>`。
  - [ ] `Save`（主要藍色）與 `Discard`（次要灰色）按鈕相鄰靠左放置，在數據無修改時均為 `disabled`；有修改時，`Save` 顯示修改個數，如 `Save (2)`。
- [ ] **1.4 只讀與 Spreadsheet 安全防護**
  - [ ] 當用戶為 `viewer` 角色時，頂部顯示標準的藍色唯讀 Alert 警示 (`abf-alert-page`, `type="info"`)。
  - [ ] `ProductsSpreadsheetLab` 的 DataSheetGrid 中，所有單元格均不可編輯 (`disabled: !writable`)，且 `onChange` 加載了安全守衛。
  - [ ] Grid 外部包裹於 `.spreadsheet-wrapper` 容器內，窄屏下滾動順暢。

---

## 2. 需求預測頁面 (`Forecasts.tsx` / `ForecastsSpreadsheetLab.tsx`) 驗收

- [ ] **2.1 篩選與過濾 Toolbar 標準化**
  - [ ] 篩選面板套用 `.abf-toolbar` 樣式，`<Row>` 設置了 `wrap={true}` 避免窄屏按鈕溢出。
  - [ ] 視圖切換控件全部重構為 `<Segmented>` 元件。
- [ ] **2.2 按鈕對齊與 ActionBar 整合**
  - [ ] 引入 `<ActionBar>` 組件，`Save` 與 `Discard` 按鈕靠左相鄰放置。
  - [ ] 按鈕的 `disabled` 狀態與 `dirtySet` 動態聯鎖。
- [ ] **2.3 只讀警示與 RWD 水平滾動**
  - [ ] Viewer 只讀模式下，頂部渲染 `abf-alert-page`，`type` 統一為 `info`。
  - [ ] 實驗室頁面頂部套用 `<ExperimentalBanner>`，移除 Toolbar 內多餘的橘色 Experiment Tag。
  - [ ] DataSheetGrid 外層包裹 `.spreadsheet-wrapper`，窄屏下產生局部水平滾動條，不擠壓欄位。

---

## 3. 產能規劃頁面 (`CapacityPlan.tsx` / `CapacitySpreadsheet.tsx`) 驗收

- [ ] **3.1 唯讀警示樣式標準化**
  - [ ] 刪除原內聯 padding 與 margin 樣式，統一使用 `className="abf-alert-page"`，`type` 統一為 `info`。
- [ ] **3.2 ActionBar 與 Discard 補強**
  - [ ] 產能規劃頁面與實驗室頁面整合了 `<ActionBar>`。
  - [ ] **補強驗收**：`CapacityPlan.tsx` 與 `CapacitySpreadsheet.tsx` 成功加入了 `Discard` 快照回退按鈕，修改未保存前可一鍵還原，提升系統容錯度。
- [ ] **3.3 表格對齊與數字單位**
  - [ ] 產能日產能數值列在表格中靠右對齊，並調用 `formatNumber()` 顯示千分位。
  - [ ] 產能單位旁使用 `<UnitText>` 渲染 `(panels/day)`。

---

## 4. 🚨 業務紅線與安全安全驗收

- [ ] **4.1 計算公式與業務邏輯無變動**
  - [ ] 驗收重構過程中，**絕對沒有修改** `core/calculationEngine.ts` 或 `core/skuDerived.ts` 檔案。
  - [ ] 月產能計算公式依然精確為 `日產能 * 工作天數`，良率匹配精確無誤。
- [ ] **4.2 後端 Services 與 Firestore 規則安全**
  - [ ] 驗收 `firestore.rules` 未被修改。
  - [ ] 驗收 `skuService.ts`、`forecastService.ts`、`capacityService.ts` 的批次保存 API 未被任何改動，保存時其他欄位未丟失。

---

## 5. 多國語言 (i18n) 與 RWD 窄屏佈局驗收

- [ ] **5.1 i18n 100% 覆蓋**
  - [ ] 全面切換繁中與英文，驗證這六個頁面中，**無任何硬編碼字串**殘留，動態插值正確。
- [ ] **5.2 寬表窄屏局部滾動**
  - [ ] 縮小視窗至 `375px` 行動端寬度，寬表格產生局部水平滾動，文字不擠壓，頁面不被撐大。

---

## 6. 自動化與編譯構建驗收

重構後，必須在終端機運行以下驗收命令，且必須全綠通過：

1. **單元測試**
   ```bash
   npm run test
   ```
   *標準*：所有單元測試（445+ 筆）必須 100% 通過。
2. **語法校驗**
   ```bash
   npm run lint -- --quiet
   ```
   *標準*：零警告、零錯誤。
3. **生產打包**
   ```bash
   npm run build
   ```
   *標準*：成功構建，無編譯錯誤。
