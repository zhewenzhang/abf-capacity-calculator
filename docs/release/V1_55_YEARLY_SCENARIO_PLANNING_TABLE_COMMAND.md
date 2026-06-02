# v1.55 Yearly Scenario Planning Table Command

## 0. 任務背景

目前「情境模擬」頁面只有全局 slider：

- 預測數量
- 單價
- Core 產能
- BU 產能

但實際業務情境通常每一年不同，例如：

- 2027 產能建置延後
- 2028 產能補上
- 2027 forecast 上修
- 2029 單價下降
- 2030 訂單消失或恢復

因此需要將情境模擬升級為「年度情境規劃表」：

- 左側：每年假設參數
- 右側/下方：每年結果對比

本任務是強化模擬預測功能，不是全站 UI 重構，不是更換表格技術選型。

## 1. 目標

建立 v1.55 年度情境規劃能力：

1. 使用者可以按年份調整模擬參數。
2. 系統依照每年參數套用情境。
3. 產出每年的結果對比表。
4. 保留現有全局 slider/倍率作為快速填表工具或 fallback。
5. 不修改核心計算引擎公式。

## 2. 必須遵守

1. 全程使用中文回報。
2. 必須建立並持續更新命令日誌：
   - `docs/release/V1_55_YEARLY_SCENARIO_PLANNING_TABLE_COMMAND_LOG.md`
3. 不得修改：
   - `firestore.rules`
   - `frontend/src/core/calculationEngine.ts`
   - Firebase Functions / DeepSeek runtime
4. 不得新增大型依賴。
5. 不得刪除現有情境模擬入口。
6. 不得破壞 Viewer read-only。
7. 不得改動 Firestore schema，除非先在命令日誌中提出原因並停止等待確認。
8. 本次情境可以先保持前端 session/local state，不強制保存到資料庫。

## 3. 必查文件

請先閱讀：

- `frontend/src/pages/Scenario.tsx`
- `frontend/src/core/scenarioEngine.ts`
- `frontend/src/core/operationalScenario.ts`
- `frontend/src/core/impactAnalysis.ts`
- `frontend/src/core/bpTargets.ts`
- `frontend/src/core/currency.ts`
- `frontend/src/types/index.ts`
- `frontend/src/i18n/zhTW.ts`
- `frontend/src/i18n/en.ts`

請用 `rg "scenario|情境|multiplier|forecastMultiplier|priceMultiplier|core|bu" frontend/src` 盤點現有情境相關邏輯。

## 4. 產品設計

頁面分成三塊：

### 4.1 情境設定

新增或整理一個 Scenario Header：

- 情境名稱
- 情境說明（可選）
- 年份範圍
- 快速重置
- 執行情境

情境名稱可先存在 local state，不必寫入 Firestore。

### 4.2 年度參數表

新增年度參數表，格式類似：

| 參數 | 2026 | 2027 | 2028 | 2029 |
|---|---:|---:|---:|---:|
| 預測數量倍率 | 1.00 | 1.08 | 1.12 | 1.05 |
| 單價倍率 | 1.00 | 1.05 | 1.03 | 1.00 |
| Core 產能倍率 | 1.00 | 0.95 | 1.10 | 1.15 |
| BU 產能倍率 | 1.00 | 1.00 | 1.08 | 1.12 |

需求：

1. 每個年份每個參數都可編輯。
2. 預設值均為 `1.00`。
3. 支援新增前一年 / 新增後一年 / 插入指定年份。
4. 參數範圍建議：
   - forecast multiplier: 0 到 3
   - price multiplier: 0 到 3
   - core capacity multiplier: 0 到 3
   - bu capacity multiplier: 0 到 3
5. 顯示百分比輔助文字：
   - 1.18 顯示 `+18%`
   - 0.90 顯示 `-10%`
6. Viewer 不能編輯。

### 4.3 快速模板

保留現有 slider 的價值，但改成「快速填表」工具。

可提供 preset buttons：

- Forecast 上修
- 單價上修
- 產能延後
- 產能提前
- 需求下修
- 全部重置

最低要求：

1. 現有四個 slider 不必完全刪除。
2. 它們可以改成「套用到所有年份」的快速控制。
3. 使用者調整全局倍率後，可以點 `套用到全部年份`。

### 4.4 年度結果表

新增結果表：

| 指標 | 2026 基準 | 2026 情境 | 2026 差異 | 2027 基準 | 2027 情境 | 2027 差異 |
|---|---:|---:|---:|---:|---:|---:|
| 總營收 | ... | ... | +18.0% |
| 總預測數量 | ... | ... | +8.0% |
| 最大 Core 利用率 | ... | ... | +4.2pp |
| 最大 BU 利用率 | ... | ... | -1.5pp |
| 短缺月份 | ... | ... | +2 |
| BP 達成率 | ... | ... | +5.0pp |
| BP 差距 | ... | ... | +300M TWD |

如果橫向太寬，可以做成：

| 年份 | 總營收 基準 | 總營收 情境 | 差異 | Core 利用率 基準 | Core 利用率 情境 | 差異 | ... |

請選擇最不擁擠、最適合營運檢視的設計。

### 4.5 摘要卡片

保留目前 KPI card，但改成「跨年度摘要」：

- 最大營收提升年份
- 最大 BP 缺口年份
- 最大 Core 瓶頸年份
- 最大 BU 瓶頸年份
- 短缺月份變化

不要再只顯示一組全局結果。

## 5. 計算設計

### 5.1 不修改 calculationEngine

不得修改：

- `frontend/src/core/calculationEngine.ts`

情境套用應在 scenario 層完成：

1. 以原始 SKUs / forecasts / capacityPlans / params 建立 baseline。
2. 依年度參數產生 scenario input。
3. 呼叫既有 calculation / analytics / bp helper。
4. 產生 yearly comparison。

### 5.2 年度倍率套用規則

按 forecast month 或 capacity month 的年份套用：

```ts
const year = month.slice(0, 4);
const assumption = yearlyAssumptions[year] ?? defaultAssumption;
```

對 forecasts：

- `forecastPcs *= forecastMultiplier`
- `unitPrice *= priceMultiplier`

對 capacityPlans：

- Core 相關產能欄位 *= coreCapacityMultiplier
- BU 相關產能欄位 *= buCapacityMultiplier

請先讀現有 `CapacityPlan` 型別，確認欄位名稱後再改。

### 5.3 年度結果聚合

新增 helper，建議：

- `frontend/src/core/yearlyScenario.ts`

核心型別建議：

```ts
export interface YearlyScenarioAssumption {
  year: string;
  forecastMultiplier: number;
  priceMultiplier: number;
  coreCapacityMultiplier: number;
  buCapacityMultiplier: number;
}

export interface YearlyScenarioResult {
  year: string;
  baseline: {
    revenueUsd: number;
    forecastPcs: number;
    maxCoreUtilizationPct: number;
    maxBuUtilizationPct: number;
    shortageMonthCount: number;
    bpAttainmentPct: number | null;
    bpGapMillionTwd: number | null;
  };
  scenario: same shape;
  delta: {
    revenuePct: number | null;
    forecastPct: number | null;
    coreUtilizationPp: number | null;
    buUtilizationPp: number | null;
    shortageMonthCount: number;
    bpAttainmentPp: number | null;
    bpGapMillionTwd: number | null;
  };
}
```

實際型別可以調整，但必須清晰。

## 6. UI 要求

1. 使用目前 v1.54/v1.55 tweakcn/design token 風格。
2. 表格要穩定，不要閃爍。
3. 年度參數表和年度結果表要可水平滾動，但不要雙 scrollbar 抖動。
4. 行列標題要清楚。
5. 差異值：
   - 正向用綠色
   - 負向用紅色或橘色
   - 但 BP gap / utilization 這類指標要注意語義，不要簡單把正數都當好事。
6. 若 data quality confidence low，結果區要提示：
   - `資料品質偏低，情境結果僅供方向判斷。`

## 7. i18n

新增繁中與英文文案：

繁中範例：

- `scenario.yearly.title`: `年度情境參數`
- `scenario.yearly.subtitle`: `按年份設定預測、價格與產能假設。`
- `scenario.yearly.forecastMultiplier`: `預測數量倍率`
- `scenario.yearly.priceMultiplier`: `單價倍率`
- `scenario.yearly.coreCapacityMultiplier`: `Core 產能倍率`
- `scenario.yearly.buCapacityMultiplier`: `BU 產能倍率`
- `scenario.yearly.addPreviousYear`: `新增前一年`
- `scenario.yearly.addNextYear`: `新增後一年`
- `scenario.yearly.insertYear`: `插入年份`
- `scenario.yearly.resultsTitle`: `年度情境結果`
- `scenario.yearly.applyGlobal`: `套用到全部年份`

英文也要對應。

## 8. 測試要求

### 8.1 Core tests

新增：

- `frontend/src/core/yearlyScenario.test.ts`

至少測試：

1. 每年倍率可不同。
2. forecast multiplier 只影響對應年份。
3. price multiplier 只影響對應年份。
4. core capacity multiplier 只影響對應年份。
5. bu capacity multiplier 只影響對應年份。
6. 年度結果會輸出 baseline / scenario / delta。
7. BP attainment / gap 可按年計算。
8. 空 BP target 時 BP 欄位為 null，不崩潰。
9. invalid multiplier 會被 clamp 或 reject。

### 8.2 Page tests

新增或更新：

- `frontend/src/pages/Scenario.test.tsx`

至少測試：

1. 年度參數表渲染。
2. 編輯某一年某一倍率後，該 cell 更新。
3. 新增前一年。
4. 新增後一年。
5. 插入指定年份。
6. 套用全局倍率到全部年份。
7. 執行情境後顯示年度結果表。
8. Viewer role 無法編輯或執行情境。

### 8.3 i18n tests

新增 key 必須在 zh-TW / en 都存在。

## 9. 驗證命令

在 `frontend` 目錄執行：

```powershell
npm run test
npm run lint -- --quiet
npm run build
```

在 repo root 執行：

```powershell
git diff -- firestore.rules
git diff -- frontend/src/core/calculationEngine.ts
git status --short
```

## 10. Browser / Visual QA

若有登入態，請截圖：

- `docs/qa/screenshots/v1-55/scenario-yearly-assumptions.png`
- `docs/qa/screenshots/v1-55/scenario-yearly-results.png`
- `docs/qa/screenshots/v1-55/scenario-yearly-mobile-375.png`

截圖需證明：

- 年度參數表存在
- 年度結果表存在
- 可以新增前後年份
- 頁面不擁擠、不閃爍

若無登入態，請明確寫：

```text
Browser QA limited due to missing authenticated session.
```

## 11. Git 要求

建議分支：

- `xiaomi/v1-55-yearly-scenario-planning-table`

Commit message：

- `feat: add yearly scenario planning table v1.55`

Push：

- `origin/xiaomi/v1-55-yearly-scenario-planning-table`

## 12. 最終回報格式

請用中文回報：

1. 是否已建立並更新命令日誌。
2. 年度參數表如何實作。
3. 年度結果表如何實作。
4. 是否修改 calculationEngine.ts。
5. 是否保留現有情境入口。
6. Viewer read-only 是否保留。
7. 修改檔案清單。
8. 新增/修改測試清單。
9. Browser QA 截圖路徑或受限原因。
10. test / lint / build 結果。
11. 紅線檔案是否未修改。
12. Commit hash、branch、push 狀態。
13. 是否可交 AGY 驗收。

