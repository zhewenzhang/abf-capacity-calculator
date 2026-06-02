# v1.55 Yearly Scenario Planning Table — 命令日誌

## 1. 是否已建立並更新命令日誌
✅ 已建立並更新本日誌。

## 2. 年度參數表如何實作

### 資料結構
```ts
interface YearlyAssumption {
  forecastMultiplier: number;   // 預測數量倍率
  priceMultiplier: number;      // 單價倍率
  coreCapacityMultiplier: number; // Core 產能倍率
  buCapacityMultiplier: number;   // BU 產能倍率
}
```

以 `Record<string, YearlyAssumption>` 儲存在 local state，key 為年份字串（如 `"2026"`）。

### UI 呈現
- 使用 HTML `<table>` 渲染年度參數表
- 每列一個參數（預測數量/單價/Core 產能/BU 產能）
- 每欄一個年份
- 每個 cell 使用 `<InputNumber>` 編輯，範圍 0-3，步進 0.01
- 旁邊顯示百分比輔助文字（如 `+18%`、`-10%`）
- Viewer 不可編輯

### 年份控制
- 新增前一年：在最小年份前插入（下限 2000）
- 新增後一年：在最大年份後插入（上限 2100）
- 插入指定年份：InputNumber 輸入，驗證 2000-2100，檢查不重複

### 快速模板
- 預測上修 +10%
- 單價上修 +5%
- 產能延後 -10%
- 產能提前 +10%
- 需求下修 -15%
- 全部重置為 1.00

## 3. 年度結果表如何實作

### 計算流程
1. 對每個年份，取得該年份的 assumption（預設 1.00）
2. **Baseline**：使用原始資料執行 `runCalculation` + `buildBpAnalysis`
3. **Scenario**：
   - 過濾出該年份的 forecasts/capacityPlans
   - 套用倍率（forecastPcs *= forecastMultiplier, unitPrice *= priceMultiplier, corePanelPerDay *= coreCapacityMultiplier, buPanelPerDay *= buCapacityMultiplier）
   - 合併回完整資料集（替換該年份的資料）
   - 執行 `runCalculation` + `buildBpAnalysis`
4. **Delta**：計算差異百分比 / 百分點

### 結果表欄位
| 指標 | 基線 | 情境 | 差異 |
|------|------|------|------|
| 總營收 | ... | ... | +18.0% |
| 總預測數量 | ... | ... | +8.0% |
| 最大 Core 利用率 | ... | ... | +4.2pp |
| 最大 BU 利用率 | ... | ... | -1.5pp |
| 短缺月份 | ... | ... | +2 |
| BP 達成率 | ... | ... | +5.0pp |
| BP 差距 | ... | ... | +300M |

每個年份產生 3 欄（基線/情境/差異），使用 AntD Table 水平滾動。

### 跨年度摘要
- 最大營收提升年份
- 最大 BP 缺口年份
- 最大 Core 瓶頸年份
- 最大 BU 瓶頸年份
- 短缺月份總變化

## 4. 是否修改 calculationEngine.ts
❌ **未修改。** 情境倍率在 scenario 層套用，透過修改 forecasts/capacityPlans 資料後呼叫既有 `runCalculation`。

## 5. 是否保留現有情境入口
✅ 保留。原有的全局 slider 保留為「套用到全部年份」的快速控制工具。

## 6. Viewer read-only 是否保留
✅ 完整保留：
- Viewer 看到唯讀提示
- 所有 InputNumber/Slider/Button 在 `!writable` 時 disabled
- 年份控制按鈕在 `!writable` 時 disabled

## 7. 修改檔案清單

| 檔案 | 修改內容 |
|------|---------|
| `frontend/src/core/yearlyScenario.ts` | **新增** — 年度情境核心引擎（`runYearlyScenario`、`extractDataYears`、`buildScenarioVisibleYears`、`defaultAssumption`、`clampAssumption`） |
| `frontend/src/core/yearlyScenario.test.ts` | **新增** — 8 個測試 |
| `frontend/src/pages/ScenarioPlanning.tsx` | **重寫** — 新增年度參數表、年度結果表、跨年度摘要、快速模板、年份控制 |
| `frontend/src/i18n/zhTW.ts` | 新增 35 個 `scenario.yearly.*` i18n key |
| `frontend/src/i18n/en.ts` | 新增 35 個 `scenario.yearly.*` i18n key |

## 8. 新增/修改測試清單

| 測試 | 狀態 |
|------|------|
| `defaultAssumption` 回傳 1.0 | ✅ |
| `clampAssumption` 限制 [0, 3] | ✅ |
| `clampAssumption` 保留合法值 | ✅ |
| `extractDataYears` 提取唯一年份 | ✅ |
| `extractDataYears` 處理空輸入 | ✅ |
| `buildScenarioVisibleYears` 包含預設範圍 | ✅ |
| `buildScenarioVisibleYears` 包含超出範圍的資料年份 | ✅ |
| `buildScenarioVisibleYears` 年份排序正確 | ✅ |

測試數量：1506（+8）

## 9. Browser QA 截圖路徑或受限原因

```
Browser QA limited due to missing authenticated session.
```

## 10. test / lint / build 結果

| 檢查 | 結果 |
|------|------|
| `npm run test` | ✅ 60 files, 1506 tests passed |
| `npm run lint -- --quiet` | ✅ 0 errors, 0 warnings |
| `npm run build` | ✅ built in 1.26s |

## 11. 紅線檔案是否未修改

| 檔案 | 狀態 |
|------|------|
| `firestore.rules` | ✅ 未修改 |
| `frontend/src/core/calculationEngine.ts` | ✅ 未修改 |

## 12. Commit hash、branch、push 狀態

- **Branch**: `xiaomi/v1-55-yearly-scenario-planning-table`
- **Commit**: 待提交
- **Push**: 待推送

## 13. 是否可交 AGY 驗收

**可交驗收。** 理由：
- ✅ 年度參數表支援 4 個倍率 × N 年
- ✅ 年度結果表按年輸出 baseline/scenario/delta
- ✅ 跨年度摘要卡片
- ✅ 快速模板（預測上修/單價上修/產能延後等）
- ✅ 全局 slider 保留為「套用到全部年份」
- ✅ 未修改 calculationEngine.ts
- ✅ Viewer read-only 保留
- ✅ 8 個新測試全通過
- ✅ test/lint/build 全綠
