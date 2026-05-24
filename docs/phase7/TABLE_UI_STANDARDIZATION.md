# 表格 UI 使用邊界標準化

**版本**: v1.25.0
**日期**: 2026-05-24
**狀態**: 定義完成

---

## 一、表格技術選擇邊界

本專案目前存在三種表格/輸入形態，各有適用場景：

### 1. Ant Design Table

**適用場景**:
- 只讀分析結果展示
- 資料量中等（< 1000 rows）
- 需要排序、篩選、分頁
- 複雜的 row/column 結構

**特點**:
- 內建排序、篩選、分頁
- 豐富的 column 配置
- 良好的 i18n 支援
- 不適合高頻編輯

**使用頁面**: Dashboard, Results, Snapshot Change Review, Parameters（yield matrix）

### 2. react-datasheet-grid

**適用場景**:
- Excel-like 大量輸入
- 需要 Excel 複製貼上
- 資料量較大（< 500 rows x 60 cols）
- 高頻 cell-by-cell 編輯

**特點**:
- 支援 Excel 格式貼上
- Cell-level dirty tracking
- 鍵盤導航友善
- 需要 dirty state + Save/Discard

**使用頁面**: Capacity Lab, Products Lab, BP Targets（v1.25.0 規劃）

### 3. 普通 Form / Input

**適用場景**:
- 低頻設定
- 單一或少數欄位
- 需要複雜驗證邏輯
- 非表格結構資料

**特點**:
- 靈活的欄位配置
- 內建驗證
- 適合設定頁面

**使用頁面**: Parameters（匯率、panel params、working days）

### 4. TanStack Table + Virtual（保留候選）

**適用場景**:
- 超大資料量（> 500 rows 或 > 60 cols）
- 需要虛擬滾動
- 效能瓶頸場景

**狀態**: Phase 7.3 評估中，尚未實作

---

## 二、現有頁面表格型態審查

### 2.1 Dashboard

| 項目 | 目前狀態 | 建議 |
|------|----------|------|
| KPI Cards | 自訂組件 | ✅ 保留 |
| Revenue by Customer | Ant Design Table | ✅ 保留 |
| Core Demand by Size | Ant Design Table | ✅ 保留 |
| Yearly Health Matrix | Ant Design Table | ✅ 保留 |
| BP Analysis | Ant Design Table | ✅ 保留 |

**結論**: 全部只讀，Ant Design Table 適合。無需變更。

### 2.2 Products

| 項目 | 目前狀態 | 建議 |
|------|----------|------|
| SKU 列表 | Ant Design Table + inline edit | ⚠️ 檢討 |
| 新增/編輯表單 | Ant Design Form + Modal | ✅ 保留 |
| 匯入/匯出 | XLSX 處理 | ✅ 保留 |

**問題**:
- inline edit 體驗不如 Excel-like
- 大量新增時效率低

**建議**: 
- 保留現有頁面作為正式頁
- 導向 Products Lab 處理大量輸入

### 2.3 Products Spreadsheet Lab

| 項目 | 目前狀態 | 建議 |
|------|----------|------|
| SKU Grid | react-datasheet-grid | ✅ 保留 |
| Dirty State | 已實作 | ✅ 正確 |
| Save / Discard | 已實作 | ✅ 正確 |

**結論**: 作為實驗頁，體驗正確。無需變更。

### 2.4 Forecasts

| 項目 | 目前狀態 | 建議 |
|------|----------|------|
| 預測列表 | Ant Design Table | ⚠️ 檢討 |
| 編輯模式 | inline InputNumber | ⚠️ 體驗待改善 |
| 年度/季度/月份切換 | 自訂邏輯 | ✅ 功能正確 |

**問題**:
- 大量 SKU 編輯效率低
- inline edit 沒有 dirty state
- 無法從 Excel 貼上

**建議**:
- Phase 7.1 建立 ForecastsSpreadsheetLab
- 保留現有 Forecasts 頁面

### 2.5 Capacity

| 項目 | 目前狀態 | 建議 |
|------|----------|------|
| Capacity Grid | 自訂 Ant Design Table | ✅ 功能完整 |
| Factory 管理 | Modal + Input | ✅ 保留 |
| Fill Forward | 已實作 | ✅ 正確 |
| Batch Set | 已實作 | ✅ 正確 |

**結論**: 功能完整，體驗良好。無需變更。

### 2.6 Capacity Lab

| 項目 | 目前狀態 | 建議 |
|------|----------|------|
| Core Grid | react-datasheet-grid | ✅ 保留 |
| BU Grid | react-datasheet-grid | ✅ 保留 |
| Dirty State | 已實作 | ✅ 正確 |
| Save / Discard | 已實作 | ✅ 正確 |

**問題**:
- i18n 不完整（部分硬編碼）
- 空狀態顯示可改善

**建議**: 小幅修正 i18n 和空狀態，不重構。

### 2.7 Parameters

| 項目 | 目前狀態 | 建議 |
|------|----------|------|
| Yield Matrix | Ant Design Table（只讀） | ✅ 保留 |
| Panel Params | Ant Design Form | ✅ 保留 |
| Currency Settings | Ant Design Form | ✅ 保留 |
| BP Targets | Ant Design InputNumber（v1.24） | ⚠️ 移除 |
| Workspace Settings | 自訂 Panel | ✅ 保留 |

**建議**:
- v1.25.0 移除 BP 直接編輯
- 改為跳轉提示到 `/bp-targets`

### 2.8 Results

| 項目 | 目前狀態 | 建議 |
|------|----------|------|
| SKU Detail | Ant Design Table | ✅ 保留 |
| Capacity Summary | Ant Design Table | ✅ 保留 |
| Risk Brief | Ant Design Table + Card | ✅ 保留 |
| BP Analysis | Ant Design Table | ✅ 保留 |
| Change Review | Ant Design Table | ✅ 保留 |

**結論**: 全部只讀，Ant Design Table 適合。無需變更。

### 2.9 Snapshot Change Review

| 項目 | 目前狀態 | 建議 |
|------|----------|------|
| Snapshot List | Ant Design Table | ✅ 保留 |
| Change Impact | Ant Design Table + Statistic | ✅ 保留 |

**結論**: 全部只讀，Ant Design Table 適合。無需變更。

---

## 三、表格技術選擇決策樹

```
是否需要編輯？
├── 否 → Ant Design Table
└── 是
    ├── 資料量 < 50 rows？
    │   └── 是 → Ant Design Table + inline edit
    └── 否
        ├── 需要 Excel 貼上？
        │   └── 是 → react-datasheet-grid
        └── 否
            ├── 資料量 > 500 rows？
            │   └── 是 → TanStack Table + Virtual（評估）
            └── 否 → react-datasheet-grid 或 Ant Design Table
```

---

## 四、不一致問題盤點

### 4.1 表格樣式不一致

| 問題 | 影響頁面 | 嚴重度 |
|------|----------|--------|
| Cell padding 不一致 | Products, Forecasts, Capacity | 低 |
| Header 背景色不一致 | Products, Forecasts | 低 |
| Odd/Even row stripe 不一致 | 部分 Table 有，部分無 | 低 |

### 4.2 欄位命名不一致

| 問題 | 位置 | 建議 |
|------|------|------|
| "SKU" vs "SKU Code" | 不同頁面不同名稱 | 統一為 "SKU Code" |
| "Revenue" vs "Revenue (USD)" | Dashboard vs Results | 統一為 "Revenue"（tooltip 說明單位）|
| "BP Target" vs "BP Target (Million TWD)" | Parameters vs BP Analysis | 統一為 "BP Target"（tooltip 說明單位）|

### 4.3 空狀態不一致

| 問題 | 影響頁面 | 建議 |
|------|----------|------|
| 有的顯示空 Table，有的顯示 Alert | Products, Forecasts | 統一為：空 Table + Alert 提示 |
| 空狀態文案不一致 | 各頁面 | 統一使用 i18n key |

### 4.4 操作按鈕不一致

| 問題 | 位置 | 建議 |
|------|------|------|
| Save 按鈕位置不一致 | Capacity Lab 右上，Products Lab 右上 | 統一右上角 |
| Save 按鈕圖示不一致 | SaveOutlined vs 無圖示 | 統一 SaveOutlined |
| Discard 文案不一致 | "Discard" vs "Undo" vs "Cancel" | 統一 "Discard" / "放棄" |

---

## 五、v1.26 - v1.28 UI Cleanup Roadmap

### Phase 1.26: 表格樣式統一

**範圍**: 全域 CSS 調整

| 任務 | 優先級 |
|------|--------|
| 定義統一的 Table cell padding | P1 |
| 定義統一的 Header 樣式 | P2 |
| 定義統一的 Odd/Even stripe | P2 |
| 建立 `TableStyleGuide.md` | P1 |

**不變更**:
- 不改變任何頁面邏輯
- 只調整 CSS/Ant Design theme tokens

### Phase 1.27: 欄位命名與空狀態統一

**範圍**: i18n key 統一

| 任務 | 優先級 |
|------|--------|
| 盤點所有表格欄位 i18n key | P1 |
| 統一 "SKU Code" 命名 | P1 |
| 統一 "Revenue" 命名（加 tooltip） | P2 |
| 統一空狀態 Alert 文案 | P1 |
| 統一空狀態顯示邏輯 | P2 |

**不變更**:
- 不改變任何資料結構
- 不改變任何計算邏輯

### Phase 1.28: 操作按鈕與交互統一

**範圍**: Save/Discard 按鈕統一

| 任務 | 優先級 |
|------|--------|
| 統一 Save 按鈕位置（右上角） | P1 |
| 統一 Save 按鈕圖示 | P1 |
| 統一 Discard 文案與圖示 | P1 |
| 統一 dirty state 顯示位置 | P2 |
| 建立 `InteractionGuide.md` | P1 |

**不變更**:
- 不改變 Save/Discard 邏輯
- 不改變 dirty state 計算

---

## 六、禁止事項

### 6.1 不允許混用造成的問題

| 禁止 | 原因 |
|------|------|
| 同一類高頻輸入在不同頁面有不同交互 | 用戶體驗混亂 |
| 只讀表格使用 react-datasheet-grid | 效能浪費 |
| 大量輸入使用普通 Form | 效率極低 |
| Autosave | Firestore 成本、資料一致性風險 |

### 6.2 新頁面檢查清單

新增頁面時，請確認：

- [ ] 是否選擇正確的表格技術？
- [ ] 是否遵循 dirty state / Save / Discard 模式？（編輯頁面）
- [ ] 是否使用統一的 i18n key？
- [ ] 是否使用統一的空狀態顯示？
- [ ] 是否遵循表格樣式規範？

---

## 七、附錄

### A. 技術版本

| 技術 | 版本 |
|------|------|
| Ant Design | 6.x |
| react-datasheet-grid | 4.x |
| TanStack Table | 評估中 |

### B. 相關文件

- `PHASE7_EXCEL_LIKE_INPUT_SPEC.md`: Excel-like 輸入規格
- `UI_GUIDELINES.md`: Ant Design 主題規範
- `DEVELOPMENT.md`: 開發規範

### C. 程式碼參考

```typescript
// react-datasheet-grid 標準模式
import { DataSheetGrid, textColumn, keyColumn } from 'react-datasheet-grid';

const MySheet = () => {
  const [data, setData] = useState([]);
  const [dirty, setDirty] = useState(new Set());
  
  const handleSave = async () => {
    await batchSave(data);
    setDirty(new Set());
  };
  
  const handleDiscard = () => {
    setData(savedSnapshot);
    setDirty(new Set());
  };
  
  return (
    <>
      <DataSheetGrid
        value={data}
        onChange={setData}
        columns={columns}
      />
      <Space>
        <Button onClick={handleSave} disabled={dirty.size === 0}>
          Save
        </Button>
        <Button onClick={handleDiscard} disabled={dirty.size === 0}>
          Discard
        </Button>
      </Space>
    </>
  );
};
```
