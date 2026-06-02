# v1.54.5 BP Target Derived Rows + Year Control Command

## 0. 任務背景

使用者希望優化「營業目標 BP」頁面。

目前頁面只有一行：

- `BP 目標（百萬 TWD）`

使用者實際工作流是：

1. 只輸入第一行台幣 BP 金額。
2. 系統自動帶出：
   - 人民幣金額
   - 美金金額
   - 年度 YoY 成長
3. 年份不應固定只能從 2026 開始，使用者需要可以：
   - 往前加入年份
   - 往後加入年份
   - 插入自訂年份

本任務是 BP 目標頁的功能性 UX 改造，不是全站表格選型，也不是重寫 BP 計算引擎。

## 1. 核心目標

將 `/bp-targets` 改成更接近業務使用習慣的 BP 目標輸入表：

| 項目 | 2025 | 2026 | 2027 | 2028 |
|---|---:|---:|---:|---:|
| BP 目標（百萬 TWD） | 使用者輸入 | 使用者輸入 | 使用者輸入 | 使用者輸入 |
| BP 目標（百萬 CNY） | 自動換算 | 自動換算 | 自動換算 | 自動換算 |
| BP 目標（百萬 USD） | 自動換算 | 自動換算 | 自動換算 | 自動換算 |
| 年度 YoY 成長 | - | 自動計算 | 自動計算 | 自動計算 |

## 2. 必須遵守

1. 全程使用中文回報。
2. 必須建立並持續更新命令日誌：
   - `docs/release/V1_54_5_BP_TARGET_DERIVED_ROWS_YEAR_CONTROL_COMMAND_LOG.md`
3. 不得修改：
   - `firestore.rules`
   - `frontend/src/core/calculationEngine.ts`
   - Firebase Functions / DeepSeek runtime
4. 不得新增大型表格依賴。
5. 不得更換目前表格技術選型。
6. 不得改變現有 BP 儲存資料語義：
   - Firestore 仍只儲存 `bpTargets.yearlyRevenueTargetsMillionTwd`
   - 單位仍是 `million TWD`
7. Derived rows 不得寫回 Firestore：
   - CNY row 不存
   - USD row 不存
   - YoY row 不存
8. Viewer read-only 必須保留。

## 3. 現有資料模型

目前型別位於：

- `frontend/src/types/index.ts`

現有欄位：

```ts
bpTargets?: {
  mode: 'yearly' | 'monthly';
  yearlyRevenueTargetsMillionTwd: Record<string, number>;
  monthlyRevenueTargetsMillionTwd?: Record<string, number>;
};
```

匯率欄位：

```ts
currencySettings?: {
  baseCurrency: 'USD';
  displayCurrency: CurrencyCode;
  exchangeRateMode: 'constant' | 'yearly';
  constantUsdToTwdRate: number;
  yearlyUsdToTwdRates: Record<string, number>;
  constantUsdToCnyRate: number;
  yearlyUsdToCnyRates: Record<string, number>;
};
```

請使用既有 helper：

- `normalizeCurrencySettings`
- `getUsdToTwdRate`
- `getUsdToCurrencyRate`
- 或 `convertCurrencyAmount`

位置：

- `frontend/src/core/currency.ts`

## 4. 必查文件

請先閱讀：

- `frontend/src/pages/BpTargets.tsx`
- `frontend/src/core/bpTargetsHelpers.ts`
- `frontend/src/core/bpTargetsHelpers.test.ts`
- `frontend/src/core/currency.ts`
- `frontend/src/types/index.ts`
- `frontend/src/i18n/zhTW.ts`
- `frontend/src/i18n/en.ts`

也請確認是否已有 v1.54.3 spreadsheet grid stability 修復；若已存在 stable wrapper，請沿用。

## 5. 功能需求

### 5.1 主輸入行

第一行仍是唯一可編輯行：

- label zh-TW：`BP 目標（百萬 TWD）`
- label en：`BP Target (Million TWD)`

行為：

- 使用者輸入年度 BP 目標，單位為 `百萬 TWD`
- 允許空值
- 不允許負值
- 不允許非數字
- 儲存時只保存這一行到 `yearlyRevenueTargetsMillionTwd`

### 5.2 自動派生 CNY 行

第二行：

- zh-TW：`BP 目標（百萬 CNY）`
- en：`BP Target (Million CNY)`

公式：

```text
USD million = TWD million / USD→TWD rate for that year
CNY million = USD million * USD→CNY rate for that year
```

如果匯率模式是 yearly：

- 使用該年度 `yearlyUsdToTwdRates[year]`
- 使用該年度 `yearlyUsdToCnyRates[year]`

如果該年度 yearly rate 缺失，沿用 `currency.ts` 的 normalize / fallback 規則。

顯示：

- read-only
- 建議 1 位小數，或依現有格式器策略
- 空值 TWD 時顯示 `-`

### 5.3 自動派生 USD 行

第三行：

- zh-TW：`BP 目標（百萬 USD）`
- en：`BP Target (Million USD)`

公式：

```text
USD million = TWD million / USD→TWD rate for that year
```

顯示：

- read-only
- 建議 1 位小數，或依現有格式器策略
- 空值 TWD 時顯示 `-`

### 5.4 自動派生 YoY 行

第四行：

- zh-TW：`年度 YoY 成長`
- en：`YoY Growth`

公式：

```text
YoY = (currentYearTwd - previousYearTwd) / previousYearTwd * 100
```

規則：

1. 使用 TWD 主行計算。
2. 使用「前一個年份欄位」作為 previous year。
3. 如果 previous year 沒有值、為 0、或 current year 沒有值，顯示 `-`。
4. 顯示格式：`+12.3%`、`-4.5%`、`0.0%`。
5. YoY row read-only。

### 5.5 年份控制

目前 helper 使用固定：

```ts
START_YEAR = 2026;
END_YEAR = 2040;
```

本次需要支援動態年份。

需求：

1. 頁面根據現有 BP target record 生成 visible years。
2. 預設仍可從 2026 開始顯示一段年份，例如 2026-2034 或沿用現有 2026-2040。
3. 如果 record 中有更早年份，例如 2024，必須顯示 2024。
4. 如果 record 中有更晚年份，例如 2045，必須顯示 2045。
5. 使用者可以：
   - 點「新增前一年」：在目前最小年份前插入一年
   - 點「新增後一年」：在目前最大年份後插入一年
   - 透過輸入框/按鈕插入指定年份
6. 年份限制：
   - 建議允許 2000-2100
   - 非四位數或超出範圍要提示錯誤
7. 新增年份後：
   - TWD row 該年為空值
   - CNY/USD/YoY 自動顯示 `-`
   - 未填值的年份不應被保存成 0

### 5.6 UX 要求

頁面上方增加簡短說明：

繁中：

```text
只需輸入第一行台幣 BP 目標；CNY、USD 與 YoY 由匯率設定自動換算。
```

英文：

```text
Enter only the TWD BP target row; CNY, USD, and YoY are derived automatically from currency settings.
```

年份控制按鈕建議：

- `新增前一年`
- `新增後一年`
- `插入年份`

英文：

- `Add Previous Year`
- `Add Next Year`
- `Insert Year`

Derived rows 必須有淡色 read-only 視覺，避免使用者以為可以直接編輯。

## 6. 建議實作

### 6.1 擴充 helper

建議修改：

- `frontend/src/core/bpTargetsHelpers.ts`

新增或調整：

```ts
export type BpSheetMetric =
  | 'targetTwd'
  | 'targetCny'
  | 'targetUsd'
  | 'yoyGrowth';

export interface BpSheetRow {
  metric: string;
  metricType: BpSheetMetric;
  readOnly: boolean;
  [year: string]: number | null | undefined | string | boolean;
}
```

新增 helper：

```ts
export function buildVisibleYears(
  record: Record<string, number> | undefined | null,
  defaultStartYear = 2026,
  defaultEndYear = 2040
): string[]
```

```ts
export function buildBpSheetRows(
  record: Record<string, number> | undefined | null,
  labels: {
    targetTwd: string;
    targetCny: string;
    targetUsd: string;
    yoyGrowth: string;
  },
  currencySettings: CurrencySettings,
  visibleYears: string[]
): BpSheetRow[]
```

```ts
export function rowsToBpTargetRecord(rows: BpSheetRow[], visibleYears: string[]): Record<string, number>
```

或沿用既有 `recordToRows / rowsToRecord`，但必須明確保證：

- 只讀 rows 不會被保存
- visible years 是動態的
- 既有測試不回退

### 6.2 BpTargets 頁面

修改：

- `frontend/src/pages/BpTargets.tsx`

建議新增 state：

```ts
const [visibleYears, setVisibleYears] = useState<string[]>([]);
```

載入時：

1. 讀取 params
2. 取 `yearlyRevenueTargetsMillionTwd`
3. build visible years
4. build rows with derived values

使用者改 TWD row：

1. 更新 TWD row
2. 重新計算 CNY / USD / YoY rows
3. 不要讓 derived rows 可編輯

新增年份：

1. 更新 visibleYears
2. 重新 build rows
3. 不保存空年份

儲存時：

1. 從 rows 中抽取 `metricType === 'targetTwd'`
2. 僅保存有值年份
3. 不保存 CNY / USD / YoY

### 6.3 Column disabled

`react-datasheet-grid` 的 column disabled 是欄位層級，不足以控制 row read-only。

如果需要 row-level read-only，可在 `onChange` 中攔截：

1. 只接受 `metricType === 'targetTwd'` 的 row 變更
2. 如果 derived row 被修改，立即用 recalculated rows 覆蓋

或使用自定義 cell renderer / column disabled callback，視現有 library 能力而定。

## 7. 測試要求

### 7.1 Helper tests

更新：

- `frontend/src/core/bpTargetsHelpers.test.ts`

至少測試：

1. `buildVisibleYears` 包含預設年份。
2. `buildVisibleYears` 包含 record 中更早年份。
3. `buildVisibleYears` 包含 record 中更晚年份。
4. `buildBpSheetRows` 產生 4 行：
   - TWD
   - CNY
   - USD
   - YoY
5. USD/CNY 派生計算正確：
   - 例如 TWD=3200, USD→TWD=32, USD→CNY=7.2
   - USD=100
   - CNY=720
6. YoY 計算正確：
   - 2026=100
   - 2027=120
   - YoY=+20.0%
7. previous year 為空或 0 時 YoY 顯示空/null。
8. `rowsToBpTargetRecord` 只保存 TWD row。
9. 空年份不保存。
10. 負數仍 throw `NEGATIVE_VALUE:{year}`。
11. 非數字仍 throw `INVALID_VALUE:{year}`。

### 7.2 Page tests

如已有 `BpTargets.test.tsx`，請更新；若沒有，請新增：

- `frontend/src/pages/BpTargets.test.tsx`

至少測試：

1. 頁面顯示 4 行。
2. CNY/USD/YoY 行顯示 read-only 樣式或標記。
3. 點「新增前一年」後，年份增加到前一年。
4. 點「新增後一年」後，年份增加到後一年。
5. 插入指定年份成功。
6. 插入非法年份顯示錯誤。
7. 儲存時只送出 TWD row。
8. viewer role 時不能編輯或新增年份。

### 7.3 i18n tests

更新 i18n key 測試，確保新增 key 在：

- zh-TW
- en

都存在。

## 8. Browser / Visual QA

如有登入態，請截圖：

- `docs/qa/screenshots/v1-54-5/bp-target-derived-rows-desktop.png`
- `docs/qa/screenshots/v1-54-5/bp-target-add-previous-year.png`
- `docs/qa/screenshots/v1-54-5/bp-target-add-next-year.png`
- `docs/qa/screenshots/v1-54-5/bp-target-mobile-375.png`

截圖要證明：

- 4 行顯示正常
- Derived rows 不像可編輯主行
- 年份可以往前 / 往後加入
- 表格不閃、不水平崩壞

如果沒有登入態，請明確寫：

```text
Browser QA limited due to missing authenticated session.
```

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

## 10. Git 要求

建議分支：

- `xiaomi/v1-54-5-bp-target-derived-rows-year-control`

Commit message：

- `feat: add derived bp target rows and year controls v1.54.5`

Push：

- `origin/xiaomi/v1-54-5-bp-target-derived-rows-year-control`

## 11. 最終回報格式

請用中文回報：

1. 是否已建立並更新命令日誌。
2. 是否仍只保存 TWD row。
3. USD/CNY/YoY 計算公式。
4. 年份新增/插入功能如何實作。
5. Viewer read-only 是否保留。
6. 修改檔案清單。
7. 新增/修改測試清單。
8. Browser QA 截圖路徑或受限原因。
9. test / lint / build 結果。
10. 紅線檔案是否未修改。
11. Commit hash、branch、push 狀態。
12. 是否可交 AGY 驗收。

