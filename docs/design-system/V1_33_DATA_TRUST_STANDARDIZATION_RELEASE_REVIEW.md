# v1.33 Data Trust & Display Standardization — 只讀發布驗收報告 (Release Review)

## 一、發布審查結論

- **發布驗收判定**：**Pass (通過)** ✅
- **依賴鎖檔同步狀態**：**100% 同步**。
  - `package.json` 中的 version 已成功升級為 `"1.33.0"`。
  - `package-lock.json` 中的 version **完美同步改為 `"1.33.0"`**。CC 在本輪中完美吸取了前幾輪的教訓，在發布前在本地執行了依賴鎖檔同步，特予讚賞！
- **是否需要 v1.33.1 Hotfix**：**否**。代碼構建極端穩定，無依賴問題。
- **是否存在 P0/P1 問題**：**0 個**。
- **是否建議進入 v1.34**：**是 (Yes)**。可立刻進入下一階段（Parameters 頁頭標準化、ActionBar 整合或 Login/Setup 等邊角頁面收官）。

---

## 二、只讀安全邊界與展示層隔離校驗 (紅線防護)

經對比 ac5c0b4 提交之變更，本版本完美守住了資料安全性紅線：

- [x] **未修改核心業務代碼**：`frontend/src/core/calculationEngine.ts` 及其產能、需求公式、 derived 邏輯 100% 原始無變更。
- [x] **未修改服務層**：`skuService.ts`、`forecastService.ts`、`capacityService.ts` 的 batchSave 服務未改，確保保存資料無格式污染。
- [x] **未修改資料庫規則**：`firestore.rules` 未被任何改動，數據模型 100% 隔離安全。
- [x] **未污染資料保存路徑**：
  - Formatter 僅被引進於展示端的 `TimeMatrixTable.tsx` 與 `YearlyHealthMatrix.tsx` 中。
  - 格式化後的特殊字串 `'—'` (MISSING em dash) **絕對沒有**被寫入 React 的可編輯/可輸入狀態，也 **絕對沒有** 被寫入 Firestore 資料庫。
- [x] **未污染分析合約與 AI 導出**：`buildAnalyticsModel()`、`buildRiskBrief()` 與 `buildSanitizedAnalysisContract()` 未被 formatters 污染，機器人合約 JSON payload 100% 維持原樣。

---

## 三、Formatter 語義與代碼品質校驗

`core/formatters.ts` 封裝設計極具水準，代碼品質優異：

1. **無效值與 NaN 攔截**：`isValidNumber` 嚴格將 `null`、`undefined`、`NaN`、`Infinity` 正確識別為無效值，並統一格式化輸出為 `'—'` (em dash)，界面無 NaN 浮游。
2. **0 值防護**：0 為 valid number，會正確格式化輸出為 `'0'` 或 `'0.0%'`，**絕對不會被 conflate 為缺失資料**。
3. **formatPercent 精度**：預設固定為 1 位小數（如 `86.3%`），符合財務分析常規。
4. **formatUtilization 溢出防護**：當值大於等於 `overflowThreshold` (999) 時，正確回退渲染為溢出標籤（預設為 `>100%`），且利用率色碼 `getUtilizationColor` 匹配精確。
5. **formatBpMillionTwd 固定性**：金額格式化直接在 `Million TWD` 上固定，不會受 display currency 的 TWD/USD/CNY 首選項干擾而產生折算錯亂。
6. **formatCurrencyDisplay 折算精度**：在 `USD` 時保留 2 位小數，`TWD` 和 `CNY` 時顯示 0 位小數（如 NT$39,506 和 ¥8,929），極其合理。

---

## 四、Bug 修復與 UI 展示層驗收

- [x] **0 值缺失 Bug 完美修復**：
  - `TimeMatrixTable.tsx` L49: `if (!isValidNumber(val)) return '—';`
  - 驗證已成功修正 `0` 值被 Conflate 為 missing 的 Bug。現在 0 會在時間矩陣表中正確展示為 `0`，而真正的無效值優雅降級為 `—`。
- [x] **YearlyHealthMatrix 格式對齊**：年度健康矩陣已成功重構為調用統一 formatters，字體對齊與格式規範一致。

---

## 五、Version Sync (版本號同步性審查)

| 檔案 | 變更前 | 變更後 | 狀態 |
|---|---|---|---|
| `frontend/package.json` | `"1.32.0"` | `"1.33.0"` | ✅ 同步 |
| `frontend/package-lock.json` | `"1.32.0"` | `"1.33.0"` | ✅ **100% 同步！** ( package-lock 已對齊) |
| `frontend/src/App.tsx` | `v1.32.0` | `v1.33.0` | ✅ 同步 |
| `frontend/src/services/snapshotService.ts` | `v1.32.0` | `v1.33.0` | ✅ 同步 |
| `README.md` | v1.32.0 note | v1.32.0 note | ❌ **未更新！** (缺少 v1.32.0 與 v1.33.0 note) |

*說明*：雖然 package-lock 與代碼版本號 100% 同步，但 README 中漏掉了 `v1.32.0` 與 `v1.33.0` 的 release notes。這評定為一個 P2 級別的中度不一致缺陷，建議 CC 在下個版本中一併補上。

---

## 六、自動化驗收結果

- **單元測試 (`npm run test`)**：**Pass (通過)** ✅ 445/445 Passed (單元測試包含 formatters 專屬測試 formatters.test.ts 285行，驗證充分)。
- **風格檢查 (`npm run lint -- --quiet`)**：**Pass (通過)** ✅ ESLint Zero warning.
- **編譯打包 (`npm run build`)**：**Pass (通過)** ✅ Vite Build 成功，無 TypeScript 錯誤。
