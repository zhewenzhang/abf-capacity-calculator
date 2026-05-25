# UI 一致性 Roadmap

本文檔規劃 ABF Capacity Calculator UI 一致性改進的版本路徑。

---

## v1.30 UI Foundation (已完成)

### Scope
- 建立 CSS utilities 基礎
- 新增 ActionBar, UnitText 元件
- 補強 common components props passthrough
- 試點：BpTargets, ForecastsSpreadsheetLab

### 禁止事項
- ❌ 不修改 services
- ❌ 不修改 core formulas
- ❌ 不修改資料語義

---

## v1.31 Dashboard / Results 統一 (預計)

### Scope
- Dashboard.tsx 套用 abf-page, PageHeader, MetricCard 標準化
- CalculationResults.tsx 套用 abf-section, abf-alert-section
- 統一 Risk Brief 區塊樣式
- Parameters.tsx 套用 ActionBar

### 禁止事項
- ❌ 不修改計算邏輯
- ❌ 不修改分析結果語義
- ❌ 不改變 BP 達成率計算

---

## v1.32 Input Pages 統一 (預計)

### Scope
- Products.tsx 套用 abf-page, ActionBar
- Forecasts.tsx 套用 abf-page, ActionBar
- CapacityPlan.tsx 套用 abf-page, abf-section
- CapacitySpreadsheet.tsx 套用 abf-page
- ProductsSpreadsheetLab.tsx 套用 abf-page

### 禁止事項
- ❌ 不修改 CRUD 邏輯
- ❌ 不修改驗證規則
- ❌ 不修改批量操作行為

---

## v1.33 Mobile / Narrow Viewport Polish (預計)

### Scope
- 響應式設計優化
- 窄螢幕表格處理
- 手機版操作優化

### 禁止事項
- ❌ 不因響應式刪減功能
- ❌ 不改變資料結構

---

## 版本規劃原則

1. **每版本只做一件事**：UI 改進不與功能開發混合
2. **低風險優先**：先改純 UI 頁面，後改資料頁面
3. **可回滾**：每版本獨立，可單獨回滾
4. **測試覆蓋**：不改邏輯，但確保視覺回歸測試

---

## 衡量指標

| 指標 | v1.30 | v1.31 | v1.32 | v1.33 |
|------|-------|-------|-------|-------|
| 已套用頁面數 | 2 | 5 | 9 | 9 |
| Common components 數 | 10 | 10 | 12 | 12 |
| CSS utilities 數 | ~25 | ~25 | ~25 | ~30 |
| 行為變更 | 0 | 0 | 0 | 0 |

---

**文件版本**：v1.30.0
**更新日期**：2026-05-25
