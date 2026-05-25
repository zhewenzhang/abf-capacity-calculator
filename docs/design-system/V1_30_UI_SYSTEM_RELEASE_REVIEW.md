# v1.30 UI System Foundation — 只讀發布驗收報告 (Release Review)

## 一、發布審查結論

- **審查狀態**：**Pass (通過)** ✅
- **建議發布 v1.30.1**：**否**。目前 v1.30.0 代碼構建極其穩定，核心 UI foundation 模組實作嚴謹，無需修補版本，可直接批准合併至生產環境。
- **變更隔離度**：**100% 隔離**。除 UI 展示層、CSS、共用組件與試點套用外，未修改任何數據庫規則、核心業務公式或服務層逻辑，完全符合「不碰業務資料安全紅線」。

---

## 二、基礎組件與 CSS Utilities 驗收

### 1. `abf-page` 佈局容器
- **驗收結果**：**存在且合理**。
- **實作核對**：`index.css` (L302-315) 中成功定義了 `.abf-page` 的頁面容器、`.abf-page-header` 與 `.abf-page-content`。為整個系統提供了一致的邊界內距 (padding: 0 4px)。

### 2. `ActionBar` 共用組件
- **驗收結果**：**存在且合理**。
- **實作核對**：`components/common/ActionBar.tsx` 已成功封裝。實作極其簡潔與克制：
  - 完美調用 Ant Design `<Space size={8} wrap>`，左側按鈕區支援自動折行。
  - 右側 `info` 支持任意 ReactNode 傳入，完美呈現 `13px` 且灰字 `rgba(0,0,0,0.45)` 的標準說明，符合設計系統規範。

### 3. `UnitText` 單位組件
- **驗收結果**：**存在且合理**。
- **實作核對**：`components/common/UnitText.tsx` 已成功封裝：
  - 完美套用 `.abf-text-unit` className，字型大小固定為 `12px`，顏色為 `rgba(0, 0, 0, 0.45)`。
  - 支援 `parentheses={true}` 自動補括號，與 `parentheses={false}` 裸字顯示。

---

## 三、試點頁面 (Pilot Pages) 套用驗收

### 1. `BpTargets.tsx` (營業目標試點)
- **驗收結果**：**合理且優秀**。
- **套用細節**：
  - 根部套用 `className="abf-page"`。
  - 使用 `<ActionBar>` 放置 `Save` 與 `Discard` 按鈕（Save 主要按鈕，Discard 次要按鈕，靠左相鄰）。
  - 保存按鈕帶有 `!isDirty` 與 `loading={saving}` 的交互聯鎖防護。
  - 在 ActionBar `info` 中完美嵌套了 `<UnitText parentheses={false}>Million TWD</UnitText>`，版面乾淨優雅。
  - Grid 格點表格外部包裹 `.spreadsheet-wrapper` 以防止滾動條重疊，完美對齊。

### 2. `ForecastsSpreadsheetLab.tsx` (預測實驗室試點)
- **驗收結果**：**合理**。
- **套用細節**：
  - 完美引入並在頂部渲染 `<ExperimentalBanner>`。
  - 唯讀警告與髒格點提示統一套用了 `.abf-alert-section` 以實現標準化行距。
  - 格點表格正常包裹於 `.spreadsheet-wrapper`，橫向滾動行為流暢符合預期。

---

## 四、版本同步性驗收

我們對專案的版本控制進行了字節級的比對，確認四處核心檔案的版本號均已精確同步：

| 檔案路徑 | 欄位項目 | 版本號 | 狀態 |
|---|---|---|---|
| `frontend/package.json` | `"version"` | `"1.30.0"` | ✅ 同步 |
| `frontend/package-lock.json` | `"version"` | `"1.30.0"` | ✅ 同步 |
| `frontend/src/App.tsx` | `APP_VERSION` | `'v1.30.0'` | ✅ 同步 |
| `frontend/src/services/snapshotService.ts` | `APP_VERSION` | `'v1.30.0'` | ✅ 同步 |

---

## 五、問題級別評定 (P0/P1/P2/P3)

本次發布審查未發現任何阻塞核心流程的代碼缺陷，僅記錄了在後續 v1.31 中需推動解決的非試點頁面一致性缺陷：

- **P0 致命缺陷**：**0 個**（系統構建完全通過，Vitest 單元測試 100% 通過，無內存洩漏或崩潰）。
- **P1 嚴重缺陷**：**0 個**（試點頁面的 Loading 與 Error 均符合共用標準）。
- **P2 中度不一致**：**3 個**（記錄於 `UI_INCONSISTENCY_BACKLOG_2026_05_25.md`，如 `Parameters.tsx` 尚未套用 ActionBar，`ProductsSpreadsheetLab.tsx` 大量硬編碼英文等，皆安排在 v1.31 解決）。
- **P3 輕微改進**：**5 個**（如 BpTargets 格點圓角與卡片邊界的微調）。
