# v1.31 Dashboard & Results UI 統一設計規格

## 總覽

本規格書規範在 `v1.31.0` 中，核心頁面 **Dashboard (儀表板)** 與 **Results (計算結果)** 該如何系統化地套用 v1.30.0 UI System Foundation 基礎建設，從而消除碎片化的硬編碼、非響應式佈局以及視覺對齊不一致問題。

本規範之核心指導原則是：**僅在「展示層 (Presentation Layer)」進行視覺重構與語意優化，絕對不得改動底層資料架構、Firestore Schema 與核心計算公式**。

---

## 1. 頁面佈局與區塊層級 (Section Hierarchy)

### Dashboard.tsx 佈局標準
1. **根部容器**：將外層裸 `<div>` 改為 `<div className="abf-page">`。
2. **頁頭導入**：引進 `<PageHeader>` 組件：
   - `title`: `t('dashboard.title')` 或 「容量儀表板」。
   - `description`: `t('dashboard.subtitle')` 或 「全工廠產能、需求與營業目標核心指標摘要」。
3. **區塊卡片**：
   - Dashboard 內的「三大核心卡片」（工廠產能摘要、營業目標差距、以及 KPI 趨勢）必須套用共用的 `<SectionCard>`。
   - 統一尺寸為 `size="small"`，並配置統一的外距間距 `.abf-section`。

### CalculationResults.tsx 佈局標準
1. **根部容器**：改為 `<div className="abf-page">`。
2. **頁頭導入**：引入 `<PageHeader>` 組件：
   - `title`: `t('results.title')` 或 「計算結果與分析」。
   - `description`: `t('results.subtitle')` 或 「基於當前產品、需求預測與產能規劃之全方位財務與產線瓶頸分析結果」。
3. **Toolbar 與 View 切換**：
   - 導航與 Tab 切換統一使用 `<Segmented>`，並包裹在 `.abf-toolbar` 類中。
   - 移除所有自建按鈕組 space。
4. **區塊卡片**：
   - Results 頁面高達 2000 多行，內部包含大量卡片（財務摘要、產線瓶頸、Attribution 分析、Change Review 快照管理、AI Brief 匯出等）。
   - 所有卡片統一繼承 `<SectionCard>` 屬性，尺寸固定為 `size="small"`。
   - 依據底色配置 `bordered={false}`（ Results 頁面包含灰色卡片底，應維持 bordered={false} 配合 border-radius: 6px 的一致卡片投影）。

---

## 2. 核心 UI 元件使用規則

在 `v1.31` 中，必須全面以共用組件取代硬編碼排版：

### 2.1 MetricCard (KPI 卡片)
- **使用場景**：用於 Dashboard 頂部核心指標（如總產能、總需求、目標缺口）以及 Results 頁面的財務四大指標卡。
- **統一屬性**：
  - 統一尺寸與內部字型，避免 Results 的 KPI 卡片與 Dashboard 的卡片大小不一。
  - **響應式斷點約束 (RWD)**：必須 100% 廢除 Results 頁面的 `<Col span={6}>` 寫法，統一重構為：
    ```tsx
    <Col xs={24} sm={12} md={6}>
      <MetricCard ... />
    </Col>
    ```

### 2.2 UnitText (單位組件)
- **使用場景**：所有數值、價格、產能數據標題或欄位旁，必須渲染 `<UnitText>`。
- **格式規範**：
  - 產能單位：`<UnitText>panels/day</UnitText>` -> 呈現為 `(panels/day)`。
  - 金額單位：`<UnitText>Million TWD</UnitText>` 或 `<UnitText>USD</UnitText>`。
  - 若已在表格欄位標題內，可使用 `<UnitText parentheses={false}>mm</UnitText>`。
  - **嚴禁**在代碼中以拼接括號的形式硬編碼單位。

### 2.3 EmptyState (空狀態)
- **使用場景**：
  - Dashboard 當加載無數據、或 Results 頁面當分析合約 (`analysisPayload`) 尚未生成時。
  - 必須渲染 `<EmptyState>`：
    ```tsx
    <EmptyState
      title={t('results.emptyTitle')}
      description={t('results.emptyDesc')}
    />
    ```

### 2.4 Data Caveat (分析確定性與備註宣告)
- **使用場景**：Results 頁面的財務分析與瓶頸預警模組底部。
- **統一規範**：
  - 必須展示確定性附註：`* {t('results.deterministicNotice')}`（提示計算結果非隨機AI生成，而是基於精確數學公式運算）。
  - 所有附屬註解、公式備註、數據邊界宣告，必須套用 `.abf-caveat` 類，呈現為 12px 灰色斜體。

---

## 3. 展示層 (Presentation Layer) 數據處理原則

對於 NaN、空值 (Empty/Null) 以及單位顯示，v1.31 確立以下**唯讀展示層**過濾與回退機制：

### 3.1 NaN / 零除錯誤防護 (NaN Guard)
- **原則**：當由於分子為 0 或數據缺失導致利用率、增長率計算出 `NaN` 或 `Infinity` 時，業務層可能直接回傳 `null` 或原始 `NaN`。
- **展示層處理**：
  - **嚴禁**在 UI 上渲染字面 `NaN`、`NaN%` 或 `Infinity`。這會讓決策者對產品的專業性產生懷疑。
  - 所有百分比利用率或增長率展示，必須通過保護函數過濾：
    ```typescript
    export const formatPercentage = (value: number | null | undefined): string => {
      if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return '-';
      }
      return `${(value * 100).toFixed(1)}%`;
    };
    ```
  - 對於非百分比的數值 NaN，UI 一律優雅降級顯示為 `-`。

### 3.2 空值 (Empty / Null) 回退機制
- **原則**：缺失數值在系統中以 `null` 或 `undefined` 存檔。
- **展示層處理**：
  - **金額/單價**：若單價為空，降級顯示為 `-` 或者是根據對應貨幣設置回退至預設匯率。
  - **產能規劃**：若月份規劃未填寫，視為 `0` 或者是展示 `-`，但計算時按業務公式降級（UI層不修改原數據，僅展示 `-`）。

### 3.3 貨幣與單位切換 (Currency Auto-switch)
- **原則**：Results 的數值顯示必須精確遵循用戶的首選項 `prefs.displayCurrency`（USD / TWD / CNY）以及 `currencySettings` 的折算率。
- **展示層處理**：
  - 必須調用 `formatCurrency(val, currencySettings)`。
  - 匯率顯示應與年份精確對齊。當為常數匯率時，使用固定常數折算；當為年度匯率時，折算財務總值必須依據當前指標年份取得精確的匯率，若年份不存在，回退至常數匯率，不得崩潰。

---

## 4. UI 視覺重構的業務紅線 (Red Lines)

為確保系統之穩定性與正確性，v1.31.0 的 UI 優化重構**嚴禁跨越以下紅線**：

1. **🚨 不得修改計算公式 (Core Formulas)**：
   - 嚴禁修改 `frontend/src/core/calculationEngine.ts` 或其附隨的任何公式與 derive 邏輯。
   - 嚴禁調整 UPP (Unit per Panel) 計算公式。
   - 嚴禁修改 Yield Estimate (良率評估) 矩陣匹配邏輯。
2. **🚨 不得改動資料庫結構 (Firestore Schema & Rules)**：
   - 嚴禁修改 `firestore.rules` 檔案。
   - 儲存或加載專案 parameters / SKUs / forecasts 時，不得改變任何屬性的資料型態。
3. **🚨 不得變更 AI Export Payload (合約合規性)**：
   - `buildSanitizedAnalysisContract` 與 `buildCombinedAiBriefPack` 輸出的 JSON 資料結構是用於外部大模型解析的「機器人合約」，其屬性名稱、鍵值關係已固定。
   - **嚴禁**在優化 Results UI 時，修改這兩個 export 函數所輸出的資料規格與 JSON payload，避免導致大模型 Brief 解析崩潰。
4. **🚨 不得修改 Workspace 權限邏輯 (canEdit)**：
   - 控制只讀或可編輯依然使用既有的 `canEdit(scope.role)`，嚴禁自創角色判斷鏈。
