# v1.54.5 BP Target Derived Rows + Year Control — 命令日誌

## 1. 是否已建立並更新命令日誌
✅ 已建立並更新本日誌。

## 2. 是否仍只保存 TWD row

✅ 是。Firestore 僅儲存 `bpTargets.yearlyRevenueTargetsMillionTwd`。

`rowsToBpTargetRecord()` 只從 `metricType === 'targetTwd'` 的 row 抽取值，CNY/USD/YoY 行完全不寫回。

## 3. USD/CNY/YoY 計算公式

| 行 | 公式 | 說明 |
|----|------|------|
| USD | `TWD million / usdToTwdRate(year)` | 使用年度匯率或固定匯率 |
| CNY | `USD million * usdToCnyRate(year)` | 使用年度匯率或固定匯率 |
| YoY | `(currentYearTwd - prevYearTwd) / prevYearTwd * 100` | 前一年無值或為 0 時顯示 null |

匯率來源：
- `getUsdToTwdRate(settings, year)` — 從 `currency.ts`
- `getUsdToCurrencyRate(settings, 'CNY', year)` — 從 `currency.ts`
- 支援 `constant` 和 `yearly` 兩種匯率模式

## 4. 年份新增/插入功能如何實作

| 按鈕 | 行為 |
|------|------|
| 新增前一年 | 在 `visibleYears` 最小年份前插入一年（下限 2000） |
| 新增後一年 | 在 `visibleYears` 最大年份後插入一年（上限 2100） |
| 插入年份 | 透過 InputNumber 輸入指定年份，驗證 2000-2100，檢查不重複 |

實作方式：
- `visibleYears` state 管理當前顯示的年份列表
- `buildVisibleYears(record)` 從 BP record + 預設範圍生成初始年份
- 新增年份後，用 `rebuildRows()` 重新產生 4 行資料
- 新增的空年份 TWD 行為 null，CNY/USD/YoY 自動顯示 null

## 5. Viewer read-only 是否保留

✅ 完整保留：
- Viewer 看到 read-only warning
- `handleRowsChange` 中 `if (!writable) return` 攔截所有編輯
- 年份控制按鈕僅在 `writable` 時顯示
- Derived rows 有 `read-only-row` CSS class，視覺上明顯不可編輯

## 6. 修改檔案清單

| 檔案 | 修改內容 |
|------|---------|
| `frontend/src/core/bpTargetsHelpers.ts` | 新增 `BpSheetMetric`、`buildVisibleYears`、`buildBpSheetRows`、`rowsToBpTargetRecord`、`validateYearInput`；保留舊 API 向後相容 |
| `frontend/src/pages/BpTargets.tsx` | 重寫頁面：4 行 grid、年份控制、派生行 read-only、onChange 攔截 |
| `frontend/src/i18n/zhTW.ts` | 新增 12 個 bpTargets i18n key |
| `frontend/src/i18n/en.ts` | 新增 12 個 bpTargets i18n key |
| `frontend/src/index.css` | 新增 `.read-only-row` 樣式 |
| `frontend/src/core/bpTargetsHelpers.test.ts` | 新增 `buildVisibleYears`、`buildBpSheetRows`、`rowsToBpTargetRecord`、`validateYearInput` 測試 |

## 7. 新增/修改測試清單

| 測試 | 狀態 |
|------|------|
| `buildVisibleYears` 包含預設年份 | ✅ |
| `buildVisibleYears` 包含 record 中更早/晚年份 | ✅ |
| `validateYearInput` 接受合法年份 | ✅ |
| `validateYearInput` 拒絕非法年份 | ✅ |
| `buildBpSheetRows` 產生 4 行 | ✅ |
| USD/CNY 派生計算正確 (TWD=3200, rate=32 → USD=100, CNY=720) | ✅ |
| YoY 計算正確 (2026=100, 2027=120 → +20.0%) | ✅ |
| 前一年為空時 YoY 顯示 null | ✅ |
| `rowsToBpTargetRecord` 只保存 TWD row | ✅ |
| 空年份不保存 | ✅ |
| 負數 throw NEGATIVE_VALUE | ✅ |
| 非數字 throw INVALID_VALUE | ✅ |
| 舊 API `recordToRows` / `rowsToRecord` 向後相容 | ✅ |

測試數量：1498（+17）

## 8. Browser QA 截圖路徑或受限原因

```
Browser QA limited due to missing authenticated session.
```

## 9. test / lint / build 結果

| 檢查 | 結果 |
|------|------|
| `npm run test` | ✅ 59 files, 1498 tests passed |
| `npm run lint -- --quiet` | ✅ 0 errors, 0 warnings |
| `npm run build` | ✅ built in 1.17s |

## 10. 紅線檔案是否未修改

| 檔案 | 狀態 |
|------|------|
| `firestore.rules` | ✅ 未修改 |
| `frontend/src/core/calculationEngine.ts` | ✅ 未修改 |

## 11. Commit hash、branch、push 狀態

- **Branch**: `xiaomi/v1-54-5-bp-target-derived-rows-year-control`
- **Commit**: 待提交
- **Push**: 待推送

## 12. 是否可交 AGY 驗收

**可交驗收。** 理由：
- ✅ 僅保存 TWD row，CNY/USD/YoY 不寫回 Firestore
- ✅ 匯率計算使用既有 `currency.ts` helper
- ✅ 年份可往前/往後/指定插入
- ✅ 空年份不保存成 0
- ✅ Viewer read-only 完整保留
- ✅ 17 個新測試全通過
- ✅ test/lint/build 全綠
- ✅ 向後相容舊 API
