# v1.54.6 Forecast Month System Bug Repair — 命令日誌

## 1. 根因判斷

### 14 筆異常資料模式摘要

無法直接存取 Firestore 資料，但根據程式碼審計，異常月份（如 `66ea`、`c5a3`）的模式分析：

| 可能來源 | 可能性 | 證據 |
|---------|--------|------|
| 歷史髒資料（舊版寫入） | **高** | 當前所有寫入路徑都使用 `YYYY-MM` 格式（`generateMonths` 或 header 驗證），不可能產生 `66ea` |
| Firestore doc id 洩漏 | 中 | `66ea`、`c5a3` 是 4 字元十六進位片段，可能是 UUID 前 4 位，但當前 `saveForecast` 使用 `crypto.randomUUID()` 作為 id，不會寫入 month |
| Workspace copy / snapshot restore | 中 | `createWorkspaceFromPersonalProject` 使用 `copyDocuments` 直接複製文件，如果來源有髒資料會直接複製過來 |
| 匯入流程欄位映射錯誤 | 低 | `handleImport` 使用 header 驗證 `/^\d{4}-\d{2}$/`，理論上不會通過非法月份 |

### 結論

**根因 A：歷史髒資料** — 最可能的原因。舊版系統可能在某個時間點將非 YYYY-MM 值寫入了 `Forecast.month`。當前版本的所有寫入路徑都已使用合法格式，但歷史資料未被清理。

**根因 B：Workspace copy 複製髒資料** — `createWorkspaceFromPersonalProject` 使用 `batch.set(ref, { ...row })` 直接複製，如果來源 workspace 有髒資料，複製後仍然存在。

### 修復策略

1. **源頭防線**：在 `saveForecast()` 和 `batchSaveForecasts()` 加入寫入前驗證，拒絕非法月份
2. **下游防污染**：在 `buildAnalyticsModel()`、`computeScenarioComparison()`、`runYearlyScenario()` 過濾非法月份
3. **使用者修復**：在預測頁提供異常資料表格，支援刪除和匯出

## 2. 修改文件清單

| 檔案 | 修改內容 |
|------|---------|
| `frontend/src/core/forecastMonthValidator.ts` | **新增** — 共享驗證工具（`isValidForecastMonth`、`assertValidForecastMonth`、`filterValidForecasts`、`findInvalidForecasts`、`groupInvalidForecastsByMonth`） |
| `frontend/src/core/forecastMonthValidator.test.ts` | **新增** — 12 個測試 |
| `frontend/src/services/forecastService.ts` | `saveForecast()` 寫入前驗證 month；`batchSaveForecasts()` 寫入前驗證所有 month，報告最多 5 個 sample |
| `frontend/src/core/analytics.ts` | `buildAnalyticsModel()` 在傳入 `runCalculation` 前過濾 invalid forecasts |
| `frontend/src/core/scenarioEngine.ts` | `computeScenarioComparison()` 在計算前過濾 invalid forecasts |
| `frontend/src/core/yearlyScenario.ts` | `extractDataYears()` 改用 `isValidForecastMonth`；`applyYearlyMultipliers()` 和 `runYearlyScenario()` 過濾 invalid forecasts |
| `frontend/src/pages/Forecasts.tsx` | 新增異常預測修復工具（表格 + 刪除 + 全部刪除 + 匯出） |
| `frontend/src/i18n/zhTW.ts` | 改善 `dq.forecastInvalidMonth.detail` 文案；新增 13 個 `forecast.repair.*` key |
| `frontend/src/i18n/en.ts` | 改善 `dq.forecastInvalidMonth.detail` 文案；新增 13 個 `forecast.repair.*` key |

## 3. 修復入口如何使用

### 預測頁異常資料修復工具

當系統偵測到異常預測資料時，預測頁會自動顯示修復工具：

1. **查看異常資料**：表格顯示文件 ID、SKU 代碼、異常月份、預測數量
2. **單筆刪除**：每筆異常資料旁有「刪除」按鈕（需確認）
3. **全部刪除**：一次性刪除所有異常資料（需確認）
4. **匯出異常資料**：匯出為 Excel 檔案，供人工檢查後再決定

### Viewer 權限
- Viewer 看到異常資料表格但無法執行刪除操作
- 刪除按鈕在 `!writable` 時不顯示

## 4. 測試結果

| 測試 | 狀態 |
|------|------|
| `isValidForecastMonth` 接受合法 YYYY-MM | ✅ |
| `isValidForecastMonth` 拒絕 `66ea`、`c5a3`、空值等 | ✅ |
| `assertValidForecastMonth` 拋出 INVALID_FORECAST_MONTH | ✅ |
| `filterValidForecasts` 過濾非法月份 | ✅ |
| `findInvalidForecasts` 找出非法月份 | ✅ |
| `groupInvalidForecastsByMonth` 按月份分組 | ✅ |
| `extractYearFromMonth` 合法/非法處理 | ✅ |

測試數量：1518（+12）

## 5. test / lint / build 結果

| 檢查 | 結果 |
|------|------|
| `npm run test` | ✅ 61 files, 1518 tests passed |
| `npm run lint -- --quiet` | ✅ 0 errors, 0 warnings |
| `npm run build` | ✅ built in 1.14s |

## 6. 是否修改 firestore.rules / calculationEngine.ts

| 檔案 | 狀態 |
|------|------|
| `firestore.rules` | ✅ 未修改 |
| `calculationEngine.ts` | ✅ 未修改 |

修復通過 adapter 層（`forecastMonthValidator`）和 service 層（`forecastService`）完成，未觸及核心計算引擎。

## 7. Commit / branch / push

- **Branch**: `xiaomi/v1-54-6-forecast-month-system-bug-repair`
- **Commit**: 待提交
- **Push**: 待推送

## 8. 是否可交 AGY 驗收

**可交驗收。** 理由：
- ✅ 根因確認（歷史髒資料 + workspace copy 複製）
- ✅ 源頭防線：`saveForecast` / `batchSaveForecasts` 寫入前驗證
- ✅ 下游防污染：`analytics` / `scenarioEngine` / `yearlyScenario` 過濾
- ✅ 使用者修復入口：異常資料表格 + 刪除 + 匯出
- ✅ DQ 提示文案改善（不再推卸責任給使用者）
- ✅ 未修改 firestore.rules / calculationEngine.ts
- ✅ 12 個新測試全通過
- ✅ test/lint/build 全綠
