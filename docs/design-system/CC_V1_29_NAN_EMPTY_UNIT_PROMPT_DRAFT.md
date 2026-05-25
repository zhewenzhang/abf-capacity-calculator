# CC 研發工單草案：v1.29.0 NaN / Empty / Unit 視覺安全格式化

> **工單編號**：CC_V1_29_NAN_EMPTY_UNIT_PROMPT_DRAFT  
> **研發定位**：**純展示層 (Presentation Only) 格式化與單位規約**。此發行版旨在徹底解決系統在處理空資料、未填寫數值、計算異常時，前端表格或分析視圖中偶現的 `NaN`、`Infinity`、`0` 混亂顯示問題，並統一度量單位。

---

## ⚠️ 核心研發約束 (Critical Engineering Rules)

> [!CAUTION]
> **1. 嚴禁污染數據持久層 (No DB Leakage)**：
> 所有新增的 Formatter（格式化工具）和處理邏輯，**必須且僅能作用於 UI 的展示與渲染層 (Render Phase)**。
> 絕不允許將格式化佔位符（如 `—` 符號字符串）、`NaN`、`Infinity` 覆寫並保存回本地 state，更**絕不允許將其寫入 / 提交至 Firestore 資料庫**！數據模型的 `null`、`undefined` 或 `0` 語意在持久層必須保持原汁原味。
>
> **2. 嚴禁修改運算核心與服務 (No Core/Service Mutations)**：
> 禁止修改 `frontend/src/core/calculationEngine.ts` 等底層核心運算公式或任何 `*Service.ts` 中的業務邏輯。只允許編寫純函數 Formatter 或在元件 Render 時調用。

---

## 研發任務拆解 (Requirements Breakdown)

### 任務一：統一異常值與空值展示符 (Unified Out-of-Bounds & Empty Format)

CC 必須在前端工具庫（推薦新建 `frontend/src/core/formatter.ts`）中實現統一、安全的格式化器，在所有分析表格（Ant Design Table / Recharts / Grid 等）中對空值或無效數值進行以下處理：

| 原始數據狀態 (Data State) | 展示規則 (UI Display Rule) | 備註說明 (Notes) |
| :--- | :--- | :--- |
| `null` / `undefined` (數據缺失) | **`—`** (長破折號，UTF-8: `\u2014`) | 表示尚未配置或數據缺失，拒絕顯示空白或 `0` |
| `NaN` (非數值，如 $0/0$) | **`—`** | 優雅遮罩，防止引起非技術用戶恐慌 |
| `Infinity` (正負無窮，除以 $0$) | **`—`** (或 `100%` / `N/A`，取決於指標，但通常為 `—`) | 拒絕渲染瀏覽器原生的 `Infinity` |
| 數值 `0` (確切填寫的零) | **`0`** (或 `0%` 等，帶相應單位) | 保留其實體數值語意，區分 `0` 與 `null` (無目標) |

#### 格式化代碼推薦骨架 (TypeScript)：
```typescript
/**
 * 展示層安全數值格式化工具
 * 嚴禁將此函數的傳回值寫回 State 或 Firebase，僅用於元件 render
 */
export function formatDisplayValue(
  value: number | null | undefined,
  precision: number = 0,
  isPercentage: boolean = false
): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return '—';
  }
  
  if (isPercentage) {
    return `${(value * 100).toFixed(precision)}%`;
  }
  
  return value.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}
```

---

### 任務二：統一所有指標度量單位 (Unified Metrics Units)

CC 必須清查 Dashboard、Results Analytics、Forecasts Lab、Capacity Plan 等所有頁面，強制落實以下度量衡與單位標準，不得隨意縮寫或混用：

1. **財務金額 (Revenue / Cost / Price)**：
   * **單位標準**：根據項目配置的貨幣符號。如果為多貨幣則顯示 `USD`、`TWD`，或使用對應符號（如 `$12,345`）。
   * **千分位**：一律強制使用千分位逗號分隔。
2. **BP 達成率 (BP Attainment / Utilization)**：
   * **單位標準**：百分比 **`%`**。
   * **精度**：除特定財務級報告外，默認精確到整數（如 `85%`），或小數點後 1 位（如 `84.6%`）。
3. **产能配置 (Capacity / Target)**：
   * **單位標準**：**`PCS/Day`**（片数/天，小容量可為 PCS，但日產能必須寫明 PCS/Day）。
4. **預測需求量 (Forecast Quantity)**：
   * **單位標準**：**`PCS`**（個 / 片）。
5. **產能缺口 (Shortage / Gap)**：
   * **單位標準**：**`PCS`** 或 **`PCS/Day`**（與父指標對齊），缺口為負數時一律以紅色高亮或括號 `(12,000)` 展示，正數或無缺口則以綠色或常規色展示。

---

### 任務三：強制性前端健康度指標 (Hygiene & Verification)

在完成展示層優化後，CC 必須在提交 PR 前執行並通過以下本地驗證鏈，任何一項失敗將拒絕 Merge 到 main：

1. **前端單元測試**：
   * 運行 `npm run test`，必須 100% 通過（包含新增的 formatter 純函數單元測試）。
2. **語法規範與靜態審查**：
   * 運行 `npm run lint -- --quiet`，不允許新增任何編譯 Error 或 Warning。
3. **生產打包編譯**：
   * 運行 `npm run build`，必須確保 Vite + TypeScript 編譯 100% 成功，無打包截斷。

---

## 💡 下一輪研發最大注意事項 (Tips & Reminders for CC)

*   **多貨幣警告**：在格式化單價 (Price) 時，務必動態抓取 `unitPriceCurrency` 的符號。若其為 `null` 則 fallback 至 `USD`，防止丟失貨幣上下文。
*   **分析圖表遮罩**：在使用 Recharts 繪製趨勢圖時，若數值為 `NaN`，圖表可能會中斷或報錯。請 CC 使用 `connectNulls={true}` 配置，或在傳入圖表 data 前，將 `NaN` 解析為 `null`，以便圖表能平滑渲染而非崩潰。
