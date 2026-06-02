/**
 * AI Provider Prompt Pack Builder (v1.52.0)
 *
 * Builds prompt packs specifically for provider request construction.
 * Each pack includes system prompt, user message, guardrails, and
 * operation allowlists/denylists tailored to the provider mode.
 *
 * Key constraints:
 * - Pure function, zero side effects
 * - All text is deterministic — no AI API calls
 * - No firebase/firestore imports
 * - No fetch() or network API calls
 * - No localStorage or sessionStorage
 * - Includes F-A-I-R guardrails and safety rules in every prompt
 * - Does NOT mutate the input context
 * - Supports language-aware prompts (zh-TW / en)
 *
 * Consumes AiCopilotContext from aiCopilotContext.ts.
 */

import type { AiCopilotContext } from './aiCopilotContext';

// ============================================================
// Types
// ============================================================

export type ProviderMode = 'local' | 'mock' | 'deepseek-proxy';

export type SupportedLanguage = 'en' | 'zh-TW';

export interface ProviderPromptPack {
  readonly systemPrompt: string;
  readonly userMessage: string;
  readonly guardrails: string[];
  readonly allowedOperations: string[];
  readonly forbiddenOperations: string[];
  readonly outputFormat: string;
}

// ============================================================
// Constants
// ============================================================

const GUARDRAILS: readonly string[] = [
  'Do not fabricate or invent data — strictly use provided context data only',
  'Do not suggest external API calls or external services',
  'Do not auto-save any results to the database',
  'Do not modify Firestore documents or collections',
  'Do not modify calculation formulas or metric definitions',
  'Do not guess or interpolate missing data',
  'Do not confuse USD / TWD / CNY / Million TWD units — always convert before comparison',
  'Do not claim proportional attribution as causation — BP Gap Attribution is revenue-share based',
  'All suggestions and recommendations require explicit human confirmation before execution',
  'Low confidence must downgrade language tone — avoid absolute statements when confidence is low',
] as const;

const ALLOWED_OPERATIONS: readonly string[] = [
  'analyze',
  'explain',
  'compare',
  'recommend',
  'suggest fixes (draft only)',
] as const;

const FORBIDDEN_OPERATIONS: readonly string[] = [
  'save',
  'write',
  'delete',
  'modify',
  'create',
  'auto-save',
] as const;

const FAIR_OUTPUT_FORMAT = `F-A-I-R Output Format Instructions:

## 強制輸出結構

你的回答必須嚴格按照以下結構輸出，不可省略任何段落：

### 1. 重點摘要（開頭）
- 最多 3 條 bullet points
- 每條不超過 20 字
- 概括最重要的發現

### 2. 主要發現
- 使用 Markdown bullet list
- 每條結論標註 F-A-I-R 標籤
- 標籤格式：[Fact]、[Assumption]、[Inference]、[Recommendation]
- 禁止拼錯：不可寫 [Interence]，必須是 [Inference]

### 3. 數據品質問題
- 列出資料品質相關問題
- 若資料品質分數低，必須先說明：「由於資料品質不足，以下結論僅作為初步診斷。」

### 4. 產能與稼動率風險
- 分析產能瓶頸、稼動率超標月份
- 使用 bullet list 呈現

### 5. BP 營收差距
- 分析 BP 達成率、差距金額
- 涉及 USD、TWD、CNY 比較時，必須明確寫出匯率換算
- 範例：「以下 BP 差距已按 1 USD = 32 TWD 換算」

### 6. 建議行動
- 每一條 [Recommendation] 必須包含來源引用
- 來源格式：「來源：Data Quality Summary」、「來源：Capacity Risk Model」、「來源：BP Analysis」、「來源：Scenario Result」
- 禁止說「請確認後執行」
- 必須說「建議人工確認後再採取行動」或「此建議不會自動寫入系統」

### 7. 需人工確認的事項
- 列出需要人工進一步確認的項目

## F-A-I-R 標籤定義
- [Fact]: 直接從提供資料計算得出，可驗證。範例：「2026-03 Core 稼動率為 95.2%」
- [Assumption]: 基於設定參數或預設條件。範例：「假設匯率 USD/TWD = 32.0」
- [Inference]: 從資料模式推導的趨勢或可能性。範例：「若需求成長 10%，瓶頸月份可能移至 Q2」
- [Recommendation]: 建議的行動方案。範例：「建議評估 5% Core 產能擴充」

## 格式要求
- 使用 Markdown 格式：## 標題、**粗體**、- 列表、1. 編號列表
- 每個段落內使用 bullet list，不要輸出一整段長文
- 行距適當，易於閱讀`;

// ============================================================
// Language Rules
// ============================================================

function getLanguageRule(lang: SupportedLanguage): string {
  if (lang === 'zh-TW') {
    return [
      '## 語言要求',
      '你必須完全以繁體中文（Traditional Chinese）回答。',
      '絕對不可使用簡體中文。',
      '使用以下專業術語：',
      '- Utilization → 稼動率',
      '- Capacity → 產能',
      '- Forecast → 預測',
      '- Shortage → 缺口',
      '- Bottleneck → 瓶頸',
      '- Revenue → 營收',
      '- Attainment → 達成率',
      '- Gap → 差距',
      '- Risk → 風險',
      '- Scenario → 情境',
      '- Look Ahead → 前瞻',
      '',
      '回答語氣：專業、簡潔、有條理。',
      '使用條列式（bullet points）呈現重點。',
    ].join('\n');
  }

  return '## Language Requirement\nRespond in English. Use professional and concise language.';
}

// ============================================================
// Helpers
// ============================================================

function formatPct(value: number | null): string {
  return value !== null ? (value * 100).toFixed(1) + '%' : 'N/A';
}

function buildContextSummary(context: AiCopilotContext): string {
  const ps = context.projectSummary;
  const dq = context.dataQualitySummary;
  const cs = context.capacitySummary;
  const bp = context.bpSummary;
  const rb = context.riskBriefSummary;
  const cu = context.currencyAssumptions;

  const lines: string[] = [
    '## Project Summary',
    `- Total Revenue: ${ps.totalRevenueUsd.toLocaleString()} USD`,
    `- Total Forecast: ${ps.totalForecastPcs.toLocaleString()} PCS`,
    `- SKU Count: ${ps.skuCount}`,
    `- Forecast Months: ${ps.forecastMonthCount}`,
    `- Max Core Utilization: ${formatPct(ps.maxCoreUtilization)}`,
    `- Max BU Utilization: ${formatPct(ps.maxBuUtilization)}`,
    `- Shortage Months: ${ps.shortageMonthCount}`,
    ps.worstBottleneckMonth ? `- Worst Bottleneck: ${ps.worstBottleneckMonth}` : '',
    '',
    '## Data Quality',
    `- Confidence: ${dq.confidence} (score: ${dq.confidenceScore}/100)`,
    `- Status: ${dq.status}`,
    `- Issue Count: ${dq.issueCount}`,
    dq.topIssues.length > 0
      ? '- Top Issues:\n' + dq.topIssues.map(i => `  - [${i.severity}/${i.decisionImpact}] ${i.titleMessage.key}`).join('\n')
      : '- No major issues',
    '',
    '## Capacity Risk',
    cs.worstMonth ? `- Worst Month: ${cs.worstMonth}` : '- No severe capacity risk',
    `- Monthly Summaries: ${cs.monthlySummaries.length}`,
    '',
    '## BP Attainment',
    bp.hasAnyMiss ? '- Has unmet BP targets' : '- All BP targets met',
    bp.worstPeriod ? `- Worst Period: ${bp.worstPeriod}` : '',
    ...bp.yearly.map(r => {
      const att = r.attainment !== null ? (r.attainment * 100).toFixed(1) + '%' : 'N/A';
      const gap = r.gapMillionTwd !== null ? r.gapMillionTwd.toFixed(1) + ' M TWD' : 'N/A';
      return `  - ${r.period}: target ${r.targetMillionTwd ?? 'N/A'} M TWD / forecast ${r.forecastMillionTwd.toFixed(1)} M TWD / attainment ${att} / gap ${gap} [${r.status}]`;
    }),
    '',
    '## Risk Attribution',
    rb.shortageMonths.length > 0
      ? `- Shortage Months: ${rb.shortageMonths.join(', ')}`
      : '- No shortage months',
    rb.topDrivers.length > 0
      ? '- Top Drivers:\n' + rb.topDrivers.map(d => {
          const shareStr = d.share !== undefined ? `${d.share.toFixed(1)}%` : '-';
          return `  - [${d.dimension}] ${d.label} (${d.metric}): ${d.value.toFixed(0)} / share ${shareStr} / severity ${d.severity}`;
        }).join('\n')
      : '- No driver data',
    '',
    '## Currency Assumptions',
    `- Base Currency: ${cu.baseCurrency}`,
    `- Display Currency: ${cu.displayCurrency}`,
    `- Exchange Rate Mode: ${cu.exchangeRateMode}`,
    `- USD to TWD: ${cu.usdToTwdRate}`,
    `- USD to CNY: ${cu.usdToCnyRate}`,
  ];

  return lines.filter(l => l !== undefined).join('\n');
}

function getModeNote(mode: ProviderMode): string {
  switch (mode) {
    case 'local':
      return 'Running in local deterministic mode';
    case 'mock':
      return 'Running in mock provider mode - responses are deterministic test data';
    case 'deepseek-proxy':
      return 'Running in DeepSeek AI provider mode (server-managed) - all guardrails apply with extra strictness';
  }
}

// ============================================================
// buildProviderSystemPrompt
// ============================================================

/**
 * Build a system-level prompt for provider requests.
 *
 * Includes identity, guardrails, context summary, source references,
 * allowed/forbidden operations, F-A-I-R output format, currency rules,
 * attribution warning, no-write requirement, and language rules.
 */
export function buildProviderSystemPrompt(
  context: AiCopilotContext,
  mode: ProviderMode,
  lang: SupportedLanguage = 'en',
): string {
  const contextSummary = buildContextSummary(context);
  const modeNote = getModeNote(mode);
  const languageRule = getLanguageRule(lang);

  const sourceReferences = [
    '[projectSummary] Project summary — revenue, quantity, SKU, month statistics',
    '[dataQualitySummary] Data quality summary — confidence level, issue list',
    '[capacitySummary] Capacity risk summary — monthly utilization, bottleneck analysis',
    '[bpSummary] BP attainment analysis — yearly targets, forecasts, gaps',
    '[riskBriefSummary] Risk attribution — shortage months, drivers',
    '[scenarioSummary] Scenario analysis — multipliers, delta comparison',
    '[currencyAssumptions] Currency assumptions — currency types, exchange rates',
    '[assumptions] Assumptions list',
  ];

  const sections = [
    'You are the ABF Capacity Calculator AI assistant. You analyze capacity planning data.',
    '',
    '## Mode',
    modeNote,
    '',
    languageRule,
    '',
    '## Guardrails',
    ...GUARDRAILS.map((g, i) => `${i + 1}. ${g}`),
    '',
    '## Context Summary',
    contextSummary,
    '',
    '## Source References',
    ...sourceReferences.map(r => `- ${r}`),
    '',
    '## Allowed Operations',
    ...ALLOWED_OPERATIONS.map(o => `- ${o}`),
    '',
    '## Forbidden Operations',
    ...FORBIDDEN_OPERATIONS.map(o => `- ${o}`),
    '',
    '## Output Format',
    FAIR_OUTPUT_FORMAT,
    '',
    '## Currency / BP Rules',
    '- Always convert currency units before comparison (USD, TWD, CNY, Million TWD)',
    '- Always state the conversion rate used when presenting currency figures',
    '- BP Gap Attribution is proportional (revenue-share based), not strict causal attribution',
    '',
    '## Attribution Warning',
    'Proportional patterns are NOT causation. BP Gap Attribution uses revenue-share weights to allocate gaps across SKUs. This is an analytical decomposition, not a causal claim. Never state or imply that a SKU "caused" a BP gap.',
    '',
    '## No-Write Requirement',
    'All output is for human review only. Do not produce code that writes, updates, deletes, or merges data. Do not suggest automated write flows without human approval.',
    '',
    '## 重要禁止用語',
    '- 禁止說「請確認後執行」— 這暗示 AI 已經或即將自動執行',
    '- 禁止說「Please confirm before proceeding」',
    '- 必須說「建議人工確認後再採取行動」',
    '- 必須說「此建議不會自動寫入系統」',
    '- 範例：「[Recommendation] 建議評估 Q2 產能擴充方案。來源：Capacity Risk Model。建議人工確認後再採取行動，此建議不會自動寫入系統。」',
  ];

  return sections.join('\n');
}

// ============================================================
// buildProviderUserMessage
// ============================================================

/**
 * Build a user message for provider requests.
 *
 * Includes the user's question, context data summary, and
 * a request for FAIR-labeled response.
 */
export function buildProviderUserMessage(
  context: AiCopilotContext,
  question: string,
  lang: SupportedLanguage = 'en',
): string {
  const contextSummary = buildContextSummary(context);

  const responseInstructions = lang === 'zh-TW'
    ? '請提供 F-A-I-R 標註的回應（Fact / Assumption / Inference / Recommendation），使用上述資料回答用戶問題。請引用資料來源。'
    : 'Please provide a FAIR-labeled response (Fact / Assumption / Inference / Recommendation) that addresses the user question using the context data above. Cite source references for each conclusion.';

  const sections = [
    `User Question: ${question}`,
    '',
    '## Context Data',
    contextSummary,
    '',
    '## Response Instructions',
    responseInstructions,
  ];

  return sections.join('\n');
}

// ============================================================
// buildProviderPromptPack
// ============================================================

/**
 * Build a complete prompt pack for provider requests.
 *
 * Returns a ProviderPromptPack containing system prompt, user message,
 * guardrails, allowed/forbidden operations, and output format.
 */
export function buildProviderPromptPack(
  context: AiCopilotContext,
  userQuestion: string,
  mode: ProviderMode,
  lang: SupportedLanguage = 'en',
): ProviderPromptPack {
  return {
    systemPrompt: buildProviderSystemPrompt(context, mode, lang),
    userMessage: buildProviderUserMessage(context, userQuestion, lang),
    guardrails: [...GUARDRAILS],
    allowedOperations: [...ALLOWED_OPERATIONS],
    forbiddenOperations: [...FORBIDDEN_OPERATIONS],
    outputFormat: FAIR_OUTPUT_FORMAT,
  };
}
