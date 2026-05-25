# CC 任務指令：v1.31 Dashboard & Results UI 一致性重構

請全程使用中文回覆，在獨立的工作區與分支中執行本任務。

---

## 任務定位

這是一項 **UI 視覺一致性重構任務**。你的目標是將 `v1.30.0 UI System Foundation` 的基礎建設與樣式規範，完美實作到 **Dashboard (儀表板)** 與 **CalculationResults (計算結果)** 兩個核心頁面中。

重構的重點在於：**展示層 (Presentation Layer) 視覺對齊、RWD 窄屏修補、多國語言 i18n 完整套用、以及消除硬編碼色彩**。

---

## ⚠️ 嚴格開發紅線 (Red Lines)

為確保系統與 Firestore 數據的 100% 安全，本任務設有以下嚴格禁令：

1. **🔴 嚴禁修改計算公式 (Core Formulas)**：不得修改 `core/calculationEngine.ts` 或任何與產能、需求、價格、良率相關的底層數學模型與計算函式。
2. **🔴 嚴禁修改資料庫結構 (Firestore Rules & Schema)**：不得改動 `firestore.rules`，不得變更 Firestore 存儲格式，保存配置時必須完整保留其他參數屬性。
3. **🔴 嚴禁改動 AI 匯出數據結構 (AI Export Payload)**：在優化 Results UI 時，不得修改 `buildSanitizedAnalysisContract` 或 `buildCombinedAiBriefPack` 輸出的 JSON 資料規格，此結構供大語言模型直接解析，不可損毀。
4. **🔴 嚴禁隨意升級版本**：不要修改 `package.json` 中的依賴版本。

---

## 開發任務清單 (CC Step-by-Step)

### 第一步：儀表板頁面重構 (`Dashboard.tsx`)
1. **根容器與頁頭**：
   - 將外層裸 `<div>` 替換為 `<div className="abf-page">`。
   - 頂部引入共用組件 `<PageHeader>`，配置 `title={t('dashboard.title')}` 與 `description={t('dashboard.subtitle')}`。
2. **區塊卡片**：
   - 將「工廠產能摘要」、「營業目標差距」與「KPI 趨勢」三大區塊統一改為共用組件 `<SectionCard>`。
   - 每個區塊卡片外圍套用 `.abf-section` 樣式。
3. **單位與 Caveat 整理**：
   - 所有單位符號改用 `<UnitText>` 渲染（例如 `Million TWD`、`panels/day`）。
   - 底部說明字串套用 `.abf-caveat`。

### 第二步：計算結果頁面重構 (`CalculationResults.tsx`)
1. **根容器與頁頭**：
   - 根部替換為 `<div className="abf-page">`。
   - 頂部引入 `<PageHeader>`，配置好翻譯描述。
2. **KPI 卡片響應式 (RWD) 修復**：
   - 尋找 `Results L788-808` 附近的四大指標 KPI Card。
   - 將固定的 `<Col span={6}>` 徹底重構為響應式斷點：
     ```tsx
     <Col xs={24} sm={12} md={6}>
       <MetricCard ... />
     </Col>
     ```
3. **視圖切換與 Toolbar 一致性**：
   - 將頂部視圖切換的 `<Segmented>` 控件及相關按鈕包裹至 `.abf-toolbar` 與 `.abf-toolbar-actions` 結構中。
4. **表格與卡片緊湊化**：
   - 所有分析結果的 Card 統一設為 `size="small"`。
   - 表格外層包裹 `.abf-table-wrapper` 容器，以支援窄屏滾動。
5. **Loading 與 Error 狀態統一**：
   - Results 頁面非同步加載時，一律統一使用 `<PageLoading />` 共用組件。
   - 錯誤提示 Alert (L784) 必須配置 `style={{ marginBottom: 16 }}`。
6. **快照唯讀 UX 警示**：
   - 在 Change Review 視圖中，若 `writable === false`（唯讀模式下），頂部必須高亮渲染標準的 `t('common.readOnlyMode')` 警示 Alert，與主頁面一致。
7. **硬編碼色彩替換**：
   - 移除程式碼中硬編碼的 `'#cf1322'`, `'#52c41a'`, `'#3f8600'` 等色彩字串。
   - 改用 Ant Design 的 `theme.useToken()`，透過 `token.colorSuccess` 與 `token.colorError` 獲取。

### 第三步：展示層 NaN 與空值防護
1. **NaN / Infinity 攔截**：
   - 確保 Results 與 Dashboard 渲染的任何百分比或利用率欄位，均通過防護函數過濾，若為 `NaN` 或 `Infinity`，優雅降級渲染為 `-`。
2. **多國語言 100% 覆蓋**：
   - 檢查並消除 Results 頁面中任何硬編碼的英文字串，全部使用 `t()` 機制實施在地化。

---

## 驗收標準 (CC Self-Check)

- **自動化測試**：`npm run test` 全部通過。
- **語法校驗**：`npm run lint -- --quiet` 零警告。
- **生產編譯**：`npm run build` 成功構建，無編譯出錯。
- **視覺校驗**：
  - [ ] 縮小瀏覽器至 375px 行動端寬度，KPI 卡片正常換行為 1 列，Toolbar 折行無溢出。
  - [ ] 唯讀模式下進入 Calculations 頁面，頂部有標準的唯讀警告，且 Change Review 的「新建版本」按鈕 disabled。
  - [ ] 切換多國語言，Dashboard 與 Results 沒有任何殘留的硬編碼中文字串或英文字串。
