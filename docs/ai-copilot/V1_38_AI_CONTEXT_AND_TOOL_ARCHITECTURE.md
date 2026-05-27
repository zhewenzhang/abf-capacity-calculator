# v1.38.0 AI Context Builder & Tool Layer Architecture

> **版本**: v1.38.0 MVP
> **狀態**: Architecture Spec
> **前導文獻**: `V1_38_AI_COPILOT_MVP_SCOPE_REVIEW.md`, `V1_38_AI_COPILOT_SAFETY_ACCEPTANCE_GATE.md`, `ANALYSIS_CONTRACT.md`
> **核心原則**: 確定性 (Deterministic)、零資料庫污染 (Zero DB Pollution)、嚴格可解釋性 (Strict Explainability)

---

## 目錄

1. [架構總覽](#一架構總覽)
2. [aiCopilotContext.ts 設計](#二aicopilotcontextts-設計)
3. [AiCopilotContext Schema](#三aicopilotcontext-schema)
4. [Context Sanitization Rules](#四context-sanitization-rules)
5. [Tool Definitions (6 Tools)](#五tool-definitions-6-tools)
6. [Tool Output as Draft Pattern](#六tool-output-as-draft-pattern)
7. [Future API Key Handling](#七future-api-key-handling)
8. [Module Dependency Map](#八module-dependency-map)
9. [Safety Guardrails Integration](#九safety-guardrails-integration)

---

## 一、架構總覽

### 1.1 設計哲學

v1.38.0 AI Data Copilot 的架構遵循「**本地確定性優先，外部 AI 為輔**」的核心哲學。所有分析能力必須在無任何外部 API 的情況下，由純前端 JavaScript/TypeScript 引擎完成。AI（如 Claude、GPT、Gemini）的角色僅限於「文字解讀與結構化表述」，不參與任何數值計算或數據決策。

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Copilot Panel (UI)                     │
│  ┌───────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Quick Q's  │  │ Chat History │  │ Draft Confirmation    │ │
│  └─────┬─────┘  └──────┬───────┘  └───────────┬───────────┘ │
│        │               │                       │             │
│  ┌─────▼───────────────▼───────────────────────▼───────────┐ │
│  │              Tool Dispatcher (ToolRouter)                │ │
│  └─────┬───────┬───────┬───────┬───────┬───────┬───────────┘ │
│        │       │       │       │       │       │             │
│  ┌─────▼──┐┌───▼───┐┌──▼──┐┌──▼───┐┌──▼───┐┌──▼──────────┐ │
│  │inspect ││explain││expla││suggest││explain││buildLook    │ │
│  │DataQlty││CapRisk││BpGap││Fixes  ││ScenImp││AheadFocus  │ │
│  └───┬────┘└───┬───┘└──┬──┘└──┬───┘└──┬───┘└──┬──────────┘ │
│      │         │       │      │       │       │             │
│  ┌───▼─────────▼───────▼──────▼───────▼───────▼───────────┐ │
│  │           AiCopilotContext (Safe Context Object)         │ │
│  └───┬─────────┬───────┬──────┬───────┬───────┬───────────┘ │
│      │         │       │      │       │       │             │
│  ┌───▼──┐ ┌───▼──┐ ┌──▼──┐ ┌▼─────┐ ┌▼────┐ ┌▼──────────┐ │
│  │dataQl│ │riskAt│ │bpTgt│ │scenEn│ │anal │ │analysisCon│ │
│  │uality│ │ribut│ │s    │ │gine  │ │ytics│ │tract      │ │
│  └──────┘ └──────┘ └─────┘ └──────┘ └─────┘ └───────────┘ │
│                    (Existing Core Modules)                    │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Module Layering

| Layer | Module | Responsibility |
|-------|--------|---------------|
| **L0 - Data** | `types/index.ts` | 原始型別定義 (SKU, Forecast, CapacityPlan, ProjectParameters) |
| **L1 - Engine** | `calculationEngine.ts`, `currency.ts` | 確定性數值計算、貨幣標準化 |
| **L2 - Analytics** | `analytics.ts`, `bpTargets.ts`, `dataQuality.ts`, `riskAttribution.ts` | 分析模型建構 |
| **L3 - Contract** | `analysisContract.ts`, `aiBriefExport.ts` | 整合性分析合約與清洗導出 |
| **L4 - Context** | **`aiCopilotContext.ts`** (NEW) | Copilot 專用安全上下文建構器 |
| **L5 - Tools** | **`aiCopilotTools.ts`** (NEW) | 6 個確定性診斷工具 |
| **L6 - UI** | `CopilotPanel.tsx`, `CopilotDrawer.tsx` | 用戶交互界面 |

---

## 二、aiCopilotContext.ts 設計

### 2.1 模組定位

`aiCopilotContext.ts` 是 AI Copilot 的「感知層」，負責將現有多個核心模組的輸出整合為一個**自包含 (self-contained)、已清洗 (sanitized)、確定性 (deterministic)** 的上下文物件。此物件是所有 Tool 函數的唯讀輸入，也是未來接上外部 AI API 時的 Prompt Context Payload。

### 2.2 `buildAiCopilotContext()` 函數簽名

```typescript
// frontend/src/core/aiCopilotContext.ts

import type { SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';
import type { AnalyticsModel } from './analytics';
import type { BpAnalysisModel } from './bpTargets';
import type { DataQualitySummary } from './dataQuality';
import type { RiskAttributionModel } from './riskAttribution';
import type { ScenarioComparison } from './scenarioEngine';
import type { MetricDefinition } from './metricDefinitions';
import type { CurrencySettings } from './currency';
import { normalizeCurrencySettings, DEFAULT_CURRENCY_SETTINGS } from './currency';
import { buildDataQualitySummary } from './dataQuality';
import { buildRiskAttributionModel } from './riskAttribution';
import { METRIC_DEFINITIONS } from './metricDefinitions';

// ============================================================
// Sensitive Keys — must be recursively stripped
// ============================================================

/**
 * Keys that MUST be removed from any object before it enters the AI context.
 * This list is the single source of truth for sanitization.
 * Matched case-insensitively via `String.toLowerCase().includes()`.
 */
export const AI_CONTEXT_SENSITIVE_KEYS: readonly string[] = [
  'uid',
  'email',
  'token',
  'auth',
  'apiKey',
  'secret',
  'password',
  'workspaceId',
  'userId',
  'ownerUid',
  'member',
] as const;

// ============================================================
// Array Cap Limits — prevent context bloat
// ============================================================

export const CONTEXT_CAP_LIMITS = {
  topDrivers: 5,
  topIssues: 8,
  topHealthSignals: 5,
  topShortageMonths: 12,
  topBpPeriods: 5,
  topScenarioDeltas: 7,
  maxSkuSummaryRows: 20,
} as const;

// ============================================================
// AiCopilotContext Interface
// ============================================================

export interface AiCopilotContext {
  /** Schema version for forward compatibility */
  readonly schemaVersion: '1.0';

  /** ISO timestamp of when this context was built */
  readonly generatedAt: string;

  /** App version string (e.g., 'v1.38.0') */
  readonly appVersion: string;

  /** Provenance: which modules contributed to each section */
  readonly provenance: ContextProvenance;

  /** High-level project metrics */
  readonly projectSummary: ProjectSummarySection;

  /** Data quality confidence, score, and capped issues */
  readonly dataQualitySummary: DataQualitySection;

  /** Top risk drivers and shortage months */
  readonly riskBriefSummary: RiskBriefSection;

  /** Current scenario state (if any scenario has been run) */
  readonly scenarioSummary: ScenarioSection | null;

  /** BP attainment and gap analysis */
  readonly bpSummary: BpSection;

  /** Capacity utilization and bottlenecks */
  readonly capacitySummary: CapacitySection;

  /** Currency rates and mode in effect */
  readonly currencyAssumptions: CurrencySection;

  /** Metric definitions registry (what each metric means) */
  readonly metricDefinitions: MetricDefinition[];

  /** Human-readable assumptions list */
  readonly assumptions: string[];

  /** AI behavioral guardrails (do-not-modify, F-A-I-R, etc.) */
  readonly aiGuardrails: AiGuardrailsSection;
}

// ============================================================
// Sub-section Interfaces
// ============================================================

export interface ContextProvenance {
  projectSummary: 'calculationEngine + analytics';
  dataQualitySummary: 'dataQuality';
  riskBriefSummary: 'riskAttribution';
  scenarioSummary: 'scenarioEngine' | 'none';
  bpSummary: 'bpTargets';
  capacitySummary: 'calculationEngine + analytics';
  currencyAssumptions: 'currency';
  metricDefinitions: 'metricDefinitions';
}

export interface ProjectSummarySection {
  totalRevenueUsd: number;
  totalForecastPcs: number;
  maxCoreUtilization: number | null;
  maxBuUtilization: number | null;
  shortageMonthCount: number;
  worstBottleneckMonth: string | null;
  skuCount: number;
  forecastMonthCount: number;
  timeRange: {
    months: string[];
    years: string[];
  };
}

export interface DataQualitySection {
  confidence: 'high' | 'medium' | 'low' | 'blocked';
  confidenceScore: number;
  status: 'ok' | 'warning' | 'error';
  issueCount: number;
  topIssues: Array<{
    id: string;
    severity: 'error' | 'warning' | 'info';
    domain: string;
    decisionImpact: 'high' | 'medium' | 'low';
    titleMessage: { key: string; params?: Record<string, string | number> };
    detailMessage: { key: string; params?: Record<string, string | number> };
  }>;
}

export interface RiskBriefSection {
  shortageMonths: string[];
  topDrivers: Array<{
    dimension: string;
    label: string;
    metric: string;
    value: number;
    share: number | undefined;
    severity: 'critical' | 'warning' | 'info';
    affectedPeriods: string[];
  }>;
  topHealthSignals: Array<{
    skuCode: string;
    customer: string;
    classification: string;
    revenueShare: number | undefined;
    capacityPressureShare: number | undefined;
    weightedPressureIndex: number;
  }>;
}

export interface ScenarioSection {
  isActive: boolean;
  multipliers: {
    forecastVolume: number;
    unitPrice: number;
    coreCapacity: number;
    buCapacity: number;
  };
  deltas: {
    totalRevenueUsd: { base: number | null; scenario: number | null; delta: number | null };
    shortageMonthCount: { base: number | null; scenario: number | null; delta: number | null };
    bpAttainmentPct: { base: number | null; scenario: number | null; delta: number | null };
  };
}

export interface BpSection {
  yearly: Array<{
    period: string;
    targetMillionTwd: number | null;
    forecastMillionTwd: number;
    attainment: number | null;
    gapMillionTwd: number | null;
    status: 'no-target' | 'met' | 'watch' | 'miss';
  }>;
  hasAnyMiss: boolean;
  worstPeriod: string | null;
}

export interface CapacitySection {
  monthlySummaries: Array<{
    month: string;
    coreUtilization: number | null;
    buUtilization: number | null;
    coreShortage: number;
    buShortage: number;
    bottleneck: 'Core' | 'BU' | 'None';
  }>;
  worstMonth: string | null;
}

export interface CurrencySection {
  baseCurrency: 'USD';
  displayCurrency: string;
  exchangeRateMode: 'constant' | 'yearly';
  usdToTwdRate: number;
  usdToCnyRate: number;
  note: string;
}

export interface AiGuardrailsSection {
  doNotModify: string[];
  currencyHandling: string[];
  attributionWarning: string[];
  dataQualityWarning: string[];
  fairClassification: string[];
  weightedPressureBoundary: string[];
  blockedConfidenceHandling: string[];
  noWriteGuarantee: string[];
}
```

### 2.3 `buildAiCopilotContext()` 實作邏輯

```typescript
/**
 * Build a safe, self-contained AI Copilot context from existing module outputs.
 *
 * GUARANTEES:
 * 1. Deterministic: same inputs always produce identical output (modulo generatedAt timestamp)
 * 2. Sanitized: all SENSITIVE_KEYS recursively stripped
 * 3. Self-contained: contains all info an AI needs to answer questions
 * 4. No Firestore reads: consumes only in-memory data passed as arguments
 * 5. No writes: pure function, zero side effects
 *
 * @param skus - Current workspace SKU list
 * @param forecasts - Current workspace forecasts
 * @param capacityPlans - Current workspace capacity plans
 * @param params - Current workspace project parameters
 * @param model - Pre-computed analytics model (from buildAnalyticsModel)
 * @param bpModel - Pre-computed BP analysis model (from buildBpAnalysis), optional
 * @param activeScenario - If user has run a scenario, include the comparison result
 * @param appVersion - Current app version string
 */
export function buildAiCopilotContext(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters,
  model: AnalyticsModel,
  bpModel?: BpAnalysisModel,
  activeScenario?: ScenarioComparison | null,
  appVersion?: string
): AiCopilotContext {
  // Step 1: Sanitize all raw inputs (recursive key stripping)
  const cleanSkus = sanitizeDeep(skus);
  const cleanForecasts = sanitizeDeep(forecasts);
  const cleanCapacityPlans = sanitizeDeep(capacityPlans);
  const cleanParams = sanitizeDeep(params);

  // Step 2: Build or reuse derived models
  const dqSummary = buildDataQualitySummary({
    skus: cleanSkus,
    forecasts: cleanForecasts,
    capacityPlans: cleanCapacityPlans,
    params: cleanParams,
  });

  const riskModel = buildRiskAttributionModel(model, cleanSkus, bpModel);
  const currencySettings = normalizeCurrencySettings(cleanParams.currencySettings);

  // Step 3: Build each section with array capping and number rounding
  const projectSummary = buildProjectSummarySection(model, cleanForecasts);
  const dataQualitySection = buildDataQualitySection(dqSummary);
  const riskBriefSection = buildRiskBriefSection(riskModel);
  const scenarioSection = activeScenario ? buildScenarioSection(activeScenario) : null;
  const bpSection = buildBpSection(bpModel);
  const capacitySection = buildCapacitySection(model);
  const currencySection = buildCurrencySection(currencySettings);

  // Step 4: Assemble final context
  return sanitizeDeep({
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    appVersion: appVersion ?? 'v1.38.0',
    provenance: {
      projectSummary: 'calculationEngine + analytics',
      dataQualitySummary: 'dataQuality',
      riskBriefSummary: 'riskAttribution',
      scenarioSummary: activeScenario ? 'scenarioEngine' : 'none',
      bpSummary: 'bpTargets',
      capacitySummary: 'calculationEngine + analytics',
      currencyAssumptions: 'currency',
      metricDefinitions: 'metricDefinitions',
    },
    projectSummary,
    dataQualitySummary: dataQualitySection,
    riskBriefSummary: riskBriefSection,
    scenarioSummary: scenarioSection,
    bpSummary: bpSection,
    capacitySummary: capacitySection,
    currencyAssumptions: currencySection,
    metricDefinitions: sanitizeDeep(METRIC_DEFINITIONS),
    assumptions: buildAssumptions(cleanParams),
    aiGuardrails: buildAiGuardrails(),
  });
}
```

### 2.4 Section Builder Helpers (內部函數)

每個 section builder 都是純函數，負責從對應模組的輸出中萃取、截斷、四捨五入所需欄位。

```typescript
function buildProjectSummarySection(
  model: AnalyticsModel,
  forecasts: Forecast[]
): ProjectSummarySection {
  const allMonths = Array.from(new Set(forecasts.map(f => f.month))).sort();
  const allYears = Array.from(new Set(allMonths.map(m => m.substring(0, 4)))).sort();

  return {
    totalRevenueUsd: roundTo(model.totalRevenue, 2),
    totalForecastPcs: roundTo(model.totalForecastPcs, 0),
    maxCoreUtilization: model.maxCoreUtil !== null ? roundTo(model.maxCoreUtil, 4) : null,
    maxBuUtilization: model.maxBuUtil !== null ? roundTo(model.maxBuUtil, 4) : null,
    shortageMonthCount: model.shortageMonthCount,
    worstBottleneckMonth: model.worstMonth ?? null,
    skuCount: model.skuResults.length > 0
      ? new Set(model.skuResults.map(r => r.skuId)).size
      : 0,
    forecastMonthCount: allMonths.length,
    timeRange: { months: allMonths, years: allYears },
  };
}

function buildDataQualitySection(dq: DataQualitySummary): DataQualitySection {
  return {
    confidence: dq.confidence,
    confidenceScore: dq.confidenceScore,
    status: dq.status,
    issueCount: dq.issues.length,
    topIssues: dq.issues
      .filter(i => i.severity === 'error' || i.severity === 'warning')
      .slice(0, CONTEXT_CAP_LIMITS.topIssues)
      .map(i => ({
        id: i.id,
        severity: i.severity,
        domain: i.domain,
        decisionImpact: i.decisionImpact ?? 'low',
        titleMessage: i.titleMessage,
        detailMessage: i.detailMessage,
      })),
  };
}

function buildRiskBriefSection(risk: RiskAttributionModel): RiskBriefSection {
  return {
    shortageMonths: risk.shortageMonths.slice(0, CONTEXT_CAP_LIMITS.topShortageMonths),
    topDrivers: risk.drivers.slice(0, CONTEXT_CAP_LIMITS.topDrivers).map(d => ({
      dimension: d.dimension,
      label: d.label,
      metric: d.metric,
      value: roundTo(d.value, 2),
      share: d.share !== undefined ? roundTo(d.share, 1) : undefined,
      severity: d.severity,
      affectedPeriods: d.affectedPeriods,
    })),
    topHealthSignals: risk.skuHealthSignals
      .slice(0, CONTEXT_CAP_LIMITS.topHealthSignals)
      .map(s => ({
        skuCode: s.skuCode,
        customer: s.customer,
        classification: s.classification,
        revenueShare: s.revenueShare !== undefined ? roundTo(s.revenueShare, 1) : undefined,
        capacityPressureShare: s.capacityPressureShare !== undefined
          ? roundTo(s.capacityPressureShare, 1)
          : undefined,
        weightedPressureIndex: roundTo(s.weightedPressureIndex, 2),
      })),
  };
}

function buildScenarioSection(sc: ScenarioComparison): ScenarioSection {
  return {
    isActive: true,
    multipliers: { ...sc.multipliers },
    deltas: {
      totalRevenueUsd: {
        base: roundTo(sc.deltas.totalRevenueUsd.base, 2),
        scenario: roundTo(sc.deltas.totalRevenueUsd.scenario, 2),
        delta: roundTo(sc.deltas.totalRevenueUsd.delta, 2),
      },
      shortageMonthCount: {
        base: sc.deltas.shortageMonthCount.base,
        scenario: sc.deltas.shortageMonthCount.scenario,
        delta: sc.deltas.shortageMonthCount.delta,
      },
      bpAttainmentPct: {
        base: sc.deltas.bpAttainmentPct.base !== null
          ? roundTo(sc.deltas.bpAttainmentPct.base, 1)
          : null,
        scenario: sc.deltas.bpAttainmentPct.scenario !== null
          ? roundTo(sc.deltas.bpAttainmentPct.scenario, 1)
          : null,
        delta: sc.deltas.bpAttainmentPct.delta !== null
          ? roundTo(sc.deltas.bpAttainmentPct.delta, 1)
          : null,
      },
    },
  };
}

function buildBpSection(bpModel?: BpAnalysisModel): BpSection {
  if (!bpModel || bpModel.yearly.length === 0) {
    return { yearly: [], hasAnyMiss: false, worstPeriod: null };
  }

  const yearly = bpModel.yearly
    .slice(0, CONTEXT_CAP_LIMITS.topBpPeriods)
    .map(y => ({
      period: y.period,
      targetMillionTwd: y.targetMillionTwd !== null ? roundTo(y.targetMillionTwd, 1) : null,
      forecastMillionTwd: roundTo(y.forecastMillionTwd, 1),
      attainment: y.attainment !== null ? roundTo(y.attainment, 4) : null,
      gapMillionTwd: y.gapMillionTwd !== null ? roundTo(y.gapMillionTwd, 1) : null,
      status: y.status,
    }));

  const hasAnyMiss = bpModel.yearly.some(y => y.status === 'miss');
  const missRecords = bpModel.yearly.filter(y => y.status === 'miss' || y.status === 'watch');
  const worstPeriod = missRecords.length > 0
    ? missRecords.reduce((worst, r) =>
        Math.abs(r.gapMillionTwd ?? 0) > Math.abs(worst.gapMillionTwd ?? 0) ? r : worst
      ).period
    : null;

  return { yearly, hasAnyMiss, worstPeriod };
}

function buildCapacitySection(model: AnalyticsModel): CapacitySection {
  const summaries = model.monthlySummaries.map(ms => ({
    month: ms.month,
    coreUtilization: ms.coreUtilization !== null ? roundTo(ms.coreUtilization, 4) : null,
    buUtilization: ms.buUtilization !== null ? roundTo(ms.buUtilization, 4) : null,
    coreShortage: roundTo(ms.coreShortage, 2),
    buShortage: roundTo(ms.buShortage, 2),
    bottleneck: ms.bottleneck,
  }));

  return {
    monthlySummaries: summaries,
    worstMonth: model.worstMonth ?? null,
  };
}

function buildCurrencySection(settings: CurrencySettings): CurrencySection {
  return {
    baseCurrency: 'USD',
    displayCurrency: settings.displayCurrency,
    exchangeRateMode: settings.exchangeRateMode,
    usdToTwdRate: roundTo(settings.constantUsdToTwdRate, 4),
    usdToCnyRate: roundTo(settings.constantUsdToCnyRate, 4),
    note: `Revenue is computed in USD. BP targets are in Million TWD. ` +
          `Display currency: ${settings.displayCurrency}. ` +
          `Exchange rate mode: ${settings.exchangeRateMode}.`,
  };
}

function buildAssumptions(params: ProjectParameters): string[] {
  const workingDays = params.defaultWorkingDays ?? 28;
  return [
    `Working days are fixed at ${workingDays} days/month across all capacity analyses.`,
    'Core steps are fixed to 1 step for all layer count SKUs.',
    'BU steps are derived from layer count: max(layerCount / 2 - 1, 0).',
    'Calculation engines normalize TWD and CNY prices to USD before revenue calculation.',
    'BP Target revenue is in Million TWD. Attainment converts USD revenue to TWD per month.',
    'Weighted Pressure Index (Core 1.3 / BU 1.0) is analysis-only; core formulas unchanged.',
    'BP Gap Attribution is proportional (revenue-share based), not strict causal attribution.',
    'Price/Capacity Impact scenarios are deterministic re-runs; they do not mutate inputs.',
  ];
}

function buildAiGuardrails(): AiGuardrailsSection {
  return {
    doNotModify: [
      'DO NOT modify any formulas in metricDefinitions.formula.',
      'DO NOT invent or supplement missing data.',
      'DO NOT change unit prices, exchange rates, or BP targets.',
      'DO NOT assume all data is complete - respect data quality warnings.',
    ],
    currencyHandling: [
      'All revenue is calculated in USD (normalized from source currencies).',
      'BP targets are in Million TWD.',
      'NEVER compare USD revenue directly to Million TWD BP targets without conversion.',
      'USD to TWD conversion uses the exchange rate defined in parameters.',
    ],
    attributionWarning: [
      'BP Gap Attribution and Risk Attribution are PROPORTIONAL, not causal.',
      'A high "share of gap" means the driver contributes a large share of revenue during gap periods.',
      'It does NOT mean that driver is solely responsible for the gap.',
    ],
    dataQualityWarning: [
      'If quality.confidence is "low" or "blocked", analysis may not be reliable.',
      'Always review quality.topIssues before making recommendations.',
    ],
    fairClassification: [
      'Every key conclusion must be tagged as [Fact], [Assumption], [Inference], or [Recommendation].',
      'DO NOT present inferences as facts.',
      'DO NOT present recommendations as decided actions.',
    ],
    weightedPressureBoundary: [
      'Weighted Pressure Index (Core x1.3 / BU x1.0) is ONLY for risk ranking and proportional attribution.',
      'It does NOT modify actual demand, capacity, shortage, or utilization calculations.',
      'DO NOT multiply the Core 1.3 weight back into actual shortage panel counts.',
    ],
    blockedConfidenceHandling: [
      'If quality.confidence is "blocked", DO NOT produce full decision recommendations.',
      'When blocked, ONLY list data gaps and human remediation steps.',
      'For "low" confidence, use "may", "possibly", "suggests" instead of "is", "will", "causes".',
    ],
    noWriteGuarantee: [
      'This context is READ-ONLY. No tool can write to Firestore.',
      'All fix suggestions produce Draft objects that require explicit human confirmation.',
      'Viewer role receives analysis only; no draft/fix suggestions are generated.',
    ],
  };
}
```

---

## 三、AiCopilotContext Schema

### 3.1 JSON Schema (用於驗證與文件化)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AiCopilotContext",
  "description": "Safe, self-contained context for AI Copilot tools and external AI consumption.",
  "type": "object",
  "required": [
    "schemaVersion", "generatedAt", "appVersion", "provenance",
    "projectSummary", "dataQualitySummary", "riskBriefSummary",
    "bpSummary", "capacitySummary", "currencyAssumptions",
    "metricDefinitions", "assumptions", "aiGuardrails"
  ],
  "properties": {
    "schemaVersion": {
      "type": "string",
      "const": "1.0"
    },
    "generatedAt": {
      "type": "string",
      "format": "date-time"
    },
    "appVersion": {
      "type": "string",
      "pattern": "^v\\d+\\.\\d+\\.\\d+$"
    },
    "provenance": {
      "type": "object",
      "description": "Which module produced each section"
    },
    "projectSummary": {
      "type": "object",
      "required": ["totalRevenueUsd", "totalForecastPcs", "shortageMonthCount"],
      "properties": {
        "totalRevenueUsd": { "type": "number" },
        "totalForecastPcs": { "type": "number" },
        "maxCoreUtilization": { "type": ["number", "null"] },
        "maxBuUtilization": { "type": ["number", "null"] },
        "shortageMonthCount": { "type": "integer", "minimum": 0 },
        "worstBottleneckMonth": { "type": ["string", "null"] }
      }
    },
    "dataQualitySummary": {
      "type": "object",
      "required": ["confidence", "confidenceScore", "topIssues"],
      "properties": {
        "confidence": {
          "type": "string",
          "enum": ["high", "medium", "low", "blocked"]
        },
        "confidenceScore": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100
        },
        "topIssues": {
          "type": "array",
          "maxItems": 8
        }
      }
    }
  }
}
```

### 3.2 Context 完整性檢查清單

| 檢查項 | 驗證方式 | 預期結果 |
|--------|----------|----------|
| 無敏感欄位 | 遞迴掃描所有 key，匹配 `AI_CONTEXT_SENSITIVE_KEYS` | 零命中 |
| 陣列長度上限 | 每個陣列欄位檢查 `.length <= cap` | 所有陣列符合上限 |
| 數值精度 | 檢查所有 `number` 欄位小數位數 | 營收 2 位、百分比 1-4 位 |
| 確定性 | 同一輸入呼叫兩次，比對 JSON 序列化結果 | `deepEqual(a, b) === true` (除 generatedAt) |
| 無 `undefined` | `JSON.stringify` 後重新 `parse`，確認無遺失欄位 | 所有欄位存在 |

---

## 四、Context Sanitization Rules

### 4.1 遞迴敏感欄位移除

```typescript
/**
 * Recursively remove all keys matching AI_CONTEXT_SENSITIVE_KEYS.
 * Match is case-insensitive substring check: key.toLowerCase().includes(sensitiveKey).
 *
 * @param obj - Any value to sanitize
 * @returns A deep copy with all sensitive keys removed
 */
export function sanitizeDeep<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeDeep(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      continue; // Skip sensitive keys
    }
    result[key] = sanitizeDeep(value);
  }
  return result as T;
}

function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return AI_CONTEXT_SENSITIVE_KEYS.some(sk => lowerKey.includes(sk));
}
```

### 4.2 數值四捨五入

```typescript
/**
 * Round a number to the specified decimal places.
 * Returns null if input is null or undefined.
 */
function roundTo(value: number | null | undefined, decimals: number): number | null {
  if (value === null || value === undefined) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
```

### 4.3 陣列截斷 (Array Capping)

所有陣列型欄位在進入 Context 前必須經過 `.slice(0, LIMIT)` 截斷：

| 欄位 | 上限 | 理由 |
|------|------|------|
| `topIssues` | 8 | 聚焦高優先度問題，避免噪音 |
| `topDrivers` | 5 | 與 `riskAttribution.ts` 的 `TOP_N_DRIVERS` 一致 |
| `topHealthSignals` | 5 | 聚焦策略性 SKU |
| `shortageMonths` | 12 | 最多一年的月份 |
| `bpSummary.yearly` | 5 | 覆蓋 5 年規劃期 |
| `monthlySummaries` | 不截斷 | 完整月份數據對 what-if 分析必要 |

### 4.4 Sanitization 流程圖

```
Raw Data (skus, forecasts, capacityPlans, params)
  │
  ▼
┌──────────────────────┐
│ Step 1: sanitizeDeep │  ← 遞迴移除 SENSITIVE_KEYS
│ (on all raw inputs)  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Step 2: Build DQ,    │  ← 用已清洗的數據呼叫各模組
│ Risk, BP, Capacity   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Step 3: Section      │  ← 截斷陣列、四捨五入數值
│ Builders with Caps   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Step 4: Final        │  ← 最終安全網：再次 sanitizeDeep
│ sanitizeDeep         │
└──────────┬───────────┘
           │
           ▼
     AiCopilotContext (safe to expose)
```

---

## 五、Tool Definitions (6 Tools)

### 5.0 共通設計原則

所有 Tool 函數遵循以下約束：

1. **純函數**: 接收 `AiCopilotContext` + Tool-specific input，返回 Tool-specific output，無副作用。
2. **不寫入任何東西**: 不調用 Firestore、不修改 Context、不觸發 save 服務。
3. **確定性**: 相同輸入 always 產生相同輸出。
4. **Viewer 安全**: 所有 Tool 的分析輸出對 Viewer 可見；Draft 類輸出僅在 `canEdit === true` 時產生。
5. **回退安全**: 當 `dataQualitySummary.confidence === 'blocked'` 時，Tool 必須回傳降級結果而非猜測。

---

### Tool 1: `inspectDataQuality`

**用途**: 返回資料品質問題的結構化診斷報告，包含嚴重程度、影響範圍、修復建議。

```typescript
// ---------- inspectDataQuality ----------

export interface InspectDataQualityInput {
  /** No additional input needed; uses full context */
  _placeholder?: never;
}

export interface InspectDataQualityOutput {
  overallConfidence: 'high' | 'medium' | 'low' | 'blocked';
  overallScore: number;
  issues: Array<{
    id: string;
    severity: 'error' | 'warning' | 'info';
    domain: string;
    decisionImpact: 'high' | 'medium' | 'low';
    summary: string;
    fixSuggestion: string;
    fixType: 'quick-fix' | 'guided-fix' | 'navigation-fix';
  }>;
  blockedRecommendation: string | null;
}

/**
 * inspectDataQuality Tool
 *
 * Implementation: Reads directly from context.dataQualitySummary.
 * Maps each issue to a human-readable summary + fix suggestion using
 * the remediation strategy from dataQualityRemediation.ts.
 *
 * Safety constraints:
 * - When confidence is 'blocked', returns blockedRecommendation instead of fix suggestions.
 * - Fix suggestions are descriptive text only; they do NOT trigger any save action.
 * - Viewer role receives the same analysis output (analysis-only, no draft).
 */
export function inspectDataQuality(
  context: AiCopilotContext
): InspectDataQualityOutput {
  const dq = context.dataQualitySummary;

  if (dq.confidence === 'blocked') {
    return {
      overallConfidence: 'blocked',
      overallScore: dq.confidenceScore,
      issues: [],
      blockedRecommendation:
        '資料信心等級為 BLOCKED。無法進行完整的資料品質診斷。' +
        '請先載入產品資料與月度預測以解鎖分析功能。',
    };
  }

  const issues = dq.topIssues.map(issue => ({
    id: issue.id,
    severity: issue.severity,
    domain: issue.domain,
    decisionImpact: issue.decisionImpact,
    summary: summarizeIssue(issue),
    fixSuggestion: suggestFix(issue),
    fixType: classifyFixType(issue.id),
  }));

  return {
    overallConfidence: dq.confidence,
    overallScore: dq.confidenceScore,
    issues,
    blockedRecommendation: null,
  };
}
```

---

### Tool 2: `explainCapacityRisk`

**用途**: 解釋瓶頸月份、稼動率、短缺驅動因子。

```typescript
// ---------- explainCapacityRisk ----------

export interface ExplainCapacityRiskInput {
  /** Optional: focus on a specific month */
  focusMonth?: string;
}

export interface ExplainCapacityRiskOutput {
  worstMonth: string | null;
  worstMonthDetail: {
    coreUtilization: number | null;
    buUtilization: number | null;
    coreShortage: number;
    buShortage: number;
    bottleneck: 'Core' | 'BU' | 'None';
  } | null;
  shortageMonthCount: number;
  topDrivers: Array<{
    dimension: string;
    label: string;
    share: number | undefined;
    severity: string;
    explanation: string;
  }>;
  healthSignals: Array<{
    skuCode: string;
    classification: string;
    explanation: string;
  }>;
  confidence: string;
}

/**
 * explainCapacityRisk Tool
 *
 * Implementation:
 * - Reads context.capacitySummary for utilization/shortage data
 * - Reads context.riskBriefSummary for drivers and health signals
 * - Reads context.dataQualitySummary.confidence for tone adjustment
 *
 * Safety constraints:
 * - Attribution is always described as "proportional", never "causal"
 * - If confidence is 'low', all explanations include uncertainty qualifiers
 * - If confidence is 'blocked', returns a degraded message
 */
export function explainCapacityRisk(
  context: AiCopilotContext,
  input: ExplainCapacityRiskInput = {}
): ExplainCapacityRiskOutput {
  if (context.dataQualitySummary.confidence === 'blocked') {
    return {
      worstMonth: null,
      worstMonthDetail: null,
      shortageMonthCount: 0,
      topDrivers: [],
      healthSignals: [],
      confidence: 'blocked',
    };
  }

  const cap = context.capacitySummary;
  const risk = context.riskBriefSummary;
  const isLowConfidence = context.dataQualitySummary.confidence === 'low';

  const targetMonth = input.focusMonth ?? cap.worstMonth;
  const monthDetail = cap.monthlySummaries.find(m => m.month === targetMonth) ?? null;

  const topDrivers = risk.topDrivers.map(d => ({
    dimension: d.dimension,
    label: d.label,
    share: d.share,
    severity: d.severity,
    explanation: isLowConfidence
      ? `[Inference] ${d.label} 在短缺月份中需求佔比約 ${d.share ?? 'N/A'}%（數據可信度較低，僅供參考）。`
      : `[Fact] ${d.label} 在短缺月份中需求佔比 ${d.share ?? 'N/A'}%。`,
  }));

  const healthSignals = risk.topHealthSignals.map(s => ({
    skuCode: s.skuCode,
    classification: s.classification,
    explanation: formatHealthExplanation(s, isLowConfidence),
  }));

  return {
    worstMonth: cap.worstMonth,
    worstMonthDetail: monthDetail ? {
      coreUtilization: monthDetail.coreUtilization,
      buUtilization: monthDetail.buUtilization,
      coreShortage: monthDetail.coreShortage,
      buShortage: monthDetail.buShortage,
      bottleneck: monthDetail.bottleneck,
    } : null,
    shortageMonthCount: risk.shortageMonths.length,
    topDrivers,
    healthSignals,
    confidence: context.dataQualitySummary.confidence,
  };
}
```

---

### Tool 3: `explainBpGap`

**用途**: 解釋 BP 達成差距、主要貢獻因子。

```typescript
// ---------- explainBpGap ----------

export interface ExplainBpGapInput {
  /** Optional: focus on a specific year */
  focusYear?: string;
}

export interface ExplainBpGapOutput {
  hasAnyMiss: boolean;
  worstPeriod: string | null;
  yearlyBreakdown: Array<{
    period: string;
    targetMillionTwd: number | null;
    forecastMillionTwd: number;
    attainment: number | null;
    gapMillionTwd: number | null;
    status: string;
    explanation: string;
  }>;
  topRiskDrivers: Array<{
    label: string;
    share: number | undefined;
    explanation: string;
  }>;
  currencyNote: string;
  confidence: string;
}

/**
 * explainBpGap Tool
 *
 * Implementation:
 * - Reads context.bpSummary for attainment data
 * - Reads context.riskBriefSummary.topDrivers for BP gap drivers
 * - Reads context.currencyAssumptions for currency conversion note
 *
 * Safety constraints:
 * - Always includes currency conversion disclaimer
 * - Attainment is described in percentage, gap in Million TWD
 * - Never compares USD directly to TWD
 * - Attribution is "proportional" not "causal"
 */
export function explainBpGap(
  context: AiCopilotContext,
  input: ExplainBpGapInput = {}
): ExplainBpGapOutput {
  const bp = context.bpSummary;
  const isLowConfidence = context.dataQualitySummary.confidence === 'low';
  const isBlocked = context.dataQualitySummary.confidence === 'blocked';

  if (isBlocked) {
    return {
      hasAnyMiss: false,
      worstPeriod: null,
      yearlyBreakdown: [],
      topRiskDrivers: [],
      currencyNote: context.currencyAssumptions.note,
      confidence: 'blocked',
    };
  }

  const yearlyBreakdown = bp.yearly
    .filter(y => !input.focusYear || y.period === input.focusYear)
    .map(y => ({
      ...y,
      explanation: formatBpExplanation(y, isLowConfidence),
    }));

  const bpDrivers = context.riskBriefSummary.topDrivers
    .filter(d => d.metric === 'bpGapContribution')
    .map(d => ({
      label: d.label,
      share: d.share,
      explanation: isLowConfidence
        ? `[Inference] ${d.label} 在 BP 差距期間營收佔比約 ${d.share ?? 'N/A'}%（低可信度，僅供參考）。`
        : `[Fact] ${d.label} 在 BP 差距期間營收佔比 ${d.share ?? 'N/A}%。注意：此為比例歸因，非因果判定。`,
    }));

  return {
    hasAnyMiss: bp.hasAnyMiss,
    worstPeriod: bp.worstPeriod,
    yearlyBreakdown,
    topRiskDrivers: bpDrivers,
    currencyNote: context.currencyAssumptions.note,
    confidence: context.dataQualitySummary.confidence,
  };
}
```

---

### Tool 4: `suggestDataFixes`

**用途**: 根據 DQ 問題提出具體的數據修復建議（如「為 SKU-003 補上單價」）。

```typescript
// ---------- suggestDataFixes ----------

export interface SuggestDataFixesInput {
  /** Whether the current user has edit permission */
  canEdit: boolean;
  /** Optional: focus on a specific DQ issue ID */
  focusIssueId?: string;
}

export interface DataFixDraft {
  issueId: string;
  domain: string;
  description: string;
  proposedChanges: Array<{
    recordType: 'sku' | 'forecast' | 'capacity' | 'parameter';
    recordId: string;
    field: string;
    currentValue: unknown;
    suggestedValue: unknown;
    reasoning: string;
  }>;
  affectedRecords: string[];
  riskLevel: 'low' | 'medium' | 'high';
  requiresConfirmation: true;
}

export interface SuggestDataFixesOutput {
  drafts: DataFixDraft[];
  viewerBlocked: boolean;
  confidence: string;
}

/**
 * suggestDataFixes Tool
 *
 * Implementation:
 * - Reads context.dataQualitySummary.topIssues
 * - For each issue, generates a DataFixDraft with proposed changes
 * - Uses dataQualityRemediation.ts strategies to classify fix type
 * - References dataQualityRemediation.ts validation rules
 *
 * Safety constraints:
 * - If canEdit === false (Viewer role), returns empty drafts with viewerBlocked: true
 * - If confidence is 'blocked', returns empty drafts with explanation
 * - All drafts have requiresConfirmation: true (never auto-save)
 * - suggestedValue is a reasonable default ONLY for guided suggestions;
 *   it must never be a random guess
 * - For issues where no deterministic fix exists (e.g., orphan forecast),
 *   draft contains navigation guidance instead of field values
 */
export function suggestDataFixes(
  context: AiCopilotContext,
  input: SuggestDataFixesInput
): SuggestDataFixesOutput {
  // Viewer role: analysis only, no fix suggestions
  if (!input.canEdit) {
    return {
      drafts: [],
      viewerBlocked: true,
      confidence: context.dataQualitySummary.confidence,
    };
  }

  // Blocked confidence: no fix suggestions
  if (context.dataQualitySummary.confidence === 'blocked') {
    return {
      drafts: [],
      viewerBlocked: false,
      confidence: 'blocked',
    };
  }

  const issues = input.focusIssueId
    ? context.dataQualitySummary.topIssues.filter(i => i.id === input.focusIssueId)
    : context.dataQualitySummary.topIssues;

  const drafts: DataFixDraft[] = [];

  for (const issue of issues) {
    const draft = buildDraftForIssue(issue);
    if (draft) {
      drafts.push(draft);
    }
  }

  return {
    drafts,
    viewerBlocked: false,
    confidence: context.dataQualitySummary.confidence,
  };
}
```

**Draft 生成邏輯 (內部)**:

```typescript
function buildDraftForIssue(
  issue: DataQualitySection['topIssues'][number]
): DataFixDraft | null {
  const id = issue.id;

  // SKU missing attributes
  if (id.startsWith('sku-missing-attr-')) {
    const skuId = id.replace('sku-missing-attr-', '');
    return {
      issueId: id,
      domain: issue.domain,
      description: `SKU ${skuId} 缺少必要的生產屬性，需補齊後才能進行準確計算。`,
      proposedChanges: [
        {
          recordType: 'sku',
          recordId: skuId,
          field: 'unitPrice',
          currentValue: null,
          suggestedValue: '(需用戶輸入)',
          reasoning: 'Unit price is required for revenue calculation. No default can be assumed.',
        },
      ],
      affectedRecords: [skuId],
      riskLevel: 'high',
      requiresConfirmation: true,
    };
  }

  // SKU zero price
  if (id.startsWith('sku-zero-price-')) {
    const skuId = id.replace('sku-zero-price-', '');
    return {
      issueId: id,
      domain: issue.domain,
      description: `SKU 單價為 0，將導致營收計算結果為零。`,
      proposedChanges: [
        {
          recordType: 'sku',
          recordId: skuId,
          field: 'unitPrice',
          currentValue: 0,
          suggestedValue: '(需用戶輸入正確單價)',
          reasoning: 'Zero price results in zero revenue. User must provide the actual unit price.',
        },
      ],
      affectedRecords: [skuId],
      riskLevel: 'medium',
      requiresConfirmation: true,
    };
  }

  // Missing exchange rate
  if (id.startsWith('missing-constant-twd-rate') || id.startsWith('missing-yearly-twd-rate')) {
    return {
      issueId: id,
      domain: 'currency',
      description: `缺少 TWD 匯率設定，導致無法進行 BP 達成率分析。`,
      proposedChanges: [
        {
          recordType: 'parameter',
          recordId: 'currencySettings',
          field: id.startsWith('missing-constant') ? 'constantUsdToTwdRate' : 'yearlyUsdToTwdRates',
          currentValue: null,
          suggestedValue: '(需用戶在 Parameters 頁面設定匯率)',
          reasoning: 'Exchange rate is required for TWD conversion. Default rate cannot be assumed.',
        },
      ],
      affectedRecords: ['currencySettings'],
      riskLevel: 'medium',
      requiresConfirmation: true,
    };
  }

  // For other issues, return a navigation-type draft
  return {
    issueId: id,
    domain: issue.domain,
    description: `問題 ${id} 需要手動檢查與修正。`,
    proposedChanges: [],
    affectedRecords: [],
    riskLevel: 'low',
    requiresConfirmation: true,
  };
}
```

---

### Tool 5: `explainScenarioImpact`

**用途**: 解釋情境乘數變動會帶來什麼影響。

```typescript
// ---------- explainScenarioImpact ----------

export interface ExplainScenarioImpactInput {
  /** The multipliers to explain */
  multipliers: {
    forecastVolume?: number;
    unitPrice?: number;
    coreCapacity?: number;
    buCapacity?: number;
  };
}

export interface ExplainScenarioImpactOutput {
  inputMultipliers: Record<string, number>;
  currentScenario: ScenarioSection | null;
  interpretation: Array<{
    dimension: string;
    change: string;
    expectedEffect: string;
    confidenceNote: string;
  }>;
  guardrailReminder: string;
}

/**
 * explainScenarioImpact Tool
 *
 * Implementation:
 * - If context.scenarioSummary is active and matches input multipliers,
 *   returns the existing delta data with human-readable explanations
 * - If no active scenario, describes what the multiplier changes WOULD do
 *   based on deterministic proportional reasoning (NOT running the engine)
 *
 * Safety constraints:
 * - NEVER actually runs computeScenarioComparison (that's buildLookAheadFocus's job)
 * - All interpretations are marked as [Inference] or [Assumption]
 * - Includes guardrail reminder that scenarios are read-only re-runs
 * - Clamps all multipliers to [0.5, 2.0] range per scenarioEngine.ts rules
 */
export function explainScenarioImpact(
  context: AiCopilotContext,
  input: ExplainScenarioImpactInput
): ExplainScenarioImpactOutput {
  const clamped = {
    forecastVolume: clampMultiplier(input.multipliers.forecastVolume ?? 1.0),
    unitPrice: clampMultiplier(input.multipliers.unitPrice ?? 1.0),
    coreCapacity: clampMultiplier(input.multipliers.coreCapacity ?? 1.0),
    buCapacity: clampMultiplier(input.multipliers.buCapacity ?? 1.0),
  };

  const interpretation: ExplainScenarioImpactOutput['interpretation'] = [];

  if (clamped.forecastVolume !== 1.0) {
    const pct = ((clamped.forecastVolume - 1) * 100).toFixed(0);
    interpretation.push({
      dimension: 'forecastVolume',
      change: `預測量 ${clamped.forecastVolume > 1 ? '+' : ''}${pct}%`,
      expectedEffect: `[Assumption] 預測量變動 ${pct}% 將等比例影響營收、產能需求與短缺月份數。`,
      confidenceNote: '此為線性推估，實際影響取決於各 SKU 的良率與面板佈局。',
    });
  }

  if (clamped.unitPrice !== 1.0) {
    const pct = ((clamped.unitPrice - 1) * 100).toFixed(0);
    interpretation.push({
      dimension: 'unitPrice',
      change: `單價 ${clamped.unitPrice > 1 ? '+' : ''}${pct}%`,
      expectedEffect: `[Assumption] 單價變動 ${pct}% 將等比例影響營收，但不影響產能需求。`,
      confidenceNote: '已知單價為 0 的 SKU 不受此乘數影響。',
    });
  }

  if (clamped.coreCapacity !== 1.0) {
    const pct = ((clamped.coreCapacity - 1) * 100).toFixed(0);
    interpretation.push({
      dimension: 'coreCapacity',
      change: `Core 產能 ${clamped.coreCapacity > 1 ? '+' : ''}${pct}%`,
      expectedEffect: `[Assumption] Core 產能擴充 ${pct}% 可能緩解 Core 瓶頸月份的短缺。`,
      confidenceNote: '實際效果取決於需求分佈，不是所有月份都會受益。',
    });
  }

  if (clamped.buCapacity !== 1.0) {
    const pct = ((clamped.buCapacity - 1) * 100).toFixed(0);
    interpretation.push({
      dimension: 'buCapacity',
      change: `BU 產能 ${clamped.buCapacity > 1 ? '+' : ''}${pct}%`,
      expectedEffect: `[Assumption] BU 產能擴充 ${pct}% 可能緩解 BU 瓶頸月份的短缺。`,
      confidenceNote: '僅對多層 SKU 有效（layerCount > 2 的 SKU 才有 BU 需求）。',
    });
  }

  return {
    inputMultipliers: clamped,
    currentScenario: context.scenarioSummary,
    interpretation,
    guardrailReminder:
      '情境模擬是確定性的唯讀重跑計算引擎，不會修改任何輸入數據或寫入 Firebase。',
  };
}

function clampMultiplier(v: number): number {
  return Math.max(0.5, Math.min(2.0, v));
}
```

---

### Tool 6: `buildLookAheadFocus`

**用途**: 執行 What-If 分析，用提議的變更重跑計算引擎。

```typescript
// ---------- buildLookAheadFocus ----------

export interface BuildLookAheadFocusInput {
  /** Multipliers for the what-if scenario */
  multipliers: {
    forecastVolume?: number;
    unitPrice?: number;
    coreCapacity?: number;
    buCapacity?: number;
  };
  /** Whether the current user has edit permission */
  canEdit: boolean;
}

export interface LookAheadResult {
  scenarioComparison: {
    deltas: {
      totalRevenueUsd: { base: number | null; scenario: number | null; delta: number | null; deltaPercent: number | null };
      totalForecastPcs: { base: number | null; scenario: number | null; delta: number | null; deltaPercent: number | null };
      maxCoreUtilization: { base: number | null; scenario: number | null; delta: number | null; deltaPercent: number | null };
      maxBuUtilization: { base: number | null; scenario: number | null; delta: number | null; deltaPercent: number | null };
      shortageMonthCount: { base: number | null; scenario: number | null; delta: number | null; deltaPercent: number | null };
      bpAttainmentPct: { base: number | null; scenario: number | null; delta: number | null; deltaPercent: number | null };
      bpGapMillionTwd: { base: number | null; scenario: number | null; delta: number | null; deltaPercent: number | null };
    };
    scenarioDqConfidence: string;
  };
  narrative: Array<{
    metric: string;
    before: string;
    after: string;
    change: string;
    interpretation: string;
  }>;
  guardrailReminder: string;
}

export interface BuildLookAheadFocusOutput {
  result: LookAheadResult | null;
  viewerBlocked: boolean;
  confidence: string;
}

/**
 * buildLookAheadFocus Tool
 *
 * Implementation:
 * - This is the ONLY tool that invokes the calculation engine (via computeScenarioComparison)
 * - It requires the raw data (skus, forecasts, capacityPlans, params) to be passed
 *   alongside the context, because the context itself is sanitized/summarized
 * - Returns full delta analysis with human-readable narrative
 *
 * Safety constraints:
 * - If canEdit === false (Viewer), returns viewerBlocked: true with no result
 * - If confidence is 'blocked', refuses to run and explains why
 * - Multipliers clamped to [0.5, 2.0]
 * - Result is a READ-ONLY analysis; it does NOT modify any stored data
 * - Narrative uses F-A-I-R classification
 */
export function buildLookAheadFocus(
  context: AiCopilotContext,
  rawInputs: {
    skus: SKU[];
    forecasts: Forecast[];
    capacityPlans: CapacityPlan[];
    params: ProjectParameters;
  },
  input: BuildLookAheadFocusInput
): BuildLookAheadFocusOutput {
  // Viewer: no what-if execution
  if (!input.canEdit) {
    return {
      result: null,
      viewerBlocked: true,
      confidence: context.dataQualitySummary.confidence,
    };
  }

  // Blocked: refuse to run
  if (context.dataQualitySummary.confidence === 'blocked') {
    return {
      result: null,
      viewerBlocked: false,
      confidence: 'blocked',
    };
  }

  const multipliers: ScenarioMultipliers = {
    forecastVolume: clampMultiplier(input.multipliers.forecastVolume ?? 1.0),
    unitPrice: clampMultiplier(input.multipliers.unitPrice ?? 1.0),
    coreCapacity: clampMultiplier(input.multipliers.coreCapacity ?? 1.0),
    buCapacity: clampMultiplier(input.multipliers.buCapacity ?? 1.0),
  };

  // Invoke the existing scenario engine
  const comparison = computeScenarioComparison(
    rawInputs.skus,
    rawInputs.forecasts,
    rawInputs.capacityPlans,
    rawInputs.params,
    multipliers,
    buildDataQualitySummary(rawInputs)
  );

  const narrative = buildNarrative(comparison);

  return {
    result: {
      scenarioComparison: {
        deltas: sanitizeDeep(comparison.deltas),
        scenarioDqConfidence: comparison.scenario.dqSummary.confidence,
      },
      narrative,
      guardrailReminder:
        '此分析為確定性唯讀情境模擬，不修改任何正式數據。' +
        '所有數字均由 calculationEngine 原生公式產生。',
    },
    viewerBlocked: false,
    confidence: context.dataQualitySummary.confidence,
  };
}
```

---

## 六、Tool Output as Draft Pattern

### 6.1 Draft 物件結構

所有可能導致數據變更的 Tool（`suggestDataFixes`, `buildLookAheadFocus`）產生的輸出中，涉及「建議修改」的部分必須以 **Draft** 物件形式呈現。

```typescript
/**
 * Generic Draft object produced by AI Copilot tools.
 * NEVER directly passed to save services; requires explicit user confirmation.
 */
export interface CopilotDraft {
  /** Unique draft ID for tracking */
  draftId: string;

  /** Which tool produced this draft */
  sourceTool: 'suggestDataFixes' | 'buildLookAheadFocus' | 'explainScenarioImpact';

  /** Human-readable description of what this draft proposes */
  description: string;

  /** Specific field-level changes proposed */
  proposedChanges: Array<{
    recordType: 'sku' | 'forecast' | 'capacity' | 'parameter';
    recordId: string;
    field: string;
    currentValue: unknown;
    suggestedValue: unknown;
    reasoning: string;
  }>;

  /** Records that would be affected if applied */
  affectedRecords: string[];

  /** Risk level of applying this draft */
  riskLevel: 'low' | 'medium' | 'high';

  /** ALWAYS true — AI Copilot never auto-saves */
  requiresConfirmation: true;

  /** ISO timestamp of when this draft was generated */
  generatedAt: string;
}
```

### 6.2 Draft 生命週期

```
Tool produces Draft
       │
       ▼
┌──────────────┐
│ Draft Card   │  ← UI renders Before/After preview
│ in Copilot   │
│ Panel        │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│ User clicks  │────▶│ Confirmation │
│ "Apply Fix"  │     │ Modal        │
└──────────────┘     └──────┬───────┘
                            │
                   ┌────────▼────────┐
                   │ User clicks     │
                   │ "Confirm"       │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │ Existing save   │
                   │ service called  │
                   │ (saveSku, etc.) │
                   └─────────────────┘
```

### 6.3 Viewer Role Guard

```typescript
/**
 * When user role is 'viewer':
 * - All tools return analysis output normally
 * - suggestDataFixes returns viewerBlocked: true, empty drafts
 * - buildLookAheadFocus returns viewerBlocked: true, no result
 * - UI hides all "Apply" / "Fix" buttons
 * - UI shows read-only badge: "檢視者模式 — 僅供分析"
 */
export function isViewerRole(role: WorkspaceRole): boolean {
  return role === 'viewer';
}
```

### 6.4 Draft 與現有 Save 流程的對接

Draft 中的 `recordType` + `field` 對應到現有的寫入服務：

| recordType | 對應 Service | 範例 |
|------------|-------------|------|
| `sku` | `saveSku(skuId, updates)` | 修改 SKU 單價 |
| `forecast` | `saveForecast(forecastId, updates)` | 修改預測數量 |
| `capacity` | `saveCapacityPlan(planId, updates)` | 修改產能配置 |
| `parameter` | `saveParameters(paramUpdates)` | 修改匯率、工作天數 |

**關鍵約束**: Draft 的 `proposedChanges` 只描述「改什麼」，不包含對 service 層的直接調用。UI 層的確認 Modal 負責將 Draft 轉換為具體的 service 調用。

---

## 七、Future API Key Handling

### 7.1 v1.38.0 MVP 策略

**v1.38.0 不連接任何外部 AI API**。所有分析由本地確定性引擎完成。Copilot 面板的「對話」功能在 MVP 中為以下兩種模式之一：

1. **本地模式 (Local Mode)**: 使用者點選 Quick Question 按鈕，Tool 函數直接返回結構化結果，UI 將結果渲染為格式化文字。不涉及任何 AI API。

2. **匯出模式 (Export Mode)**: 使用者點選「複製 Prompt」按鈕，系統將 `AiCopilotContext` JSON 連同 guardrails prompt 一起複製到剪貼簿。使用者自行貼到外部 AI 工具。

### 7.2 未來架構演進路線

```
v1.38.0 (MVP)          v1.39.0+               v2.0+
─────────────          ──────────             ─────────
Local Mode only  ───▶  User-provided    ───▶  Optional server-side
                       session key            Cloud Functions proxy
                       (sessionStorage)       (encrypted key vault)
```

### 7.3 API Key 安全規範

| 規則 | 實作方式 |
|------|----------|
| **NEVER 硬編碼 API Key** | `.env` 檔案 + `.gitignore`；CI/CD 使用 Secret Manager |
| **NEVER 存入 Firestore** | API Key 僅存在 `sessionStorage`（頁面關閉即清除） |
| **NEVER 在前端裸傳** | 未來如需伺服器代理，Key 儲存在 Cloud Functions 的環境變數中 |
| **User-provided key 流程** | 設定頁面輸入 Key → 存入 `sessionStorage` → 請求時讀取 → 頁面關閉自動清除 |
| **Key validation** | 發送前先做 format check（如 OpenAI: `sk-...`, Anthropic: `sk-ant-...`） |
| **Error handling** | API 失敗時回退到 Local Mode，顯示「AI 服務暫時無法使用，已切換至本地分析模式」 |

### 7.4 User-Provided Session Key 流程

```typescript
// Future implementation sketch (NOT for v1.38.0)

const SESSION_KEY_STORAGE = 'abf_copilot_api_key';

export function storeSessionKey(provider: string, key: string): void {
  // Only store in sessionStorage (cleared on tab close)
  sessionStorage.setItem(`${SESSION_KEY_STORAGE}_${provider}`, key);
}

export function getSessionKey(provider: string): string | null {
  return sessionStorage.getItem(`${SESSION_KEY_STORAGE}_${provider}`);
}

export function clearSessionKeys(): void {
  // Called on logout or explicit clear
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith(SESSION_KEY_STORAGE)) {
      sessionStorage.removeItem(key);
    }
  }
}
```

---

## 八、Module Dependency Map

### 8.1 依賴關係圖

```
aiCopilotContext.ts
  ├── imports from types/index.ts (SKU, Forecast, CapacityPlan, ProjectParameters)
  ├── imports from currency.ts (normalizeCurrencySettings, DEFAULT_CURRENCY_SETTINGS)
  ├── imports from dataQuality.ts (buildDataQualitySummary)
  ├── imports from riskAttribution.ts (buildRiskAttributionModel)
  ├── imports from metricDefinitions.ts (METRIC_DEFINITIONS)
  └── imports from scenarioEngine.ts (ScenarioComparison — type only, for activeScenario param)

aiCopilotTools.ts
  ├── imports from aiCopilotContext.ts (AiCopilotContext, all section types)
  ├── imports from scenarioEngine.ts (computeScenarioComparison, ScenarioMultipliers)
  ├── imports from dataQuality.ts (buildDataQualitySummary)
  └── imports from dataQualityRemediation.ts (getRemediationType — for fix classification)
```

### 8.2 新增檔案清單

| 檔案路徑 | 用途 | 依賴 |
|----------|------|------|
| `frontend/src/core/aiCopilotContext.ts` | Context Builder | dataQuality, riskAttribution, metricDefinitions, currency |
| `frontend/src/core/aiCopilotContext.test.ts` | Context Builder 單元測試 | aiCopilotContext |
| `frontend/src/core/aiCopilotTools.ts` | 6 個 Tool 函數 | aiCopilotContext, scenarioEngine, dataQualityRemediation |
| `frontend/src/core/aiCopilotTools.test.ts` | Tool 單元測試 | aiCopilotTools |

### 8.3 不修改的既有檔案

v1.38.0 的 AI Copilot 模組**嚴禁修改**以下既有模組：

- `calculationEngine.ts` — 核心計算公式不可觸碰
- `analytics.ts` — 分析模型建構不可改動
- `bpTargets.ts` — BP 分析邏輯不可改動
- `dataQuality.ts` — DQ 檢查邏輯不可改動
- `riskAttribution.ts` — 風險歸因邏輯不可改動
- `scenarioEngine.ts` — 情境引擎不可改動
- `analysisContract.ts` — 合約結構不可改動
- `aiBriefExport.ts` — 清洗邏輯可複用但不可改動
- `types/index.ts` — 核心型別不可改動

---

## 九、Safety Guardrails Integration

### 9.1 十條紅線在 Tool 層的落實

| # | 紅線 | Tool 層實作 |
|---|------|-------------|
| 1 | 不修改公式 | Tool 僅讀取 `metricDefinitions`，不產生修改建議 |
| 2 | 不發明數據 | `suggestDataFixes` 中 `suggestedValue` 標記為「需用戶輸入」而非猜測值 |
| 3 | 不跨幣別運算 | `explainBpGap` 強制附帶 `currencyNote`；context 中 USD/TWD 已明確標記 |
| 4 | 歸因非因果 | 所有 Tool 輸出的 `explanation` 使用「佔比」而非「造成」 |
| 5 | 不違反假設 | `assumptions` 陣列嵌入 context，Tool 可引用但不可違反 |
| 6 | 不繞過可信度 | 所有 Tool 檢查 `confidence`；blocked 時回傳降級結果 |
| 7 | 不自動商業決策 | Draft 永遠 `requiresConfirmation: true` |
| 8 | 不繞過人工確認 | Viewer 角色完全攔截；Editor/Owner 需二次確認 Modal |
| 9 | 不違反指標定義 | Tool 輸出引用 `metricDefinitions` 的 `id`，不自創指標 |
| 10 | 不過度承諾 | 情境乘數 clamp 至 [0.5, 2.0]；敘述使用「可能」而非「必定」 |

### 9.2 Blocked Confidence 降級矩陣

| Tool | High/Medium Confidence | Low Confidence | Blocked Confidence |
|------|----------------------|----------------|-------------------|
| `inspectDataQuality` | 完整診斷 + 修復建議 | 完整診斷 + 不確定性標註 | 僅回傳「需先載入數據」 |
| `explainCapacityRisk` | 完整分析 | 加入「僅供參考」標語 | 僅回傳 confidence: blocked |
| `explainBpGap` | 完整分析 | 加入不確定性語氣 | 僅回傳 confidence: blocked |
| `suggestDataFixes` | 完整修復草稿 | 草稿附帶不確定性警告 | 空草稿 + 說明 |
| `explainScenarioImpact` | 完整解釋 | 加入「僅供參考」標語 | 僅回傳 guardrail reminder |
| `buildLookAheadFocus` | 完整 what-if 結果 | 結果附帶低可信度警告 | 拒絕執行 |

### 9.3 F-A-I-R 結論分類在 Tool 輸出中的應用

每個 Tool 的 `explanation` / `interpretation` 欄位必須以 F-A-I-R 前綴標註結論性質：

- **[Fact]**: 直接來自計算引擎的確定性數字
- **[Assumption]**: 基於情境乘數或外部假設
- **[Inference]**: 從數據推導的結論
- **[Recommendation]**: 給人類的行動建議

### 9.4 Context JSON 導出安全

當使用者點選「複製 Prompt」時，系統導出的 JSON 必須：

1. 經過 `sanitizeDeep()` 最終處理
2. 包含完整的 `aiGuardrails` 區塊
3. 不包含任何原始 `skus[]`, `forecasts[]` 等陣列（僅包含摘要）
4. 不包含 Firestore document IDs 或路徑
5. 加上 UTF-8 BOM 以確保中文編碼正確（沿用 `aiBriefExport.ts` 的做法）

---

## Appendix A: 完整 Type Definition 匯出清單

```typescript
// aiCopilotContext.ts exports
export { AI_CONTEXT_SENSITIVE_KEYS, CONTEXT_CAP_LIMITS };
export type {
  AiCopilotContext,
  ContextProvenance,
  ProjectSummarySection,
  DataQualitySection,
  RiskBriefSection,
  ScenarioSection,
  BpSection,
  CapacitySection,
  CurrencySection,
  AiGuardrailsSection,
};
export { buildAiCopilotContext, sanitizeDeep };

// aiCopilotTools.ts exports
export type {
  InspectDataQualityInput, InspectDataQualityOutput,
  ExplainCapacityRiskInput, ExplainCapacityRiskOutput,
  ExplainBpGapInput, ExplainBpGapOutput,
  SuggestDataFixesInput, SuggestDataFixesOutput, DataFixDraft,
  ExplainScenarioImpactInput, ExplainScenarioImpactOutput,
  BuildLookAheadFocusInput, BuildLookAheadFocusOutput, LookAheadResult,
  CopilotDraft,
};
export {
  inspectDataQuality,
  explainCapacityRisk,
  explainBpGap,
  suggestDataFixes,
  explainScenarioImpact,
  buildLookAheadFocus,
};
```

## Appendix B: 確定性保證測試策略

```typescript
// aiCopilotContext.test.ts — 確定性驗證

describe('buildAiCopilotContext', () => {
  it('should produce identical output for identical inputs (determinism)', () => {
    const ctx1 = buildAiCopilotContext(skus, forecasts, capacityPlans, params, model);
    const ctx2 = buildAiCopilotContext(skus, forecasts, capacityPlans, params, model);

    // Ignore generatedAt (timestamp)
    const { generatedAt: _, ...rest1 } = ctx1;
    const { generatedAt: __, ...rest2 } = ctx2;

    expect(rest1).toEqual(rest2);
  });

  it('should contain zero sensitive keys', () => {
    const ctx = buildAiCopilotContext(skus, forecasts, capacityPlans, params, model);
    const json = JSON.stringify(ctx);
    for (const key of AI_CONTEXT_SENSITIVE_KEYS) {
      expect(json.toLowerCase()).not.toContain(key);
    }
  });

  it('should cap all arrays within limits', () => {
    const ctx = buildAiCopilotContext(skus, forecasts, capacityPlans, params, model);
    expect(ctx.dataQualitySummary.topIssues.length).toBeLessThanOrEqual(CONTEXT_CAP_LIMITS.topIssues);
    expect(ctx.riskBriefSummary.topDrivers.length).toBeLessThanOrEqual(CONTEXT_CAP_LIMITS.topDrivers);
    expect(ctx.riskBriefSummary.topHealthSignals.length).toBeLessThanOrEqual(CONTEXT_CAP_LIMITS.topHealthSignals);
  });

  it('should never contain undefined values after JSON round-trip', () => {
    const ctx = buildAiCopilotContext(skus, forecasts, capacityPlans, params, model);
    const roundTripped = JSON.parse(JSON.stringify(ctx));
    expect(roundTripped).toEqual(ctx);
  });
});
```

## Appendix C: 與 Analysis Contract 的關係

`AiCopilotContext` 與既有的 `AnalysisContractPayload` / `SanitizedAnalysisContract` 的關係：

| 維度 | AnalysisContractPayload | AiCopilotContext |
|------|------------------------|------------------|
| **用途** | 外部 AI Prompt 導出 | Copilot Tool 內部運算 |
| **粒度** | 包含完整 SKU 列表、矩陣 | 僅包含摘要統計 |
| **清洗** | `buildSanitizedAnalysisContract` | `sanitizeDeep` (更嚴格) |
| **陣列限制** | 部分有 cap (top 10 drivers) | 全面有 cap |
| **Guardrails** | `aiGuardrails` 區塊 | `aiGuardrails` 區塊 (更完整) |
| **Metric Defs** | 嵌入 | 嵌入 |
| **Scenario** | 包含 priceImpact / capacityImpact | 包含 scenarioSummary (如有) |
| **Build 成本** | 較高（需完整計算） | 較低（複用已有 model） |

**設計決策**: `AiCopilotContext` 不取代 `AnalysisContractPayload`，而是作為 Copilot Tool 層的輕量級輸入。兩者可以共用 `sanitizeDeep()` 和 guardrails 常量。未來若需將 Context 導出為 Prompt，可透過 `buildCopilotPromptPack(context)` 橋接。
