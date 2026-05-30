/**
 * AI Provider Prompt Pack Builder (v1.40.0)
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
 *
 * Consumes AiCopilotContext from aiCopilotContext.ts.
 */

import type { AiCopilotContext } from './aiCopilotContext';

// ============================================================
// Types
// ============================================================

export type ProviderMode = 'local' | 'mock' | 'external-byok' | 'deepseek';

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
- [Fact]: Directly calculated from provided data, verifiable. Example: "2026-03 Core utilization is 95.2%"
- [Assumption]: Based on configuration parameters or default conditions. Example: "Assuming exchange rate USD/TWD = 32.0"
- [Inference]: Trends or possibilities derived from data patterns. Example: "If demand grows 10%, bottleneck month may shift to Q2"
- [Recommendation]: Suggested action plans. Example: "Consider evaluating 5% Core capacity expansion"
All conclusions must be labeled with one of the four F-A-I-R categories. Every recommendation must cite source references.`;

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
    case 'external-byok':
      return 'External provider mode - all guardrails apply with extra strictness';
    case 'deepseek':
      return 'Running in DeepSeek AI provider mode - all guardrails apply with extra strictness';
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
 * attribution warning, and no-write requirement.
 */
export function buildProviderSystemPrompt(
  context: AiCopilotContext,
  mode: ProviderMode,
): string {
  const contextSummary = buildContextSummary(context);
  const modeNote = getModeNote(mode);

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
    'All output is for human review only. Do not produce code that writes, updates, deletes, or merges data. Do not suggest automated write flows without human approval. All recommendations must end with: "Please confirm before proceeding."',
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
): string {
  const contextSummary = buildContextSummary(context);

  const sections = [
    `User Question: ${question}`,
    '',
    '## Context Data',
    contextSummary,
    '',
    '## Response Instructions',
    'Please provide a FAIR-labeled response (Fact / Assumption / Inference / Recommendation) that addresses the user question using the context data above. Cite source references for each conclusion.',
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
): ProviderPromptPack {
  return {
    systemPrompt: buildProviderSystemPrompt(context, mode),
    userMessage: buildProviderUserMessage(context, userQuestion),
    guardrails: [...GUARDRAILS],
    allowedOperations: [...ALLOWED_OPERATIONS],
    forbiddenOperations: [...FORBIDDEN_OPERATIONS],
    outputFormat: FAIR_OUTPUT_FORMAT,
  };
}
