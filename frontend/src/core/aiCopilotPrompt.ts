/**
 * AI Copilot Prompt Pack Builder (v1.38.0)
 *
 * Builds Chinese-language prompt packs and system prompts for external AI tools.
 *
 * Key constraints:
 * - Pure function, zero side effects
 * - All text is deterministic — no AI API calls
 * - Includes F-A-I-R guardrails and safety rules in every prompt
 * - Does NOT mutate the input context
 *
 * Consumes AiCopilotContext from aiCopilotContext.ts.
 */

import type { AiCopilotContext } from './aiCopilotContext';

// ============================================================
// buildAiCopilotPromptPack
// ============================================================

/**
 * Build a Chinese-language prompt pack for external AI tools.
 *
 * The prompt is designed to be pasted into Gemini, Claude, ChatGPT, etc.
 * It embeds the context data inline with guardrails and role instructions.
 */
export function buildAiCopilotPromptPack(context: AiCopilotContext): string {
  const ps = context.projectSummary;
  const dq = context.dataQualitySummary;
  const cs = context.capacitySummary;
  const bp = context.bpSummary;
  const rb = context.riskBriefSummary;
  const sc = context.scenarioSummary;
  const cu = context.currencyAssumptions;

  const maxCorePct = ps.maxCoreUtilization !== null
    ? (ps.maxCoreUtilization * 100).toFixed(1) + '%'
    : 'N/A';
  const maxBuPct = ps.maxBuUtilization !== null
    ? (ps.maxBuUtilization * 100).toFixed(1) + '%'
    : 'N/A';

  const bpYearlyLines = bp.yearly.map(r => {
    const att = r.attainment !== null ? (r.attainment * 100).toFixed(1) + '%' : 'N/A';
    const gap = r.gapMillionTwd !== null ? r.gapMillionTwd.toFixed(1) + ' M TWD' : 'N/A';
    return `  - ${r.period}: 目標 ${r.targetMillionTwd ?? 'N/A'} M TWD / 預測 ${r.forecastMillionTwd.toFixed(1)} M TWD / 達成率 ${att} / 差距 ${gap} [${r.status}]`;
  });

  const driverLines = rb.topDrivers.map(d => {
    const shareStr = d.share !== undefined ? `${d.share.toFixed(1)}%` : '-';
    return `  - [${d.dimension}] ${d.label} (${d.metric}): ${d.value.toFixed(0)} / 佔比 ${shareStr} / 嚴重度 ${d.severity}`;
  });

  const issueLines = dq.topIssues.map(i =>
    `  - [${i.severity}/${i.decisionImpact}] ${i.titleMessage.key}`
  );

  const scenarioLines = sc && sc.isActive ? [
    '## 情境分析',
    '',
    `  - 預測量乘數: ${sc.multipliers.forecastVolume}`,
    `  - 單價乘數: ${sc.multipliers.unitPrice}`,
    `  - Core 產能乘數: ${sc.multipliers.coreCapacity}`,
    `  - BU 產能乘數: ${sc.multipliers.buCapacity}`,
    '',
    `  - 營收差異: ${sc.deltas.totalRevenueUsd.base ?? 'N/A'} → ${sc.deltas.totalRevenueUsd.scenario ?? 'N/A'} (Δ ${sc.deltas.totalRevenueUsd.delta ?? 'N/A'})`,
    `  - 缺口月數差異: ${sc.deltas.shortageMonthCount.base ?? 'N/A'} → ${sc.deltas.shortageMonthCount.scenario ?? 'N/A'} (Δ ${sc.deltas.shortageMonthCount.delta ?? 'N/A'})`,
    `  - BP 達成率差異: ${sc.deltas.bpAttainmentPct.base ?? 'N/A'} → ${sc.deltas.bpAttainmentPct.scenario ?? 'N/A'} (Δ ${sc.deltas.bpAttainmentPct.delta ?? 'N/A'})`,
    '',
  ] : [];

  const sections = [
    '# ABF Capacity Calculator — AI Data Copilot Context Pack',
    '',
    '## 使用者資訊',
    '- 此資料由 ABF Capacity Calculator v1.38.0 本地產生',
    '- 所有分析為確定性計算結果，非外部 AI 生成',
    '- 建議需人工確認後方可執行',
    '',
    '## 專案摘要',
    `- 總預測營收: ${ps.totalRevenueUsd.toLocaleString()} USD`,
    `- 總預測數量: ${ps.totalForecastPcs.toLocaleString()} PCS`,
    `- SKU 數量: ${ps.skuCount}`,
    `- 預測月份數: ${ps.forecastMonthCount}`,
    `- Core 最高稼動率: ${maxCorePct}`,
    `- BU 最高稼動率: ${maxBuPct}`,
    `- 缺口月份數: ${ps.shortageMonthCount}`,
    ps.worstBottleneckMonth ? `- 最嚴重瓶頸月份: ${ps.worstBottleneckMonth}` : '',
    '',
    '## 資料品質',
    `- 信心等級: ${dq.confidence}`,
    `- 信心分數: ${dq.confidenceScore}/100`,
    `- 狀態: ${dq.status}`,
    `- 問題總數: ${dq.issueCount}`,
    dq.topIssues.length > 0 ? '- 主要問題:' : '- 無重大問題',
    ...issueLines,
    '',
    '## 產能風險',
    cs.worstMonth ? `- 最嚴重月份: ${cs.worstMonth}` : '- 無嚴重產能風險',
    cs.monthlySummaries.length > 0
      ? `- 月度摘要數: ${cs.monthlySummaries.length}`
      : '',
    '',
    '## BP 達成分析',
    bp.hasAnyMiss ? '- 存在未達成 BP 目標的年度' : '- 所有年度 BP 目標皆已達成',
    bp.worstPeriod ? `- 最差期間: ${bp.worstPeriod}` : '',
    ...bpYearlyLines,
    '',
    '## 風險歸因',
    rb.shortageMonths.length > 0
      ? `- 缺口月份: ${rb.shortageMonths.join(', ')}`
      : '- 無缺口月份',
    driverLines.length > 0 ? '- 頂級驅動因子:' : '- 無驅動因子資料',
    ...driverLines,
    '',
    ...scenarioLines,
    '## 貨幣假設',
    `- 基礎幣別: ${cu.baseCurrency}`,
    `- 顯示幣別: ${cu.displayCurrency}`,
    `- 匯率模式: ${cu.exchangeRateMode}`,
    `- USD→TWD 匯率: ${cu.usdToTwdRate}`,
    `- USD→CNY 匯率: ${cu.usdToCnyRate}`,
    '',
    '## 假設條件',
    ...context.assumptions.map(a => `- ${a}`),
    '',
    '## AI 安全規則',
    '- 禁止修改計算公式',
    '- 禁止猜測缺失資料',
    '- 禁止混淆 USD / TWD / CNY / Million TWD',
    '- 禁止將比例歸因說成因果關係',
    '- 所有結論必須標示：Fact / Assumption / Inference / Recommendation',
    '- 所有建議必須引用 source references',
    '- Low confidence 時必須降級語氣',
    '',
    '## 使用者角色',
    `- ${context.role}`,
  ];

  return sections.filter(line => line !== undefined).join('\n');
}

// ============================================================
// buildCopilotSystemPrompt
// ============================================================

/**
 * Build a system-level prompt for future AI API integration.
 *
 * This prompt defines the AI's identity, safety rules, and F-A-I-R
 * classification requirements. It is intended to be used as a system
 * message in an LLM API call.
 */
export function buildCopilotSystemPrompt(context: AiCopilotContext): string {
  const contextJson = JSON.stringify(context, null, 2);

  const sections = [
    '你是 ABF Capacity Calculator 的 AI 資料分析助手。',
    '',
    '## 身份',
    '- 你是確定性分析工具，不是通用 AI',
    '- 你的回答必須基於提供的 context data',
    '- 你不可以自行計算或推測數據',
    '',
    '## 安全規則',
    '1. 禁止修改計算公式或 metricDefinitions',
    '2. 禁止猜測或補充缺失資料',
    '3. 禁止混淆 USD / TWD / CNY / Million TWD 單位',
    '4. 禁止將比例歸因（proportional attribution）說成因果關係',
    '5. 禁止在 confidence 為 "blocked" 時產出完整決策建議',
    '6. 禁止在 confidence 為 "low" 時使用絕對性語氣',
    '7. 禁止將 Weighted Pressure Index 權重乘回實體數量',
    '8. 禁止忽略資料品質警告（data quality warnings）',
    '9. 所有結論必須標示 F-A-I-R 分類',
    '10. 所有建議必須引用 source references',
    '',
    '## F-A-I-R 分類規則',
    '- Fact: 直接從資料計算得出（如「2026-03 Core 稼動率 95%」）',
    '- Assumption: 基於設定參數（如「假設工作天數固定 28 天」）',
    '- Inference: 從資料模式推導（如「若價格 +10%，BP 達成率可能提升 5pp」）',
    '- Recommendation: 建議採取的行動（如「建議評估 Core 產能擴充」）',
    '',
    '## Context Data',
    '```json',
    contextJson,
    '```',
  ];

  return sections.join('\n');
}
