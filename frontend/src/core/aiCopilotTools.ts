/**
 * AI Copilot Tools (v1.39.0) — 6 Deterministic Diagnostic Tools
 *
 * Key constraints:
 * - Pure functions, zero side effects (no Firestore, no services, no network)
 * - NO imports from services/**
 * - All answers include: facts, assumptions, inferences, recommendations,
 *   sourceReferences, confidence, caveats
 * - Do NOT guess missing data
 */

import type { AiCopilotContext } from './aiCopilotContext';

// ============================================================
// CopilotToolResult
// ============================================================

export interface CopilotToolResult {
  toolName: string;
  title: string;
  summary: string;
  facts: string[];
  assumptions: string[];
  inferences: string[];
  recommendations: string[];
  sourceReferences: string[];
  confidence: 'high' | 'medium' | 'low' | 'blocked';
  caveats: string[];
  data: Record<string, unknown>;
  // Provider adapter metadata (optional, populated when provider mode is active)
  validationIssues?: string[];
  isMockProvider?: boolean;
  blockedReason?: string;
}

// ============================================================
// Tool 1: inspectDataQuality
// ============================================================

export function inspectDataQuality(context: AiCopilotContext): CopilotToolResult {
  const dq = context.dataQualitySummary;

  if (dq.confidence === 'blocked') {
    return {
      toolName: 'inspectDataQuality',
      title: '資料品質檢查（已封鎖）',
      summary: '資料信心等級為 BLOCKED，無法進行完整的資料品質診斷。請先載入產品資料與月度預測以解鎖分析功能。',
      facts: [`信心等級: blocked`, `信心分數: ${dq.confidenceScore}`],
      assumptions: ['DQ rules are correct'],
      inferences: [],
      recommendations: ['載入產品資料', '載入月度預測資料', '確認容量配置已設定'],
      sourceReferences: ['dataQuality module'],
      confidence: 'blocked',
      caveats: ['資料不足，無法產生完整診斷報告'],
      data: { confidenceScore: dq.confidenceScore, issueCount: dq.issueCount },
    };
  }

  // Group issues by decisionImpact (high first)
  const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sortedIssues = [...dq.topIssues].sort(
    (a, b) => (impactOrder[a.decisionImpact] ?? 2) - (impactOrder[b.decisionImpact] ?? 2)
  );

  const highIssues = sortedIssues.filter(i => i.decisionImpact === 'high');
  const mediumIssues = sortedIssues.filter(i => i.decisionImpact === 'medium');
  const lowIssues = sortedIssues.filter(i => i.decisionImpact === 'low');

  const facts: string[] = [
    `資料品質問題總數: ${dq.issueCount}`,
    `信心分數: ${dq.confidenceScore}/100`,
    `信心等級: ${dq.confidence}`,
    `狀態: ${dq.status}`,
  ];

  for (const issue of sortedIssues) {
    facts.push(`[${issue.severity.toUpperCase()}][${issue.decisionImpact}] ${issue.titleMessage.key} (domain: ${issue.domain})`);
  }

  const inferences: string[] = [];
  if (highIssues.length > 0) {
    inferences.push(`${highIssues.length} 個高影響問題可能阻礙核心分析或扭曲 BP/容量數據`);
    const highDomains = new Set(highIssues.map(i => i.domain));
    for (const domain of highDomains) {
      inferences.push(`${domain} 領域的高影響問題需要優先處理`);
    }
  }
  if (mediumIssues.length > 0) {
    inferences.push(`${mediumIssues.length} 個中等影響問題會造成數據噪音或部分覆蓋`);
  }

  const recommendations: string[] = [];
  if (highIssues.length > 0) {
    recommendations.push('優先修復高影響 (high) 問題，這些問題阻礙核心分析');
    for (const issue of highIssues.slice(0, 3)) {
      recommendations.push(`修復: ${issue.titleMessage.key} (domain: ${issue.domain})`);
    }
  }
  if (mediumIssues.length > 0) {
    recommendations.push('處理中等影響 (medium) 問題以提升數據品質');
  }
  if (highIssues.length === 0 && mediumIssues.length === 0) {
    recommendations.push('數據品質良好，可放心進行分析決策');
  }

  return {
    toolName: 'inspectDataQuality',
    title: '資料品質檢查',
    summary: `共 ${dq.issueCount} 個問題，信心分數 ${dq.confidenceScore}/100。高影響問題 ${highIssues.length} 個，中等影響 ${mediumIssues.length} 個，低影響 ${lowIssues.length} 個。`,
    facts,
    assumptions: ['DQ rules are correct'],
    inferences,
    recommendations,
    sourceReferences: ['dataQuality module'],
    confidence: dq.confidence,
    caveats: dq.confidence === 'low' ? ['信心等級為 LOW，分析結果可能不可靠'] : [],
    data: {
      confidenceScore: dq.confidenceScore,
      issueCount: dq.issueCount,
      highImpactCount: highIssues.length,
      mediumImpactCount: mediumIssues.length,
      lowImpactCount: lowIssues.length,
      groupedIssues: { high: highIssues, medium: mediumIssues, low: lowIssues },
    },
  };
}

// ============================================================
// Tool 2: explainCapacityRisk
// ============================================================

export function explainCapacityRisk(context: AiCopilotContext): CopilotToolResult {
  const cap = context.capacitySummary;
  const risk = context.riskBriefSummary;

  // Identify months where utilization > 0.9 or shortage > 0
  const highUtilMonths = cap.monthlySummaries.filter(
    m => (m.coreUtilization !== null && m.coreUtilization > 0.9) ||
         (m.buUtilization !== null && m.buUtilization > 0.9)
  );
  const shortageMonths = cap.monthlySummaries.filter(
    m => m.coreShortage > 0 || m.buShortage > 0
  );

  const facts: string[] = [
    `最差月份: ${cap.worstMonth ?? 'N/A'}`,
    `高利用率月份 (>90%): ${highUtilMonths.length}`,
    `短缺月份數: ${shortageMonths.length}`,
    `風險摘要中的短缺月份: ${risk.shortageMonths.length}`,
  ];

  for (const m of highUtilMonths.slice(0, 5)) {
    const corePct = m.coreUtilization !== null ? `${(m.coreUtilization * 100).toFixed(1)}%` : 'N/A';
    const buPct = m.buUtilization !== null ? `${(m.buUtilization * 100).toFixed(1)}%` : 'N/A';
    facts.push(`${m.month}: Core ${corePct}, BU ${buPct}, 瓶頸: ${m.bottleneck}`);
  }

  for (const m of shortageMonths.slice(0, 5)) {
    facts.push(`${m.month}: Core 短缺 ${m.coreShortage.toFixed(0)}, BU 短缺 ${m.buShortage.toFixed(0)}`);
  }

  if (cap.worstMonth) {
    const worst = cap.monthlySummaries.find(m => m.month === cap.worstMonth);
    if (worst) {
      facts.push(`最差月份 ${worst.month} 的瓶頸類型: ${worst.bottleneck}`);
    }
  }

  // Trend analysis
  const inferences: string[] = [];
  if (shortageMonths.length >= 2) {
    const sortedShortages = [...shortageMonths].sort((a, b) => a.month.localeCompare(b.month));
    const firstHalf = sortedShortages.slice(0, Math.floor(sortedShortages.length / 2));
    const secondHalf = sortedShortages.slice(Math.floor(sortedShortages.length / 2));
    const firstAvgCore = firstHalf.reduce((s, m) => s + m.coreShortage, 0) / firstHalf.length;
    const secondAvgCore = secondHalf.reduce((s, m) => s + m.coreShortage, 0) / secondHalf.length;
    if (secondAvgCore > firstAvgCore) {
      inferences.push('短缺壓力呈上升趨勢，後期月份的缺口較前期更大');
    } else if (secondAvgCore < firstAvgCore) {
      inferences.push('短缺壓力呈下降趨勢，後期月份的缺口較前期收窄');
    } else {
      inferences.push('短缺壓力穩定，各月份缺口大致相同');
    }
  }

  if (highUtilMonths.length > 0) {
    const coreBottleneckMonths = highUtilMonths.filter(m => m.bottleneck === 'Core');
    const buBottleneckMonths = highUtilMonths.filter(m => m.bottleneck === 'BU');
    if (coreBottleneckMonths.length > buBottleneckMonths.length) {
      inferences.push('主要瓶頸指向 Core 產能');
    } else if (buBottleneckMonths.length > coreBottleneckMonths.length) {
      inferences.push('主要瓶頸指向 BU 產能');
    }
  }

  const recommendations: string[] = [];
  if (shortageMonths.length > 0) {
    recommendations.push('處理瓶頸月份的產能缺口');
    const worstMonth = cap.worstMonth;
    if (worstMonth) {
      recommendations.push(`優先處理最差月份 ${worstMonth} 的產能配置`);
    }
  }
  if (highUtilMonths.length > 0) {
    recommendations.push('監控高利用率月份，考慮產能擴充或需求調整');
  }
  if (shortageMonths.length === 0 && highUtilMonths.length === 0) {
    recommendations.push('產能充足，持續監控即可');
  }

  return {
    toolName: 'explainCapacityRisk',
    title: '產能風險分析',
    summary: cap.worstMonth
      ? `最差月份 ${cap.worstMonth}，共 ${shortageMonths.length} 個短缺月份，${highUtilMonths.length} 個高利用率月份。`
      : '未偵測到產能風險。',
    facts,
    assumptions: ['capacity plan is current'],
    inferences,
    recommendations,
    sourceReferences: ['calculationEngine + analytics'],
    confidence: context.dataQualitySummary.confidence === 'blocked' ? 'blocked' :
                shortageMonths.length > 0 ? 'medium' : 'high',
    caveats: context.dataQualitySummary.confidence === 'low' ? ['信心等級較低，僅供參考'] : [],
    data: {
      worstMonth: cap.worstMonth,
      highUtilMonthCount: highUtilMonths.length,
      shortageMonthCount: shortageMonths.length,
      highUtilMonths: highUtilMonths.map(m => m.month),
      shortageMonthDetails: shortageMonths.map(m => ({
        month: m.month,
        coreShortage: m.coreShortage,
        buShortage: m.buShortage,
        bottleneck: m.bottleneck,
      })),
    },
  };
}

// ============================================================
// Tool 3: explainBpGap
// ============================================================

export function explainBpGap(context: AiCopilotContext): CopilotToolResult {
  const bp = context.bpSummary;
  const missYears = bp.yearly.filter(r => r.status === 'miss' || r.status === 'watch');

  const facts: string[] = [
    `BP 目標是否有任何未達成: ${bp.hasAnyMiss ? '是' : '否'}`,
    `最差期間: ${bp.worstPeriod ?? 'N/A'}`,
    `年度數: ${bp.yearly.length}`,
    `未達成/watch 年度數: ${missYears.length}`,
  ];

  for (const year of bp.yearly) {
    const target = year.targetMillionTwd !== null ? `${year.targetMillionTwd.toFixed(1)}M TWD` : 'N/A';
    const forecast = `${year.forecastMillionTwd.toFixed(1)}M TWD`;
    const attainment = year.attainment !== null ? `${(year.attainment * 100).toFixed(1)}%` : 'N/A';
    const gap = year.gapMillionTwd !== null ? `${year.gapMillionTwd.toFixed(1)}M TWD` : 'N/A';
    facts.push(`${year.period}: 目標 ${target}, 預測 ${forecast}, 達成率 ${attainment}, 差距 ${gap}, 狀態 ${year.status}`);
  }

  const inferences: string[] = [];
  if (missYears.length > 0) {
    for (const year of missYears) {
      if (year.status === 'miss') {
        inferences.push(`${year.period} 年度 BP 目標未達成（miss），差距 ${year.gapMillionTwd?.toFixed(1) ?? 'N/A'}M TWD`);
      } else {
        inferences.push(`${year.period} 年度 BP 目標接近但未完全達成（watch）`);
      }
    }
    inferences.push('未達成的年度需要採取行動縮小差距');
  } else {
    inferences.push('所有年度的 BP 目標均已達成或無目標設定');
  }

  const recommendations: string[] = [];
  if (missYears.length > 0) {
    recommendations.push('針對未達成年度制定差距縮小計畫');
    for (const year of missYears.filter(y => y.status === 'miss')) {
      const gap = Math.abs(year.gapMillionTwd ?? 0).toFixed(1);
      recommendations.push(`${year.period}: 需縮小 ${gap}M TWD 差距`);
    }
  } else {
    recommendations.push('BP 達成狀況良好，維持現有策略');
  }

  return {
    toolName: 'explainBpGap',
    title: 'BP 達成差距分析',
    summary: bp.hasAnyMiss
      ? `BP 目標有 ${missYears.length} 個年度未達成或需關注，最差期間為 ${bp.worstPeriod ?? 'N/A'}。`
      : '所有 BP 目標均已達成。',
    facts,
    assumptions: ['BP targets are finalized'],
    inferences,
    recommendations,
    sourceReferences: ['bpTargets module'],
    confidence: context.dataQualitySummary.confidence,
    caveats: [
      '此為比例歸因（proportional attribution），非嚴格因果關係',
      ...(context.dataQualitySummary.confidence === 'low' ? ['信心等級較低，僅供參考'] : []),
    ],
    data: {
      hasAnyMiss: bp.hasAnyMiss,
      worstPeriod: bp.worstPeriod,
      yearly: bp.yearly,
      missYears: missYears.map(y => ({
        period: y.period,
        status: y.status,
        gapMillionTwd: y.gapMillionTwd,
        attainment: y.attainment,
      })),
    },
  };
}

// ============================================================
// Tool 4: suggestDataFixes
// ============================================================

export function suggestDataFixes(context: AiCopilotContext): CopilotToolResult {
  // Viewer role: block fix suggestions
  if (context.role === 'viewer') {
    return {
      toolName: 'suggestDataFixes',
      title: '數據修復建議',
      summary: 'Viewer 角色無法檢視修復建議。',
      facts: [],
      assumptions: [],
      inferences: [],
      recommendations: [],
      sourceReferences: [],
      confidence: 'blocked',
      caveats: ['Viewer 角色不具備檢視修復建議的權限'],
      data: { blocked: true },
    };
  }

  const dq = context.dataQualitySummary;
  const highIssues = dq.topIssues.filter(i => i.decisionImpact === 'high');

  const facts: string[] = [
    `資料品質問題總數: ${dq.issueCount}`,
    `高影響問題數: ${highIssues.length}`,
  ];

  const recommendations: string[] = [];
  const fixSuggestions: Array<{ issueId: string; domain: string; recommendation: string; draft: boolean }> = [];

  for (const issue of highIssues) {
    facts.push(`問題: ${issue.titleMessage.key} (domain: ${issue.domain}, severity: ${issue.severity})`);

    // Generate fix suggestion based on issue id pattern
    const suggestion = generateFixSuggestion(issue.id, issue.domain);
    if (suggestion) {
      recommendations.push(suggestion.recommendation);
      fixSuggestions.push(suggestion);
    }
  }

  if (highIssues.length === 0) {
    facts.push('無高影響問題');
    recommendations.push('數據品質良好，無需修復');
  }

  return {
    toolName: 'suggestDataFixes',
    title: '數據修復建議',
    summary: highIssues.length > 0
      ? `共 ${highIssues.length} 個高影響問題需要修復。以下建議均為草稿，需人工確認。`
      : '無高影響問題需要修復。',
    facts,
    assumptions: ['fix suggestion is based on standard patterns'],
    inferences: highIssues.length > 0
      ? ['修復高影響問題將提升資料信心分數']
      : ['資料品質已達標'],
    recommendations,
    sourceReferences: ['dataQuality + dataQualityRemediation'],
    confidence: dq.confidence,
    caveats: [
      '所有修復建議均為 DRAFT，需人工確認後才能生效',
      '不猜測缺失數據的具體值',
      ...(context.dataQualitySummary.confidence === 'low' ? ['信心等級較低，修復建議僅供參考'] : []),
    ],
    data: {
      fixSuggestions,
      highImpactCount: highIssues.length,
    },
  };
}

/**
 * Generate a fix suggestion for a given DQ issue.
 * Returns null if no deterministic suggestion can be made.
 */
function generateFixSuggestion(
  issueId: string,
  domain: string
): { issueId: string; domain: string; recommendation: string; draft: boolean } | null {
  if (issueId.startsWith('sku-missing-attr-')) {
    return {
      issueId,
      domain,
      recommendation: `SKU 缺少必要屬性，請在 Products 頁面補齊相關欄位（需用戶輸入，系統無法猜測）`,
      draft: true,
    };
  }
  if (issueId.startsWith('sku-zero-price-')) {
    return {
      issueId,
      domain,
      recommendation: `SKU 單價為 0，請在 Products 頁面設定正確的單價（需用戶輸入）`,
      draft: true,
    };
  }
  if (issueId.startsWith('forecast-orphan-sku-')) {
    return {
      issueId,
      domain,
      recommendation: `Forecast 引用了不存在的 SKU，請檢查 Products 頁面是否已建立該 SKU，或刪除孤立 Forecast`,
      draft: true,
    };
  }
  if (issueId === 'forecast-missing-capacity') {
    return {
      issueId,
      domain,
      recommendation: `Forecast 有需求但缺少容量配置，請在 Capacity 頁面新增對應月份的工廠容量`,
      draft: true,
    };
  }
  if (issueId === 'bu-demand-zero-capacity') {
    return {
      issueId,
      domain,
      recommendation: `BU 需求存在但 BU 容量為 0，請在 Parameters 頁面更新工廠配置`,
      draft: true,
    };
  }
  if (issueId.startsWith('missing-constant-twd-rate') || issueId.startsWith('missing-yearly-twd-rate')) {
    return {
      issueId,
      domain,
      recommendation: `缺少 TWD 匯率設定，請在 Parameters 頁面設定匯率（需用戶輸入）`,
      draft: true,
    };
  }
  if (issueId.startsWith('missing-constant-cny-rate') || issueId.startsWith('missing-yearly-cny-rate')) {
    return {
      issueId,
      domain,
      recommendation: `缺少 CNY 匯率設定，請在 Parameters 頁面設定匯率（需用戶輸入）`,
      draft: true,
    };
  }
  if (issueId.startsWith('forecast-partial-year-')) {
    return {
      issueId,
      domain,
      recommendation: `預測資料僅涵蓋部分月份，建議補齊完整年度的預測數據`,
      draft: true,
    };
  }
  if (issueId.startsWith('forecast-missing-bp-target-')) {
    return {
      issueId,
      domain,
      recommendation: `Forecast 存在但缺少 BP 目標，請在 Parameters 頁面設定對應年度的 BP 目標`,
      draft: true,
    };
  }
  // Default: navigation fix
  return {
    issueId,
    domain,
    recommendation: `問題 ${issueId} 需要手動檢查與修正`,
    draft: true,
  };
}

// ============================================================
// Tool 5: explainScenarioImpact
// ============================================================

export function explainScenarioImpact(context: AiCopilotContext): CopilotToolResult {
  const sc = context.scenarioSummary;

  if (sc === null) {
    return {
      toolName: 'explainScenarioImpact',
      title: '情境影響分析',
      summary: '目前沒有啟動的情境模擬。',
      facts: ['無活躍情境'],
      assumptions: [],
      inferences: [],
      recommendations: ['執行情境模擬以查看 what-if 分析結果', '考慮使用 buildLookAheadFocus 進行前瞻性分析'],
      sourceReferences: ['scenarioEngine'],
      confidence: 'medium',
      caveats: ['無活躍情境可供分析'],
      data: { isActive: false },
    };
  }

  const facts: string[] = [
    `情境是否啟動: ${sc.isActive}`,
    `預測量乘數: ${sc.multipliers.forecastVolume}`,
    `單價乘數: ${sc.multipliers.unitPrice}`,
    `Core 產能乘數: ${sc.multipliers.coreCapacity}`,
    `BU 產能乘數: ${sc.multipliers.buCapacity}`,
  ];

  // Interpret deltas
  if (sc.deltas.totalRevenueUsd.delta !== null) {
    const dir = sc.deltas.totalRevenueUsd.delta > 0 ? '增加' : '減少';
    facts.push(`營收變化: ${dir} ${Math.abs(sc.deltas.totalRevenueUsd.delta).toFixed(2)} USD`);
  }
  if (sc.deltas.shortageMonthCount.delta !== null) {
    const dir = sc.deltas.shortageMonthCount.delta > 0 ? '增加' : '減少';
    facts.push(`短缺月份變化: ${dir} ${Math.abs(sc.deltas.shortageMonthCount.delta)} 個月`);
  }
  if (sc.deltas.bpAttainmentPct.delta !== null) {
    const dir = sc.deltas.bpAttainmentPct.delta > 0 ? '提升' : '下降';
    facts.push(`BP 達成率變化: ${dir} ${Math.abs(sc.deltas.bpAttainmentPct.delta).toFixed(1)}%`);
  }

  const inferences: string[] = [];
  if (sc.multipliers.forecastVolume !== 1.0) {
    const pct = ((sc.multipliers.forecastVolume - 1) * 100).toFixed(0);
    inferences.push(`[Assumption] 預測量變動 ${pct}% 將等比例影響營收與產能需求`);
  }
  if (sc.multipliers.unitPrice !== 1.0) {
    const pct = ((sc.multipliers.unitPrice - 1) * 100).toFixed(0);
    inferences.push(`[Assumption] 單價變動 ${pct}% 將等比例影響營收，但不影響產能需求`);
  }
  if (sc.multipliers.coreCapacity !== 1.0) {
    const pct = ((sc.multipliers.coreCapacity - 1) * 100).toFixed(0);
    inferences.push(`[Assumption] Core 產能變動 ${pct}% 可能緩解或加劇 Core 瓶頸`);
  }
  if (sc.multipliers.buCapacity !== 1.0) {
    const pct = ((sc.multipliers.buCapacity - 1) * 100).toFixed(0);
    inferences.push(`[Assumption] BU 產能變動 ${pct}% 僅對多層 SKU 有效`);
  }

  return {
    toolName: 'explainScenarioImpact',
    title: '情境影響分析',
    summary: `情境已啟動。乘數: 預測量 ${sc.multipliers.forecastVolume}x, 單價 ${sc.multipliers.unitPrice}x, Core ${sc.multipliers.coreCapacity}x, BU ${sc.multipliers.buCapacity}x。`,
    facts,
    assumptions: ['scenario multipliers are user-defined'],
    inferences,
    recommendations: ['考慮使用 buildLookAheadFocus 進行更深入的前瞻性分析'],
    sourceReferences: ['scenarioEngine'],
    confidence: context.dataQualitySummary.confidence,
    caveats: [
      '情境模擬是確定性的唯讀重跑，不會修改任何數據',
      '情境結果為 what-if 預測，非確認的預測值',
    ],
    data: {
      isActive: sc.isActive,
      multipliers: sc.multipliers,
      deltas: sc.deltas,
    },
  };
}

// ============================================================
// Tool 6: buildLookAheadFocus
// ============================================================

export function buildLookAheadFocus(context: AiCopilotContext): CopilotToolResult {
  const cap = context.capacitySummary;

  // Identify the next 3-6 months of concern
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // Filter to future months with high utilization or shortage
  const futureMonths = cap.monthlySummaries.filter(m => m.month >= currentMonth);
  const concernMonths = futureMonths.filter(
    m => (m.coreUtilization !== null && m.coreUtilization > 0.85) ||
         (m.buUtilization !== null && m.buUtilization > 0.85) ||
         m.coreShortage > 0 ||
         m.buShortage > 0
  ).slice(0, 6);

  const facts: string[] = [
    `未來月份總數: ${futureMonths.length}`,
    `需關注月份數: ${concernMonths.length}`,
  ];

  for (const m of concernMonths) {
    const corePct = m.coreUtilization !== null ? `${(m.coreUtilization * 100).toFixed(1)}%` : 'N/A';
    const buPct = m.buUtilization !== null ? `${(m.buUtilization * 100).toFixed(1)}%` : 'N/A';
    const hasShortage = m.coreShortage > 0 || m.buShortage > 0;
    facts.push(`${m.month}: Core ${corePct}, BU ${buPct}, 瓶頸 ${m.bottleneck}${hasShortage ? ', 有短缺' : ''}`);
  }

  const inferences: string[] = [];
  if (concernMonths.length > 0) {
    const shortageCount = concernMonths.filter(m => m.coreShortage > 0 || m.buShortage > 0).length;
    const highUtilCount = concernMonths.length - shortageCount;
    if (shortageCount > 0) {
      inferences.push(`${shortageCount} 個月份預計出現產能短缺`);
    }
    if (highUtilCount > 0) {
      inferences.push(`${highUtilCount} 個月份利用率偏高，需密切監控`);
    }
    inferences.push('需要關注的月份集中在近期，建議提前準備');
  } else {
    inferences.push('未來月份產能充足，無需特別關注');
  }

  const recommendations: string[] = [];
  if (concernMonths.length > 0) {
    recommendations.push('考慮調整產能配置以應對未來風險月份');
    const shortageMonths = concernMonths.filter(m => m.coreShortage > 0 || m.buShortage > 0);
    if (shortageMonths.length > 0) {
      recommendations.push('優先處理有短缺的月份，考慮產能擴充或需求調配');
    }
    const coreBottleneckMonths = concernMonths.filter(m => m.bottleneck === 'Core');
    const buBottleneckMonths = concernMonths.filter(m => m.bottleneck === 'BU');
    if (coreBottleneckMonths.length > 0) {
      recommendations.push('Core 產能是主要瓶頸，考慮增加 Core 面板日產能');
    }
    if (buBottleneckMonths.length > 0) {
      recommendations.push('BU 產能是主要瓶頸，考慮增加 BU 面板日產能');
    }
  } else {
    recommendations.push('產能充裕，維持現有配置即可');
  }

  return {
    toolName: 'buildLookAheadFocus',
    title: '前瞻性焦點分析',
    summary: concernMonths.length > 0
      ? `未來 ${concernMonths.length} 個月份需要關注，其中部分月份存在產能風險。`
      : '未來月份產能充足，無需特別關注。',
    facts,
    assumptions: ['current capacity plan continues'],
    inferences,
    recommendations,
    sourceReferences: ['calculationEngine + analytics'],
    confidence: context.dataQualitySummary.confidence,
    caveats: context.dataQualitySummary.confidence === 'low'
      ? ['信心等級較低，前瞻性分析僅供參考']
      : [],
    data: {
      futureMonthCount: futureMonths.length,
      concernMonthCount: concernMonths.length,
      concernMonths: concernMonths.map(m => ({
        month: m.month,
        coreUtilization: m.coreUtilization,
        buUtilization: m.buUtilization,
        coreShortage: m.coreShortage,
        buShortage: m.buShortage,
        bottleneck: m.bottleneck,
      })),
    },
  };
}

// ============================================================
// Tool 7: explainWorkbenchOverview
// ============================================================

export function explainWorkbenchOverview(context: AiCopilotContext): CopilotToolResult {
  const dq = context.dataQualitySummary;
  const cap = context.capacitySummary;
  const bp = context.bpSummary;
  const risk = context.riskBriefSummary;
  const sc = context.scenarioSummary;

  // --- Derive workflow stage statuses from existing context ---

  // Products stage
  const productsReady = context.projectSummary.skuCount > 0;
  const hasHighDqIssues = dq.topIssues.some(i => i.decisionImpact === 'high');

  // Forecasts stage
  const forecastsReady = context.projectSummary.forecastMonthCount > 0;

  // Capacity stage
  const capacityReady = cap.monthlySummaries.length > 0;

  // BP Targets stage
  const bpReady = bp.yearly.length > 0;

  // Analysis stage
  const analysisReady = context.projectSummary.totalForecastPcs > 0;

  const stageStatuses = [
    { name: 'Products', ready: productsReady, blocked: !productsReady },
    { name: 'Forecasts', ready: forecastsReady, blocked: !forecastsReady },
    { name: 'Capacity', ready: capacityReady, blocked: !capacityReady },
    { name: 'BP Targets', ready: bpReady, blocked: !bpReady },
    { name: 'Analysis', ready: analysisReady, blocked: !analysisReady },
  ];

  const readyCount = stageStatuses.filter(s => s.ready).length;
  const blockedStages = stageStatuses.filter(s => s.blocked);

  // --- Compute top abnormalities ---

  // Shortage months
  const shortageMonths = cap.monthlySummaries.filter(
    m => m.coreShortage > 0 || m.buShortage > 0
  );

  // High utilization months (>90%)
  const highUtilMonths = cap.monthlySummaries.filter(
    m => (m.coreUtilization !== null && m.coreUtilization > 0.9) ||
         (m.buUtilization !== null && m.buUtilization > 0.9)
  );

  // BP miss years
  const bpMissYears = bp.yearly.filter(r => r.status === 'miss');
  const bpWatchYears = bp.yearly.filter(r => r.status === 'watch');

  // --- Compute look-ahead highlights ---
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const futureConcernMonths = cap.monthlySummaries.filter(
    m => m.month >= currentMonth &&
         ((m.coreUtilization !== null && m.coreUtilization > 0.85) ||
          (m.buUtilization !== null && m.buUtilization > 0.85) ||
          m.coreShortage > 0 ||
          m.buShortage > 0)
  ).slice(0, 6);

  // --- Build facts ---
  const facts: string[] = [
    `Workflow stages: ${readyCount}/${stageStatuses.length} ready`,
    `SKU count: ${context.projectSummary.skuCount}`,
    `Forecast months: ${context.projectSummary.forecastMonthCount}`,
    `Total revenue: ${context.projectSummary.totalRevenueUsd.toFixed(2)} USD`,
    `Shortage months: ${shortageMonths.length}`,
    `High utilization months (>90%): ${highUtilMonths.length}`,
    `BP miss years: ${bpMissYears.length}`,
    `BP watch years: ${bpWatchYears.length}`,
    `DQ confidence: ${dq.confidence} (score: ${dq.confidenceScore})`,
    `Top risk drivers: ${risk.topDrivers.length}`,
  ];

  if (cap.worstMonth) {
    facts.push(`Worst capacity month: ${cap.worstMonth}`);
  }
  if (bp.worstPeriod) {
    facts.push(`Worst BP period: ${bp.worstPeriod}`);
  }
  if (sc !== null && sc.isActive) {
    facts.push(`Scenario active: forecastVolume ${sc.multipliers.forecastVolume}x`);
  }

  // Blocked stages
  for (const stage of blockedStages) {
    facts.push(`Stage blocked: ${stage.name}`);
  }

  // Top abnormalities
  const criticalAbnormalities: string[] = [];
  if (hasHighDqIssues) {
    const highCount = dq.topIssues.filter(i => i.decisionImpact === 'high').length;
    criticalAbnormalities.push(`${highCount} high-impact data quality issues`);
  }
  if (shortageMonths.length > 0) {
    criticalAbnormalities.push(`${shortageMonths.length} month(s) with capacity shortage`);
  }
  if (bpMissYears.length > 0) {
    criticalAbnormalities.push(`BP target missed in ${bpMissYears.map(y => y.period).join(', ')}`);
  }

  for (const ab of criticalAbnormalities) {
    facts.push(`Abnormality: ${ab}`);
  }

  // Look-ahead highlights
  for (const m of futureConcernMonths.slice(0, 4)) {
    const corePct = m.coreUtilization !== null ? `${(m.coreUtilization * 100).toFixed(1)}%` : 'N/A';
    const buPct = m.buUtilization !== null ? `${(m.buUtilization * 100).toFixed(1)}%` : 'N/A';
    const hasShortage = m.coreShortage > 0 || m.buShortage > 0;
    facts.push(`Look-ahead ${m.month}: Core ${corePct}, BU ${buPct}${hasShortage ? ', SHORTAGE' : ''}`);
  }

  // --- Build inferences ---
  const inferences: string[] = [];

  if (blockedStages.length > 0) {
    inferences.push(`${blockedStages.length} workflow stage(s) are blocked: ${blockedStages.map(s => s.name).join(', ')}. Complete these stages to unlock full analysis.`);
  }

  if (readyCount === stageStatuses.length) {
    inferences.push('All workflow stages are ready. The workbench has complete data for full operational analysis.');
  }

  if (shortageMonths.length > 0) {
    inferences.push(`Capacity shortage is detected in ${shortageMonths.length} month(s), indicating a supply-demand imbalance.`);
  }

  if (bpMissYears.length > 0) {
    inferences.push(`${bpMissYears.length} year(s) have BP targets missed. Revenue forecast falls below business plan targets.`);
  }

  if (futureConcernMonths.length > 0) {
    inferences.push(`${futureConcernMonths.length} upcoming month(s) require attention due to high utilization or shortage.`);
  }

  if (dq.confidence === 'low' || dq.confidence === 'blocked') {
    inferences.push('Data quality confidence is low. Analysis results may not be reliable for decision-making.');
  }

  if (criticalAbnormalities.length === 0 && blockedStages.length === 0) {
    inferences.push('No critical abnormalities detected. Operations appear normal across all domains.');
  }

  // --- Build recommendations (viewer-safe: no actionable fix steps) ---
  const recommendations: string[] = [];

  if (blockedStages.length > 0) {
    recommendations.push('Address blocked workflow stages to enable full analysis capabilities.');
  }
  if (shortageMonths.length > 0) {
    recommendations.push('Review capacity plans for shortage months to understand supply constraints.');
  }
  if (bpMissYears.length > 0) {
    recommendations.push('Examine BP gap analysis for details on revenue shortfall.');
  }
  if (dq.confidence !== 'high') {
    recommendations.push('Improve data quality to increase analysis confidence.');
  }
  if (criticalAbnormalities.length === 0 && blockedStages.length === 0) {
    recommendations.push('Continue monitoring key metrics through the Dashboard and Results pages.');
  }

  // --- Confidence ---
  let confidence: 'high' | 'medium' | 'low' | 'blocked' = dq.confidence;
  if (blockedStages.length >= 3) {
    confidence = 'blocked';
  } else if (blockedStages.length > 0 && dq.confidence !== 'high') {
    confidence = 'low';
  }

  return {
    toolName: 'explainWorkbenchOverview',
    title: 'Workbench Overview',
    summary: `${readyCount}/${stageStatuses.length} stages ready. ${criticalAbnormalities.length} critical abnormalit(y/ies). ${shortageMonths.length} shortage month(s). ${futureConcernMonths.length} look-ahead concern(s).`,
    facts,
    assumptions: [
      'Workflow stage status is derived from data presence and data quality',
      'Abnormalities are classified by severity: critical > warning > info',
      'Look-ahead covers next 6 months with utilization > 85% or shortage',
    ],
    inferences,
    recommendations,
    sourceReferences: [
      'dataQuality module',
      'calculationEngine + analytics',
      'bpTargets module',
      'riskAttribution module',
    ],
    confidence,
    caveats: [
      'This is a summary view; use specific tools (data quality, capacity risk, BP gap) for deeper analysis',
      ...(dq.confidence === 'low' ? ['Data confidence is low; summary may be incomplete'] : []),
      ...(dq.confidence === 'blocked' ? ['Data confidence is blocked; most stages may be unreliable'] : []),
    ],
    data: {
      stageCount: stageStatuses.length,
      readyCount,
      blockedStageNames: blockedStages.map(s => s.name),
      abnormalityCount: criticalAbnormalities.length,
      shortageMonthCount: shortageMonths.length,
      highUtilMonthCount: highUtilMonths.length,
      bpMissYearCount: bpMissYears.length,
      lookAheadConcernCount: futureConcernMonths.length,
      scenarioActive: sc !== null && sc.isActive,
    },
  };
}

// ============================================================
// Tool 8: explainAbnormalityDetail
// ============================================================

export function explainAbnormalityDetail(context: AiCopilotContext): CopilotToolResult {
  const dq = context.dataQualitySummary;
  const cap = context.capacitySummary;
  const bp = context.bpSummary;
  const risk = context.riskBriefSummary;

  const isViewer = context.role === 'viewer';

  // Collect all abnormalities across domains
  const abnormalities: Array<{
    domain: string;
    title: string;
    severity: 'critical' | 'warning' | 'info';
    evidence: string;
    whyItMatters: string;
    investigationRoute: string;
  }> = [];

  // Data domain abnormalities
  for (const issue of dq.topIssues) {
    if (issue.decisionImpact === 'high') {
      abnormalities.push({
        domain: 'data',
        title: `${issue.titleMessage.key} (${issue.domain})`,
        severity: issue.severity === 'error' ? 'critical' : issue.severity === 'warning' ? 'warning' : 'info',
        evidence: `Domain: ${issue.domain}, Impact: ${issue.decisionImpact}`,
        whyItMatters: 'High-impact data issues distort analysis results and block reliable decision-making.',
        investigationRoute: '/products',
      });
    }
  }

  // Capacity domain abnormalities
  const shortageMonths = cap.monthlySummaries.filter(m => m.coreShortage > 0 || m.buShortage > 0);
  if (shortageMonths.length > 0) {
    abnormalities.push({
      domain: 'capacity',
      title: `Capacity shortage in ${shortageMonths.length} month(s)`,
      severity: 'critical',
      evidence: shortageMonths.map(m => `${m.month}: Core ${m.coreShortage.toFixed(0)}, BU ${m.buShortage.toFixed(0)}`).join('; '),
      whyItMatters: 'Capacity shortage means unfulfilled demand, risking revenue loss and customer dissatisfaction.',
      investigationRoute: '/capacity',
    });
  }

  const highUtilMonths = cap.monthlySummaries.filter(
    m => (m.coreUtilization !== null && m.coreUtilization > 0.9) ||
         (m.buUtilization !== null && m.buUtilization > 0.9)
  );
  if (highUtilMonths.length > 0) {
    abnormalities.push({
      domain: 'capacity',
      title: `High utilization (>90%) in ${highUtilMonths.length} month(s)`,
      severity: 'warning',
      evidence: highUtilMonths.slice(0, 3).map(m => {
        const core = m.coreUtilization !== null ? `${(m.coreUtilization * 100).toFixed(1)}%` : 'N/A';
        const bu = m.buUtilization !== null ? `${(m.buUtilization * 100).toFixed(1)}%` : 'N/A';
        return `${m.month}: Core ${core}, BU ${bu}`;
      }).join('; '),
      whyItMatters: 'High utilization leaves no buffer for demand variability, increasing shortage risk.',
      investigationRoute: '/capacity',
    });
  }

  // BP domain abnormalities
  const bpMissYears = bp.yearly.filter(r => r.status === 'miss');
  if (bpMissYears.length > 0) {
    abnormalities.push({
      domain: 'bp',
      title: `BP target missed in ${bpMissYears.map(y => y.period).join(', ')}`,
      severity: 'critical',
      evidence: bpMissYears.map(y => `${y.period}: attainment ${y.attainment !== null ? (y.attainment * 100).toFixed(1) : 'N/A'}%, gap ${y.gapMillionTwd?.toFixed(1) ?? 'N/A'}M TWD`).join('; '),
      whyItMatters: 'BP target miss signals potential revenue shortfall against business plan commitments.',
      investigationRoute: '/bp-targets',
    });
  }

  const bpWatchYears = bp.yearly.filter(r => r.status === 'watch');
  if (bpWatchYears.length > 0) {
    abnormalities.push({
      domain: 'bp',
      title: `BP target at risk in ${bpWatchYears.map(y => y.period).join(', ')}`,
      severity: 'warning',
      evidence: bpWatchYears.map(y => `${y.period}: attainment ${y.attainment !== null ? (y.attainment * 100).toFixed(1) : 'N/A'}%`).join('; '),
      whyItMatters: 'BP attainment below threshold requires monitoring to avoid a full miss.',
      investigationRoute: '/bp-targets',
    });
  }

  // Risk driver abnormalities
  for (const driver of risk.topDrivers.slice(0, 3)) {
    if (driver.severity === 'critical') {
      abnormalities.push({
        domain: driver.dimension,
        title: `Top risk driver: ${driver.label} (${driver.metric})`,
        severity: 'critical',
        evidence: `Value: ${driver.value}, Share: ${driver.share !== undefined ? (driver.share * 100).toFixed(1) + '%' : 'N/A'}, Periods: ${driver.affectedPeriods.join(', ')}`,
        whyItMatters: `This driver contributes significantly to capacity pressure during shortage periods.`,
        investigationRoute: '/results',
      });
    }
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  abnormalities.sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));

  const topAbnormalities = abnormalities.slice(0, 8);

  const facts: string[] = [
    `Total abnormalities detected: ${abnormalities.length}`,
    `Critical: ${abnormalities.filter(a => a.severity === 'critical').length}`,
    `Warning: ${abnormalities.filter(a => a.severity === 'warning').length}`,
  ];

  for (const ab of topAbnormalities) {
    facts.push(`[${ab.severity.toUpperCase()}][${ab.domain}] ${ab.title}`);
  }

  const inferences: string[] = [];
  const criticalCount = abnormalities.filter(a => a.severity === 'critical').length;
  if (criticalCount > 0) {
    inferences.push(`${criticalCount} critical abnormality(ies) require immediate investigation.`);
  }
  if (shortageMonths.length > 0) {
    inferences.push('Capacity shortage is the most urgent operational risk.');
  }
  if (bpMissYears.length > 0) {
    inferences.push('BP target misses indicate revenue forecast is below business plan.');
  }
  if (abnormalities.length === 0) {
    inferences.push('No abnormalities detected. Operations appear normal.');
  }

  const recommendations: string[] = [];
  if (!isViewer) {
    for (const ab of topAbnormalities.filter(a => a.severity === 'critical').slice(0, 3)) {
      recommendations.push(`Investigate: ${ab.title} (route: ${ab.investigationRoute})`);
    }
  }
  if (isViewer) {
    recommendations.push('Contact your workspace editor for actionable fix recommendations.');
  }
  if (abnormalities.length === 0) {
    recommendations.push('Continue monitoring key metrics through the Dashboard.');
  }

  return {
    toolName: 'explainAbnormalityDetail',
    title: 'Abnormality Intelligence Detail',
    summary: abnormalities.length > 0
      ? `${abnormalities.length} abnormality(ies) detected: ${criticalCount} critical, ${abnormalities.filter(a => a.severity === 'warning').length} warning.`
      : 'No abnormalities detected in current data.',
    facts,
    assumptions: [
      'Abnormality classification is based on data quality rules and threshold analysis',
      'Severity scoring uses data quality impact levels and utilization thresholds',
    ],
    inferences,
    recommendations,
    sourceReferences: [
      'dataQuality module',
      'calculationEngine + analytics',
      'bpTargets module',
      'riskAttribution module',
    ],
    confidence: dq.confidence,
    caveats: [
      'Abnormality detection is deterministic and threshold-based',
      ...(dq.confidence === 'low' ? ['Data confidence is low; some abnormalities may not be detected'] : []),
      ...(dq.confidence === 'blocked' ? ['Data confidence is blocked; abnormality detection is severely limited'] : []),
    ],
    data: {
      totalAbnormalities: abnormalities.length,
      criticalCount: abnormalities.filter(a => a.severity === 'critical').length,
      warningCount: abnormalities.filter(a => a.severity === 'warning').length,
      topAbnormalities: topAbnormalities.map(a => ({
        domain: a.domain,
        title: a.title,
        severity: a.severity,
        evidence: a.evidence,
        whyItMatters: a.whyItMatters,
      })),
    },
  };
}

// ============================================================
// Tool 9: explainScenarioV2Impact
// ============================================================

export function explainScenarioV2Impact(context: AiCopilotContext): CopilotToolResult {
  const sc = context.scenarioSummary;

  if (sc === null || !sc.isActive) {
    return {
      toolName: 'explainScenarioV2Impact',
      title: 'Operational Scenario V2 Impact',
      summary: 'No active operational scenario. Run a scenario from the workbench to see impact analysis.',
      facts: ['No active operational scenario'],
      assumptions: [],
      inferences: [],
      recommendations: [
        'Run an operational scenario from the workbench (BU Capacity Delay, Top Customer Down, or Forecast Surge)',
        'Use the Scenario Planning page for detailed what-if analysis',
      ],
      sourceReferences: ['operationalScenario module'],
      confidence: 'medium',
      caveats: ['No active scenario to analyze'],
      data: { isActive: false },
    };
  }

  const facts: string[] = [
    `Scenario is active: ${sc.isActive}`,
    `Forecast volume multiplier: ${sc.multipliers.forecastVolume}x`,
    `Unit price multiplier: ${sc.multipliers.unitPrice}x`,
    `Core capacity multiplier: ${sc.multipliers.coreCapacity}x`,
    `BU capacity multiplier: ${sc.multipliers.buCapacity}x`,
  ];

  // Revenue delta
  if (sc.deltas.totalRevenueUsd.delta !== null) {
    const dir = sc.deltas.totalRevenueUsd.delta > 0 ? 'increase' : 'decrease';
    facts.push(`Revenue ${dir}: ${Math.abs(sc.deltas.totalRevenueUsd.delta).toFixed(2)} USD`);
  }

  // Shortage delta
  if (sc.deltas.shortageMonthCount.delta !== null) {
    const dir = sc.deltas.shortageMonthCount.delta > 0 ? 'increase' : 'decrease';
    facts.push(`Shortage months ${dir}: ${Math.abs(sc.deltas.shortageMonthCount.delta)} month(s)`);
  }

  // BP delta
  if (sc.deltas.bpAttainmentPct.delta !== null) {
    const dir = sc.deltas.bpAttainmentPct.delta > 0 ? 'improvement' : 'decline';
    facts.push(`BP attainment ${dir}: ${Math.abs(sc.deltas.bpAttainmentPct.delta).toFixed(1)}pp`);
  }

  const inferences: string[] = [];

  // Scenario type inference
  if (sc.multipliers.coreCapacity !== 1.0 || sc.multipliers.buCapacity !== 1.0) {
    const coreShift = ((sc.multipliers.coreCapacity - 1) * 100).toFixed(0);
    const buShift = ((sc.multipliers.buCapacity - 1) * 100).toFixed(0);
    inferences.push(`[Assumption] This is a capacity shift scenario: Core ${coreShift}%, BU ${buShift}%. Capacity changes affect supply sufficiency.`);
  }

  if (sc.multipliers.forecastVolume !== 1.0) {
    const pct = ((sc.multipliers.forecastVolume - 1) * 100).toFixed(0);
    inferences.push(`[Assumption] Forecast volume change of ${pct}% will proportionally affect revenue and capacity demand.`);
  }

  if (sc.multipliers.unitPrice !== 1.0) {
    const pct = ((sc.multipliers.unitPrice - 1) * 100).toFixed(0);
    inferences.push(`[Assumption] Unit price change of ${pct}% will proportionally affect revenue but not capacity demand.`);
  }

  // Customer/SKU impact inference
  if (sc.deltas.totalRevenueUsd.delta !== null && sc.deltas.totalRevenueUsd.delta < 0) {
    inferences.push('Revenue decline scenario: review customer impact and identify mitigation strategies.');
  }

  if (sc.deltas.shortageMonthCount.delta !== null && sc.deltas.shortageMonthCount.delta > 0) {
    inferences.push('Shortage months increased: capacity constraints are tightening under this scenario.');
  }

  return {
    toolName: 'explainScenarioV2Impact',
    title: 'Operational Scenario V2 Impact',
    summary: `Scenario active with multipliers: Volume ${sc.multipliers.forecastVolume}x, Price ${sc.multipliers.unitPrice}x, Core ${sc.multipliers.coreCapacity}x, BU ${sc.multipliers.buCapacity}x.`,
    facts,
    assumptions: [
      'Scenario multipliers are user-defined what-if parameters',
      'Impact is computed by re-running calculation with transformed inputs',
    ],
    inferences,
    recommendations: [
      'Review customer and SKU impact breakdown for targeted mitigation',
      'Compare multiple scenarios to find optimal capacity allocation',
    ],
    sourceReferences: ['operationalScenario module', 'scenarioEngine module'],
    confidence: context.dataQualitySummary.confidence,
    caveats: [
      'This result is a what-if projection based on simplified assumptions',
      'Actual outcomes may differ due to supply chain dynamics, lead times, and other factors not captured in this model',
      'Customer/SKU impact is proportional attribution, not causal',
    ],
    data: {
      isActive: sc.isActive,
      multipliers: sc.multipliers,
      deltas: sc.deltas,
    },
  };
}

// ============================================================
// Tool 10: generateReportNarrative
// ============================================================

export function generateReportNarrative(context: AiCopilotContext): CopilotToolResult {
  const dq = context.dataQualitySummary;
  const cap = context.capacitySummary;
  const bp = context.bpSummary;
  const risk = context.riskBriefSummary;
  const sc = context.scenarioSummary;
  const proj = context.projectSummary;

  const facts: string[] = [
    `Total revenue: ${proj.totalRevenueUsd.toFixed(2)} USD`,
    `Total forecast: ${proj.totalForecastPcs.toFixed(0)} PCS`,
    `SKU count: ${proj.skuCount}`,
    `Forecast months: ${proj.forecastMonthCount}`,
    `Data confidence: ${dq.confidence} (score: ${dq.confidenceScore})`,
  ];

  // Executive summary paragraphs
  const paragraphs: string[] = [];
  const keyTakeaways: string[] = [];

  // Confidence paragraph
  paragraphs.push(
    `Based on ${dq.confidence} data confidence (score: ${dq.confidenceScore}/100), this report covers the current operational state. ${proj.skuCount} SKUs are tracked across ${proj.forecastMonthCount} forecast months with total revenue of ${proj.totalRevenueUsd.toFixed(2)} USD.`
  );

  // Top risk
  const shortageMonths = cap.monthlySummaries.filter(m => m.coreShortage > 0 || m.buShortage > 0);
  const bpMissYears = bp.yearly.filter(r => r.status === 'miss');
  const highImpactIssues = dq.topIssues.filter(i => i.decisionImpact === 'high');

  if (highImpactIssues.length > 0) {
    paragraphs.push(
      `${highImpactIssues.length} high-impact data quality issue(s) detected. These issues may distort analysis results and should be addressed before making critical decisions.`
    );
    keyTakeaways.push(`${highImpactIssues.length} DQ issue(s) need fixing before analysis can be fully trusted.`);
    facts.push(`High-impact DQ issues: ${highImpactIssues.length}`);
  }

  if (shortageMonths.length > 0) {
    paragraphs.push(
      `Capacity shortage detected in ${shortageMonths.length} upcoming month(s): ${shortageMonths.map(m => m.month).join(', ')}. Primary bottleneck is ${shortageMonths[0]?.bottleneck ?? 'unknown'}.`
    );
    keyTakeaways.push(`${shortageMonths.length} month(s) face capacity shortage.`);
    facts.push(`Shortage months: ${shortageMonths.length}`);
  } else {
    paragraphs.push('No capacity shortage detected in the look-ahead window.');
    keyTakeaways.push('No capacity shortage in look-ahead window.');
  }

  if (bpMissYears.length > 0) {
    const missDetails = bpMissYears.map(y =>
      `${y.period} (gap: ${y.gapMillionTwd?.toFixed(1) ?? 'N/A'}M TWD)`
    ).join(', ');
    paragraphs.push(
      `BP target miss detected in: ${missDetails}. Revenue forecast falls short of business plan targets.`
    );
    keyTakeaways.push(`BP target missed in ${bpMissYears.length} period(s).`);
    facts.push(`BP miss years: ${bpMissYears.length}`);
  } else if (bp.yearly.length > 0) {
    paragraphs.push('All BP targets are met or at watch level under current forecast.');
    keyTakeaways.push('BP targets are on track.');
  }

  if (sc !== null && sc.isActive && sc.deltas.totalRevenueUsd.delta !== null) {
    const dir = sc.deltas.totalRevenueUsd.delta >= 0 ? 'increase' : 'decrease';
    paragraphs.push(
      `Active scenario shows a ${dir} of ${Math.abs(sc.deltas.totalRevenueUsd.delta).toFixed(2)} USD in total revenue.`
    );
  }

  // Top risk drivers
  if (risk.topDrivers.length > 0) {
    const topDriver = risk.topDrivers[0];
    paragraphs.push(
      `Top risk driver: ${topDriver.label} (${topDriver.metric}), contributing ${topDriver.share !== undefined ? (topDriver.share * 100).toFixed(1) + '%' : 'significant'} of capacity pressure.`
    );
    keyTakeaways.push(`Focus: ${topDriver.label} is the primary risk driver.`);
    facts.push(`Top risk driver: ${topDriver.label}`);
  }

  // Recommended focus
  const recommendations: string[] = [];
  if (highImpactIssues.length > 0) {
    recommendations.push('Priority 1: Resolve high-impact data quality issues to improve analysis confidence.');
  }
  if (shortageMonths.length > 0) {
    recommendations.push(`Priority ${highImpactIssues.length > 0 ? '2' : '1'}: Address capacity shortage in ${shortageMonths[0]?.month ?? 'upcoming months'}.`);
  }
  if (bpMissYears.length > 0) {
    recommendations.push(`Priority 3: Review BP gap analysis for ${bpMissYears[0]?.period ?? 'missed periods'} and develop mitigation plan.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('Continue monitoring key metrics. No critical actions required.');
  }

  return {
    toolName: 'generateReportNarrative',
    title: 'Management Report Narrative',
    summary: `${paragraphs.length} sections generated. ${keyTakeaways.length} key takeaways identified. Data confidence: ${dq.confidence}.`,
    facts,
    assumptions: [
      'This is a deterministic narrative template — no external AI was used',
      'Numbers use fixed precision (1 decimal)',
      'Attribution is proportional, not causal',
    ],
    inferences: keyTakeaways,
    recommendations,
    sourceReferences: [
      'dataQuality module',
      'calculationEngine + analytics',
      'bpTargets module',
      'riskAttribution module',
    ],
    confidence: dq.confidence,
    caveats: [
      'This narrative is a deterministic template. No external AI was used. No causality claims are made.',
      'Numbers use fixed precision (1 decimal). All values are deterministic and reproducible.',
      ...(dq.confidence === 'low' ? ['Data confidence is LOW. Results may not be reliable for capital decisions.'] : []),
      ...(dq.confidence === 'blocked' ? ['Data confidence is BLOCKED. Most analysis is not meaningful.'] : []),
    ],
    data: {
      paragraphs,
      keyTakeaways,
      recommendedFocus: recommendations,
      dataConfidence: dq.confidence,
      scenarioActive: sc !== null && sc.isActive,
    },
  };
}

// ============================================================
// Keyword Router
// ============================================================

export function routeQuestion(question: string, context: AiCopilotContext): CopilotToolResult {
  const lower = question.toLowerCase();

  // Abnormality / anomaly — English + Traditional Chinese (must match before general "data")
  if (
    lower.includes('abnormality') ||
    lower.includes('anomaly') ||
    lower.includes('異常') ||
    lower.includes('異常分析')
  ) {
    return explainAbnormalityDetail(context);
  }

  // Data quality — English + Traditional Chinese
  if (
    lower.includes('data') ||
    lower.includes('quality') ||
    lower.includes('missing') ||
    lower.includes('dirty') ||
    lower.includes('problem') ||
    lower.includes('資料') ||
    lower.includes('品質') ||
    lower.includes('缺失') ||
    lower.includes('問題')
  ) {
    return inspectDataQuality(context);
  }

  // Capacity risk — English + Traditional Chinese
  if (
    lower.includes('capacity') ||
    lower.includes('shortage') ||
    lower.includes('utilization') ||
    lower.includes('bottleneck') ||
    lower.includes('產能') ||
    lower.includes('短缺') ||
    lower.includes('稼動') ||
    lower.includes('瓶頸')
  ) {
    return explainCapacityRisk(context);
  }

  // BP gap — English + Traditional Chinese
  if (
    lower.includes('bp') ||
    lower.includes('gap') ||
    lower.includes('attainment') ||
    lower.includes('target') ||
    lower.includes('差距') ||
    lower.includes('達成') ||
    lower.includes('目標')
  ) {
    return explainBpGap(context);
  }

  // Fix suggestions — English + Traditional Chinese
  if (
    lower.includes('fix') ||
    lower.includes('clean') ||
    lower.includes('repair') ||
    lower.includes('suggest') ||
    lower.includes('修復') ||
    lower.includes('建議') ||
    lower.includes('修正')
  ) {
    return suggestDataFixes(context);
  }

  // Report / management report — English + Traditional Chinese (must match before general "scenario")
  if (
    lower.includes('report') ||
    lower.includes('management report') ||
    lower.includes('報告') ||
    lower.includes('管理報告')
  ) {
    return generateReportNarrative(context);
  }

  // Scenario v2 / operational scenario — English + Traditional Chinese
  if (
    lower.includes('scenario v2') ||
    lower.includes('operational what-if') ||
    lower.includes('operational scenario') ||
    lower.includes('營運情境')
  ) {
    return explainScenarioV2Impact(context);
  }

  // Scenario impact (v1) — English + Traditional Chinese
  if (
    lower.includes('scenario') ||
    lower.includes('what if') ||
    lower.includes('multiplier') ||
    lower.includes('情境') ||
    lower.includes('假如') ||
    lower.includes('乘數')
  ) {
    return explainScenarioImpact(context);
  }

  // Look-ahead — English + Traditional Chinese
  if (
    lower.includes('look ahead') ||
    lower.includes('focus') ||
    lower.includes('upcoming') ||
    lower.includes('前瞻') ||
    lower.includes('焦點') ||
    lower.includes('未來')
  ) {
    return buildLookAheadFocus(context);
  }

  // Workbench overview — English + Traditional Chinese
  if (
    lower.includes('workbench') ||
    lower.includes('overview') ||
    lower.includes('operations summary') ||
    lower.includes('daily status') ||
    lower.includes('工作台') ||
    lower.includes('總覽') ||
    lower.includes('營運摘要') ||
    lower.includes('每日狀態')
  ) {
    return explainWorkbenchOverview(context);
  }

  // Default: unknown question — explain what data is needed
  return {
    toolName: 'unknown',
    title: '無法辨識問題',
    summary: '此問題需要外部 AI 分析。本地模式僅支援以下分析：資料品質、產能風險、BP 差距、修復建議、情境影響、前瞻分析、工作台總覽、異常詳情、情境 V2、報告敘述。請使用 Export Prompt Pack 將資料匯出後，貼到外部 AI 工具中提問。',
    facts: [],
    assumptions: [],
    inferences: [],
    recommendations: [
      '使用 Export Prompt Pack 功能匯出資料',
      '將匯出的 JSON 貼到 Claude / GPT / Gemini 等 AI 工具',
      '嘗試使用以下關鍵字：data quality、capacity risk、bp gap、fix、scenario、look ahead、workbench overview、abnormality、scenario v2、report',
    ],
    sourceReferences: [],
    confidence: 'blocked',
    caveats: [
      '本地模式無法回答此問題，需要外部 AI',
      '可回答的問題類型：資料品質 / 產能風險 / BP 差距 / 修復建議 / 情境影響 / 前瞻分析 / 工作台總覽 / 異常詳情 / 情境 V2 / 報告敘述',
    ],
    data: {},
  };
}

// ============================================================
// runTool — execute a tool by ID (used by quick buttons)
// ============================================================

export function runTool(
  toolId: string,
  context: AiCopilotContext
): CopilotToolResult {
  const toolMap: Record<string, (ctx: AiCopilotContext) => CopilotToolResult> = {
    dataProblems: inspectDataQuality,
    capacityRisk: explainCapacityRisk,
    bpGap: explainBpGap,
    suggestFixes: suggestDataFixes,
    scenarioImpact: explainScenarioImpact,
    lookAhead: buildLookAheadFocus,
    workbenchOverview: explainWorkbenchOverview,
    abnormalityDetail: explainAbnormalityDetail,
    scenarioV2: explainScenarioV2Impact,
    reportNarrative: generateReportNarrative,
  };
  const tool = toolMap[toolId];
  if (tool) return tool(context);
  return routeQuestion(toolId, context);
}
