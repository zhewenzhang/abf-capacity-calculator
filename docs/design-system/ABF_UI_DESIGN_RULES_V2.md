# ABF UI Design Rules v2 (深化設計與開發規範)

## 總覽

本規範為 ABF Capacity Calculator 全系統 UI 一致性深化的最高指導準則。未來無論是人類工程師或是 AI 代碼生成助手，在進行新頁面開發、舊頁面重構或 UI 調整時，**必須 100% 嚴格遵守本規範**。所有不符合本規範的 UI 修改皆會被 AGY/QA 審查視為 **Fail / P1 缺陷**。

---

## 1. Page Layout (頁面佈局)

- **根容器標準**：
  - 每個頁面的最外層 DOM 節點必須且只能是單個 `<div>`，並套用 `abf-page` 樣式。
  - **嚴禁**裸 `<div>` 或以 `Card` 作為直接根容器。
- **頁面標題區**：
  - 每個頁面頂部**必須**引入共用組件 `<PageHeader>`。
  - `PageHeader` 必須傳入 `title` 與 `description`（需綁定 i18n 翻譯 `t()`）。
  - 如果頁面有全局級操作（如新增項目、匯出數據），這些操作按鈕應作為 `actions` 屬性傳入 `PageHeader`。
- **頁面內容區**：
  - 內容主體應包裹在帶有 `abf-page-content` 樣式的容器中，以確保標準的最小高度（400px）與流式排版。

---

## 2. Section Hierarchy (區塊與卡片層級)

- **標準區塊**：
  - 頁面內部的各個大功能板塊必須使用 `.abf-section` 加以隔離。每一個 `.abf-section` 預設擁有 `margin-bottom: 16px`。
- **卡片使用準則**：
  - 所有區塊卡片統一使用共用的 `<SectionCard>` 組件。
  - 卡片尺寸固定為 `size="small"`（緊湊風格符合數據密集型產品定位）。
  - **Border / Background 規範**：
    - 在白色主頁面背景下，卡片應設為 `bordered={true}`，提供明確的網格視覺區隔。
    - 若卡片內部嵌套在灰色或其他底色容器中，可設為 `bordered={false}`。
  - **Card Title 規範**：
    - 卡片標題必須符合標準層級，一律為 14px 粗體，對齊色彩為 `rgba(0,0,0,0.88)`。

---

## 3. Table vs Spreadsheet 使用邊界

為了確保極佳的數據錄入體驗與呈現效果，嚴格劃分兩種表格的適用場景：

| 維度 | Ant Design `<Table>` (共用 `AppTable`) | `react-datasheet-grid` (Spreadsheet) |
|---|---|---|
| **核心定位** | 結構化數據呈現、單行修改、唯讀列表、樹狀/嵌套數據。 | Excel 式高頻大量錄入、橫向年度/月度數據展開、多單元格複製貼上。 |
| **適用頁面** | Products 唯讀歷史、Snapshots 列表、KPI 歸因分析子表格。 | Products Lab, Forecasts Lab, Capacity Lab, BpTargets。 |
| **只讀防護** | 通過將操作按鈕設為 disabled，或行內編輯 Form 設為 disabled。 | **必須**同時配置：<br>1. 每個 `keyColumn` 設 `disabled: !writable`<br>2. 變更回呼 `onChange` 配置 `!writable` 攔截早期返回<br>3. 外層套用 `.spreadsheet-wrapper` 避免滾動錯位。 |
| **高度與分頁** | 必須啟用標準分頁 (Pagination)。主列表 pageSize=20；小歷史/側欄列表 pageSize=10。 | 不得分頁。必須固定高度，超出則滾動。高度計算公式：`Math.min(600, window.innerHeight - 280)`。 |

---

## 4. Form / Input Layout (表單排版)

- **複雜編輯與配置**：
  - 當輸入欄位大於等於 3 個時，必須使用 `layout="vertical"` 表單，讓標籤 (Label) 位於輸入框上方。這樣提供了極佳的垂直閱讀流，避免窄屏下的水平擠壓。
- **簡單工具欄過濾**：
  - 當欄位小於 3 個且為純過濾/切換用途時，可使用 `layout="inline"` 或包裹在 `<Space>` 內。
- **數字輸入框對齊**：
  - 所有 `InputNumber` 組件**必須**配置固定的 `width`（常用 `style={{ width: 100 }}`），且輸入數值靠右對齊，精確設定 `precision`（如比率精度設 `precision={2}`）。

---

## 5. Action Bar (操作列)

- **共用 ActionBar 使用**：
  - 凡是涉及 `Save` / `Discard` / `Restore` 等需要資料提交的頁面，**必須**使用共用的 `<ActionBar>` 組件放置於數據格點上方或底部。
  - **嚴禁**使用裸 `<Space>` 或 Row 自建保存欄。
- **按鈕擺放順序與顏色規範**：
  - 按鈕位置應**一律靠左**相鄰排列，擺放順序固定為：
    1. **第一順位 (Primary Button)**: `Save`（主要按鈕，`type="primary"`，常帶 `SaveOutlined` 圖標）。
    2. **第二順位 (Default Button)**: `Discard / Cancel`（次要按鈕，`type="default"`，帶 `UndoOutlined` 或 `CloseOutlined` 圖標）。
    3. **其餘輔助按鈕**: 如 `Validate`、`Import`、`Export` 緊隨其後。
  - 當數據為 `dirty` 時，保存按鈕應動態加上修改項數計數（如 `Save (3)`); 若無修改，保存按鈕與放棄按鈕應同時設為 `disabled`。

---

## 6. Empty State (空狀態)

- **統一組件**：
  - 凡是沒有載入數據、無工廠、無 SKU 或過濾後無結果的視圖，**必須**渲染共用組件 `<EmptyState>`。
  - 嚴禁裸露「No Data」英文字串或硬編碼 Alert 充當空狀態。
- **參數要求**：
  - 必須傳入 `title` 與 `description`。
  - 若能提供引導，必須配置 `actionLabel` 與 `onAction`（例如引導前往「新增工廠」或「導入範本」）。

---

## 7. Loading / Error (加載與錯誤)

- **頁面級加載**：
  - 當頁面非同步加載時，必須在最早期返回 `<PageLoading />`。
  - 加載狀態必須居中並提供標準的遮罩，且配置有 ARIA 的加載狀態標記。
- **區塊級/表格加載**：
  - 表格加載必須使用 Table 內置的 `loading={loading}` 或 `<Spin spinning={loading}>` 覆蓋局部。
- **錯誤捕獲與提示**：
  - 任何非同步拋出的 Error 必須捕獲並存在 `error` 狀態中，以 `<Alert message={error} type="error" showIcon className="abf-alert-page" />` 呈現在頁面頂部。
  - 嚴禁使用瀏覽器 native `alert()`。

---

## 8. Read-only / Permission UX (唯讀權限防護)

- **頂部強警示**：
  - 在 `writable === false`（只讀模式下），頁面頂部**必須**高亮渲染標準的唯讀警告 Alert：
    ```tsx
    {!writable && (
      <Alert
        message={t('common.readOnlyMode')}
        description={t('common.readOnlyDesc')}
        type="info"
        showIcon
        className="abf-alert-page"
      />
    )}
    ```
- **表單與按鈕聯鎖**：
  - 只讀模式下，所有 Form.Item 內部的 Input、Select、Checkbox 等元件必須全部設為 `disabled={true}`。
  - ActionBar 中的 `Save`, `Discard`, `Restore` 按鈕必須全部設為 `disabled={true}`。
- **快照 Change Review 只讀規則**：
  - 即使在只讀模式下，Change Review 依然允許用戶下載 JSON、匯出數據，但「新建版本」等寫操作按鈕必須 `disabled={true}`，且必須渲染上述頂部唯讀警告 Alert。

---

## 9. Unit / Currency Display (單位與貨幣)

- **數值右對齊**：
  - 所有財務、金額、數值列在表格中必須配置 `align: 'right'`。
- **格式化函數規範**：
  - 金額與數值嚴禁直接渲染原始 float 類型。
  - 必須調用 `formatNumber(val)` 進行千分位分割。
  - 貨幣必須調用 `formatCurrency(val, settings)` 獲取精確的外匯換算與符號排版。
- **單位輔助文字**：
  - 單位（如 `Million TWD`, `pcs/day`, `mm`）應使用共用組件 `<UnitText>` 包裹。例如：
    - `<UnitText>Million TWD</UnitText>` -> 顯示為 `(Million TWD)`（標準小字淺色）。
    - 嚴禁硬編碼括號與淺色樣式。

---

## 10. Analysis Caveat / Deterministic Notice (分析提示)

- **分析確定性宣告**：
  - 在數據分析頁（Results 頁）與預測分析中，數據下方或警示欄中必須顯示確定性通知，提示用戶「計算結果基於既定公式與特定參數，非AI隨機生成」。
- **Caveat（備註樣式）**：
  - 所有備註、警告性附屬說明，必須套用 `.abf-caveat` 樣式以實現一致的 `font-size: 12px`, `color: rgba(0,0,0,0.45)`, `font-style: italic` 的標準字體。

---

## 11. Mobile / Narrow Viewport (窄屏適配)

- **Row 必須 wrap**：
  - 所有 Toolbar 中的 Row 組件**必須**配置 `wrap={true}`。
  - 避免窄屏下按鈕溢出，必須使用自動折行。
- **響應式斷點統一**：
  - 全域卡片與區塊列 Col 的佈局，**嚴禁**使用固定 `span`（例如 `span={6}`，在中等螢幕會被極度擠壓錯位）。
  - **必須**配置響應式斷點：`<Col xs={24} sm={12} md={8} lg={6}>`，保證手持設備與小螢幕筆電的佈局完整度。

---

## 12. 多國語言 (i18n) 與硬編碼嚴格禁令

- **i18n 100% 覆蓋**：
  - 所有在 UI 上呈現的標籤、警告、按鈕、輸入框 Placeholder 等，**嚴禁硬編碼任何中文字串或英文字串**。
  - 必須透過 `useI18n()` 呼叫 `t('key')` 來獲取對應的翻譯。
- **翻譯 Key 命名階層**：
  - 系統通用詞彙：歸入 `common.*` (例如 `common.save`, `common.discard`, `common.readOnlyMode`)。
  - 頁面專屬詞彙：歸入 `[pageName].[field]`。例如 BpTargets 的標籤歸為 `bpTargets.*`；參數頁面歸為 `parameters.*`。
- **動態插值標準**：
  - 動態參數（如條數、年份、百分比）必須使用 i18n 插值語法。例如 `t('forecastsLab.dirtyCells', { count: dirtySet.size })`，嚴禁使用 JS 模板字串 `${dirtySet.size}` 與硬編碼文字進行拼接。

---

**規範版本**：v2.0.0
**生效日期**：2026-05-25
**維護團隊**：AGY Design Quality Review Team
