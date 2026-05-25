# Dashboard.tsx 與 CalculationResults.tsx UI 結構盤點

本文檔盤點 Dashboard.tsx 與 CalculationResults.tsx 的 UI 結構，作為 v1.31 UI 一致性改進的參考依據。

---

## 一、Dashboard.tsx 結構分析

### 1.1 頁面區塊結構

```
<div>                                    ← 根容器（無 abf-page）
├── Alert (error)                       ← 錯誤提示
├── Alert (qualitySummary)              ← 資料信心度提示
├── Card (welcome)                      ← 歡迎卡片（無 SKU 時）
├── Row (KPI Cards)                     ← 6 個 MetricCard
│   ├── MetricCard (totalSkus)
│   ├── MetricCard (totalRevenue)
│   ├── MetricCard (revenueTrend)
│   ├── MetricCard (worstYear)
│   ├── MetricCard (maxCoreUtil)
│   └── MetricCard (shortageMonths)
├── SectionCard (yearlyHealth)          ← 年度健康矩陣
├── SectionCard (bpAttainment)          ← BP 達成率區塊
│   ├── Row (BP KPI Cards)
│   └── Table (BP 分析表)
├── SectionCard (revenueTrend)          ← 營收趨勢圖
├── SectionCard (utilTrend)             ← 利用率趨率趨勢圖
├── Row (Top Driver Snapshots)          ← 3 個 TimeMatrixTable
│   ├── SectionCard (revByCustomer)
│   ├── SectionCard (coreBySize)
│   └── SectionCard (revByApp)
└── SectionCard (keyInsights)           ← 關鍵洞察
```

### 1.2 使用的 Ant Design 元件

| 元件 | 用途 | 位置 |
|------|------|------|
| `Card` | 區塊容器、歡迎卡片 | 根容器、welcome |
| `Row/Col` | 響應式網格 | KPI cards、BP KPI、Top Drivers |
| `Table` | BP 分析表 | BP Attainment |
| `Alert` | 錯誤、信心度提示 | 頂部 |
| `Tag` | 狀態標籤 | 信心度、BP attainment |
| `Typography.Text` | 次要文字 | 多處 |
| `Space` | 間距容器 | 多處 |
| `Spin` | 載入狀態 | loading |
| `Button` | 操作按鈕 | loadDemo |
| `Popconfirm` | 確認對話框 | loadDemo |

### 1.3 使用的 Common Components

| 元件 | 使用次數 | 位置 |
|------|----------|------|
| `MetricCard` | 10 | KPI cards、BP KPI cards |
| `SectionCard` | 7 | yearlyHealth、bpAttainment、charts、topDrivers、keyInsights |

### 1.4 使用的 Analytics Components

| 元件 | 用途 |
|------|------|
| `TimeMatrixTable` | Top Driver 分析表 |
| `YearlyHealthMatrix` | 年度健康矩陣 |

### 1.5 可套用 UI System 的位置

| 位置 | 現狀 | 可套用 |
|------|------|--------|
| 根容器 `<div>` | 無 class | `abf-page` |
| Alert (error) | inline style | `abf-alert-page` |
| Alert (qualitySummary) | inline style | `abf-alert-page` |
| Card (welcome) | inline style | 已有 `.toolbar-card` 可參考 |
| BP KPI 區塊 | inline Row | 無需改動 |
| BP Table | `analysis-table` class | 已標準化 |

### 1.6 NaN / Empty / Unit 顯示風險

| 位置 | 風險 | 說明 |
|------|------|------|
| `model?.maxCoreUtil === null` | ✅ 已處理 | 顯示 100% + 警告圖示 |
| `highlights?.worstYear` | ✅ 已處理 | 無值時顯示 '—' |
| BP attainment `r.attainment === null` | ✅ 已處理 | 顯示 '-' |
| BP gap `r.gapMillionTwd === null` | ✅ 已處理 | 顯示 '-' |
| KPI `model?.totalRevenue ?? 0` | ✅ 已處理 | 空值 fallback 0 |

### 1.7 不能碰的區域（涉及分析公式或資料流）

| 區域 | 原因 |
|------|------|
| `buildAnalyticsModel()` | 核心分析模型 |
| `getDashboardHighlights()` | 分析結果計算 |
| `buildBpAnalysis()` | BP 分析計算 |
| `computeBpKpi()` | BP KPI 計算 |
| `buildDataQualitySummary()` | 資料品質計算 |
| `yearlyHealthRows` 計算邏輯 | 包含利用率公式 |
| `bpModel.yearly` 資料來源 | BP 資料流 |

---

## 二、CalculationResults.tsx 結構分析

### 2.1 頁面區塊結構

```
<div>                                    ← 根容器（無 abf-page）
├── Alert (error)                       ← 錯錯誤提示
├── Row (Summary KPIs)                  ← 4 個 MetricCard
│   ├── MetricCard (totalRevenue)
│   ├── MetricCard (totalForecastPcs)
│   ├── MetricCard (calculationRows)
│   └── MetricCard (shortageMonthCount)
├── Segmented (view selector)           ← 7 個 view 切換
│
├── view='risk' ──────────────────────── Risk Brief View
│   ├── Card (executiveSummary)
│   ├── Card (aiBriefExport)
│   │   ├── Alert (notice)
│   │   ├── Space (buttons)
│   │   └── Collapse (guardrails)
│   ├── Card (keyFindings)
│   ├── Card (bpGapAttribution) + Table
│   ├── Card (priceImpact) + Tabs/Table
│   ├── Card (capacityImpact) + Table
│   ├── Card (facts)
│   ├── Card (topRiskPeriods) + Table
│   ├── Card (driverAnalysis)
│   ├── Card (bpRisk)
│   ├── Card (dataConfidence) + Table
│   └── Card (assumptions)
│
├── view='change' ────────────────────── Change Review View
│   ├── Card (versionHistory) + Table
│   ├── Card (compareSection)
│   │   ├── Alert (direction)
│   │   ├── Card (recommendedPair)
│   │   ├── Row (selectors)
│   │   └── Button (compare)
│   └── Card (impactResult) + 多個 Alert/Table
│
├── view='sales' ─────────────────────── Sales View
│   └── Tabs (TimeMatrixTable × 4)
│
├── view='product' ───────────────────── Product Planning View
│   └── Tabs (TimeMatrixTable × 8)
│
├── view='capacity' ──────────────────── Capacity View
│   └── Tabs (TimeMatrixTable × 5)
│
├── view='bp' ────────────────────────── BP View
│   └── BpAnalysisPanel
│
└── view='raw' ───────────────────────── Raw View
    └── Tabs (Table × 3)
```

### 2.2 使用的 Ant Design 元件

| 元件 | 用途 | 使用次數 |
|------|------|----------|
| `Card` | 區塊容器 | ~20+ |
| `Table` | 資料表格 | ~15+ |
| `Tabs` | 分頁容器 | 5 |
| `Alert` | 提示訊息 | ~10+ |
| `Tag` | 狀態標籤 | 多處 |
| `Row/Col` | 網格佈局 | KPI、Compare |
| `Segmented` | View 切換 | 1 |
| `List` | 清單顯示 | Key Findings |
| `Collapse` | 可折疊區塊 | Guardrails |
| `Space` | 間距容器 | 多處 |
| `Button` | 操作按鈕 | 多處 |
| `Select` | 下拉選單 | Snapshot selector |
| `Modal` | 對話框 | Create Snapshot |
| `Progress` | 進度條 | Attainment |
| `Statistic` | 統計數值 | Change Impact |

### 2.3 使用的 Common Components

| 元件 | 使用次數 | 位置 |
|------|----------|------|
| `MetricCard` | 4 | Summary KPIs |

### 2.4 使用的 Analytics Components

| 元件 | 用途 |
|------|------|
| `TimeMatrixTable` | 所有矩陣分析表 |
| `YearlyHealthMatrix` | 年度健康矩陣 |
| `BpAnalysisPanel` | BP 分析面板 |

### 2.5 可套用 UI System 的位置

| 位置 | 現狀 | 可套用 |
|------|------|--------|
| 根容器 `<div>` | 無 class | `abf-page` |
| Alert (error) | 無 class | `abf-alert-page` |
| Risk Brief Cards | `<Card bordered={false} size="small">` | 可統一樣式 |
| AI Brief Export buttons | `<Space wrap>` | `abf-toolbar-actions` |
| Change Compare Section | inline style | `abf-toolbar` 模式 |
| View selector margin | inline style | CSS utility |

### 2.6 NaN / Empty / Unit 顯示風險

| 位置 | 風險 | 說明 |
|------|------|------|
| Price Impact `v === null` | ✅ 已處理 | 顯示 '-' |
| Capacity Impact `maxCoreUtil === null` | ✅ 已處理 | 顯示 `t('results.capacityImpact.overflow')` |
| BP Attainment `kpi.overallAttainment === null` | ✅ 已處理 | 顯示 '-' |
| BP Gap `kpi.totalGapMillionTwd === null` | ✅ 已處理 | 顯示 '-' |
| Change Impact 數值 | ✅ 已處理 | 有 delta 格式化 |

### 2.7 不能碰的區域（涉及分析公式或資料流）

| 區域 | 原因 |
|------|------|
| `buildAnalyticsModel()` | 核心分析模型 |
| `buildShortageExposure()` | 缺口暴露計算 |
| `buildBpAnalysis()` | BP 分析計算 |
| `buildAnalysisContractPayload()` | 分析合約建構 |
| `buildRiskBrief()` | 風險摘要生成 |
| `computeChangeImpact()` | 變更影響計算 |
| `buildSanitizedAnalysisContract()` | AI 匯出資料清洗 |
| `analysisPayload` 相關計算 | 分析結果來源 |
| `bpAnalysisModel` 相關計算 | BP 分析結果 |
| Snapshot handlers | 資料持久化邏輯 |

---

## 三、共同問題與改進建議

### 3.1 共同問題

| 問題 | Dashboard | CalculationResults |
|------|-----------|-------------------|
| 根容器無標準 class | ✅ | ✅ |
| Alert 無統一間距 class | ✅ | ✅ |
| Card 無統一 size/variant | 部分 | ❌ (多種 size 混用) |
| inline style 過多 | 部分 | ✅ |

### 3.2 改進建議

#### 低風險（v1.31 可做）

1. **根容器加入 `abf-page`**
2. **Alert 加入 `abf-alert-page` / `abf-alert-section`**
3. **統一 Card 使用 `SectionCard` 元件**

#### 中風險（需評估）

1. **Risk Brief 區塊重構** — 結構複雜，需逐步處理
2. **Change Review UI 統一** — 涉及 Snapshot 邏輯

#### 高風險（不建議）

1. **分析表格欄位調整** — 涉及分析公式輸出
2. **MetricCard 資料來源變更** — 涉及計算邏輯

---

## 四、版本規劃建議

### v1.31 Dashboard / Results 統一

| 項目 | Dashboard | CalculationResults |
|------|-----------|-------------------|
| 根容器 `abf-page` | ✅ 可做 | ✅ 可做 |
| Alert 標準化 | ✅ 可做 | ✅ 可做 |
| Card → SectionCard | ✅ 可做 | 部分可做 |
| Risk Brief UI | N/A | 需評估 |

### 禁止事項

- ❌ 不修改 `buildAnalyticsModel` 等分析函數
- ❌ 不修改 `buildRiskBrief` 等分析輸出
- ❌ 不修改 Snapshot 資料流
- ❌ 不修改 Table columns 定義（影響分析輸出）

---

## 五、檔案行數參考

| 檔案 | 行數 | 複雜度 |
|------|------|--------|
| Dashboard.tsx | 540 | 中 |
| CalculationResults.tsx | 2387 | 高 |

---

**文件版本**：v1.30.0
**盤點日期**：2026-05-25
**用途**：v1.31 UI 一致性改進參考
