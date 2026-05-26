# v1.32 數據輸入頁面 UI 標準化 — 只讀發布驗收報告 (Release Review)

## 一、發布審查結論

- **發布驗收判定**：**Conditional Pass (條件性通過)** ⚠️
  - *判定說明*：v1.32.0 的代碼在產品管理（單價靠右對齊與貨幣展示對齊）、需求預測（Segmented 視圖切換與 Discard 放棄變更補強）、產能規劃（abf-page 根容器與唯讀 Alert 對齊）、以及 Spreadsheet 實驗室頁面的唯讀保護（!writable、handleChange 守衛、info Alert 對齊）上，表現極其完美，單元測試、ESLint 與 Vite Build 全線綠燈。
  - *扣分項 / 條件說明*：我們在只讀校驗中發現了一個關鍵的**版本號未同步缺陷** —— 雖然 `package.json` 成功升級為 `"1.32.0"`，但 `package-lock.json` 依然停留為 `"1.31.0"`，這可能導致安裝依賴時的潛在不一致。因此，本次判定為「條件性通過」，需要 CC 在 v1.32.1 中補做 package-lock 同步。
- **是否需要 v1.32.1 Hotfix**：**是 (Yes)**。
  - *建議*：強烈建議 CC 發布一個微小的 v1.32.1 修補版本，僅用於在本地執行 `npm install` 或者是手動將 `package-lock.json` 版本號升級為 `1.32.0`。
- **是否可以進入下一階段 (如 v1.33)**：**是**（待 v1.32.1 package-lock 鎖檔同步修正後，即可立刻安全啟動下一階段對 Parameters 或其他邊界頁面的 UI 標準化改造）。

---

## 二、只讀安全邊界與 Scope 校驗 (紅線防護)

我們逐位元組對比了 commit `36a4871` 的變更，確認了變更高度安全隔離：

- [x] **未修改核心業務代碼**：`frontend/src/core/**` 內的計算引擎、良率矩陣、UPP 算法 100% 原始無變更。
- [x] **未修改後端服務**：`frontend/src/services/**` 100% 原始無變更，僅 `snapshotService.ts` 中的 APP_VERSION 變量更新。
- [x] **未修改資料庫規則**：`firestore.rules` 未被任何改動，數據模型 100% 原始。
- [x] **未修改 AI 導出與 Snapshot 邏輯**：AI Brief Export 的 sanitized JSON 結構與 60 個月/180 個月的時間語義 100% 完好隔離。

---

## 三、表格技術分工校驗

本版本精確遵循了設計規格，表格分工表現完美：

- [x] **Products.tsx**：維持使用 **Ant Design Table**，保障了產品分頁 (pageSize=20) 與篩選的完整性。
- [x] **Forecasts.tsx**：維持使用 **Ant Design Table**，明細展示正確。
- [x] **CapacityPlan.tsx**：維持使用 **Ant Design Table / 原正式頁結構**，Month/Quarter/Year 分頁與聚合完好。
- [x] **ProductsSpreadsheetLab.tsx**：100% 使用 **react-datasheet-grid**，格點複製貼上順暢。
- [x] **ForecastsSpreadsheetLab.tsx**：100% 使用 **react-datasheet-grid**。
- [x] **CapacitySpreadsheet.tsx**：100% 使用 **react-datasheet-grid**。

---

## 四、Viewer True Read-only (唯讀防護) 驗收

對 `ProductsSpreadsheetLab.tsx`、`ForecastsSpreadsheetLab.tsx` 與 `CapacitySpreadsheet.tsx` 進行了深度漏洞盤點，唯讀保護牢不可破：

- [x] **寫按鈕聯鎖**：Save 與 Discard 按鈕在 Viewer 模式下均已嚴密配置 `disabled={!writable}`。
- [x] **格點欄位鎖定**：所有的 DataSheetGrid columns 均已嚴密配置 `disabled: !writable`。
- [x] **onChange 守衛安全**：
  - `ProductsSpreadsheetLab.tsx` L151: `if (!writable) return;`
  - `ForecastsSpreadsheetLab.tsx` L196: `if (!writable) return;`
  - `CapacitySpreadsheet.tsx` L165, 171: `if (!writable) return;`
  - 以上 onChange 函式開頭成功加載了 writable 守衛，直接攔截了複製貼上修改！
- [x] **唯讀警示 Alert 一致性**：
  - 唯讀警示 Alert 的 `type` 在六個頁面中均已**統一改為 `"info"`**，且 `className` 統一套用為 `"abf-alert-page"` 或 `"abf-alert-section"`，成功消除了警告類型分裂的缺陷。

---

## 五、UI 一致性與價格欄位驗收

- [x] **根容器 abf-page 套用**：`CapacityPlan.tsx` 與 `CapacitySpreadsheet.tsx` 最外圍成功套用 `className="abf-page"`。
- [x] **Alert 樣式套用**：新增錯誤 Alert 與唯讀 Alert 統一套用 `.abf-alert-page`，排版對齊。
- [x] **格點水平滾動防護**：DataSheetGrid 表格外部成功套用 `.spreadsheet-wrapper` 類，平板與手機窄屏下具備局部水平滾動條，不擠壓寬表，頁面無破裂溢出。
- [x] **Loading 與 EmptyState 共用化**：加載狀態一律統一為 `<PageLoading />`，為空數據引導導入共用 `<EmptyState>`。
- [x] **Forecasts.tsx 視圖切換與 Discard 按鈕**：
  - 視圖切換控件成功升級為現代感 `<Segmented>`。
  - **成功補強了 `Discard` （放棄變更，UndoOutlined）按鈕與 `handleDiscardEdits` 快照回退邏輯**，成功解決了 Forecasts 按鈕順序不一致與缺少撤銷手段的嚴重缺失！
- [x] **Products 單價欄位對齊**：
  - 產品列表中的單價欄位 (`unitPrice`) 成功配置了 `align: 'right' as const`。
  - 金額展示成功保持了既有 correct 貨幣換算（toFixed(2) 及 currency），無硬編碼 `$` 符號錯誤與手動拼接錯誤。

---

## 六、版本號同步性審查 (Version Sync)

| 檔案 | 變更前 | 變更後 | 狀態 |
|---|---|---|---|
| `frontend/package.json` | `"1.31.0"` | `"1.32.0"` | ✅ 同步 |
| `frontend/package-lock.json` | `"1.31.0"` | `"1.31.0"` | ❌ **未同步！** (停留於 1.31.0) |
| `frontend/src/App.tsx` | `v1.31.0` | `v1.32.0` | ✅ 同步 |
| `frontend/src/services/snapshotService.ts` | `v1.31.0` | `v1.32.0` | ✅ 同步 |
| `README.md` | v1.31.0 note | v1.32.0 note | ✅ 同步 |

---

## 七、自動化驗收結果

- **單元測試 (`npm run test`)**：**Pass (通過)** ✅ 445/445 Passed.
- **風格檢查 (`npm run lint -- --quiet`)**：**Pass (通過)** ✅ ESLint Zero warning.
- **編譯打包 (`npm run build`)**：**Pass (通過)** ✅ Vite Build 成功，無 TypeScript 錯誤。
