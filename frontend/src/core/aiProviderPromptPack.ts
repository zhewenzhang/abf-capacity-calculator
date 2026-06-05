/**
 * AI Provider Prompt Pack Builder (v1.58.2)
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
 * - Includes safety guardrails in every prompt
 * - Does NOT mutate the input context
 * - Supports language-aware prompts (zh-TW / en)
 *
 * v1.58.2: Simplified output format. Removed FAIR labels.
 * Uses concise 4-section structure. Supports action hints.
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
// buildProviderSystemPrompt — v1.58.2 Simplified
// ============================================================

/**
 * Build a system-level prompt for provider requests.
 *
 * v1.58.2: Simplified output format. No FAIR labels.
 * Concise 4-section answer structure. Action hints support.
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
  ];

  const conciseOutputFormat = lang === 'zh-TW'
    ? `## 輸出格式

回答必須使用以下簡潔結構，除非使用者要求詳細報告：

### 1. 結論
一句話總結核心發現。

### 2. 關鍵數據
最多 4 條 bullet points，列出支援結論的主要數據。
- 金額使用 M NTD（除非使用者指定其他單位）
- 使用短句，不要完整段落

### 3. 原因
最多 3 條 bullet points，簡要說明原因。

### 4. 下一步
最多 3 條建議行動。如可跳轉頁面，請加註頁面名稱：
- 範例："查看產能規劃頁面進行詳細分析。"
- 範例："請至 BP 目標頁面確認年度目標。"

### 格式規則
- 不要使用 [Fact]、[Recommendation]、[Inference]、[Assumption] 等英文長標籤
- 可使用「事實：」「判斷：」「假設：」「建議：」等短標籤，但不要每句重複
- 不要輸出 7 段長報告
- 除非使用者要求詳細分析，否則回答控制在 300-600 中文字
- 回答中如提及可跳轉的頁面，使用自然語言指引即可`
    : `## Output Format

Use this concise structure unless the user requests a detailed report:

### 1. Conclusion
One sentence summary.

### 2. Key Data
Up to 4 bullet points with supporting data.
- Use M NTD for amounts (unless user specifies otherwise)
- Use short phrases, not full paragraphs

### 3. Reasons
Up to 3 bullet points explaining why.

### 4. Next Steps
Up to 3 suggested actions. If a page link is relevant, mention the page name naturally.

### Rules
- Do NOT use [Fact], [Recommendation], [Inference], [Assumption] long labels
- Do NOT output a 7-section report
- Keep answers to 300-600 characters unless user asks for detailed analysis
- Mention page navigation in natural language`;

  const sections = [
    'You are the ABF CSS enterprise operations analytics assistant. You help analyze ABF capacity, forecasts, BP targets, revenue, customers, and data quality.',
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
    conciseOutputFormat,
    '',
    '## Currency / BP Rules',
    '- Always convert currency units before comparison (USD, TWD, CNY, Million TWD)',
    '- Always state the conversion rate used when presenting currency figures',
    '- Default display currency: M NTD',
    '- BP Gap Attribution is proportional (revenue-share based), not strict causal attribution',
    '',
    '## Attribution Warning',
    'Proportional patterns are NOT causation. BP Gap Attribution uses revenue-share weights to allocate gaps across SKUs. This is an analytical decomposition, not a causal claim.',
    '',
    '## No-Write Requirement',
    'All output is for human review only. Do not produce code that writes, updates, deletes, or merges data. Do not suggest automated write flows without human approval.',
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
 * concise response instructions.
 */
export function buildProviderUserMessage(
  context: AiCopilotContext,
  question: string,
  lang: SupportedLanguage = 'en',
): string {
  const contextSummary = buildContextSummary(context);

  const responseInstructions = lang === 'zh-TW'
    ? '請使用上述資料回答用戶問題。回答請簡潔，使用結論/關鍵數據/原因/下一步四段結構。不要使用 [Fact] 等英文長標籤。'
    : 'Please answer the user question using the context data above. Keep it concise using the structure: conclusion / key data / reasons / next steps. Do not use [Fact] or similar long labels.';

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
  const sp = buildProviderSystemPrompt(context, mode, lang);
  return {
    systemPrompt: sp,
    userMessage: buildProviderUserMessage(context, userQuestion, lang),
    guardrails: [...GUARDRAILS],
    allowedOperations: [...ALLOWED_OPERATIONS],
    forbiddenOperations: [...FORBIDDEN_OPERATIONS],
    outputFormat: lang === 'zh-TW'
      ? '簡潔四段結構：結論、關鍵數據、原因、下一步'
      : 'Concise 4-section: Conclusion, Key Data, Reasons, Next Steps',
  };
}
