# ABF Capacity Calculator — UI 不一致性 Backlog (2026-05-25)

本清單為 AGY 旁路設計審查產出，旨在盤點當前 `frontend/src` 中所有正式頁面與 Lab 頁面在視覺、佈局、權限 UX、i18n、數字格式化等維度上的不一致問題。本 Backlog 將做為後續版本（v1.31 ~ v1.33）UI 深化與一致性對齊的開發與驗收依據。

---

## 總覽矩陣

| 嚴重度 | 數量 | 核心定義 | 預計解決版本 |
|--------|------|----------|--------------|
| **P0** (阻礙/崩潰) | 0 | 阻礙核心操作或導致頁面崩潰的致命設計缺陷。 | — |
| **P1** (體驗嚴重問題) | 6 | 影響功能信任度、缺少核心 UX 狀態（如 Loading/Error）或嚴重的窄屏排版擠壓。 | v1.31 |
| **P2** (視覺中度不一致) | 16 | 頁面佈局、Toolbar 結構、唯讀模式提示、數字對齊、i18n 缺失或硬編碼。 | v1.31 / v1.32 |
| **P3** (次要視覺打磨) | 8 | 圓角、邊界、字型大小、細微背景色或表單排版佈局的微調。 | v1.32 / v1.33 |

---

## 詳細問題清單（按模組與嚴重度排列）

### 🔴 P1: 體驗與功能信任問題 (影響功能信任)

#### 1. 各頁面 Loading / Error 狀態實現模式碎片化 (A1, A2)
- **問題描述**：全系統無統一的 Loading 覆蓋與 Error 提示模式，導致非同步加載時用戶產生卡頓與不安全感。
  - *Dashboard.tsx (L191-200)*: 自建帶 ARIA 屬性與 tip 文字的 `<div role="status"><Spin size="large" />`。
  - *Products/Forecasts/Capacity*: 使用 Ant Table 內建 `loading={loading}`。
  - *CalculationResults.tsx (L778-779)*: 直接 `<Spin size="large" />`，無居中、無遮罩、無 ARIA。
  - *CalculationResults.tsx (L784) 的 Error Alert*: **缺少 marginBottom**，導致若出錯時與下方元件直接粘連。
- **頁面位置**：`Dashboard.tsx`, `Products.tsx`, `Forecasts.tsx`, `CapacityPlan.tsx`, `CalculationResults.tsx`
- **影響功能信任**：是。Loading 的視覺斷檔會讓用戶以為程序卡死或點擊無效。
- **建議修法**：所有頁面非同步加載統一使用已定義的 `PageLoading` 組件 (`components/common/PageLoading.tsx`)；Results 頁面的 Error Alert 統一補上 `style={{ marginBottom: 16 }}`。
- **適合版本**：v1.31

#### 2. Products Spreadsheet Lab 大量硬編碼英文字串 (J1)
- **問題描述**：整個頁面未使用任何 `useI18n()` 或 `t()`。所有按鈕、狀態標籤、提示內容（如 `Save Valid Rows`, `Validate`, `+ 20 Blank Rows`, `Reload`, `Discard Changes`, `Export CSV`, `Read-only Mode`, `You are a viewer...` 等）均為硬編碼英文字串。
- **頁面位置**：`ProductsSpreadsheetLab.tsx` L271-L325
- **影響功能信任**：是。繁中用戶在中文環境下會直接看到全英文操作介面，且提示缺乏在地化，直接降低企業級產品的專業信任感。
- **建議修法**：導入 `useI18n()`，將所有靜態與動態字串全部抽離至 `en.ts` 與 `zhTW.ts` 中。
- **適合版本**：v1.31

#### 3. CalculationResults KPI 卡片窄屏下固定 Col Span 擠壓崩潰 (I1)
- **問題描述**：Results 頁面的 4 個 KPI 核心卡片使用了固定 `<Col span={6}>`，不支援響應式斷點。
- **頁面位置**：`CalculationResults.tsx` L788-808
- **影響功能信任**：是。在窄屏/平板或行動裝置上，4 個卡片將會被擠壓在同一行，導致數值遮擋 or 換行錯位，界面徹底破裂。
- **對比基準**：*Dashboard.tsx (L277-327)* 使用 `<Col xs={24} sm={12} md={8} lg={6} xl={4}>` 響應式斷點。
- **建議修法**：Results 頁面的 KPI Col 改用與 Dashboard 一致的響應式斷點 `<Col xs={24} sm={12} md={6}>`。
- **適合版本**：v1.31

#### 4. Products 正式頁面與 Lab 頁面的 Save / Discard 按鈕擺放順序與 Toolbar 結構背離 (D1, D2, C1)
- **問題描述**：Products 正式頁面與 Lab 頁面操作列擺放順序、位置混亂：
  - *Forecasts.tsx / BpTargets.tsx*: Save 與 Discard 按鈕緊緊相鄰，置於 ActionBar 左側或 Toolbar 內。
  - *CapacityPlan.tsx*: Save 置於右側且包在 Popconfirm 中，**無 Discard 按鈕**（一旦在 grid 修改便無法撤銷，必須 Reload）。
  - *ProductsSpreadsheetLab.tsx*: 按鈕順序為 `Save` -> `Validate` -> `+20 Blank Rows` -> `Reload` -> `Discard` -> `Export`。Discard 與 Save 被遠遠隔開。
- **頁面位置**：`Products.tsx`, `ProductsSpreadsheetLab.tsx`, `CapacityPlan.tsx`
- **影響功能信任**：是。沒有 Discard 按鈕或 Discard 被藏在後面會讓用戶感到修改資料具有高風險性，無法隨時反悔。
- **建議修法**：統一使用 `ActionBar` 共用組件。將 `Save`（主色）與 `Discard / Cancel`（次色）按鈕固定靠左相鄰放置。
- **適合版本**：v1.31

#### 5. 所有正式與 Lab 表格數字欄位未對齊與千分位格式化混亂 (E1, E2)
- **問題描述**：財務及產能核心數據的對齊與格式化在不同頁面極端碎片化：
  - *Products.tsx L437*: `unitPrice` 欄位**沒有** `align: 'right'`，`layerCount` 欄位使用 `align: 'center'`。
  - *ProductsSpreadsheetLab.tsx*: 所有數字列（Price、Layers、Chip L/W）全為默認左對齊。
  - *Products.tsx L438*: 價格顯示為 `${v?.toFixed(2)} ${r.unitPriceCurrency}`（無千分位）。
  - *CalculationResults.tsx*: 數字列正確加了 `align: 'right'` 且使用 `.toLocaleString()`。
- **頁面位置**：`Products.tsx`, `ProductsSpreadsheetLab.tsx`, `Forecasts.tsx` 等所有表格列
- **影響功能信任**：是。表格中的數值忽左忽右、大小位數不對齊，會造成極差的數據可讀性，使決策者難以快速比對數值。
- **建議修法**：所有數值列統一加上 `align: 'right'`；引入共用數值格式化函數 `formatNumber(value, decimals)` 與貨幣格式化函數 `formatCurrency(value, currency)` 統一調用。
- **適合版本**：v1.31

#### 6. Change Review 快照歷史在 Viewer 唯讀模式下缺乏 UX 警示提示 (H1)
- **問題描述**：唯讀角色進入 `Change Review` 時，「新建版本」按鈕被 `disabled={scope.role === 'viewer'}`，但是**整個頁面沒有展示任何「只讀模式」的頂部 Alert 提示**。
- **頁面位置**：`CalculationResults.tsx` L1595-L1625
- **影響功能信任**：否。
- **對比基準**：*Products, Forecasts, Capacity, BpTargets* 均在頂部有醒目的 `t('common.readOnlyMode')` Info/Warning Alert。
- **建議修法**：當 `scope.role === 'viewer'` 時，在 Change Review 頂部加載與正式頁面相同的 `.abf-alert-page` 提示，告知用戶目前僅為查看模式。
- **適合版本**：v1.31

---

### 🟠 P2: 視覺與交互中度不一致問題 (體驗打磨)

#### 7. 根容器缺少統一的 Padding 與 CSS 容器類 (B1)
- **問題描述**：全系統 12 個頁面中，只有新版 `BpTargets.tsx` 使用了 `<div className="abf-page">` 根容器。其他頁面如 `Dashboard.tsx`, `Parameters.tsx` 等均為 bare `<div>` 或 bare `<Card>`，其內距 padding 與對齊全靠 Ant Design Default 或內聯樣式。
- **頁面位置**：`Dashboard.tsx`, `Parameters.tsx`, `CalculationResults.tsx` 等
- **建議修法**：將所有頁面的最外層 `<div>` 統一套用 `.abf-page` 類，確保 100% 的頁邊距與背景對齊一致性。
- **適合版本**：v1.31

#### 8. 沒有正式頁面使用標準 `PageHeader` 組件 (B2)
- **問題描述**：系統中封裝了優秀的 `PageHeader` 組件（包含標題、描述、自定義 Action 按鈕），但在所有正式頁面中套用率為 **0%**。各頁面標題或是沒有、或是寫在 Card Title 內，各頁面標題層級極不一致。
- **頁面位置**：所有頁面
- **建議修法**：為每個正式頁面與 Lab 頁面頂部引入 `<PageHeader>` 組件，移去冗餘的卡片級標題。
- **適合版本**：v1.32

#### 9. 沒有正式頁面使用 `EmptyState` 共用組件 (B3)
- **問題描述**：當數據為空時，各頁面自建空狀態，樣式混亂：
  - *Dashboard.tsx*: 自建 `border: 1px solid #91d5ff` 的 welcome card。
  - *Products.tsx*: `<Text type="secondary">{t('common.noData')}</Text>`。
  - *CapacityPlan.tsx*: `<Text type="secondary">{t('capacity.noVersions')}</Text>`。
  - *CalculationResults.tsx*: 用 `<Alert message={...} type="info" />` 來充當空狀態。
- **頁面位置**：各數據加載頁面
- **建議修法**：統一採用 `EmptyState` 組件來提供一致的插圖、文字、引導操作按鈕。
- **適合版本**：v1.32

#### 10. Read-only Alert 唯讀警示樣式與 Type 不一致 (H1)
- **問題描述**：即使在套用了唯讀警示的頁面中，其 `type` 屬性也各不相同：
  - *Products.tsx, Forecasts.tsx, BpTargets.tsx*: 使用 `type="info"` 與 `className="abf-alert-page"`。
  - *ProductsSpreadsheetLab.tsx, ForecastsSpreadsheetLab.tsx, CapacitySpreadsheet.tsx*: 使用 `type="warning"` 與 `style={{ marginBottom: 8 }}`。
- **頁面位置**：各 Lab 頁面與正式頁面
- **建議修法**：統一規定唯讀模式警示為 `type="info"`，並統一套用 `.abf-alert-page`，移除內聯 `style`。
- **適合版本**：v1.31

#### 11. View Mode (視圖切換) 控件類型與外觀不一致 (C2)
- **問題描述**：各頁面對「視圖切換」的交互控件使用完全不同：
  - *Forecasts.tsx*: 使用 `<Space.Compact>` + 多個 `<Button>`。
  - *CapacityPlan.tsx*: 使用 `<Radio.Group optionType="button" buttonStyle="solid">`。
  - *CalculationResults.tsx*: 使用 `<Segmented>`。
- **頁面位置**：`Forecasts.tsx`, `CapacityPlan.tsx`, `CalculationResults.tsx`
- **建議修法**：統一使用 Ant Design 的 `<Segmented>` 作為頁面內/區塊內視圖切換的第一優先組件，其圓角與現代感最契合系統。
- **適合版本**：v1.32

#### 12. 貨幣與單位顯示（如 USD / TWD / CNY）硬編碼與位置混亂 (E3)
- **問題描述**：單位與貨幣有時在前（如 `$1,000`），有時在後（如 `1,000 USD`，`12.5 M TWD`），有時使用 Statistic 屬性，且大量硬編碼貨幣符號。
- **頁面位置**：`Products.tsx`, `CalculationResults.tsx`
- **建議修法**：所有貨幣與單位顯示應統一使用 `<UnitText>` 或呼叫 `formatCurrency()`，並配合 i18n 來決定符號在前在後。
- **適合版本**：v1.32

#### 13. Card Title 的 Size 與 Border 屬性不一致 (F1, F2)
- **問題描述**：在同一個Results頁面中，有些 Card 設為 `bordered={false} size="small"`；而在 Dashboard 與 Parameters 頁面中卻是預設的大尺寸、帶邊框 Card。
- **頁面位置**：`Dashboard.tsx`, `Parameters.tsx`, `CalculationResults.tsx`
- **建議修法**：制定標準：頁面主要區塊卡片（Section-level Card）統一使用 `SectionCard` 或設為 `size="small"`，背景有灰色底時使用 `bordered={false}`，背景為純白底時使用 `bordered={true}`。
- **適合版本**：v1.32

#### 14. 未使用 `AppTable` 共用組件 (G1)
- **問題描述**：系統中提供了 `AppTable`（標準化 size="small", scroll, pagination=false 等），但正式頁面皆直接裸用 Ant `<Table>`，導致表格緊湊度、邊框線樣式不統一。
- **頁面位置**：所有含表格的正式頁面
- **建議修法**：將 Results 中的子表格、Products 的表格與版本歷史表格等，統一替換為 `<AppTable>`。
- **適合版本**：v1.32

#### 15. 色彩代碼硬編碼與 design token 碎片化 (K2)
- **問題描述**：代碼中存在大量硬編碼色彩字串（如 `'#cf1322'`, `'#3f8600'`, `'#52c41a'`, `'#1890ff'`），而沒有調用 Ant Design 的 `theme.useToken()`。
- **頁面位置**：`CalculationResults.tsx`, `CapacityPlan.tsx`
- **建議修法**：全部重構為使用 `const { token } = theme.useToken();`，調用 `token.colorSuccess`, `token.colorError`, `token.colorPrimary` 等。
- **適合版本**：v1.31

#### 16. i18n 翻譯 Key 的命名模式不一致 (J1)
- **問題描述**：部分頁面的 i18n 使用非常混亂，有些使用 `common.*`，有些使用頁面專屬的 `forecasts.*`，而有些新加的翻譯命名為 `forecastsLab.*`，甚至有些直接在業務代碼中寫死中文/英文。
- **頁面位置**：`zhTW.ts`, `en.ts`, `Parameters.tsx`
- **建議修法**：將系統級別（如 Save, Cancel, Discard, Read-only）的翻譯一律歸入 `common.*`，頁面級別嚴格按照 `[pageName].[field]` 命名。
- **適合版本**：v1.31

#### 17. 數字與貨幣格式化缺少全域統一的 utility helper (E2)
- **問題描述**：有的數字格式化寫 `v.toLocaleString()`，有的寫 `v.toFixed(1)`，有的寫 `v.toLocaleString(undefined, { minimumFractionDigits: 1 })`。
- **建議修法**：在 `core/` 下建立專屬的 `numberFormat.ts`，封裝所有數值、百分比、貨幣的格式化函數。
- **適合版本**：v1.31

#### 18. Products Lab 與 Forecasts Lab 頁面標題區域 ExperimentalBanner 與 Row/Card 重複堆疊 (B1)
- **問題描述**：Lab 頁面同時使用了 `<ExperimentalBanner>` 與包含實驗標記 Tag 的 `<Card size="small">` Toolbar，導致頂部出現雙重「實驗功能」提示，視覺冗餘。
- **頁面位置**：`ProductsSpreadsheetLab.tsx`, `ForecastsSpreadsheetLab.tsx`
- **建議修法**：既然已有了 `<ExperimentalBanner>`，Toolbar 中的橘色 `ExperimentOutlined` Tag 應該移去，或將 banner 整合進頁面 Header 中。
- **適合版本**：v1.32

#### 19. 表單 Form Layout 排版類型衝突 (L3)
- **問題描述**：在 `Parameters.tsx` 中，參數配置 Form 使用了 `layout="inline"`；而在 `Products.tsx` 的編輯彈窗中使用的是 `layout="vertical"`。這在系統中產生了表單輸入體驗的分裂。
- **建議修法**：統一規範：單行或 3 個以下的簡單輸入使用 `layout="inline"`；複雜的資料配置與編輯一律使用 `layout="vertical"`。
- **適合版本**：v1.32

#### 20. BpTargets 與 Lab 表格中 React DataSheet Grid 缺少外層 wrapper 導致橫向滾動條不一致 (B1)
- **問題描述**：DataSheetGrid 擁有自己的橫向滾動條。如果直接放在 Card 中且無 wrapper，在某些螢幕寬度下滾動條樣式與卡片邊框會產生遮擋或溢出。
- **頁面位置**：`BpTargets.tsx`, `ProductsSpreadsheetLab.tsx`
- **對比基準**：*CapacitySpreadsheet.tsx L279* 加上了 `<div className="spreadsheet-wrapper">`，完美解決了滾動遮擋。
- **建議修法**：為所有 DataSheetGrid 卡片的外層統一加上 `.spreadsheet-wrapper` div。
- **適合版本**：v1.31

#### 21. 日期時間格式化（如快照歷史日期）在不同頁面實作不同
- **問題描述**：有些寫 `new Date(date).toLocaleString()`，有些用自製格式，沒有一致的時間格式。
- **建議修法**：統一封裝 `formatDateTime` 函數，繁中預設採用 `YYYY-MM-DD HH:mm:ss`，英文採用 `MM/DD/YYYY HH:mm:ss`。
- **適合版本**：v1.32

#### 22. RangePicker 欄位預設文字硬編碼
- **問題描述**：`placeholder={['From', 'To']}` 硬編碼，未對齊多國語言。
- **建議修法**：改為 `[t('common.from'), t('common.to')]`。
- **適合版本**：v1.31

---

## 🟡 P3: 次要視覺打磨問題 (不影響功能信任)

#### 23. Parameters 唯讀警告與頂部區塊間距微小偏差
- **問題描述**：`Parameters.tsx` 唯讀警告與下方 `Space` 行距為 16px，但與上方 `WorkspaceSettingsPanel` 行距過緊，因為外圍缺少統一的區塊包裹。
- **建議修法**：使用 `.abf-section` 加以隔離。
- **適合版本**：v1.32

#### 24. Table 分頁筆數 (pageSize) 參數不一致 (G2)
- **問題描述**：`Products.tsx` table pageSize=20，版本歷史 table pageSize=10，Results 某些表格為 12 或 20，缺乏統一套路。
- **建議修法**：統一規範：常規卡片/版本列表固定為 10 筆；主數據/列表固定為 20 筆；月度/年度財務數據固定為 12 筆（對應 12 個月）。
- **適合版本**：v1.32

#### 25. Card bordered 屬性使用混亂 (F2)
- **問題描述**：Results 使用 `bordered={false}`，而 Products / Forecasts 預設帶邊框。
- **建議修法**：在 CSS 中為卡片樣式做主體規範，確保全局投影與邊框感知一致。
- **適合版本**：v1.33

#### 26. Products Lab 編輯 Form 背景色硬編碼 (L1)
- **問題描述**：Inline Form 背景色硬編碼 `background: '#f0f5ff'` 與 `borderColor: '#91d5ff'`。
- **建議修法**：改用 Ant Design info 背景色 token：`token.colorInfoBg`。
- **適合版本**：v1.32

#### 27. Dashboard Welcome Card 背景色硬編碼 (L2)
- **問題描述**：`background: '#e6f7ff', border: '1px solid #91d5ff'` 硬編碼。
- **建議修法**：改用 `token.colorInfoBg`。
- **適合版本**：v1.32

#### 28. Products 正式頁面 Add Form (Inline Layout) 與 Edit Form (Vertical Layout) 輸入風格不一致 (L3)
- **問題描述**：新增 SKU 在列表頂部用 inline 表單，而編輯 SKU 使用 vertical 表單彈窗。這導致同一個實體 SKU 的輸入與欄位先後順序不一致。
- **建議修法**：統一 SKU 的表單結構，無論是新增還是編輯，皆使用一致的 Form Schema。
- **適合版本**：v1.32

#### 29. BpTargets 與 Lab 表格中 React DataSheet Grid 圓角硬編碼邊界問題
- **問題描述**：DataSheetGrid 邊框與 Ant Card 邊框堆疊，且 DataSheetGrid 四角預設為直角，與 Ant Card 圓角 (6px) 產生割裂。
- **建議修法**：在 `.spreadsheet-wrapper` 中寫入 CSS 以修剪 DataSheetGrid 四角為圓角，使其完美貼合外層 Card。
- **適合版本**：v1.31

#### 30. Results Change Review 選擇器和 Statistic 擠壓 (I2)
- **問題描述**：`<Col span={10}>`, `<Col span={4}>` 在中等螢幕（平板）下會發生擠壓。
- **建議修法**：使用 `xs={24} md={10}` 響應式佈局。
- **適合版本**：v1.32
