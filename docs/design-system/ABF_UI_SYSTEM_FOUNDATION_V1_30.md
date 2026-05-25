# ABF UI System Foundation (v1.30.0)

本文檔記錄 ABF Capacity Calculator 的 UI 基礎建設，包含 CSS utilities、common components 與使用規範。

---

## 一、CSS Utilities

### 頁面佈局

| Class | 用途 |
|-------|------|
| `.abf-page` | 頁面容器，提供標準 padding |
| `.abf-page-header` | 頁面標題區塊 |
| `.abf-page-content` | 頁面內容區塊 |

### 區塊間距

| Class | 用途 |
|-------|------|
| `.abf-section` | 標準區塊，margin-bottom: 16px |
| `.abf-section-title` | 區塊標題，14px 粗體 |

### Toolbar / Action Bar

| Class | 用途 |
|-------|------|
| `.abf-toolbar` | 標準 toolbar 容器 |
| `.abf-toolbar-actions` | toolbar 左側按鈕區 |
| `.abf-toolbar-info` | toolbar 右側資訊區 |
| `.abf-sticky-actions` | 底部固定操作列 |

### 文字樣式

| Class | 用途 |
|-------|------|
| `.abf-text-muted` | 淺色文字 (rgba(0,0,0,0.45)) |
| `.abf-text-secondary` | 次要文字 (rgba(0,0,0,0.65)) |
| `.abf-text-unit` | 單位文字，12px 淺色 |
| `.abf-text-nowrap` | 禁止換行 |

### Alert 間距

| Class | 用途 |
|-------|------|
| `.abf-alert-page` | 頁面級 Alert，margin-bottom: 16px |
| `.abf-alert-section` | 區塊級 Alert，margin-bottom: 8px |

### 表格

| Class | 用途 |
|-------|------|
| `.abf-table-wrapper` | 表格容器，overflow-x: auto |
| `.abf-table-compact` | 緊湊表格 |

### Flex Utilities

| Class | 用途 |
|-------|------|
| `.abf-flex-between` | flex + justify-between + align-center |
| `.abf-flex-center` | flex + justify-center + align-center |
| `.abf-flex-gap-sm` | gap: 8px |
| `.abf-flex-gap-md` | gap: 12px |

### 其他

| Class | 用途 |
|-------|------|
| `.abf-empty-state` | 空狀態容器 |
| `.abf-caveat` | 警告/備註文字 |
| `.spreadsheet-wrapper` | Spreadsheet grid 容器 |

---

## 二、Common Components

### PageHeader

頁面標題組件，支援 title、description、actions。

```tsx
<PageHeader
  title="產品管理"
  description="管理 SKU 資料"
  actions={<Button>新增</Button>}
/>
```

### ActionBar

標準 toolbar 組件，提供一致的按鈕排列與資訊顯示。

```tsx
<ActionBar info="3 items selected">
  <Button type="primary">Save</Button>
  <Button>Discard</Button>
</ActionBar>
```

### UnitText

單位文字顯示，標準化小字淺色樣式。

```tsx
<UnitText>Million TWD</UnitText>
// 顯示：(Million TWD)

<UnitText parentheses={false}>mm</UnitText>
// 顯示：mm
```

### EmptyState

空狀態顯示組件。

```tsx
<EmptyState
  title="沒有資料"
  description="請先新增產品"
  actionLabel="新增產品"
  onAction={handleAdd}
/>
```

### ExperimentalBanner

實驗功能警告橫幅。

```tsx
<ExperimentalBanner
  label="EXPERIMENTAL"
  description="此功能仍在實驗階段"
/>
```

### MetricCard

KPI 卡片組件。

```tsx
<MetricCard
  title="總 SKU"
  value={1234}
  suffix="個"
/>
```

### StatusTag

狀態標籤，支援 severity 色彩。

```tsx
<StatusTag label="正常" severity="green" />
<StatusTag label="警告" severity="orange" />
<StatusTag label="危險" severity="red" />
```

---

## 三、已試點頁面

| 頁面 | 套用項目 |
|------|----------|
| BpTargets.tsx | abf-page, ActionBar, UnitText, abf-section, abf-alert-page |
| ForecastsSpreadsheetLab.tsx | abf-page, toolbar-card, abf-alert-section, abf-text-nowrap |

---

## 四、尚未套用頁面

以下頁面將在後續版本逐步套用：

| 頁面 | 預計版本 |
|------|----------|
| Parameters.tsx | v1.31 |
| Dashboard.tsx | v1.31 |
| CalculationResults.tsx | v1.31 |
| Products.tsx | v1.32 |
| Forecasts.tsx | v1.32 |
| CapacityPlan.tsx | v1.32 |
| CapacitySpreadsheet.tsx | v1.32 |
| ProductsSpreadsheetLab.tsx | v1.32 |

---

## 五、設計原則

1. **不改變行為**：CSS utilities 僅影響樣式，不改變任何功能行為
2. **逐步套用**：不一次性重構所有頁面，採漸進式
3. **與 Ant Design 共存**：不覆蓋 Ant Design 預設樣式
4. **可組合**：utilities 可自由組合使用

---

## 六、重要聲明

本版本 v1.30.0 **未修改**：
- Services 層
- Core formulas
- Firestore rules
- 資料語義
- 任何業務邏輯

---

**文件版本**：v1.30.0
**更新日期**：2026-05-25
