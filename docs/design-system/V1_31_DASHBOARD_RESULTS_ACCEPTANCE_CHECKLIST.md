# v1.31 Dashboard & Results UI 重構驗收清單 (Acceptance Checklist)

本文檔為 `v1.31.0` 版本之驗收清單，旨在確保 **Dashboard (儀表板)** 與 **CalculationResults (計算結果)** 兩大核心頁面在 UI System 一致性深化重構時，**完美對齊視覺體驗**，同時 **100% 守住業務數據與核心公式之紅線**。

---

## 1. 儀表板頁面 (`Dashboard.tsx`) 驗收項目

- [ ] **1.1 頁面容器標準化**
  - [ ] 頁面最外層 DOM 節點是否已成功配置 `className="abf-page"`。
  - [ ] 頂部是否已載入共用 `<PageHeader>` 元件，並傳入正確的 i18n 標題 `t('dashboard.title')` 與描述 `t('dashboard.subtitle')`。
- [ ] **1.2 區塊卡片與層級規範**
  - [ ] 「工廠產能摘要」、「營業目標差距」與「KPI 趨勢」等主要卡片是否已全面重構為共用的 `<SectionCard>` 元件。
  - [ ] 每個區塊卡片的外圍是否使用 `.abf-section` 樣式包裹，提供一致的底外距。
- [ ] **1.3 單位顯示對齊**
  - [ ] 儀表板內所有產能數據旁，括號單位（如 `(panels/day)`、`(pcs)`）是否已替換為共用的 `<UnitText>` 元件。
  - [ ] 是否消除了代碼中任何硬編碼的 `<span>(panels/day)</span>` 拼接。
- [ ] **1.4 備註與說明文字樣式**
  - [ ] 底部所有備註與輔助說明字串是否已套用 `.abf-caveat` 樣式（呈現 12px 灰色斜體）。

---

## 2. 計算結果頁面 (`CalculationResults.tsx`) 驗收項目

- [ ] **2.1 頁面容器與頁頭標準化**
  - [ ] 最外層是否套用 `className="abf-page"`。
  - [ ] 頂部是否成功載入共用 `<PageHeader>`。
- [ ] **2.2 KPI 卡片響應式 (RWD) 斷點驗收**
  - [ ] 尋找 Results 頁面頂部的四大核心 KPI Card。
  - [ ] 驗證已徹底刪除 `<Col span={6}>` 寫法，並改為響應式斷點：
    ```tsx
    <Col xs={24} sm={12} md={6}>
      <MetricCard ... />
    </Col>
    ```
  - [ ] 驗證在窄屏下，四個 KPI Card 會自動垂直折行堆疊，而非橫向擠壓變形。
- [ ] **2.3 導航與 Toolbar 一致性**
  - [ ] Results 頂部 View 切換的 `<Segmented>` 控件是否包裹在 `.abf-toolbar` 類中。
  - [ ] 與 Snapshot Compare 相關的操作元件是否包裹在 `.abf-toolbar` 結構中。
- [ ] **2.4 Loading 與 Error 狀態統一**
  - [ ] 非同步加載時是否引入並返回共用的 `<PageLoading />`。
  - [ ] 錯誤提示 Alert 是否統一套用了 `style={{ marginBottom: 16 }}`。
- [ ] **2.5 只讀權限警示**
  - [ ] 當用戶角色為 `viewer` 時，在 Results 頁面的 Change Review 頂部是否渲染與正式頁面完全一致的唯讀警告 `t('common.readOnlyMode')` Alert。

---

## 3. 🚨 業務紅線與資料安全性驗收 (核心防線)

- [ ] **3.1 核心分析數據無改動**
  - [ ] 驗證在 `CalculationResults.tsx` 中，**未修改**任何涉及 `buildAnalyticsModel()`、`computeChangeImpact()` 或 `buildBpAnalysis()` 的數據來源對應。
  - [ ] Results 頁面中的財務摘要、良率、瓶頸天數、产線配置等數值，與重構前完全一致，無任何精度或數值漂移。
- [ ] **3.2 Risk Brief / AI Export Payload 完整度 (100% 機器合約隔離)**
  - [ ] 驗證在 Results 重構期間，**絕對沒有修改** `buildSanitizedAnalysisContract` 或 `buildCombinedAiBriefPack` 函式。
  - [ ] 驗證匯出的 JSON 資料結構及其屬性（Keys）無任何變動，避免引發 LLM 簡報解析器崩潰。
- [ ] **3.3 資料持久化與 Firestore Rules 安全**
  - [ ] 驗證 `firestore.rules` 未被修改。
  - [ ] 驗證創建 Snapshot 快照或加載快照列表時，資料交互依然完全安全，且 Viewer 權限用戶點擊「新建快照」按鈕依然被嚴密 disabled。

---

## 4. 展示層 (Presentation Layer) 數據防護驗收

- [ ] **4.1 NaN / Infinity 零除防護**
  - [ ] 驗證當利用率、增長率計算分母為 0 或分子為空時，UI 展示層**絕對不會**渲染出字面 `NaN`、`NaN%` 或 `Infinity`。
  - [ ] 驗證百分比與數值顯示已調用安全格式化函式，在 NaN 情況下優雅降級為 `-`。
- [ ] **4.2 空值 (Empty / Null) 回退驗收**
  - [ ] 驗證缺省價格、未配置工廠或缺失預測的月份數據在 UI 上優雅呈現為 `-`，而非空白或拋出 `TypeError` 崩潰。
- [ ] **4.3 貨幣與單位切換**
  - [ ] 驗證 Results 的數值金額能完美響應全域 prefs 貨幣切換（TWD/USD/CNY），並調用 `formatCurrency()` 計算，無硬編碼 `$` 符號。

---

## 5. 多國語言 (i18n) 與 RWD 窄屏佈局驗收

- [ ] **5.1 零硬編碼字串驗收**
  - [ ] 驗證在 `Dashboard.tsx` 與 `CalculationResults.tsx` 中，**沒有**任何裸露的中文字串或英文字串。
  - [ ] 驗證所有的提示、Placeholder、標籤與動態插值（如 `t('forecastsLab.dirtyCells', { count: ... })`）全部綁定 `t()`。
- [ ] **5.2 窄屏折行與水平滾動 (不擠壓寬表)**
  - [ ] 驗證 Toolbar 行 `<Row>` 配置了 `wrap={true}`，窄屏下按鈕折行排列。
  - [ ] 驗證所有 `TimeMatrixTable`（ Results 頁面包含大量寬表）外層均包裹於 `.spreadsheet-wrapper`，在窄屏（如手機 viewport = 375px）下有流暢的水平滾動條，**絕對沒有**硬撐大頁面寬度，也**絕對沒有**擠壓變形寬表欄位。

---

## 6. 編譯與自動化構建驗收

重構完畢後，CC 必須運行以下命令進行自動化驗收，且必須全部綠燈：

1. **單元測試校驗**
   ```bash
   npm run test
   ```
   *標準*：所有單元測試（445+ 筆）必須 100% 通過，無錯誤拋出。
2. **語法與代碼風格校驗**
   ```bash
   npm run lint -- --quiet
   ```
   *標準*：ESLint 檢查必須零警告、零錯誤。
3. **生產環境打包編譯**
   ```bash
   npm run build
   ```
   *標準*：TypeScript 類型檢查成功，Vite 生產編譯打包順利通過，無 chunks 構建錯誤。
