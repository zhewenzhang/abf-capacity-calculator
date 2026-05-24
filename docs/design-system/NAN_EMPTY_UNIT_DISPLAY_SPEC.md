# 空值與數據溢出呈現技術規格 (NaN, Empty & Unit Display Specification)

- **目標版本**：`v1.29.0`
- **定位**：為協同開發團隊 (CC) 規範系統內各處表格、卡片、分析圖表對於極限值（NaN、分母為零的 Infinity）與空值（null）的**最後一公里展示格式化（Formatter）標準**，保障數據對帳精度。

---

## 🚨 1. 空值與數據溢出“零污染”前端過濾標準 (The Zero Pollution Rule)

为了保证计算模型的纯洁度，所有对空值、NaN 的兜底与格式化处理，必须严格执行以下红线规定：

> [!IMPORTANT]
> **紅線：數值 Fallback 處理必須死守在前端 Render（展示層）的最後一公里！**
> 嚴禁在數據保存層（Service / Firestore 寫入端）為了讓介面顯示得好看而將 `null` 改寫為 `0` 或是將 NaN 寫入數據庫！這會對數據庫造成不可逆轉的二次髒數據污染，徹底破壞 downstream 計算模型的数据真度。

### 📊 5 大溢出與空值呈現轉換矩陣
- **`null` / `undefined` (數據未設定/未考核)**：
  - 統一渲染為 `—` (灰色淡雅短橫線)，代表此處無目標或免除考核，嚴禁直接丟空白 `""`。
- **`NaN` (Not a Number 類型錯誤)**：
  - 運算引擎全局攔截。前端渲染時捕獲 `isNaN(val)`，統一優雅降級呈現為 `— (無效數據)`，嚴禁將 NaN 字符裸露給用戶。
- **`Infinity` / `-Infinity` (正負無窮大 / 除零溢出)**：
  - 發生於分母為 0（如設備額定產能設為0）的利用率計算：
  - 統一捕獲並重繪為 `— (停機)` 或者是 `0%`（根據業務邏輯映射），絕不允許出現 `Infinity%` 撐爆 Canvas 圖表。
- **數字 `0` (數值零)**：
  - 精確保留並顯示為 `0` 或 `0%`，計入分母，與 `null` 進行物理級別的語意隔離。

---

## 🎨 2. 7 大核心指標物理單位與精度標準 (SLA Formatting Rules)

全站表格及卡片必須嚴格對齊以下 7 大核心指標的千分位、貨幣前綴及精度舍入：

1. **Revenue (營業收入)**：
   - 單位：`USD` (美元)。
   - 格式：帶千分位，前置美金符號，固定精確保留至小數點後 **2 位** (如 `$1,250,500.00`)。
2. **BP Target (年度營業目標)**：
   - 單位：`百萬新台幣 (Million TWD)`。
   - 格式：四捨五入取 **整數**，無小數點 (如 `12,500`)，表頭強制括號註明 `(百萬新台幣)`。
3. **BP Gap (目標差距)**：
   - 單位：`百萬新台幣 (Million TWD)`。
   - 格式：同上。若差距變紅（未達標），數值前置負號 `-` 并標紅 (如 `-2,500`)。
4. **Utilization (設備稼動率 / 利用率)**：
   - 格式：四捨五入取 **整數百分比**，後置 `%` (如 `89%`)，嚴禁裸露浮點數。
5. **Rated Capacity (額定產能)**：
   - 單位：`萬片/月 (Ten Thousand Pcs/Month)`。
   - 格式：整數 (如 `350`)。
6. **Shortage (產能缺口)**：
   - 單位：`萬片/月` 或 `Panel 數`。
   - 格式：整數。
7. **Forecast PCS (銷售預測量)**：
   - 單位：`PCS (件)`。
   - 格式：帶千分位整數 (如 `150,000`)。

---

## 🛠️ 3. 建議的共用 Formatter 共享工具函數接口 (Formatter Interfaces)

建議 CC 團隊在 `frontend/src/core/formatters.ts` 下統一封裝並共享以下三大線路安全 Formatter（此處只做規格設計，不在 AGY 物理實現）：

```typescript
/**
 * 1. 財務級千分位與空值安全格式化器
 */
export function formatDisplayNumber(
  val: number | null | undefined, 
  options?: { precision?: number; prefix?: string; suffix?: string }
): string {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return '—';
  }
  const precision = options?.precision ?? 0;
  const prefix = options?.prefix ?? '';
  const suffix = options?.suffix ?? '';
  
  const formatted = val.toLocaleString('zh-TW', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  });
  return `${prefix}${formatted}${suffix}`;
}

/**
 * 2. 百分比安全格式化器（嚴防除零與 NaN）
 */
export function formatPercentSafe(
  numerator: number, 
  denominator: number
): string {
  if (!denominator || denominator === 0 || isNaN(numerator) || isNaN(denominator)) {
    return '—';
  }
  const pct = Math.round((numerator / denominator) * 100);
  return `${pct}%`;
}

/**
 * 3. 帶單位格式化器
 */
export function formatUnitValue(
  val: number | null | undefined,
  unitType: 'million-twd' | 'usd' | 'pcs' | 'percent'
): string {
  switch (unitType) {
    case 'million-twd':
      return formatDisplayNumber(val, { precision: 0 });
    case 'usd':
      return formatDisplayNumber(val, { precision: 2, prefix: '$' });
    case 'pcs':
      return formatDisplayNumber(val, { precision: 0 });
    case 'percent':
      return val != null ? `${Math.round(val * 100)}%` : '—';
    default:
      return '—';
  }
}
```

---

## 💾 4. CC 可直接執行的 v1.29.0 專屬極客 Prompt

```text
請執行 v1.29.0：NaN / Empty / Unit 表格格式化大清洗重構。

【硬性約束】：不允許修改 calculationEngine.ts 核心底層算式，所有的格式化與 fallback 必須死守在前端展現層（Columns render 函數或 Statistic 卡片中），嚴禁在寫入數據庫時將 null 擅自改為 0 造成二次數據污染。

【開發任務】：
1. 在 `frontend/src/core` 下封裝通用格式化模塊 `formatters.ts`，實現 `formatDisplayNumber`、`formatPercentSafe` 和 `formatUnitValue` 三大核心函數。
2. 徹底捕獲運算產生的 `NaN` 及分母為零的 `Infinity`，將其在表格渲染中統一重繪為灰色短橫線 `—`（對於利用率除零，可顯示為 `— (停機)`）。
3. 盤點 Results 所有子頁面的表格，統一將表頭用括號明確物理單位（如 `營業收入 (USD)`，`BP目標 (百萬新台幣)`）。
4. 統一表格對齊風格：文字列 text-align: left；數值列 text-align: right 并綁定 Tab tabular-nums 等寬字體。
5. 使用 `val.toLocaleString('zh-TW')` 對所有大額數字注入千分位，並對百分比利用率使用 `Math.round()` 強鎖整數百分比。
```
