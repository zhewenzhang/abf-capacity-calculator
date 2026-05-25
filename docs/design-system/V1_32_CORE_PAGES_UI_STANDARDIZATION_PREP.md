# v1.32 剩餘核心頁面 UI 標準化準備文件

## 總覽

本文檔為 `v1.32.0` 版本的旁路設計與規範準備，旨在為 **Products (產品)**、**Forecasts (需求預測)** 與 **CapacityPlan (產能規劃)** 等剩餘核心正式頁面與 Lab 頁面，提供標準化 UI 基礎套用的設計草案。

本準備文件將指引開發人員在完成 v1.31（儀表板與計算結果統一）後，如何流暢且安全地將 UI 基礎建設推廣至全專案，最終實現 **100% 的 UI 一致性**。

---

## 1. 待重構核心頁面現狀盤點

截至 v1.31.0，以下頁面仍存在較多 UI 基礎建設未套用或碎片化問題：

| 頁面 | 檔案路徑 | 當前主要不一致問題 |
|---|---|---|
| **Products (產品)** | `Products.tsx` | 1. 根容器無 `.abf-page` 與 PageHeader<br>2. 數字單價列未靠右對齊，且無千分位格式化<br>3. 唯讀警告 type 不一致，且 Save 按鈕位於行內，非 ActionBar 結構。 |
| **Forecasts (預測)** | `Forecasts.tsx` | 1. Toolbar 卡片缺少 `wrap` 屬性，窄屏溢出<br>2. 視圖切換使用 Space.Compact 按鈕群而非 Segmented<br>3. 保存按鈕在左側，Discard 沒有與之相鄰統一放置。 |
| **Capacity (產能)** | `CapacityPlan.tsx` | 1. 裸 `Card` 充當標題與 Toolbar，無 ActionBar<br>2. 唯讀警告為內聯 style，非 `.abf-alert-page`<br>3. 數據格點修改無 Discard 按鈕，無法撤銷變更。 |

---

## 2. v1.32.0 統一設計草案與套用細則

在 v1.32 中，上述頁面必須遵循 `ABF_UI_DESIGN_RULES_V2.md` 的核心設計規則進行以下改造：

### 2.1 Products.tsx (產品管理) 改造規格
- **佈局與頁頭**：
  - 外層裸 `<div>` 改為 `<div className="abf-page">`。
  - 頂部載入 `<PageHeader title={t('products.title')} description={t('products.subtitle')} />`。
- **表格與對齊**：
  - 將 SKU Table 替換為共用的 `<AppTable>`。
  - 單價欄位 (`unitPrice`) 加上 `align: 'right'`，並調用 `formatCurrency()` 來展示千分位及貨幣符號。
  - 良率與尺寸等欄位展示對齊。
- **ActionBar 整合**：
  - 移除表格內部的 inline Add/Edit 操作按鈕。
  - 統一使用 `<ActionBar>` 放置主要 Save 與 Discard 操作，按鈕靠左相鄰。

### 2.2 Forecasts.tsx (需求預測) 改造規格
- **Toolbar 響應式優化**：
  - 頂部篩選與過濾卡片套用 `.abf-toolbar` 結構，並且 `<Row>` 必須設定 `wrap={true}` 避免窄屏溢出。
  - 視圖切換按鈕替換為標準的 `<Segmented>` 組件，提升現代感。
- **按鈕佈局對齊**：
  - 引入 `<ActionBar>`，使 Save（主要藍色）與 Discard（次要白色）緊緊相鄰靠左放置，並加載 dirty 項數計數。

### 2.3 CapacityPlan.tsx (產能規劃) 改造規格
- **只讀 UX 標準化**：
  - 將內聯 `style={{ marginBottom: 16 }}` 的唯讀 Alert 替換為標準的 `className="abf-alert-page"`，並統一 type 為 `info`。
- **提供 Discard 功能**：
  - 目前產能規劃修改在 grid 中直接發生且不可撤銷，這極易造成操作失誤。
  - 在 v1.32 重構時，必須在頂部 Toolbar 引入 `ActionBar`，並實作 `handleDiscard` 快照回退邏輯，提供 Discard 按鈕以提升用戶操作安全感。

---

## 3. 🚨 v1.32 開發安全約束 (業務紅線)

在進行上述頁面視覺標準化時，開發者**必須嚴格遵守**以下紅線：

1. **🔴 不得改動 SKU 驗證核心規則 (`core/validation.ts`)**：
   - 產品的欄位驗證、UPP 計算以及 Derived 良率評估公式，在 Products 重構時**絕對不可**變更。
2. **🔴 不得改動預測與產能的批量保存服務 (`batchSaveForecasts` / `batchSaveCapacityPlans`)**：
   - 重構僅限於 UI 表單與格點包裝，底層批次寫入資料庫的服務邏輯與資料格式（Payload）必須保持 100% 原始不變。
3. **🔴 不得修改 Firestore Schema 與權限邏輯**：
   - canEdit 的 Workspace 權限機制在全專案中保持高度隔離，只讀防護依舊生效。
