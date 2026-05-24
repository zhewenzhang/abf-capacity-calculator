# ABF Capacity Calculator UI/UX 與決策級產品體驗評審書 (UI_UX_REVIEW.md)

本文件對項目現有的 **UI 資訊架構、Ant Design 統一產品風格、分頁職責定位、中文化繙譯精度以及大量數據輸入體驗**進行全局評估，並起草下一代 **UI Design Rules v2**，確保系統具備決策級（Decision-grade）產品的高階質感。

---

## 1. 現有 UI 資訊架構與分頁職責盤點 (Information Architecture)

系統現有的分頁結構定義清晰，但部分分頁在職責劃分上存在微幅重疊，建議在下一階段予以精確卡死：

### 📁 6 大分頁職責與優化點評：
1. **Dashboard (儀表板)**：
   - **定位**：全景大盤宏觀趨勢展示。
   - **痛點**：目前 Dashboard 與 Results 頁面的部分圖表職責略有重疊，用戶可能混淆。
   - **優化建議**：Dashboard 應嚴格定位於「Fact 趨勢（如年度營收趨勢、大盤 utilization 曲線）」，不展示任何「歸因與敏感度分析」。
2. **Results & Risk Brief (分析與風險簡報)**：
   - **定位**：**決策級（Decision-grade）核心診斷中心**。
   - **點評**：Risk Brief 的「前三大風險」、「DQ 主要問題」、「角色 Attention」已具備極佳的決策級產品感，文字凝練。
   - **優化建議**：在資訊排版上應進一步增加柵格留白，避免大量表格與警告文字高度擁擠，優化高層投屏大屏幕時的可讀性。
3. **Products (產品與 SKU 編輯)**：
   - **定位**：SKU 物理配置（晶片長寬、層數、價格等）。
   - **點評**： Products Spreadsheet Lab（電子表格編輯）非常實用，但大數據量下存在微幅交互延遲。
4. **Forecasts (預測輸入)** 與 **Capacity (產能計劃)**：
   - **定位**：日產能配置與銷售預測月度數據錄入。
   - **點評**：表格寬度在窄屏/移動端下偶有被硬性撐爆現象，影響移動辦公體驗。
5. **Settings & Parameters (系統參數)**：
   - **定位**：匯率、BP Target 百萬 TWD 及全局常數設置。
   - **點評**：參數入口偏深。由於匯率波動對多幣別折算至關重要，建議在 Results 頁面頂端以輕量 Badge 形式高亮顯示當前全局匯率參數。

---

## 2. Ant Design 與表格一致性缺陷評審 (Consistency Gaps)

### 2.1 AntD 風格一致性缺口：
- **按鈕與 Badge 顏色不一**：在 `CalculationResults` 頁面中，部分拷貝和離線下載按鈕的 Padding 和圖標間距有微小偏差。
- **加載與空數據狀態 (Loading/Empty/Error)**：
  - 部分表格在數據加載中（Loading）缺乏統一的 AntD `<Spin>` 遮罩，加載體驗不連貫。
  - 當前 Workspace 無快照時，部分列表未統一調用 AntD `<Empty>` 占位，而是直接顯示空白塊，缺乏引導。

### 2.2 表格一致性與滾動缺陷：
- **橫向滾動撐爆 (Scroll Defect)**：部分月度預測表格在窄屏下未設置 `<Table scroll={{ x: true }}>`，導致右側操作按鈕溢出屏幕，無法點擊。
- **鍵盤快捷鍵缺失**： Spreadsheet Lab 缺乏類似 Excel 的鍵盤快速鍵導航（如 Enter/Tab 回車或 Ctrl+C/V 批量粘貼），影響錄入效率。

---

## 3. 中文化本地化與術語一致性評估 (Localization & Terms)

經只讀審查，繁體中文版（zh-TW）本地化質量總體較高，但仍有以下**術語一致性缺陷**需在後續開發中卡死：

- **「Attainment」**：部分地方翻譯為「達成率」，部分地方繙譯為「BP 達成率」。建議統一為 **「BP 達成率」**，以與「百萬 TWD BP Target」呼應。
- **「Attribution」**：部分地方翻譯為「歸因」，部分翻譯為「比例分攤」。建議統一為 **「比例歸因」**，並時刻加註「非因果責任」的免責聲明。
- **「Weighted Pressure」**：部分地方翻譯為「加權壓力」，部分直接顯示英文。建議統一為 **「加權產能壓力」**。
- **「Worst Bottleneck Month」**：建議統一翻譯為 **「最大產能瓶頸月份」**，避免生硬抄錄。

---

## 4. 🚀 下一代設計規範 UI Design Rules v2

為了保證後續 Phase 6 至 Phase 8 的開發不會破壞系統的決策級產品質感，我們為 CC 與 AGY 制定了以下 **UI Design Rules v2**：

### 🛡️ UI Design Rules v2 核心規範：
1. **大盤 Delta 統一配色**：
   - **正向/健康改善 Delta**（如營收增加、 Attainment 升高、短缺月份減少）：一律使用 **綠色 (AntD success color)** 搭配 `<ArrowUpOutlined>`。
   - **負向/風險增加 Delta**（如營收減少、 Attainment 下降、短缺月份增加）：一律使用 **紅色 (AntD error color)** 搭配 `<ArrowDownOutlined>`。
2. **大屏幕排版柵格化**：結果頁面的 Risk Brief 卡片一律採用 AntD `<Row gutter={[16, 16]}>` 進行佈局，卡片內部 padding 統一為 `24px`，保證視覺留白與高清晰度。
3. **表格橫向滾動硬性承諾**：所有月度/SKU 表格，必須配置 `scroll={{ x: 'max-content' }}`，絕不允許在窄屏下撐爆網頁寬度。
4. **空數據狀態硬性要求**：任何列表（Snapshot list, SKU list）在無數據時，必須使用 `renderEmpty` 返回標準的 AntD `<Empty description="請先建立快照/SKU數據" />`。
5. **決定性模擬高亮隔離**：任何 deterministic scenario（敏感度價格/產能模擬）的渲染區域，必須使用**橙色 (AntD warning color)** 的細邊框與 Badge 進行高亮隔離，並附帶顯眼的提示「*此為 Sandbox 決定性模擬，未改寫實體數據*」。

---

## 5. 🚫 嚴格禁止的 UI Redesign 方向 (No Redesign Warning)

- **禁止引入任何花哨的 3D 產能沙盤或大屏動畫**：
  - **原因**：這些功能除了拖慢系統加載速度、導致高管演示崩潰外，無法提供任何實質性的「決策級數理價值」，屬於典型的過度工程化，**必須物理禁止**。
- **禁止大改 Dashboard 圖表樣式**：
  - **原因**：目前的 AntD Charts 已經非常簡潔實用，重新設計 UI 樣式無法帶來邊際收益，只會帶來嚴重的 CSS/Less 衝突，**必須推遲或延期**。
