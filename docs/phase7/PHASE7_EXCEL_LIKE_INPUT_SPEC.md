# Phase 7: Excel-like Input 實作規格深化

**版本**: v1.25.0 規劃文件
**日期**: 2026-05-24
**狀態**: 規格定義中

---

## 一、概述

Phase 7 目標是建立統一的 Excel-like 輸入體驗，使用戶能夠：
- 像使用 Excel 一樣輸入大量資料
- 支援複製貼上（從 Excel 直接貼入）
- 統一 dirty state、Save、Discard 交互模式
- 確保高頻輸入場景下的效能與可靠性

---

## 二、ForecastsSpreadsheetLab MVP 實作規格

### 2.1 頁面定位

- **路由**: `/forecasts-lab`（實驗頁面）
- **用途**: SKU x Month 大量預測輸入
- **資料量**: 支援 500 SKU x 180 months（最壞情況）
- **與 Forecasts 頁面關係**: 並存，Forecasts 保持現有 Ant Design Table 交互

### 2.2 表格結構

```
| SKU Code | Customer | 2026-01 | 2026-02 | ... | 2040-12 |
|----------|----------|---------|---------|-----|---------|
| SKU-001  | TSMC     | 1000    | 1200    | ... | 2000    |
| SKU-002  | Intel    | 500     | 600     | ... | 800     |
```

- **固定欄位**: SKU Code, Customer（只讀，從 SKU master 帶入）
- **可編輯欄位**: 每月預測數量（K PCS）
- **橫向滾動**: 年份從左到右，支援 2026-2040

### 2.3 交互規格

| 功能 | 規格 |
|------|------|
| 單格編輯 | 點擊即編輯，Enter 確認，Tab 移至下一格 |
| 多格選取 | 拖曳選取範圍 |
| Excel 貼上 | 支援從 Excel 複製範圍貼入，自動對齊 |
| 負數處理 | 顯示紅色錯誤提示，禁止保存 |
| 非數字處理 | 顯示黃色警告，還原為原值 |
| 空值 | 允許，視為 0 |

### 2.4 Dirty State 規格

```typescript
interface DirtyState {
  isDirty: boolean;
  dirtyCells: Set<string>;  // key: "skuId-month"
  dirtyCount: number;
}

// 計算方式
function computeDirtyCells(
  current: Map<string, number>,  // skuId-month -> value
  saved: Map<string, number>
): Set<string> {
  const dirty = new Set<string>();
  for (const [key, val] of current) {
    if (val !== saved.get(key)) {
      dirty.add(key);
    }
  }
  return dirty;
}
```

### 2.5 Save / Discard 流程

```
┌─────────────────────────────────────────────────────────────┐
│                    Save Flow                                 │
├─────────────────────────────────────────────────────────────┤
│ 1. 驗證所有 dirty cells（負數檢查、非數字檢查）              │
│ 2. 如有錯如有錯誤，顯示錯誤列表，阻止保存                          │
│ 3. 無錯誤則 batch save 到 Firestore                          │
│ 4. 更新 saved snapshot                                       │
│ 5. 清空 dirty set                                            │
│ 6. 顯示成功訊息                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Discard Flow                               │
├─────────────────────────────────────────────────────────────┤
│ 1. 顯示確認對話框                                            │
│ 2. 確認後還原到 saved snapshot                               │
│ 3. 清空 dirty set                                            │
│ 4. 重新渲染表格                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、TanStack Table + TanStack Virtual 技術合約

### 3.1 技術選擇理由

| 技術 | 優點 | 缺點 |
|------|------|------|
| react-datasheet-grid | 輕量、Excel-like 體驗好 | 大資料量效能問題 |
| TanStack Table + Virtual | 虛擬滾動、大資料量友善 | 需要較多配置 |

### 3.2 效能目標

| 指標 | 目標 |
|------|------|
| 500 SKU x 24 months | 滾動流暢（> 30 FPS） |
| 首次渲染 | < 1 秒 |
| 編輯響應 | < 100ms |
| 貼上 1000 cells | < 500ms |

### 3.3 Virtual Scroll 策略

```typescript
// 垂直虛擬化：只渲染可見的 SKU rows
// 水平虛擬化：只渲染可見的月份 columns

import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: skus.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 35,  // row height
  overscan: 10,
});

const columnVirtualizer = useVirtualizer({
  count: months.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80,  // column width
  horizontal: true,
  overscan: 5,
});
```

### 3.4 禁止 Autosave

**理由**:
- Firestore 寫入按文件計費
- 高頻編輯會產生大量寫入
- 網路延遲可能導致資料不一致

**規範**:
- 必須使用 dirty state + Save / Discard
- Save 時 batch 寫入
- 最大 batch size: 500 documents

---

## 四、Excel Clipboard Paste Parser 規格

### 4.1 剪貼簿格式

Excel 複製時產生的剪貼簿格式：
- `text/plain`: TSV 格式（Tab 分隔）
- `text/html`: HTML table（可忽略）

### 4.2 Parser 實作

```typescript
interface ParsedData {
  rows: string[][];
  startRow: number;
  startCol: number;
}

function parseClipboard(
  clipboardData: DataTransfer,
  targetCell: { row: number; col: number }
): ParsedData | null {
  const text = clipboardData.getData('text/plain');
  if (!text) return null;

  const rows = text
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => line.split('\t'));

  return {
    rows,
    startRow: targetCell.row,
    startCol: targetCell.col,
  };
}
```

### 4.3 貼上處理流程

```
1. 取得剪貼簿內容
2. 解析為 TSV 結構
3. 驗證每個 cell 的值型別
4. 將有效值填入對應 cells
5. 標記為 dirty
6. 不自動保存
```

### 4.4 邊界案例處理

| 案例 | 處理方式 |
|------|----------|
| 貼上範圍超出表格 | 自動擴展表格（如允許）或截斷 |
| 空白 cell | 保留原值或設為 0（視欄位而定） |
| 非數字 | 顯示警告，跳過該 cell |
| 負數 | 顯示錯誤，跳過該 cell |
| 合併儲存格 | 視為單一 cell |

---

## 五、Firestore 寫入成本與 Autosave 禁止規範

### 5.1 寫入成本計算

| 操作 | 寫入次數 |
|------|----------|
| 單一 cell 更新 | 1 document write |
| Batch 500 cells | 500 writes（一次 request） |
| Autosave 每秒 1 cell | 60 writes / minute |

### 5.2 成本估算

假設 Firestore 寫入價格：$0.18 / 100,000 writes

| 場景 | Writes | 成本 |
|------|--------|------|
| 每日編輯 100 cells | 100 | $0.00018 |
| 每月編輯 10,000 cells | 10,000 | $0.018 |
| Autosave 1 小時（1 write/sec） | 3,600 | $0.00648 |

### 5.3 禁止 Autosave 規範

```typescript
// ❌ 錯誤：每次變更都保存
const handleChange = (value) => {
  updateCell(value);
  saveToFirestore(value);  // 禁止！
};

// ✅ 正確：累積 dirty，使用者主動保存
const handleChange = (value) => {
  updateCell(value);
  markDirty(cellKey);
  // 使用者點擊 Save 時才 batch save
};
```

---

## 六、效能驗收標準

### 6.1 載入效能

| 指標 | 目標 | 測試方法 |
|------|------|----------|
| 首次載入（100 SKU x 12 months） | < 500ms | Performance API |
| 首次載入（500 SKU x 24 months） | < 1s | Performance API |
| 切換年份視圖 | < 200ms | 手動測試 |

### 6.2 互動效能

| 指標 | 目標 | 測試方法 |
|------|------|----------|
| Cell 編輯響應 | < 100ms | 點擊到可輸入 |
| 滾動 FPS | > 30 FPS | Chrome DevTools |
| 選取 100 cells | < 50ms | 拖曳完成到選取顯示 |
| 貼上 1000 cells | < 500ms | 從貼上到渲染完成 |

### 6.3 記憶體使用

| 指標 | 目標 |
|------|------|
| 500 SKU x 180 months 峰值 | < 200MB |
| 長時間使用（1 小時） | 無記憶體洩漏 |

### 6.4 測試矩陣

```
測試配置：
- SKU 數量：50, 100, 200, 500
- Month 數量：12, 24, 60, 180
- 總組合：4 x 4 = 16 組

每組測試：
- 載入時間
- 滾動 FPS
- 編輯響應時間
- 貼上效能
```

---

## 七、實作階段規劃

### Phase 7.1: ForecastsSpreadsheetLab MVP

- 建立 `/forecasts-lab` 頁面
- 實作 react-datasheet-grid 基礎版本
- 實作 dirty state / Save / Discard
- 實作 Excel 貼上
- 效能測試 100 SKU x 24 months

### Phase 7.2: BP Targets 頁面（已在 v1.25.0）

- 建立 `/bp-targets` 頁面
- 使用 react-datasheet-grid
- 橫向年份排列
- dirty state / Save / Discard

### Phase 7.3: 效能優化

- 評估 TanStack Virtual 導入
- 500 SKU x 180 months 效能驗收
- 記憶體優化

---

## 八、附錄

### A. 參考實作

- `CapacitySpreadsheet.tsx`: react-datasheet-grid 實作範例
- `ProductsSpreadsheetLab.tsx`: SKU 輸入範例

### B. 相關文件

- `TABLE_UI_STANDARDIZATION.md`: 表格使用邊界定義
- `FIREBASE_ARCHITECTURE.md`: Firestore 路徑結構

### C. 技術文件連結

- [react-datasheet-grid](https://github.com/nick-keller/react-datasheet-grid)
- [TanStack Table](https://tanstack.com/table)
- [TanStack Virtual](https://tanstack.com/virtual)
