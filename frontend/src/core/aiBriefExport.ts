/**
 * AI Brief Export / Prompt Pack
 *
 * v1.21.1 - Hardened version with UTF-8 BOM, F-A-I-R guardrails, Key Findings params fix.
 * v1.21.0 - Sanitized Analysis Contract export for external AI consumption.
 *
 * This module provides:
 * 1. Sanitized Analysis Contract (removes sensitive data)
 * 2. Chinese AI Brief Prompt template with guardrails
 * 3. Combined AI Brief Pack (Prompt + JSON)
 *
 * IMPORTANT: This module does NOT call any AI API. It only prepares data
 * for users to copy and paste into external AI tools (Gemini, Claude, ChatGPT).
 */

import type { AnalysisContractPayload } from './analysisContract';

/**
 * Localized message descriptor for i18n support.
 */
export interface LocalizedMessageDescriptor {
  key: string;
  params?: Record<string, string | number>;
}

/**
 * Sanitized Analysis Contract for external AI consumption.
 * Uses relaxed types to avoid tight coupling with internal models.
 */
export interface SanitizedAnalysisContract {
  version: string;
  generatedAt: string;
  appVersion?: string;
  timeRange: {
    months: string[];
    years: string[];
  };
  metricDefinitions: Array<{
    id: string;
    labelKey: string;
    definition: string;
    formula: string;
    unit: string;
  }>;
  quality: {
    confidence: string;
    score: number;
    issueCount: number;
    topIssues: string[];
  };
  assumptions: string[];
  summary: {
    totalRevenueUsd: number;
    totalForecastPcs: number;
    maxCoreUtilization: number | null;
    maxBuUtilization: number | null;
    shortageMonthCount: number;
    worstBottleneckMonth: string | null;
  };
  yearlyHealth: Array<Record<string, unknown>>;
  bpAnalysis?: Array<Record<string, unknown>>;
  riskAttribution: Array<Record<string, unknown>>;
  bpAttribution: {
    worstPeriod: string | null;
    topDrivers: Array<Record<string, unknown>>;
    proportionalNote: string;
  };
  priceImpact: {
    summary: string;
    scenarios: Array<Record<string, unknown>>;
  };
  capacityImpact: {
    summary: string;
    scenarios: Array<Record<string, unknown>>;
  };
  keyFindings: Array<{
    severity: string;
    source: string;
    titleKey: string;
    detailKey: string;
    titleParams?: Record<string, string | number>;
    detailParams?: Record<string, string | number>;
    titleMessage: LocalizedMessageDescriptor;
    detailMessage: LocalizedMessageDescriptor;
  }>;
  skuSummary: Array<{
    skuCode: string;
    customer: string;
    deviceName: string;
    application: string;
    productGrade: string;
    sizeCategory: string;
    layerCount: number;
  }>;
  aiGuardrails: {
    doNotModify: string[];
    currencyHandling: string[];
    attributionWarning: string[];
    dataQualityWarning: string[];
    fairClassification: string[];
    weightedPressureBoundary: string[];
    blockedConfidenceHandling: string[];
  };
}

/**
 * Keys that should be removed or sanitized from the payload.
 */
const SENSITIVE_KEYS = [
  'uid',
  'email',
  'token',
  'auth',
  'member',
  'user',
  'workspaceId',
  'ownerUid',
];

/**
 * Check if a key looks sensitive based on common patterns.
 */
function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some(sk => lowerKey.includes(sk));
}

/**
 * Recursively remove sensitive keys from an object.
 * This is a safety net even if current payload doesn't have these keys.
 */
function removeSensitiveData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeSensitiveData(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      continue; // Skip sensitive keys
    }
    result[key] = removeSensitiveData(value);
  }
  return result as T;
}

/**
 * Extract LocalizedMessageDescriptor from a message field.
 * Handles both string and object formats.
 */
function extractMessageDescriptor(
  message: unknown
): LocalizedMessageDescriptor {
  if (typeof message === 'string') {
    return { key: message };
  }
  if (typeof message === 'object' && message !== null) {
    const msg = message as Record<string, unknown>;
    return {
      key: typeof msg.key === 'string' ? msg.key : '',
      params: msg.params as Record<string, string | number> | undefined,
    };
  }
  return { key: '' };
}

/**
 * Build a sanitized Analysis Contract for external AI consumption.
 */
export function buildSanitizedAnalysisContract(
  payload: AnalysisContractPayload
): SanitizedAnalysisContract {
  // First, remove any potentially sensitive data as a safety measure
  const cleanPayload = removeSensitiveData(payload);

  // Build SKU summary (limited fields, no internal IDs)
  const skuSummary = cleanPayload.skus.map(sku => ({
    skuCode: sku.skuCode,
    customer: sku.customer || '',
    deviceName: sku.deviceName || '',
    application: sku.application || '',
    productGrade: sku.productGrade || '',
    sizeCategory: sku.sizeCategory || '',
    layerCount: sku.layerCount || 0,
  }));

  // Simplify metric definitions
  const metricDefinitions = cleanPayload.metricDefinitions.map(m => ({
    id: m.id,
    labelKey: m.labelKey,
    definition: m.definition,
    formula: m.formula,
    unit: m.unit,
  }));

  // Build keyFindings with full message descriptors (P0-2 fix)
  const keyFindings = cleanPayload.keyFindings.map(f => {
    const titleMessage = extractMessageDescriptor(f.titleMessage);
    const detailMessage = extractMessageDescriptor(f.detailMessage);
    return {
      severity: f.severity,
      source: f.source,
      titleKey: titleMessage.key,
      detailKey: detailMessage.key,
      titleParams: titleMessage.params,
      detailParams: detailMessage.params,
      titleMessage,
      detailMessage,
    };
  });

  // Build sanitized structure
  return {
    version: cleanPayload.version,
    generatedAt: cleanPayload.generatedAt,
    appVersion: cleanPayload.appVersion,
    timeRange: cleanPayload.timeRange,
    metricDefinitions,
    quality: {
      confidence: cleanPayload.quality.confidence,
      score: cleanPayload.quality.confidenceScore,
      issueCount: cleanPayload.quality.issues.length,
      topIssues: cleanPayload.quality.issues
        .filter(i => i.severity === 'error' || i.severity === 'warning')
        .slice(0, 5)
        .map(i => {
          const titleMsg = extractMessageDescriptor(i.titleMessage);
          let title = titleMsg.key;
          if (titleMsg.params) {
            title += ` (params: ${JSON.stringify(titleMsg.params)})`;
          }
          return `${i.severity}: ${title}`;
        }),
    },
    assumptions: cleanPayload.assumptions,
    summary: cleanPayload.summary,
    yearlyHealth: cleanPayload.yearlyHealth.map(y => ({
      year: y.year,
      revenue: y.revenue,
      forecastPcs: y.forecastPcs,
      coreDemand: y.coreDemand,
      coreCapacity: y.coreCapacity,
      buDemand: y.buDemand,
      buCapacity: y.buCapacity,
      shortageMonths: y.shortageMonths,
      bottleneck: y.bottleneck,
    })),
    bpAnalysis: cleanPayload.bpAnalysis?.yearly.map(y => ({
      year: y.period,
      targetMillionTwd: y.targetMillionTwd,
      forecastMillionTwd: y.forecastMillionTwd,
      attainment: y.attainment,
      gapMillionTwd: y.gapMillionTwd,
      status: y.status,
    })),
    riskAttribution: cleanPayload.riskAttribution.drivers.slice(0, 10).map(d => ({
      dimension: d.dimension,
      label: d.label,
      metric: d.metric,
      value: d.value,
      share: d.share,
      affectedPeriods: d.affectedPeriods,
    })),
    bpAttribution: {
      worstPeriod: cleanPayload.bpAttribution.worstPeriod,
      topDrivers: cleanPayload.bpAttribution.topDrivers.slice(0, 5).map(d => ({
        period: d.period,
        dimension: d.dimension,
        label: d.label,
        shareOfGap: d.shareOfGap,
        gapContributionMillionTwd: d.gapContributionMillionTwd,
      })),
      proportionalNote:
        'BP Gap Attribution is proportional (revenue-share based), not strict causal attribution. ' +
        'Drivers are ranked by their share of revenue in gap periods, not by their direct responsibility for the gap.',
    },
    priceImpact: {
      summary:
        'Price Impact scenarios are deterministic read-only re-runs of the calculation engine. ' +
        'They do not mutate inputs or write to Firebase.',
      scenarios: cleanPayload.priceImpact.scenarios.map(s => ({
        scenarioId: s.scenarioId,
        priceDeltaPct: s.priceDeltaPct,
        yearly: s.yearly.map(y => ({
          year: y.year,
          baseRevenueMillionTwd: y.baseRevenueMillionTwd,
          scenarioRevenueMillionTwd: y.scenarioRevenueMillionTwd,
          revenueDeltaMillionTwd: y.revenueDeltaMillionTwd,
          baseBpAttainment: y.baseBpAttainment,
          scenarioBpAttainment: y.scenarioBpAttainment,
          bpAttainmentDelta: y.bpAttainmentDelta,
        })),
      })),
    },
    capacityImpact: {
      summary:
        'Capacity Improvement Impact scenarios are deterministic read-only re-runs. ' +
        'They simulate Core/BU +10% capacity increases without modifying actual capacity plans.',
      scenarios: cleanPayload.capacityImpact.scenarios.map(s => ({
        scenarioId: s.scenarioId,
        shortageMonthsBefore: s.shortageMonthsBefore,
        shortageMonthsAfter: s.shortageMonthsAfter,
        resolvedShortageMonths: s.resolvedShortageMonths,
        maxCoreUtilBefore: s.maxCoreUtilBefore,
        maxCoreUtilAfter: s.maxCoreUtilAfter,
        maxBuUtilBefore: s.maxBuUtilBefore,
        maxBuUtilAfter: s.maxBuUtilAfter,
      })),
    },
    keyFindings,
    skuSummary,
    aiGuardrails: {
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
        'Attribution is calculated by revenue share, not by counterfactual analysis.',
      ],
      dataQualityWarning: [
        'If quality.confidence is "low" or "blocked", analysis may not be reliable.',
        'Always review quality.topIssues before making recommendations.',
        'Data caveats are listed in the quality section.',
      ],
      // P1: F-A-I-R classification guardrails
      fairClassification: [
        'Every key conclusion must be tagged as [Fact / 事實], [Assumption / 假設], [Inference / 推論], or [Recommendation / 建議].',
        'DO NOT present inferences as facts.',
        'DO NOT present recommendations as decided actions.',
        'Clearly distinguish what the data shows from what you infer or recommend.',
      ],
      // P2-1: Weighted Pressure boundary warning
      weightedPressureBoundary: [
        'Weighted Pressure Index (Core×1.3 / BU×1.0) is ONLY for risk ranking and proportional attribution.',
        'It does NOT modify actual demand, capacity, shortage, or utilization calculations.',
        'DO NOT multiply the Core 1.3 weight back into actual shortage panel counts.',
        'The weighted values are relative scores, not physical quantities.',
      ],
      // P2-2: Blocked confidence handling
      blockedConfidenceHandling: [
        'If quality.confidence is "blocked", DO NOT produce full decision recommendations.',
        'When blocked, ONLY list data gaps and human remediation steps.',
        'For "low" confidence, reduce certainty in language - use "may", "possibly", "suggests" instead of "is", "will", "causes".',
        'Always prominently display confidence level in your output header.',
      ],
    },
  };
}

/**
 * Build the Chinese AI Brief Prompt with embedded guardrails.
 */
export function buildChineseAiBriefPrompt(contract: SanitizedAnalysisContract): string {
  const isBlocked = contract.quality.confidence === 'blocked';
  const isLow = contract.quality.confidence === 'low';

  const sections = [
    // Role
    '## 角色定位',
    '',
    '你是 ABF 載板產能與產品規劃分析顧問。',
    '你的任務是根據提供的 Analysis Contract 資料，進行深度的產能與 BP 決策分析。',
    '',

    // Confidence Warning Header (P2-2: blocked confidence handling)
    ...(isBlocked || isLow ? [
      '## ⚠️ 資料品質警告',
      '',
      isBlocked
        ? '**此資料集信心等級為 BLOCKED。你不可產出完整決策建議。**'
        : '**此資料集信心等級為 LOW。請降低語氣確定性。**',
      '',
      isBlocked
        ? '你只能：列出資料缺口、建議人類修復步驟。不可做營運決策建議。'
        : '請在結論中使用「可能」、「或許」、「建議進一步確認」等語氣，而非絕對性陳述。',
      '',
    ] : []),

    // Analysis Tasks
    '## 分析任務',
    '',
    '請針對以下面向進行分析：',
    '',
    '1. **產能瓶頸分析**',
    `   - 評估 ${contract.summary.worstBottleneckMonth || '各月份'} 的產能狀況`,
    `   - Core 最高稼動率: ${contract.summary.maxCoreUtilization ? (contract.summary.maxCoreUtilization * 100).toFixed(1) : 'N/A'}%`,
    `   - BU 最高稼動率: ${contract.summary.maxBuUtilization ? (contract.summary.maxBuUtilization * 100).toFixed(1) : 'N/A'}%`,
    `   - 缺口月份數: ${contract.summary.shortageMonthCount}`,
    '',
    '2. **BP 達成風險分析**',
    contract.bpAnalysis?.some((y: Record<string, unknown>) => y.status === 'miss')
      ? '   - 注意：部分年度 BP 目標未達成，請分析差距原因'
      : '   - 目前預測下 BP 目標皆已達成',
    contract.bpAttribution.worstPeriod
      ? `   - 最大差距期間: ${contract.bpAttribution.worstPeriod}`
      : '',
    '',
    '3. **價格變動敏感度**',
    '   - 分析 ±10% 價格變動對 BP 達成率的影響',
    '   - 識別價格槓桿最大的年度',
    '',
    '4. **產能改善情境**',
    '   - 評估 Core/BU +10% 產能擴充的效果',
    '   - 計算可解除的缺口月份數',
    '',
    '5. **SKU / 客戶 / 尺寸 / 應用 / 層別風險驅動因子**',
    '   - 識別營收佔比高但產能壓力佔比也高的 SKU（策略成長型）',
    '   - 識別營收佔比低但產能壓力佔比高的 SKU（產能耗用型）',
    '   - 分析各維度的風險驅動因子',
    '',
    '6. **資料品質與可信度評估**',
    `   - 資料信心等級: ${contract.quality.confidence}`,
    `   - 信心分數: ${contract.quality.score}/100`,
    contract.quality.topIssues.length > 0
      ? `   - 主要問題: ${contract.quality.topIssues.join('; ')}`
      : '   - 無重大資料問題',
    '',

    // Guardrails - Prohibitions
    '## ⚠️ 嚴格禁止事項',
    '',
    '分析時絕對不可以：',
    '',
    '1. **修改公式**',
    '   - 不可更改 metricDefinitions 中的任何公式',
    '   - 不可自行推論或發明新的計算方式',
    '',
    '2. **自行補充資料**',
    '   - 不可假設缺失的資料',
    '   - 不可用平均值或其他估計值填補空缺',
    '   - 只能基於提供的 Analysis Contract 進行分析',
    '',
    '3. **混淆貨幣單位**',
    '   - 營收以 USD 計算（已從來源幣別標準化）',
    '   - BP 目標以「百萬 TWD」計算',
    '   - **絕對不可**直接比較 USD 營收與百萬 TWD BP 目標',
    '   - USD 換算 TWD 需使用參數中的匯率',
    '',
    '4. **忽略資料限制**',
    '   - 必須尊重 assumptions 中的分析假設',
    '   - 若 quality.confidence 為 "low" 或 "blocked"，必須明確警告分析可能不可靠',
    '   - 必須考量資料品質問題對結論的影響',
    '',
    '5. **混淆比例歸因與因果關係**',
    '   - BP Gap Attribution 和 Risk Attribution 是「比例歸因」，不是「嚴格因果」',
    '   - 「佔差距 30%」表示該驅動因子在差距期間貢獻 30% 營收',
    '   - 這**不表示**該因子「造成」30% 的差距',
    '   - 不可將比例歸因解讀為責任分配',
    '',
    // P2-1: Weighted Pressure boundary warning
    '6. **誤用 Weighted Pressure Index**',
    '   - Weighted Pressure Index（Core×1.3 / BU×1.0）只用於風險排序與比例歸因',
    '   - 它不會改變實體 demand、capacity、shortage、utilization 公式',
    '   - 不可把 Core 1.3 權重乘回實體短缺面板數',
    '   - 加權值是相對分數，不是實際數量',
    '',

    // P1: F-A-I-R Classification requirement
    '## 📋 結論分類標準（F-A-I-R）',
    '',
    '每個關鍵結論必須標明類型：',
    '',
    '- **[Fact / 事實]**：資料直接顯示的內容，如「2026-03 Core 稼動率 95%」',
    '- **[Assumption / 假設]**：分析假設，如「假設工作天數固定」',
    '- **[Inference / 推論]**：從資料推導出的結論，如「若價格 +10%，BP 達成率可能提升 5pp」',
    '- **[Recommendation / 建議]**：行動建議，如「建議評估 Core 產能擴充」',
    '',
    '注意：',
    '- 不要把推論寫成事實',
    '- 不要把建議寫成已決策',
    '- 每個重大結論都要標明類型',
    '',

    // Output Format
    '## 輸出格式',
    '',
    '請依以下結構提供分析結果：',
    '',
    '### 1. 一句話結論',
    '### 2. 前三大風險',
    '### 3. 產能瓶頸分析',
    '### 4. BP 達成風險',
    '### 5. 價格敏感度分析',
    '### 6. 產能改善情境評估',
    '### 7. SKU / 客戶 / 產品組合分析',
    '### 8. 資料品質與信心等級評估',
    '### 9. 各角色行動建議',
    '### 10. 需要人類確認的問題',
    '',

    // Embedded Guardrails Reminder
    '## 資料安全提醒',
    '',
    '**不可修改的項目：**',
    ...contract.aiGuardrails.doNotModify.map(g => `- ${g}`),
    '',
    '**貨幣處理規則：**',
    ...contract.aiGuardrails.currencyHandling.map(g => `- ${g}`),
    '',
    '**歸因警告：**',
    ...contract.aiGuardrails.attributionWarning.map(g => `- ${g}`),
    '',
    '**資料品質警告：**',
    ...contract.aiGuardrails.dataQualityWarning.map(g => `- ${g}`),
    '',
    '**F-A-I-R 分類要求：**',
    ...contract.aiGuardrails.fairClassification.map(g => `- ${g}`),
    '',
    '**Weighted Pressure 邊界：**',
    ...contract.aiGuardrails.weightedPressureBoundary.map(g => `- ${g}`),
    '',
    '**Blocked / Low Confidence 處理：**',
    ...contract.aiGuardrails.blockedConfidenceHandling.map(g => `- ${g}`),
    '',

    // JSON Fence Notice
    '---',
    '',
    '以下是受控 Analysis Contract JSON，請只根據此資料分析：',
    '',
  ];

  return sections.filter(line => line !== '').join('\n');
}

/**
 * Build the Combined AI Brief Pack (Prompt + Sanitized JSON).
 */
export function buildCombinedAiBriefPack(payload: AnalysisContractPayload): string {
  const sanitized = buildSanitizedAnalysisContract(payload);
  const prompt = buildChineseAiBriefPrompt(sanitized);
  const jsonContent = JSON.stringify(sanitized, null, 2);

  return [
    prompt,
    '```json',
    jsonContent,
    '```',
  ].join('\n');
}

/**
 * Build JSON content with UTF-8 BOM for download.
 * P0-3: Ensures proper Chinese character encoding in downloaded files.
 */
export function buildDownloadJsonContent(payload: AnalysisContractPayload): string {
  const sanitized = buildSanitizedAnalysisContract(payload);
  const jsonContent = JSON.stringify(sanitized, null, 2);
  // P0-3: Add UTF-8 BOM for proper encoding
  return '\ufeff' + jsonContent;
}

/**
 * Download the sanitized contract as a JSON file.
 * P0-3: Now includes UTF-8 BOM for proper Chinese encoding.
 * P2-3: Caller must call revokeDownloadUrl(dataUrl) after download completes.
 */
export function downloadSanitizedContract(
  payload: AnalysisContractPayload,
  filename?: string
): { dataUrl: string; filename: string } {
  const sanitized = buildSanitizedAnalysisContract(payload);
  const jsonContent = JSON.stringify(sanitized, null, 2);
  // P0-3: Add UTF-8 BOM and specify charset
  const blob = new Blob(['\ufeff' + jsonContent], {
    type: 'application/json;charset=utf-8;',
  });
  const dataUrl = URL.createObjectURL(blob);

  const defaultFilename = `abf-analysis-contract-${sanitized.timeRange.years.join('-')}-${new Date().toISOString().split('T')[0]}.json`;

  return {
    dataUrl,
    filename: filename || defaultFilename,
  };
}

/**
 * P2-3: Revoke the download URL to free memory.
 * Call this after the download completes or when the URL is no longer needed.
 */
export function revokeDownloadUrl(dataUrl: string): void {
  URL.revokeObjectURL(dataUrl);
}

/**
 * Copy text to clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * Check if the combined pack JSON content is valid and parseable.
 */
export function validateCombinedPack(pack: string): {
  valid: boolean;
  error?: string;
  parsed?: SanitizedAnalysisContract;
} {
  try {
    const match = pack.match(/```json\n([\s\S]*?)\n```$/);
    if (!match) {
      return { valid: false, error: 'JSON fence not found' };
    }

    const jsonContent = match[1];
    const parsed = JSON.parse(jsonContent) as SanitizedAnalysisContract;

    if (!parsed.version) {
      return { valid: false, error: 'Missing version field' };
    }
    if (!parsed.summary) {
      return { valid: false, error: 'Missing summary field' };
    }
    if (!parsed.aiGuardrails) {
      return { valid: false, error: 'Missing aiGuardrails field' };
    }

    return { valid: true, parsed };
  } catch {
    return { valid: false, error: 'JSON parse error' };
  }
}
