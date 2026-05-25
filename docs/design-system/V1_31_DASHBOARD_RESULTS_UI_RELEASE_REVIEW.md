# v1.31 Dashboard & Results UI 一致性整理 — 只讀發布驗收報告

## 一、發布審查結論

- **發布驗收判定**：**Conditional Pass (條件性通過)** ⚠️
  - *判定說明*：v1.31.0 的代碼在視覺對齊、RWD 窄屏 KPI 響應、只讀 Alert UX 警示以及 Loading 的共用套用上，表現極其完美，單元測試、ESLint 與 Vite Build 全線綠燈。
  - *扣分項 / 條件說明*：我們在只讀校驗中發現了一個關鍵的**版本號未同步缺陷** —— 雖然 `package.json` 升級為 `"1.31.0"`，但 `package-lock.json` 依然停留為 `"1.30.0"`，這可能導致安裝依賴時的潛在不一致。因此，本次判定為「條件性通過」，需要 CC 在 v1.31.1 中補做 package-lock 同步。
- **是否需要 v1.31.1 Hotfix**：**是 (Yes)**。
  - *建議*：強烈建議 CC 發布一個微小的 v1.31.1 修補版本，僅用於在本地執行 `npm install` 或者是同步將 `package-lock.json` 版本號升級為 `1.31.0`。
- **是否建議進入 v1.32**：**是**（待 v1.31.1 package-lock 鎖檔同步修正後，即可立刻安全啟動 v1.32.0 數據輸入標準化）。

---

## 二、只讀安全邊界與 Scope 校驗 (紅線防護)

我們逐位元組對比了 commit `02b7b7a` 與 `8dbf602` 的變更，確認了變更高度安全隔離：

- [x] **未修改核心業務代碼**：`frontend/src/core/**` 內的計算引擎、公式、 Attributions、良率矩陣 100% 原始無任何變更。
- [x] **未修改後端服務**：`frontend/src/services/**` 100% 原始無變更，僅 `snapshotService.ts` 中的 APP_VERSION 變量更新。
- [x] **未修改資料庫規則**：`firestore.rules` 未被任何改動，只讀權限邏輯依然嚴密生效。
- [x] **未修改機器合約與 AI Export**：大模型簡報導出 (AI Brief Export) 的 sanitized 屬性、格式、中文提示模板毫無變更，保證外部 LLM 大模型 100% 正常運行。

---

## 三、Dashboard.tsx 視覺驗收

- [x] **根容器 abf-page 套用**：頁面最外圍成功替換為 `<div className="abf-page">`，對齊了邊距 padding。
- [x] **標準 Alert 樣式套用**：
  - Error Alert 已加載 `className="abf-alert-page"`。
  - Data Quality Alert 已加載 `className="abf-alert-section"`。
- [x] **Welcome Card toolbar-card 套用**：新增 SKU 為空時的 welcome 卡片成功整合為 `className="toolbar-card abf-alert-section"`，消除了不一致。
- [x] **Loading 共用化**：原自建 Spin 已替換為 `<PageLoading />`。
- [x] **業務數據完整性**：歡迎卡片、KPIs 數值與折線圖表載入正常，功能完好。

---

## 四、CalculationResults.tsx 視覺驗收

- [x] **根容器 abf-page 套用**：最外層成功替換為 `<div className="abf-page">`。
- [x] **Error Alert 樣式套用**：Error Alert 加上了 `className="abf-alert-page"`。
- [x] **Summary KPIs RWD 窄屏防護 (xs/sm/md/lg)**：
  - 四大核心 KPI Card 已徹底改為響應式網格：
    ```tsx
    <Col xs={24} sm={12} md={6}>
      <MetricCard ... />
    </Col>
    ```
  - 成功消除了 `span={6}` 在窄屏下的擠壓崩潰。
- [x] **Loading 共用化**：成功替換為 `<PageLoading />`。
- [x] **快照 Change Review Viewer 只讀強警示**：
  - 當登入角色為唯讀時，頂部完美渲染藍色 `type="info"` 與 `abf-alert-section` 的只讀警告 Alert，成功對齊 UX 體驗。
- [x] **機器合約與 Table Columns 安全**：Table Columns 資料語義、AI Export buttons 邏輯無任何被改動。

---

## 五、版本號同步性審查 (Version Sync)

| 檔案 | 變更前 | 變更後 | 狀態 |
|---|---|---|---|
| `frontend/package.json` | `"1.30.0"` | `"1.31.0"` | ✅ 同步 |
| `frontend/package-lock.json` | `"1.30.0"` | `"1.30.0"` | ❌ **未同步！** (停留於 1.30.0) |
| `frontend/src/App.tsx` | `v1.30.0` | `v1.31.0` | ✅ 同步 |
| `frontend/src/services/snapshotService.ts` | `v1.30.0` | `v1.31.0` | ✅ 同步 |
| `README.md` | v1.30.0 note | v1.31.0 note | ✅ 同步 |

---

## 六、自動化驗收結果

- **單元測試 (`npm run test`)**：**Pass (通過)** ✅ 445/445 Passed.
- **風格檢查 (`npm run lint -- --quiet`)**：**Pass (通過)** ✅ ESLint Zero warning.
- **編譯打包 (`npm run build`)**：**Pass (通過)** ✅ Vite Build 成功，無 TypeScript 錯誤。
