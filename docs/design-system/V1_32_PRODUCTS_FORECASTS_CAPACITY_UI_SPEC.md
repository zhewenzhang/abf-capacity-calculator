# v1.32 Products / Forecasts / Capacity UI 標準化設計規格

## 總覽

本規格書規範在 `v1.32.0` 中，剩餘三大核心數據輸入模組：**Products (產品管理)**、**Forecasts (需求預測)** 與 **Capacity (產能規劃)** 及其附屬 Spreadsheet Lab 實驗室頁面，如何系統化地套用 v1.30.0 UI System Foundation 基礎建設，從而達成全產品 **100% 的 UI 與 UX 體驗一致性**。

本規範之核心理念：**僅對資料輸入、過濾、表格呈現與操作列按鈕進行「展示層與交互層」的視覺對齊與 i18n 多國語言深化，嚴格禁止修改任何核心公式、資料庫 schema 與後端持久化 API**。

---

## 1. 頁面表格技術架構清晰劃分 (Table vs Spreadsheet)

為了避免表格技術棧混用造成的視覺失焦與交互混亂，v1.32.0 嚴格界定兩種表格的適用邊界：

### 1.1 使用 Ant Design Table (`AppTable`) 的場景
用於常規的主體資料呈現、帶有複雜分頁、過濾、行內單個項目編輯與版本歷史展示。
- **Products.tsx (產品列表)**：SKU 主數據呈現，包含分頁 (pageSize=20) 與篩選。
- **Products.tsx / CapacityPlan.tsx (版本歷史列表)**：版本快照與備份列表 (pageSize=10)。
- **Forecasts.tsx (預測明細列表)**：月度預測 PCS 明細表。

### 1.2 使用 `react-datasheet-grid` (Spreadsheet) 的場景
用於大量、高頻數據的橫縱向格點錄入，支援 Excel 式多單元格複製貼上與批量驗證。
- **ProductsSpreadsheetLab.tsx** (產品批量編輯)
- **ForecastsSpreadsheetLab.tsx** (需求預測批量編輯)
- **CapacitySpreadsheet.tsx** (產能規劃批量編輯)
- **BpTargets.tsx** (營業目標編輯 — 已在 v1.30 實作)

---

## 2. 核心 UI 元件與佈局套用規則

### 2.1 頁面根容器與頁頭
- 待改造正式頁面 (`Products.tsx`、`Forecasts.tsx`、`CapacityPlan.tsx`) 與對應的 Lab 頁面，最外層 **必須** 配置 `className="abf-page"`。
- 頁面頂部 **必須** 引入共用組件 `<PageHeader>`，配置好對應語系的 `title` 與 `description`，移除原 Card 級冗餘標題。

### 2.2 唯讀警示與只讀 UX (Viewer Protection)
- **標準 Alert 警示**：
  - 當 `writable === false`（當前用戶為只讀 Viewer）時，頁面頂部 **必須** 優先渲染標準的 `t('common.readOnlyMode')` 警示，統一套用 `.abf-alert-page`，且 `type` 屬性統一為 `info`。
  - **嚴禁**使用 `type="warning"` 或內聯 style。
- **Spreadsheet 保護套路**：
  - 各個 Lab spreadsheet 欄位 **必須** 配置 `disabled: !writable`。
  - 欄位變更回呼 `onChange` 函式開頭 **必須** 加載守衛：`if (!writable) return;`。
- **按鈕與表單保護**：
  - 唯讀狀態下，所有寫操作按鈕（新增、批量產生、Delete、Save、Restore）一律配置 `disabled={!writable}`。

### 2.3 操作列與保存按鈕 (ActionBar 規範)
- 凡是涉及修改資料的頁面（包括三個正式頁面與三個 Lab 頁面），**必須** 使用共用的 `<ActionBar>` 組件。
- **按鈕順序與顏色約束**：
  - 按鈕位置應 **一律靠左** 緊鄰擺放，順序固定為：
    1. `Save` 按鈕 (主要藍色，`type="primary"`，帶 `SaveOutlined` 圖標)。若數據有 dirty 修改，按鈕文字應動態顯示修改數目，如 `Save (5)`; 若無修改，則設為 `disabled`。
    2. `Discard` 按鈕 (次要灰色，`type="default"`，帶 `UndoOutlined` 圖標)。無修改時設為 `disabled`。
    3. 其餘輔助操作（如 Validate, Batch Set, Import）依次靠右擺放。

### 2.4 空狀態 (Empty State) 規範
- 當查詢無 SKU、無預測、無工廠或載入為空時，**必須** 渲染共用組件 `<EmptyState>`。
- **必須** 提供引導按鈕。例如：預測為空時引導「前往 Products 新增 SKU」或「下載導入範本」。
- **嚴禁** 裸露英文字串或直接渲染 Null。

### 2.5 單位顯示 (Unit Display)
- 表頭、表單旁的單位（如 `pcs`、`pcs/day`、`Million TWD`、`USD`、`mm` 等）一律使用共用組件 `<UnitText>`。
- 表格內部若有單位，可使用 `<UnitText parentheses={false}>`。

---

## 3. 展示層 (Presentation Layer) 數據對齊原則

- **數值靠右對齊**：
  - 在 `Products.tsx`、`Forecasts.tsx` 等所有 Table 表格中，價格 (`unitPrice`)、層數 (`layerCount`)、尺寸與數量欄位，其 Table column 定義中 **必須** 配置 `align: 'right'`。
- **千分位與小數處理**：
  - SKU 價格展示必須調用 `formatCurrency()` 折算，無硬編碼。
  - 預測數量展示必須調用 `formatNumber()` 顯示千分位，小數點限制為 `0` 位（預測 PCS 必須為整數）。

---

## 4. 業務紅線與安全禁令 (v1.32 紅線)

v1.32.0 在進行 UI 一致性標準化時，**嚴禁跨越以下任何邊界**：

1. **🚨 不得變更資料存儲結構 (Firestore Schema)**：
   - 產品的欄位名稱、資料型態（長寬為 float，層數與預測 PCS 為 int，幣別為 'USD'/'TWD'/'CNY'）嚴禁變更。
2. **🚨 不得改動核心業務公式 (Core Formulas)**：
   - `月產能 = 日產能 * 工作天數` 的核心公式嚴禁修改。
   -良率匹配、UPP 計算核心逻辑嚴禁修改。
3. **🚨 不得變更資料持久化 Services 與 Rules**：
   - 嚴禁修改 `firestore.rules` 檔案。
   - `skuService.ts`、`forecastService.ts`、`capacityService.ts` 中的後端交互 API 嚴禁修改。
4. **🚨 不得變更 Forecasts 批量運算邏輯**：
   - 複製年份、依成長率批次產生的底層數據複製演算法嚴禁變更，重構僅限於對其操作按鈕及 UI 彈窗的樣式整合。

---

## 5. v1.32 允許做什麼與不允許做什麼

### 5.1 允許做什麼 (Allowed)
- [x] 為 Products, Forecasts, Capacity 及其 Lab 頁面外層套用 `.abf-page` 容器與 `<PageHeader>`。
- [x] 將所有頁面的保存操作列重構為共用的 `<ActionBar>`，將 Save/Discard 按鈕靠左相鄰。
- [x] 將所有唯讀提示警示 Alert 統一套用 `.abf-alert-page`，`type` 統一為 `info`。
- [x] 所有 Table 的數字列對齊方式配置 `align: 'right'`。
- [x] 所有欄位單位用 `<UnitText>` 渲染。
- [x] 為 `CapacityPlan.tsx` 補充 `Discard` 快照回退按鈕（提升安全性）。
- [x] 全面掃描並消除上述頁面中的任何硬編碼中/英文字串，100% 替換為 `t()`。
- [x] 為所有的格點表格外層包裹 `.spreadsheet-wrapper`，確保窄屏局部滾動流暢。

### 5.2 不允許做什麼 (Forbidden)
- [ ] ❌ 不修改 `firestore.rules`。
- [ ] ❌ 不修改任何 `*Service.ts` 的底層 API。
- [ ] ❌ 不修改 `calculationEngine.ts` 或良率/UPP 公式。
- [ ] ❌ 不修改 SKU 與預測、產能的資料 Schema 與型態。
- [ ] ❌ 不隨意升級第三方套件版本。
