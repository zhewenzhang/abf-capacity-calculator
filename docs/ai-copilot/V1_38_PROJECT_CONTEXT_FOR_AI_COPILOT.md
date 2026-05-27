# v1.38 AI Data Copilot 專案上下文文件 (Project Context Document)

> **版本**: v1.38.0
> **狀態**: Active / Foundation Reference
> **目的**: 為 AI Data Copilot 功能提供完整的專案上下文參考，涵蓋產品能力、資料模型、資料流、安全規範與 AI 行為邊界。
> **更新日期**: 2026-05-27

---

## 目錄

1. [目前產品能力總覽](#一-目前產品能力總覽)
2. [主要資料模型](#二-主要資料模型)
3. [Products / Forecasts / Capacity / BP Targets / Parameters / Results / Scenario 的資料流](#三-資料流)
4. [Data Quality Visibility / Remediation 如何運作](#四-data-quality-visibility--remediation-如何運作)
5. [Risk Brief / AI Brief Export 如何運作](#五-risk-brief--ai-brief-export-如何運作)
6. [Snapshot / Change Review 如何運作](#六-snapshot--change-review-如何運作)
7. [Workspace role 權限](#七-workspace-role-權限)
8. [哪些資料可以給 AI](#八-哪些資料可以給-ai)
9. [哪些資料絕對不能給 AI](#九-哪些資料絕對不能給-ai)
10. [哪些 AI 行為必須禁止](#十-哪些-ai-行為必須禁止)

---

## 一、目前產品能力總覽

ABF Capacity Calculator 是一款瀏覽器端的 ABF（Ajinomoto Build-up Film）載板產能規劃工具，目前版本為 **v1.37.0**。技術堆疊：React 19、TypeScript、Vite、Ant Design 6、Firebase（Auth + Firestore + Hosting）。

### 1.1 核心功能清單

| 功能模組 | 說明 |
| :--- | :--- |
| **SKU / 產品管理** | 管理產品資料，包含晶片尺寸（chipLengthMm / chipWidthMm）、層數（layerCount）、尺寸分類（sizeCategory）、多幣別定價（USD / TWD / CNY）、Core 材料類型（E705G / E795G 等）、ABF 材料類型（GL102 / GL107 等） |
| **月度銷售預測** | 逐 SKU 逐月（YYYY-MM）輸入需求量（pcs）與單價，支援 2026-2040 年度範圍，提供批量成長產生器（Forecast Growth Generator） |
| **工廠產能規劃** | 按工廠、按月配置 Core 面板/日與 BU 面板/日產能，支援多工廠定義 |
| **確定性計算引擎** | `runCalculation()` 迭代 SKU-Forecast 配對，計算面板需求（panel demand）、稼動率（utilization）、短缺（shortage）、瓶頸（bottleneck）與營收（revenue） |
| **BP 目標追蹤** | 設定年度 / 季度 / 月度營業目標（百萬台幣 Million TWD），計算達成率（attainment）、差距（gap）、歸因（attribution） |
| **分析儀表板** | 年度健康度（yearly health）、維度矩陣（dimension matrices）、趨勢圖表（trend charts），涵蓋客戶、SKU、尺寸、應用等維度 |
| **情境規劃** | 4 個乘數（forecastVolume、unitPrice、coreCapacity、buCapacity）的 What-If 模擬，計算 Delta 差異 |
| **資料品質診斷** | 6 大領域驗證，信心分數 0-100，決策影響分類（high / medium / low） |
| **預測版本控制** | 不可變快照（immutable snapshots），變更影響審查（change impact review） |
| **共享工作區協作** | Owner / Editor / Viewer 三級角色權限，基於 UID 的邀請機制 |
| **AI Brief Export** | 經過清洗（sanitized）的 JSON + 中文 Prompt，供外部 AI 工具使用，無 API 呼叫 |

### 1.2 技術架構

- **前端**: React 19 + TypeScript + Vite + Ant Design 6
- **後端**: Firebase（Auth 驗證、Firestore 資料庫、Hosting 靜態託管）
- **計算引擎**: 純前端確定性 JavaScript 計算，無伺服器端運算
- **部署**: Firebase Hosting 靜態部署，無 Cloud Functions

---

## 二、主要資料模型

以下為系統核心 TypeScript 介面定義，位於 `frontend/src/types/index.ts` 與 `frontend/src/types/snapshot.ts`。

### 2.1 SKU（產品）

```typescript
interface SKU {
  id: string;
  skuCode: string;           // 產品編碼
  customer: string;          // 客戶名稱
  deviceName: string;        // 裝置名稱
  osat: string;              // 封測廠
  application: string;       // 應用領域（Server-HPC, Mobile, AI 等）
  productGrade: string;      // 產品等級
  sizeCategory: SizeCategory; // 'small' | 'medium' | 'large' | 'xlarge'
  chipLengthMm: number;      // 晶片長度 (mm)
  chipWidthMm: number;       // 晶片寬度 (mm)
  layerCount: number;        // 層數
  unitPrice: number;         // 單價
  unitPriceCurrency?: CurrencyCode; // 'USD' | 'TWD' | 'CNY'
  upp?: number;              // 每面板單元數 (自動計算)
  yieldEstimate?: number;    // 估計良率 (從良率矩陣)
  coreType?: string;         // Core 材料類型
  coreThicknessMm?: number;  // Core 厚度 (mm)
  abfType?: string;          // ABF 材料類型
}
```

### 2.2 Forecast（需求預測）

```typescript
interface Forecast {
  id: string;
  skuId: string;             // 關聯 SKU ID
  month: string;             // YYYY-MM 格式
  forecastPcs: number;       // 需求量 (pcs)
  unitPrice: number;         // 單價
  unitPriceCurrency?: CurrencyCode;
}
```

### 2.3 CapacityPlan（產能規劃）

```typescript
interface CapacityPlan {
  id: string;
  month: string;             // YYYY-MM 格式
  factoryId: string;         // 工廠 ID
  corePanelPerDay: number;   // Core 面板日產量
  buPanelPerDay: number;     // BU 面板日產量
}
```

### 2.4 ProjectParameters（專案參數）

```typescript
interface ProjectParameters {
  yieldMatrix: YieldMatrix;  // 良率矩陣 (尺寸 x 層數區間)
  panelParams: PanelParams;  // 面板佈局參數
  defaultWorkingDays?: number; // 預設工作天數
  factories?: FactoryDef[];  // 工廠定義列表
  currencySettings?: {
    baseCurrency: 'USD';
    displayCurrency: CurrencyCode;
    exchangeRateMode: 'constant' | 'yearly';
    constantUsdToTwdRate: number;
    yearlyUsdToTwdRates: Record<string, number>;
    constantUsdToCnyRate: number;
    yearlyUsdToCnyRates: Record<string, number>;
  };
  bpTargets?: {
    mode: 'yearly' | 'monthly';
    yearlyRevenueTargetsMillionTwd: Record<string, number>;
    monthlyRevenueTargetsMillionTwd?: Record<string, number>;
  };
}
```

### 2.5 CalculationResult（計算結果）

```typescript
interface CalculationResult {
  skuResults: SkuCalculationResult[];      // 逐 SKU 逐月計算結果
  monthlySummaries: MonthlyCapacitySummary[]; // 逐月產能匯總
  totalRevenue: number;                     // 總營收 (USD)
  totalForecastPcs: number;                 // 總需求量 (pcs)
  maxCoreUtilization: number | null;        // 最高 Core 稼動率
  maxBuUtilization: number | null;          // 最高 BU 稼動率
  shortageMonthCount: number;               // 短缺月數
  worstBottleneckMonth: string | null;      // 最嚴重瓶頸月份
}
```

### 2.6 SkuCalculationResult（逐 SKU 計算結果）

```typescript
interface SkuCalculationResult {
  skuId: string;
  skuCode: string;
  month: string;
  forecastPcs: number;
  unitPrice: number;
  yieldRate: number;           // 良率
  requiredInputPcs: number;    // 良率調整後需求量
  pcsPerPanel: number;         // 每面板單元數
  requiredPanels: number;      // 需求面板數
  coreSteps: number;           // Core 步驟數 (固定 1)
  buSteps: number;             // BU 步驟數: max(layerCount / 2 - 1, 0)
  corePanelDemand: number;     // Core 面板需求
  buPanelDemand: number;       // BU 面板需求
  revenue: number;             // 營收 (USD)
}
```

### 2.7 MonthlyCapacitySummary（月度產能匯總）

```typescript
interface MonthlyCapacitySummary {
  month: string;
  totalCorePanelDemand: number;
  totalBuPanelDemand: number;
  coreCapacity: number;
  buCapacity: number;
  coreUtilization: number | null; // null 表示 Infinity（產能為 0 但需求 > 0）
  buUtilization: number | null;
  coreShortage: number;
  buShortage: number;
  bottleneck: 'Core' | 'BU' | 'None';
}
```

### 2.8 Workspace / ProjectScope / WorkspaceRole（工作區協作）

```typescript
type WorkspaceRole = 'owner' | 'editor' | 'viewer';

interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  members: Record<string, WorkspaceRole>; // uid → role
}

interface ProjectScope {
  mode: 'personal' | 'workspace';
  userId: string;
  workspaceId?: string;
  projectId: string;
  role: WorkspaceRole;
}
```

### 2.9 Snapshot（快照）

```typescript
interface Snapshot {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
  sourceAppVersion: string;
  scope: 'personal' | 'workspace';
  workspaceId?: string;
  rawInputs: SnapshotRawInputs;          // 完整原始輸入
  derivedHighlights: SnapshotDerivedHighlights; // 衍生摘要
  metadata?: SnapshotMetadata;           // 可選元數據
}

type SnapshotKind = 'working' | 'bpBaseline' | 'customerUpdate'
  | 'capacityReview' | 'scenario' | 'archive';

type SnapshotReviewStatus = 'draft' | 'reviewed' | 'locked' | 'archived';
```

### 2.10 AnalysisContractPayload（分析合約）

```typescript
interface AnalysisContractPayload {
  version: '1.1';
  generatedAt: string;
  appVersion?: string;
  timeRange: { months: string[]; years: string[] };
  metricDefinitions: MetricDefinition[];
  quality: DataQualitySummary;
  assumptions: string[];
  summary: { totalRevenueUsd; totalForecastPcs; maxCoreUtilization; ... };
  yearlyHealth: YearlyHealth[];
  bpAnalysis?: BpAnalysisModel;
  skus: SKU[];
  forecasts: Forecast[];
  matrices: { revenueByCustomer; revenueBySku; revenueBySize; ... };
  riskAttribution: RiskAttributionModel;
  bpAttribution: BpAttributionModel;
  priceImpact: PriceImpactModel;
  capacityImpact: CapacityImpactModel;
  keyFindings: KeyFinding[];
}
```

---

## 三、資料流

### 3.1 整體資料流架構

```
[用戶輸入]                    [Firestore 持久化]              [前端計算引擎]
    │                              │                              │
    ▼                              ▼                              ▼
┌─────────┐    save    ┌──────────────────┐    load    ┌──────────────────┐
│ SKU 管理 │ ────────→ │ Firestore        │ ────────→ │ runCalculation() │
│ 預測輸入 │    save    │   users/{uid}/   │    load    │                  │
│ 產能規劃 │ ────────→ │   projects/      │ ────────→ │ SkuCalculation   │
│ BP 目標  │    save    │   workspace/     │    load    │   Result[]       │
│ 參數設定 │ ────────→ │   ...            │ ────────→ │ MonthlyCapacity  │
└─────────┘            └──────────────────┘            │   Summary[]      │
                                                        └────────┬─────────┘
                                                                 │
                                                                 ▼
                                                        ┌──────────────────┐
                                                        │ buildAnalytics   │
                                                        │   Model()        │
                                                        │ → 年度健康度      │
                                                        │ → 維度矩陣       │
                                                        └────────┬─────────┘
                                                                 │
                                                                 ▼
                                                        ┌──────────────────┐
                                                        │ buildBpAnalysis  │
                                                        │   ()             │
                                                        │ → USD→TWD 轉換   │
                                                        │ → 目標對比        │
                                                        │ → 達成率 / 差距   │
                                                        └────────┬─────────┘
                                                                 │
                                                                 ▼
                                                        ┌──────────────────┐
                                                        │ Scenario Engine  │
                                                        │ → 4 個乘數模擬    │
                                                        │ → Delta 計算     │
                                                        └────────┬─────────┘
                                                                 │
                                                                 ▼
                                                        ┌──────────────────┐
                                                        │ Impact Analysis  │
                                                        │ → Price ±5/10%   │
                                                        │ → Capacity +10%  │
                                                        └────────┬─────────┘
                                                                 │
                                                                 ▼
                                                        ┌──────────────────┐
                                                        │ Data Quality     │
                                                        │ → 6 大領域驗證    │
                                                        │ → 信心分數 0-100  │
                                                        └────────┬─────────┘
                                                                 │
                                                                 ▼
                                                        ┌──────────────────┐
                                                        │ Export Pipeline  │
                                                        │ → aiBriefExport  │
                                                        │ → sanitized JSON │
                                                        │ → 中文 Prompt    │
                                                        └──────────────────┘
```

### 3.2 Products 資料流

```
Products.tsx (SKU 列表)
    │
    ├─ 創建/編輯 SKU → skuService.saveSku()
    │                      │
    │                      ▼
    │               Firestore: projects/{projectId}/skus/{skuId}
    │
    ├─ DataQualityBadge (即時 DQ 檢查)
    │   └─ 缺失 chipLengthMm/chipWidthMm/layerCount/sizeCategory/unitPrice
    │
    └─ Quick Fix Drawer → skuService.saveSku() (就地修復)
```

### 3.3 Forecasts 資料流

```
Forecasts.tsx / ForecastsSpreadsheetLab.tsx (預測表格)
    │
    ├─ 創建/編輯 Forecast → forecastService.saveForecast()
    │                          │
    │                          ▼
    │                   Firestore: projects/{projectId}/forecasts/{forecastId}
    │
    ├─ DataQualityBadge
    │   ├─ 孤兒預測 (skuId 不存在)
    │   ├─ 零單價預測
    │   └─ 部分年份數據 (1-11 個月)
    │
    └─ Quick Fix / Navigation Fix → 導航至 Products 或就地修復
```

### 3.4 Capacity 資料流

```
CapacityPlan.tsx / CapacitySpreadsheet.tsx (產能表格)
    │
    ├─ 創建/編輯 CapacityPlan → capacityService.saveCapacityPlan()
    │                              │
    │                              ▼
    │                       Firestore: projects/{projectId}/capacityPlans/{planId}
    │
    ├─ DataQualityBadge
    │   ├─ 預測月份缺失產能配置
    │   └─ 高層數 SKU 需求 vs BU 產能為零
    │
    └─ Navigation Fix → 導航至 Capacity 頁面定位月份
```

### 3.5 BP Targets 資料流

```
BpTargets.tsx (營業目標)
    │
    ├─ 設定年度/月度目標 → bpTargetService.saveBpTarget()
    │                        │
    │                        ▼
    │                 Firestore: projects/{projectId}/parameters (bpTargets 欄位)
    │
    ├─ DataQualityBadge
    │   ├─ 有目標但無預測 (bp-target-zero-forecast)
    │   └─ 有預測但無目標 (forecast-missing-bp-target)
    │
    └─ buildBpAnalysis() → USD→TWD 轉換 → 目標對比 → 達成率/差距
```

### 3.6 Parameters 資料流

```
Parameters.tsx (參數設定)
    │
    ├─ 設定良率矩陣 / 面板參數 / 匯率 / 工作天數
    │   → parameterService.saveParameters()
    │         │
    │         ▼
    │   Firestore: projects/{projectId}/parameters/{parameterId}
    │
    ├─ DataQualityBadge
    │   ├─ 缺失 TWD 匯率 (存在 TWD 計價 SKU 時)
    │   └─ 缺失 CNY 匯率 (存在 CNY 計價 SKU 時)
    │
    └─ Quick Fix Drawer → 就地補充匯率
```

### 3.7 Results / Analytics 資料流

```
runCalculation(SKU[], Forecast[], CapacityPlan[], Parameters)
    │
    ├─ SkuCalculationResult[] (逐 SKU 逐月)
    │   ├─ yieldRate = yieldMatrix[sizeCategory][layerBucket]
    │   ├─ requiredInputPcs = forecastPcs / yieldRate
    │   ├─ pcsPerPanel = panelLayout(chipLengthMm, chipWidthMm, panelParams)
    │   ├─ requiredPanels = ceil(requiredInputPcs / pcsPerPanel)
    │   ├─ buSteps = max(layerCount / 2 - 1, 0)
    │   ├─ corePanelDemand = requiredPanels * 1 (coreSteps 固定)
    │   ├─ buPanelDemand = requiredPanels * buSteps
    │   └─ revenue = forecastPcs * unitPrice (USD 標準化)
    │
    └─ MonthlyCapacitySummary[] (逐月匯總)
        ├─ coreUtilization = totalCoreDemand / coreCapacity
        ├─ buUtilization = totalBuDemand / buCapacity
        ├─ coreShortage = max(totalCoreDemand - coreCapacity, 0)
        ├─ buShortage = max(totalBuDemand - buCapacity, 0)
        └─ bottleneck = max(coreShortage, buShortage) > 0 ? 'Core' or 'BU' : 'None'

buildAnalyticsModel(CalculationResult, SKU[])
    │
    ├─ yearlyHealth (年度營收/需求/產能/短缺匯總)
    ├─ revenueByCustomer (客戶維度營收矩陣)
    ├─ revenueBySku (SKU 維度營收矩陣)
    ├─ revenueBySize (尺寸維度營收矩陣)
    ├─ coreDemandBySize / buDemandBySize
    └─ coreDemandByApplication / buDemandByApplication

buildBpAnalysis(Parameters, AnalyticsModel)
    │
    ├─ USD 營收 → TWD 轉換 (使用 currencySettings 匯率)
    ├─ 達成率 = forecastRevenueMillionTwd / targetMillionTwd
    ├─ 差距 = targetMillionTwd - forecastRevenueMillionTwd
    └─ 狀態: 'hit' | 'miss' | 'on-track'
```

### 3.8 Scenario Engine 資料流

```
Scenario Engine (情境規劃)
    │
    ├─ 輸入: 4 個乘數 (forecastVolume, unitPrice, coreCapacity, buCapacity)
    │
    ├─ 過程:
    │   ├─ 深複製 (deep clone) 原始 SKU[] / Forecast[] / CapacityPlan[]
    │   ├─ 套用乘數至複製數據
    │   │   ├─ forecastVolume → forecastPcs *= multiplier
    │   │   ├─ unitPrice → SKU.unitPrice *= multiplier
    │   │   ├─ coreCapacity → corePanelPerDay *= multiplier
    │   │   └─ buCapacity → buPanelPerDay *= multiplier
    │   ├─ 重新運行 runCalculation()
    │   └─ 計算 Delta (scenario - baseline)
    │
    └─ 輸出: ScenarioResult (含 delta 營收/短缺/稼動率)
```

### 3.9 Impact Analysis 資料流

```
Impact Analysis (影響分析)
    │
    ├─ Price Impact (價格影響):
    │   ├─ 固定情境: ±5%, ±10% 價格變動
    │   ├─ 深複製 SKU → 套用價格乘數
    │   ├─ 重跑計算 → 計算營收與 BP 達成率 Delta
    │   └─ 唯讀模擬，不修改實際數據
    │
    └─ Capacity Impact (產能影響):
        ├─ 固定情境: Core +10%, BU +10%, Both +10%
        ├─ 深複製 CapacityPlan → 套用產能乘數
        ├─ 重跑計算 → 計算短缺月數與稼動率 Delta
        └─ 唯讀模擬，不修改實際數據
```

### 3.10 Export Pipeline 資料流

```
Export Pipeline (匯出管線)
    │
    ├─ buildAnalysisContractPayload()
    │   ├─ 聚合所有分析模組
    │   ├─ 加入 metricDefinitions (指標定義)
    │   ├─ 加入 assumptions (系統假設)
    │   └─ 版本化: version '1.1'
    │
    ├─ buildSanitizedAnalysisContract()
    │   ├─ removeSensitiveData() 遞迴清洗敏感鍵值
    │   ├─ 限制 SKU 摘要欄位 (skuCode, customer, deviceName, application, productGrade, sizeCategory, layerCount)
    │   ├─ 限制 Risk Attribution Top 10
    │   └─ 加入 aiGuardrails (安全護欄)
    │
    ├─ buildChineseAiBriefPrompt()
    │   ├─ 角色定位: ABF 載板產能與產品規劃分析顧問
    │   ├─ 信心警告 (blocked/low 時)
    │   ├─ 6 大分析任務
    │   ├─ 6 大嚴格禁止事項
    │   ├─ F-A-I-R 結論分類標準
    │   └─ 資料安全提醒
    │
    └─ buildCombinedAiBriefPack()
        ├─ Prompt + Sanitized JSON
        └─ 供用戶複製貼上至外部 AI 工具
```

---

## 四、Data Quality Visibility / Remediation 如何運作

### 4.1 Data Quality 系統架構

Data Quality 系統由三個層級組成：

1. **診斷引擎** (`dataQuality.ts`): `buildDataQualitySummary()` 函式，接收 SKU、Forecast、CapacityPlan、Parameters，輸出 `DataQualitySummary`
2. **可視化層** (v1.35): 在各輸入頁面即時顯示 DQ Badge 與 Alert
3. **修復層** (v1.36): Quick Fix / Navigation Fix / Guided Fix 自癒工作流

### 4.2 六大 DQ 領域檢測規則

| 領域 (Domain) | 檢測項目 | 嚴重度 | 決策影響 |
| :--- | :--- | :--- | :--- |
| **Products** | SKU 缺失尺寸/層數/尺寸分類/單價 | error | medium |
| **Products** | SKU 單價為零 | warning | medium |
| **Products** | SKU 不支援的幣別 | warning | medium |
| **Forecast** | 孤兒預測 (skuId 不存在) | error | high |
| **Forecast** | 預測單價為零 | warning | medium |
| **Forecast** | 部分年份數據 (1-11 個月) | warning | medium |
| **Capacity** | 預測月份缺失產能配置 | error | high |
| **Capacity** | 高層數 SKU 需求 vs BU 產能為零 | error | high |
| **Capacity** | 有產能但無需求 (informational) | info | low |
| **Currency** | 缺失 TWD 匯率 (存在 TWD 計價 SKU) | error | high |
| **Currency** | 缺失 CNY 匯率 (存在 CNY 計價 SKU) | error | high |
| **BP** | 有目標但無預測 | warning | medium |
| **BP** | 有預測但無目標 | warning | medium |
| **System** | 固定工作天數假設 (informational) | info | low |
| **System** | 均勻分配假設 (informational) | info | low |

### 4.3 信心分數計算

```
confidenceScore (0-100):
  ├─ 0: blocked (無 SKU 且無 Forecast)
  ├─ 1-59: low (存在 error 級別問題)
  ├─ 60-79: medium (僅 warning 級別問題)
  └─ 80-100: high (無 error/warning 或極少)
```

### 4.4 決策影響分類 (Decision Impact)

- **high**: 封鎖核心分析或扭曲 BP/產能數字（孤兒預測、缺失產能、缺失匯率、BU 需求 vs 零產能）
- **medium**: 增加噪音 / 部分覆蓋（零單價、部分年份預測、缺失 BP 目標、不支援幣別）
- **low**: 資訊性（有產能無需求、BP 分配資訊、固定工作天數）

### 4.5 修復策略三類型

| 修復類型 | 適用場景 | 交互方式 |
| :--- | :--- | :--- |
| **Quick Fix** | 修復源在當前域且為單表 | 右側抽屉 (Drawer) 或 Popover 就地補值並保存 |
| **Navigation Fix** | 修復源在另一頁面 | 一鍵跳至目標頁，URL 攜帶參數自動聚焦高亮 |
| **Guided Fix** | 跨表複雜關聯 | 引導對話框列出多種修復路徑，由用戶決定 |

### 4.6 Viewer 角色 DQ 行為

- **完整可見**: Viewer 可看到所有 DQ 圖標、警示橫幅與 Tooltip
- **禁止觸發**: 所有修復 Drawer、Popover、Modal 對 Viewer 一律不回應
- **物理按鈕強置灰**: 任何輸入框、確認保存按鈕保持 `disabled` 狀態

---

## 五、Risk Brief / AI Brief Export 如何運作

### 5.1 分析合約管線 (Analysis Contract Pipeline)

```
buildAnalysisContractPayload()
    │
    ├─ 輸入: SKU[], Forecast[], CapacityPlan[], Parameters, AnalyticsModel, BpAnalysisModel
    │
    ├─ 聚合模組:
    │   ├─ buildDataQualitySummary() → quality
    │   ├─ buildRiskAttributionModel() → riskAttribution (SKU/客戶/尺寸/應用維度驅動)
    │   ├─ buildBpAttributionModel() → bpAttribution (BP 差距比例歸因)
    │   ├─ buildPriceImpact() → priceImpact (±5%, ±10%)
    │   ├─ buildCapacityImpact() → capacityImpact (Core/BU/Both +10%)
    │   └─ buildKeyFindings() → keyFindings (最多 5 個決策級亮點)
    │
    ├─ 加入 metricDefinitions (指標定義與公式)
    ├─ 加入 assumptions (8 項系統假設)
    └─ 輸出: AnalysisContractPayload (version '1.1')
```

### 5.2 清洗管線 (Sanitization Pipeline)

```
buildSanitizedAnalysisContract(payload)
    │
    ├─ removeSensitiveData() — 遞迴移除敏感鍵值
    │   └─ SENSITIVE_KEYS = ['uid', 'email', 'token', 'auth', 'member', 'user', 'workspaceId', 'ownerUid']
    │
    ├─ SKU 摘要限制: 僅保留 skuCode, customer, deviceName, application, productGrade, sizeCategory, layerCount
    │
    ├─ Risk Attribution 限制: Top 10 drivers
    │
    ├─ BP Attribution 限制: Top 5 drivers + proportionalNote 聲明
    │
    ├─ Price / Capacity Impact: 保留唯讀模擬結果
    │
    └─ 加入 aiGuardrails:
        ├─ doNotModify: 公式不可修改
        ├─ currencyHandling: 幣別處理規則
        ├─ attributionWarning: 比例歸因非因果聲明
        ├─ dataQualityWarning: 資料品質警告
        ├─ fairClassification: F-A-I-R 結論分類要求
        ├─ weightedPressureBoundary: 加權壓力邊界
        └─ blockedConfidenceHandling: 低信心處理規範
```

### 5.3 中文 AI Brief Prompt 結構

```
buildChineseAiBriefPrompt(sanitizedContract)
    │
    ├─ 角色定位: ABF 載板產能與產品規劃分析顧問
    │
    ├─ 資料品質警告 (blocked/low 時顯示)
    │
    ├─ 6 大分析任務:
    │   ├─ 1. 產能瓶頸分析
    │   ├─ 2. BP 達成風險分析
    │   ├─ 3. 價格變動敏感度
    │   ├─ 4. 產能改善情境
    │   ├─ 5. SKU/客戶/尺寸/應用/層別風險驅動因子
    │   └─ 6. 資料品質與可信度評估
    │
    ├─ 6 大嚴格禁止事項:
    │   ├─ 1. 修改公式
    │   ├─ 2. 自行補充資料
    │   ├─ 3. 混淆貨幣單位
    │   ├─ 4. 忽略資料限制
    │   ├─ 5. 混淆比例歸因與因果關係
    │   └─ 6. 誤用 Weighted Pressure Index
    │
    ├─ F-A-I-R 結論分類標準
    │
    ├─ 10 項輸出格式要求
    │
    └─ 資料安全提醒 (7 類護欄規範)
```

### 5.4 重要設計原則

- **零 API 呼叫**: `aiBriefExport.ts` 絕不調用任何 AI API，僅準備數據供用戶複製貼上
- **記憶體中清洗**: 所有清洗操作在記憶體中完成，不修改原始數據
- **UTF-8 BOM**: 下載的 JSON 檔案包含 UTF-8 BOM，確保中文編碼正確

---

## 六、Snapshot / Change Review 如何運作

### 6.1 快照生命週期

```
創建快照 → draft → reviewed → locked → archived
    │         │        │         │         │
    │         │        │         │         └─ 歷史歸檔
    │         │        │         └─ 鎖定，不可修改
    │         │        └─ 已審查
    │         └─ 草稿
    └─ 由 Owner/Editor 創建
```

### 6.2 快照內容

```typescript
Snapshot {
  rawInputs: {
    skus: SKU[];           // 完整 SKU 列表
    forecasts: Forecast[]; // 完整預測列表
    capacityPlans: CapacityPlan[]; // 完整產能規劃
    parameters: ProjectParameters; // 完整參數
  }
  derivedHighlights: {
    totalRevenueUsd: number;
    totalForecastPcs: number;
    maxCoreUtilization: number | null;
    maxBuUtilization: number | null;
    shortageMonthCount: number;
    worstBottleneckMonth: string | null;
    bpAttainment: number | null;
    bpGapMillionTwd: number | null;
    keyFindingsCount: number;
    skuCount: number;
    forecastMonthCount: number;
  }
  metadata?: {
    kind?: SnapshotKind;        // working / bpBaseline / customerUpdate / capacityReview / scenario / archive
    periodLabel?: string;       // "2026 BP", "2026-Q3 Update"
    reviewStatus?: SnapshotReviewStatus; // draft / reviewed / locked / archived
    note?: string;
  }
}
```

### 6.3 變更影響分析 (Change Impact Analysis)

```
compareSnapshots(baseline: Snapshot, current: Snapshot)
    │
    ├─ SKU 變更: 新增 / 刪除 / 修改的 SKU
    │   └─ 識別屬性差異 (unitPrice, layerCount, sizeCategory 等)
    │
    ├─ Forecast 變更: 新增 / 刪除 / 修改的預測
    │   └─ 識別數量與單價差異
    │
    ├─ Capacity 變更: 新增 / 刪除 / 修改的產能
    │   └─ 識別 Core/BU 面板日產量差異
    │
    ├─ Parameters 變更: 良率矩陣 / 匯率 / BP 目標差異
    │
    └─ 輸出: ChangeImpactReport
        ├─ 營收影響 (revenue delta)
        ├─ 產能影響 (capacity delta)
        ├─ BP 達成率影響 (attainment delta)
        └─ 瓶頸變化 (bottleneck changes)
```

### 6.4 快照刪除權限

- **Owner**: 可刪除任何快照
- **Editor**: 僅可刪除自己創建的快照
- **Viewer**: 無刪除權限

---

## 七、Workspace role 權限

### 7.1 角色權限矩陣

| 操作 | Owner | Editor | Viewer |
| :--- | :---: | :---: | :---: |
| 查看所有數據 | ✅ | ✅ | ✅ |
| 創建 SKU | ✅ | ✅ | ❌ |
| 編輯 SKU | ✅ | ✅ | ❌ |
| 刪除 SKU | ✅ | ✅ | ❌ |
| 創建預測 | ✅ | ✅ | ❌ |
| 編輯預測 | ✅ | ✅ | ❌ |
| 刪除預測 | ✅ | ✅ | ❌ |
| 創建產能規劃 | ✅ | ✅ | ❌ |
| 編輯產能規劃 | ✅ | ✅ | ❌ |
| 設定 BP 目標 | ✅ | ✅ | ❌ |
| 修改參數 | ✅ | ✅ | ❌ |
| 創建快照 | ✅ | ✅ | ❌ |
| 刪除任何快照 | ✅ | ❌ | ❌ |
| 刪除自己的快照 | ✅ | ✅ | ❌ |
| 管理工作區成員 | ✅ | ❌ | ❌ |
| 刪除工作區 | ✅ | ❌ | ❌ |
| 觸發 DQ 修復 | ✅ | ✅ | ❌ |
| 觸發 AI Copilot 修復 | ✅ | ✅ | ❌ |
| 查看 DQ 警示 | ✅ | ✅ | ✅ |
| 匯出 AI Brief | ✅ | ✅ | ✅ |

### 7.2 Viewer 角色硬性限制

- **服務層攔截**: 所有 `services/*.ts` 中的寫入函式在檢測到 Viewer 角色時會直接拒絕
- **Firestore Security Rules**: `firestore.rules` 在資料庫層級攔截 Viewer 的寫入請求
- **前端 UI**: 所有編輯按鈕、輸入框、保存按鈕對 Viewer 一律 `disabled`
- **AI Copilot**: 修復按鈕對 Viewer 完全隱藏或強制 `disabled`

---

## 八、哪些資料可以給 AI

以下資料經過清洗後，安全可傳遞給外部 AI 工具進行分析：

### 8.1 聚合指標 (Aggregated Metrics)

- `totalRevenueUsd`: 總營收 (USD)
- `totalForecastPcs`: 總需求量 (pcs)
- `maxCoreUtilization`: 最高 Core 稼動率
- `maxBuUtilization`: 最高 BU 稼動率
- `shortageMonthCount`: 短缺月數
- `worstBottleneckMonth`: 最嚴重瓶頸月份

### 8.2 年度健康度 (Yearly Health)

- 年度營收、需求、Core/BU 產能、短缺月數、瓶頸類型

### 8.3 維度矩陣 (Dimension Matrices)

- 營收按客戶 / SKU / 尺寸分布
- Core/BU 需求按尺寸 / 應用分布

### 8.4 BP 分析 (BP Analysis)

- 年度目標 (Million TWD)、預測營收 (Million TWD)、達成率、差距
- BP 差距歸因 (Top 5 drivers，含比例歸因聲明)

### 8.5 價格 / 產能影響 (Impact Scenarios)

- Price Impact: ±5%, ±10% 情境下的營收與 BP 達成率 Delta
- Capacity Impact: Core/BU/Both +10% 情境下的短缺月數與稼動率 Delta
- 僅為唯讀模擬結果，不包含實際數據修改

### 8.6 資料品質問題 (Data Quality Issues)

- 問題清單 (severity, domain, title, detail)
- 信心等級 (high / medium / low / blocked)
- 信心分數 (0-100)
- 決策影響分類 (high / medium / low)

### 8.7 SKU 業務屬性 (SKU Business Attributes)

以下 SKU 欄位安全可傳遞：

- `skuCode`: 產品編碼
- `customer`: 客戶名稱
- `deviceName`: 裝置名稱
- `application`: 應用領域
- `productGrade`: 產品等級
- `sizeCategory`: 尺寸分類
- `layerCount`: 層數

### 8.8 Key Findings (關鍵發現)

- 嚴重度 (severity)
- 來源 (source)
- 標題與詳情 (titleMessage, detailMessage)

### 8.9 Metric Definitions (指標定義)

- 指標 ID、標籤、定義、公式、單位

### 8.10 Assumptions (系統假設)

- 工作天數假設
- Core/BU 步驟計算規則
- 幣別標準化規則
- BP 目標單位
- Weighted Pressure Index 邊界
- 比例歸因聲明
- 唯讀模擬聲明

---

## 九、哪些資料絕對不能給 AI

以下資料在任何情況下都**絕對禁止**傳遞給 AI，無論是外部 AI 工具還是內建 AI Copilot：

### 9.1 用戶身份標識 (User Identifiers)

| 禁止欄位 | 說明 | 風險 |
| :--- | :--- | :--- |
| `uid` | Firebase Auth 用戶唯一標識 | 可關聯至真實個人身份 |
| `email` | 用戶電子郵件地址 | 直接暴露個人聯絡資訊 |
| `displayName` | 用戶顯示名稱 | 個人身份識別 |
| `photoURL` | 用戶頭像 URL | 個人身份識別 |

### 9.2 認證憑證 (Auth Credentials)

| 禁止欄位 | 說明 | 風險 |
| :--- | :--- | :--- |
| `token` | Firebase Auth Token | 可用於未授權存取 |
| `auth` | 認證上下文物件 | 包含敏感認證資訊 |
| `apiKey` | API 金鑰 | 直接暴露服務存取權限 |
| `password` | 密碼 | 極度敏感 |
| `secret` | 密鑰 | 極度敏感 |

### 9.3 工作區協作資訊 (Workspace Collaboration)

| 禁止欄位 | 說明 | 風險 |
| :--- | :--- | :--- |
| `workspaceId` | 工作區唯一標識 | 可用於未授權存取 |
| `ownerId` | 工作區擁有者 UID | 用戶身份洩露 |
| `members` | 成員列表 (uid → role) | 所有協作者身份暴露 |
| `member` | 單一成員資訊 | 用戶身份洩露 |
| `ownerUid` | 擁有者 UID | 用戶身份洩露 |

### 9.4 內部系統標識 (Internal System IDs)

| 禁止欄位 | 說明 | 風險 |
| :--- | :--- | :--- |
| Firestore 文件 ID | 內部資料庫文件標識 | 可用於資料庫探測 |
| `createdBy` | 創建者 UID | 用戶身份洩露 |
| `createdByName` | 創建者名稱 | 用戶身份洩露 |

### 9.5 清洗機制

系統透過 `SENSITIVE_KEYS` 陣列進行遞迴清洗：

```typescript
const SENSITIVE_KEYS = [
  'uid', 'email', 'token', 'auth',
  'member', 'user', 'workspaceId', 'ownerUid',
];

function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some(sk => lowerKey.includes(sk));
}
```

清洗邏輯：遞迴遍歷整個物件樹，任何鍵名包含敏感關鍵字的欄位一律移除。

---

## 十、哪些 AI 行為必須禁止

基於 `AI_SAFETY_GUARDRAILS.md` 中定義的十條安全紅線，以及 `V1_38_AI_COPILOT_SAFETY_ACCEPTANCE_GATE.md` 中的 11 項安全閘門，以下 AI 行為必須**絕對禁止**：

### 10.1 十大安全紅線 (Veto-Class Red Lines)

#### 紅線 1: 嚴禁擅自篡改計算邏輯 (No Formula Modification)

- **規範**: AI 必須絕對尊重系統底層的物理計算公式。嚴禁自行修改良率調整（Yield Loss）、BU Steps（`max(layerCount/2 - 1, 0)`）以及 Utilization（`Demand/Capacity`）的計算方式。
- **越界示例**: AI 認為「因為 16 層板非常難做，我擅自將 16 層板的 BU Steps 乘了 1.5 倍以防止產能短缺」。

#### 紅線 2: 嚴禁腦補缺失數據 (No Data Inventions)

- **規範**: 當系統報警顯示數據缺失時，AI **嚴禁**通過幻覺自行猜測、推估或腦補合理的數值代入營收或產能計算。必須將其作為 Data Quality 缺陷拋出，引導人類進行補齊。
- **越界示例**: AI 發現 SKU-X 價格為 0，報告稱「由於該 SKU 未定義單價，我幫大家預估其單價為市場平均價 12 USD」。

#### 紅線 3: 嚴禁跨幣別直接運算 (No Currency Chaos)

- **規範**: 所有多幣別（USD, TWD, CNY）原始定價必須在底層折算為標準 USD 後才能相加或計算利用率；在與 BP Target（百萬台幣 Million TWD）對比時，必須展現 `(USD * Rate) / 1,000,000` 的折算路徑。嚴禁不同幣別數值直接加減乘除。
- **越界示例**: AI 報告「2026年營收為 100,000 USD，BP目標為 10M TWD。營收超出目標 99,990 元。」

#### 紅線 4: 嚴禁將比例歸因解讀為嚴格因果關係 (No Attribution Distortion)

- **規範**: 系統的 `bpAttribution` 採用營收比例分攤法（Proportional Attribution），旨在進行資源排序，並非強烈的因果模型。AI 在列出 Gap Drivers 時，必須顯式標註免責聲明。
- **越界示例**: AI 報告「AMD 佔據了 2026 年 BP 缺口的 70%，這表明 AMD 惡意違約，我們應立刻對其進行商務制裁。」

#### 紅線 5: 嚴禁忽略系統既定假設 (No Assumption Breaches)

- **規範**: AI 必須主動讀取並尊重 Payload 中的 `assumptions`。AI 嚴禁在未聲明的前提下，假設這些底層假設是可以無成本隨意修改的。
- **越界示例**: AI 報告「我們只要將 8 月份的工作日設置為 45 天，就能完美解決 8 月份的產能短缺。」

#### 紅線 6: 嚴禁無視數據質量信心評級 (No Confidence Bypassing)

- **規範**: 當 `confidenceLevel = "low"`（對應 `confidenceScore` 0-59）時，AI 必須在報告頂部進行醒目的「低信心警示」，且分析語氣必須全部降級為「邏輯推演」、「僅供參考」。
- **越界示例**: 在 Low 信心下，AI 判定「2027年我們 100% 能夠達成業績，建議高管立刻花費 1 億台幣採購新廠房。」

#### 紅線 7: 嚴禁發布自動化業務決策命令 (No Automated Business Triggers)

- **規範**: AI 的身份僅限於「決策起草者/輔助者」。AI 報告中嚴禁使用「本 AI 已決定取消...」、「請立刻執行採購...」等命令式或直接修改後台的越權語氣。
- **越界示例**: AI 報告「為了消除產能瓶頸，我已經通知系統撤銷了所有低毛利訂單。」

#### 紅線 8: 嚴禁省略人類確認卡點 (No Bypassing Human-in-the-loop)

- **規範**: AI 報告的結尾必須顯式開闢一個「下一步人類驗證清單（Human Verification Checklist）」。AI 必須承認自己無法獲取外部市場環境、供應鏈成本和客戶真實意圖。
- **越界示例**: AI 報告直接作為最終發布版導出，不留任何人類確認、核實的接口。

#### 紅線 9: 嚴禁將分析排序指標與基礎計算混淆 (No Metric Registry Violation)

- **規範**: `weightedPressureIndex` 只是用於排序 Driver 和 SKU 壓力佔比的分析指標。AI 嚴禁將加權係數（Core 1.3）代入基礎物理需求（Demand）或短缺（Shortage）的公式計算中。
- **越界示例**: AI 報告「因為 Core 加權壓力為 1.3，今年實體短缺的面板數自動上調為 1.3 倍。」

#### 紅線 10: 嚴禁在敏感性場景中過度承諾 (No Over-commitment in Scenarios)

- **規範**: 對 Price Impact 與 Capacity Impact 兩大 Scenarios 的解讀，必須明確其「唯讀假設模擬」屬性，並理性評估其局限性，嚴禁將假設結果當作實體包裝承諾。
- **越界示例**: AI 報告「產能模擬顯示提升 10% 可以解決大部分短缺，這意味著我們只要在系統裡按下模擬鍵，工廠的實際產能就已經成功提升了 10%。」

### 10.2 v1.38 AI Copilot 安全閘門 (Safety Gates)

基於 `V1_38_AI_COPILOT_SAFETY_ACCEPTANCE_GATE.md`，以下 11 項閘門必須通過：

| 閘門編號 | 閘門名稱 | 核心要求 |
| :--- | :--- | :--- |
| 1 | 零 API Key 硬編碼 | 絕對禁止在代碼庫中出現硬編碼的 API Key |
| 2 | 數據庫寫入絕對隔離 | AI 輸出絕對禁止直接或自動調用服務層寫入 Firestore |
| 3 | 零自動保存 | 絕對不允許任何「後台靜默保存」或「自動修復」機制 |
| 4 | 檢視者權限防禦 | Viewer 角色絕對無法觸發任何數據修復 |
| 5 | 公式完整性防禦 | AI 絕對不被允許修改 calculationEngine.ts 中的任何公式 |
| 6 | 零數據隨機猜測 | AI 絕對禁止隨機猜測或填充缺失值 |
| 7 | 貨幣與計量標準化 | AI 絕對禁止混淆 USD 營收與 Million TWD BP 目標 |
| 8 | 歸因與因果性隔離 | AI 絕對禁止將比例歸因解釋為因果關係 |
| 9 | 結論性質清晰標註 | 每條結論必須標註 Fact / Assumption / Inference / Recommendation |
| 10 | 數據來源引用完整性 | 所有數字及結論必須附帶明確的 Source Reference |
| 11 | 低可信度語氣降級 | low/blocked 信心時必須進行語氣降級與警告 |

### 10.3 F-A-I-R 信息分層輸出規範

AI 生成的報告必須嚴格遵循 F-A-I-R 信息分層框架：

| 類別 | 定義 | 標記後綴 | 示例 |
| :--- | :--- | :--- | :--- |
| **Fact (事實)** | 來自系統的確定性、客觀數值 | `[Fact / 事實]` | 2026年 8月 Core 面板利用率為 125% |
| **Assumption (假設)** | 系統運算所依賴的底層邊界參數 | `[Assumption / 假設]` | 基於 TWD 與 USD 匯率快照 1 USD = 32.0 TWD |
| **Inference (推論)** | 基於事實和假設的邏輯推導 | `[Inference / 推論]` | 推測 8 月的產能短缺主要是由 NVIDIA 訂單激增引起的 |
| **Recommendation (建議)** | 給予人類決策者的備選行動方案 | `[Recommendation / 建議]` | 建議銷售經理與 NVIDIA 採購團隊核對 Forecast 準確度 |

### 10.4 安全語氣分級指南

| 數據信心級別 | 推薦使用的安全限定詞 |
| :--- | :--- |
| **High** (高) | 「數據明確證實...」、「分析表明...」、「基於完整數據...」 |
| **Medium** (中) | 「趨勢提示注意...」、「存在局部波動...」、「建議進一步確認...」 |
| **Low** (低) | 「僅供參考」、「基於不完整數據的假設推導」、「極不可信」、「嚴禁直接用於實體決策」 |

### 10.5 v1.38 MVP 絕對禁止實作的功能

| 禁用項目 | 排除理由 | 預計版本 |
| :--- | :--- | :--- |
| 默認 AI API 自動直連 | 避免密鑰洩露與網絡開銷風險 | v1.39+ |
| 伺服器端密鑰儲存 | 純前端架構，嚴禁引入伺服器數據庫儲存密鑰 | 永不實作 |
| Cloud Functions 後端轉發 | 不符合 KISS 輕量級原則 | 無限期 |
| AI 自動保存 | 違反「不污染正式工作區」底線 | 永不實作 |
| AI 自動修改數據庫資料 | 絕不允許 AI 繞過 UI 直接寫入 | 永不實作 |
| AI 自動重構數理公式 | 產能算法涉及嚴密工業工程邏輯 | 永不實作 |
| 實時自動優化引擎 | 高數理風險，應依賴確定性 Delta 計算 | 無限期 |
| 長期會話記憶 | MVP「即問即答，刷新即逝」滿足需求 | v1.39+ |
| 工作區全局 AI 審計日誌 | 需新建 Collection 並修改 Security Rules | v1.39+ |
| 自主商業決策 | 嚴防 AI 獨立發出採購、排產或調價指令 | 永不實作 |

---

## 附錄 A: 核心原始碼位置參考

| 模組 | 檔案路徑 |
| :--- | :--- |
| TypeScript 類型定義 | `frontend/src/types/index.ts` |
| Snapshot 類型定義 | `frontend/src/types/snapshot.ts` |
| 計算引擎 | `frontend/src/core/calculationEngine.ts` |
| 分析模型 | `frontend/src/core/analytics.ts` |
| BP 分析 | `frontend/src/core/bpTargets.ts` |
| 資料品質診斷 | `frontend/src/core/dataQuality.ts` |
| 資料品質可視化 | `frontend/src/core/dataQualityVisibility.ts` |
| 資料品質修復 | `frontend/src/core/dataQualityRemediation.ts` |
| 風險歸因 | `frontend/src/core/riskAttribution.ts` |
| BP 歸因 | `frontend/src/core/bpAttribution.ts` |
| 影響分析 | `frontend/src/core/impactAnalysis.ts` |
| 情境引擎 | `frontend/src/core/scenarioEngine.ts` |
| 分析合約 | `frontend/src/core/analysisContract.ts` |
| AI Brief 匯出 | `frontend/src/core/aiBriefExport.ts` |
| 變更影響匯出 | `frontend/src/core/changeImpactExport.ts` |
| 情境匯出 | `frontend/src/core/scenarioExport.ts` |
| 關鍵發現 | `frontend/src/core/keyFindings.ts` |
| 指標定義 | `frontend/src/core/metricDefinitions.ts` |
| 幣別處理 | `frontend/src/core/currency.ts` |
| SKU 衍生計算 | `frontend/src/core/skuDerived.ts` |
| 面板佈局 | `frontend/src/core/panelLayout.ts` |
| 良率矩陣 | `frontend/src/core/yieldMatrix.ts` |
| 只讀守衛 | `frontend/src/core/readOnlyGuard.ts` |
| SKU 服務 | `frontend/src/services/skuService.ts` |
| 預測服務 | `frontend/src/services/forecastService.ts` |
| 產能服務 | `frontend/src/services/capacityService.ts` |
| 參數服務 | `frontend/src/services/parameterService.ts` |
| 快照服務 | `frontend/src/services/snapshotService.ts` |
| 工作區服務 | `frontend/src/services/workspaceService.ts` |

## 附錄 B: 相關文件參考

| 文件 | 路徑 |
| :--- | :--- |
| AI 安全護欄 | `docs/ai-eval/AI_SAFETY_GUARDRAILS.md` |
| AI 分析評審規準 | `docs/ai-eval/AI_ANALYSIS_RUBRIC.md` |
| AI 發展路線圖 | `docs/ai-eval/NEXT_AI_ROADMAP.md` |
| v1.38 MVP 範圍審查 | `docs/ai-copilot/V1_38_AI_COPILOT_MVP_SCOPE_REVIEW.md` |
| v1.38 安全閘門 | `docs/ai-copilot/V1_38_AI_COPILOT_SAFETY_ACCEPTANCE_GATE.md` |
| v1.38 紅隊測試 | `docs/ai-copilot/V1_38_AI_COPILOT_RED_TEAM_TESTS.md` |
| v1.35 DQ Visibility 規格 | `docs/data-quality/V1_35_DATA_QUALITY_VISIBILITY_SPEC.md` |
| v1.36 DQ Remediation 規格 | `docs/data-quality/V1_36_DATA_QUALITY_REMEDIATION_SPEC.md` |
| AI Brief Export 文件 | `docs/AI_BRIEF_EXPORT.md` |
| 工作區協作文件 | `docs/WORKSPACE_COLLABORATION.md` |
