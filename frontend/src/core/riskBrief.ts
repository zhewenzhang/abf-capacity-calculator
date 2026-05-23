import type { AnalysisContractPayload } from './analysisContract';
import type { DataQualitySummary, DataQualityIssue } from './dataQuality';
import type { RiskDriver, SkuHealthSignal } from './riskAttribution';
import type { LocalizedMessage } from '../i18n';

// ============================================================
// Types — Decision-Grade Risk Brief
// ============================================================

export type BriefSeverity = 'critical' | 'warning' | 'info' | 'positive';

export interface BriefStatement {
  id: string;
  severity: BriefSeverity;
  /** Legacy English title — kept for backward compatibility and tests. UI should prefer titleMessage. */
  title: string;
  /** Legacy English detail — kept for backward compatibility and tests. UI should prefer detailMessage. */
  detail: string;
  /** i18n-aware title. UI renders via t(titleMessage). */
  titleMessage: LocalizedMessage;
  /** i18n-aware detail. UI renders via t(detailMessage). */
  detailMessage: LocalizedMessage;
  evidence?: Record<string, string | number | null>;
}

export type DriverMetric = 'revenue' | 'coreDemand' | 'buDemand' | 'shortageExposure' | 'bpGap';

export interface DriverItem {
  label: string;
  value: number;
  share?: number; // 0-100 percentage of group total
  /** Legacy English reason. UI should prefer reasonMessage. */
  reason: string;
  reasonMessage: LocalizedMessage;
}

export interface DriverGroup {
  /** Legacy English title. UI should prefer titleMessage. */
  title: string;
  titleMessage: LocalizedMessage;
  metric: DriverMetric;
  items: DriverItem[];
}

export interface RiskPeriodEntry {
  period: string;
  /** Legacy English reason. UI should prefer reasonMessage. */
  reason: string;
  reasonMessage: LocalizedMessage;
  bottleneck: 'Core' | 'BU' | 'None';
  severity: 'red' | 'orange' | 'green';
  score: number;
}

export interface RiskBrief {
  generatedAt: string;
  confidence: DataQualitySummary['confidence'];
  /** Legacy English explanation. UI should prefer confidenceExplanationMessage. */
  confidenceExplanation: string;
  confidenceExplanationMessage: LocalizedMessage;
  /** Legacy English summary lines. UI should prefer executiveSummaryMessages. */
  executiveSummary: string[];
  executiveSummaryMessages: LocalizedMessage[];
  facts: BriefStatement[];
  topRiskPeriods: RiskPeriodEntry[];
  drivers: DriverGroup[];
  attributionDrivers: RiskDriver[];
  shortageMonths: string[];
  skuHealthSignals: SkuHealthSignal[];
  assumptions: BriefStatement[];
  dataCaveats: {
    total: number;
    top: DataQualityIssue[];
  };
  bpRisk?: {
    worstPeriod: string | null;
    attainment: number | null;
    gapMillionTwd: number | null;
    statement: BriefStatement | null;
  };
  roleAttention: {
    /** Legacy English action lines. UI should prefer the *Messages variants. */
    sales: string[];
    productPlanning: string[];
    capacity: string[];
    executive: string[];
    salesMessages: LocalizedMessage[];
    productPlanningMessages: LocalizedMessage[];
    capacityMessages: LocalizedMessage[];
    executiveMessages: LocalizedMessage[];
  };
}

// ============================================================
// Constants
// ============================================================

const MAX_CAVEATS_DISPLAY = 5;

// ============================================================
// Helpers
// ============================================================

function safeShare(value: number, total: number): number | undefined {
  if (total <= 0) return undefined;
  return Math.round((value / total) * 1000) / 10;
}

function msg(key: string, params?: Record<string, string | number>): LocalizedMessage {
  return params ? { key, params } : { key };
}

// ============================================================
// Top Risk Periods — calibrated scoring
// ============================================================

interface RiskPeriodRaw {
  period: string;
  coreUtil: number | null;
  buUtil: number | null;
  shortageMonths: string[];
  bpGap: number | null;
}

function scoreRiskPeriod(rp: RiskPeriodRaw): number {
  let score = 0;
  const coreUtil = rp.coreUtil ?? 0;
  const buUtil = rp.buUtil ?? 0;

  score += rp.shortageMonths.length * 100;

  if (coreUtil > 1.0) score += 50;
  if (buUtil > 1.0) score += 50;

  if (coreUtil >= 0.85 && coreUtil <= 1.0) score += 20;
  if (buUtil >= 0.85 && buUtil <= 1.0) score += 20;

  if (rp.bpGap !== null && rp.bpGap < 0) score += Math.min(Math.abs(rp.bpGap) * 0.5, 30);

  return score;
}

// ============================================================
// Driver extraction helpers
// ============================================================

interface MatrixRow {
  label: string;
  values: Record<string, number>;
}

function extractTopDrivers(
  rows: MatrixRow[],
  limit: number = 5
): Array<{ label: string; value: number }> {
  return rows
    .map((row) => {
      const total = Object.values(row.values).reduce((s, v) => s + v, 0);
      return { label: row.label, value: total };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function totalOfGroup(rows: MatrixRow[]): number {
  return rows.reduce((sum, row) => {
    return sum + Object.values(row.values).reduce((s, v) => s + v, 0);
  }, 0);
}

// ============================================================
// Main builder
// ============================================================

export function buildRiskBrief(payload: AnalysisContractPayload): RiskBrief {
  const { summary, yearlyHealth, bpAnalysis, matrices, quality } = payload;
  const facts: BriefStatement[] = [];
  const drivers: DriverGroup[] = [];
  const assumptions: BriefStatement[] = [];
  const salesAttention: string[] = [];
  const planningAttention: string[] = [];
  const capacityAttention: string[] = [];
  const execAttention: string[] = [];
  const salesAttentionMsgs: LocalizedMessage[] = [];
  const planningAttentionMsgs: LocalizedMessage[] = [];
  const capacityAttentionMsgs: LocalizedMessage[] = [];
  const execAttentionMsgs: LocalizedMessage[] = [];

  // --- Empty / Blocked state ---
  if (quality.confidence === 'blocked' || yearlyHealth.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      confidence: quality.confidence,
      confidenceExplanation: 'No active data loaded. Please import products and monthly forecasts.',
      confidenceExplanationMessage: msg('riskBrief.empty.confidenceExplanation'),
      executiveSummary: ['No active data loaded. Please import products and monthly forecasts to generate analysis.'],
      executiveSummaryMessages: [msg('riskBrief.empty.executiveSummary')],
      facts: [],
      topRiskPeriods: [],
      drivers: [],
      attributionDrivers: [],
      shortageMonths: [],
      skuHealthSignals: [],
      assumptions: [],
      dataCaveats: { total: quality.issues.length, top: quality.issues.slice(0, MAX_CAVEATS_DISPLAY) },
      roleAttention: {
        sales: ['Import monthly forecasting to view customer demand risk.'],
        productPlanning: ['Input SKU specifications to identify sizing constraints.'],
        capacity: ['Verify factory capacity configuration for target years.'],
        executive: ['Awaiting core database initialization.'],
        salesMessages: [msg('riskBrief.empty.sales')],
        productPlanningMessages: [msg('riskBrief.empty.productPlanning')],
        capacityMessages: [msg('riskBrief.empty.capacity')],
        executiveMessages: [msg('riskBrief.empty.executive')],
      },
    };
  }

  // ============================================================
  // 1. Facts — what the system determined
  // ============================================================

  const primaryBottleneck = computePrimaryBottleneck(yearlyHealth);

  const revenueStr = summary.totalRevenueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const pcsStr = summary.totalForecastPcs.toLocaleString();
  facts.push({
    id: 'fact-revenue',
    severity: 'positive',
    title: 'Total Forecast Revenue',
    detail: `${revenueStr} USD across ${pcsStr} PCS.`,
    titleMessage: msg('riskBrief.fact.revenue.title'),
    detailMessage: msg('riskBrief.fact.revenue.detail', { revenue: revenueStr, pcs: pcsStr }),
    evidence: { totalRevenueUsd: summary.totalRevenueUsd, totalForecastPcs: summary.totalForecastPcs },
  });

  if (primaryBottleneck !== 'None') {
    const maxCoreUtil = Math.max(...yearlyHealth.map((y) => y.coreUtil ?? 0));
    const maxBuUtil = Math.max(...yearlyHealth.map((y) => y.buUtil ?? 0));
    const maxUtil = primaryBottleneck === 'Core' ? maxCoreUtil : maxBuUtil;
    const peakPct = (maxUtil * 100).toFixed(1);
    facts.push({
      id: 'fact-bottleneck',
      severity: 'critical',
      title: `Structural Bottleneck: ${primaryBottleneck}`,
      detail: `${primaryBottleneck} utilization peaks at ${peakPct}%. Capacity cannot meet forecast demand in some periods.`,
      titleMessage: msg('riskBrief.fact.bottleneck.title', { bottleneck: primaryBottleneck }),
      detailMessage: msg('riskBrief.fact.bottleneck.detail', { bottleneck: primaryBottleneck, peakPct }),
      evidence: { bottleneck: primaryBottleneck, peakUtilization: maxUtil },
    });
  } else {
    facts.push({
      id: 'fact-no-bottleneck',
      severity: 'positive',
      title: 'No Structural Bottleneck',
      detail: 'Both Core and BU capacity are sufficient for all forecast periods.',
      titleMessage: msg('riskBrief.fact.noBottleneck.title'),
      detailMessage: msg('riskBrief.fact.noBottleneck.detail'),
    });
  }

  if (summary.shortageMonthCount > 0) {
    const worstMonth = summary.worstBottleneckMonth ?? 'N/A';
    facts.push({
      id: 'fact-shortage',
      severity: 'critical',
      title: `${summary.shortageMonthCount} Shortage Month(s) Detected`,
      detail: `Unfulfilled demand concentrated around ${worstMonth}.`,
      titleMessage: msg('riskBrief.fact.shortage.title', { count: summary.shortageMonthCount }),
      detailMessage: msg('riskBrief.fact.shortage.detail', { month: worstMonth }),
      evidence: { shortageMonthCount: summary.shortageMonthCount, worstMonth: summary.worstBottleneckMonth },
    });
  }

  // ============================================================
  // 2. Top Risk Periods — calibrated scoring
  // ============================================================

  const bpGapByYear = new Map<string, number>();
  if (bpAnalysis && bpAnalysis.yearly.length > 0) {
    for (const r of bpAnalysis.yearly) {
      if (r.gapMillionTwd !== null) {
        bpGapByYear.set(r.period, r.gapMillionTwd);
      }
    }
  }

  const rawPeriods: RiskPeriodRaw[] = yearlyHealth.map((y) => ({
    period: y.year,
    coreUtil: y.coreUtil,
    buUtil: y.buUtil,
    shortageMonths: y.shortageMonths,
    bpGap: bpGapByYear.get(y.year) ?? null,
  }));

  const topRiskPeriods: RiskPeriodEntry[] = [];

  for (const rp of rawPeriods) {
    const coreUtil = rp.coreUtil ?? 0;
    const buUtil = rp.buUtil ?? 0;
    const bn: 'Core' | 'BU' | 'None' = (coreUtil > 0 || buUtil > 0) ? (coreUtil >= buUtil ? 'Core' : 'BU') : 'None';

    let severity: 'red' | 'orange' | 'green' = 'green';
    let reason = '';
    let reasonMessage: LocalizedMessage = msg('common.none');

    const corePct = (coreUtil * 100).toFixed(0);
    const buPct = (buUtil * 100).toFixed(0);

    if (rp.shortageMonths.length > 0 || coreUtil > 1.0 || buUtil > 1.0) {
      severity = 'red';
      reason = `Capacity exceeded: Core ${corePct}%, BU ${buPct}%. ${rp.shortageMonths.length} shortage month(s).`;
      reasonMessage = msg('riskBrief.period.reasonRed', { corePct, buPct, months: rp.shortageMonths.length });
    } else if (coreUtil >= 0.85 || buUtil >= 0.85) {
      severity = 'orange';
      reason = `Warning threshold: Core ${corePct}%, BU ${buPct}%.`;
      reasonMessage = msg('riskBrief.period.reasonOrange', { corePct, buPct });
    }

    if (severity !== 'green') {
      const score = scoreRiskPeriod(rp);
      topRiskPeriods.push({ period: rp.period, reason, reasonMessage, bottleneck: bn, severity, score });
    }
  }

  topRiskPeriods.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.period.localeCompare(b.period);
  });

  // ============================================================
  // 3. Drivers
  // ============================================================

  function makeDriverItem(label: string, value: number, total: number, reasonKey: string, zeroKey: string): DriverItem {
    const share = safeShare(value, total);
    if (value > 0) {
      const shareStr = share !== undefined ? share.toFixed(1) : '-';
      return {
        label,
        value,
        share,
        reason: `Contributes ${shareStr}% of total forecast revenue.`, // overwritten per group below
        reasonMessage: msg(reasonKey, { share: shareStr }),
      };
    }
    return {
      label,
      value,
      share,
      reason: 'No contribution.',
      reasonMessage: msg(zeroKey),
    };
  }

  // 3a. Revenue
  const topCustomers = extractTopDrivers(matrices.revenueByCustomer, 5);
  const totalRevenue = totalOfGroup(matrices.revenueByCustomer);
  const revenueDrivers: DriverGroup = {
    title: 'Revenue Drivers',
    titleMessage: msg('riskBrief.driver.revenueTitle'),
    metric: 'revenue',
    items: topCustomers.map((c) => {
      const item = makeDriverItem(c.label, c.value, totalRevenue, 'riskBrief.driver.revenueReason', 'riskBrief.driver.revenueZero');
      const shareStr = item.share !== undefined ? item.share.toFixed(1) : '-';
      item.reason = c.value > 0 ? `Contributes ${shareStr}% of total forecast revenue.` : 'No revenue contribution.';
      return item;
    }),
  };
  drivers.push(revenueDrivers);

  // 3b. Core
  const topCoreSizes = extractTopDrivers(matrices.coreDemandBySize, 5);
  const totalCoreDemand = totalOfGroup(matrices.coreDemandBySize);
  const coreDrivers: DriverGroup = {
    title: 'Core Capacity Pressure',
    titleMessage: msg('riskBrief.driver.coreTitle'),
    metric: 'coreDemand',
    items: topCoreSizes.map((s) => {
      const item = makeDriverItem(s.label, s.value, totalCoreDemand, 'riskBrief.driver.coreReason', 'riskBrief.driver.coreZero');
      const shareStr = item.share !== undefined ? item.share.toFixed(1) : '-';
      item.reason = s.value > 0 ? `Drives ${shareStr}% of Core panel demand.` : 'No Core demand.';
      return item;
    }),
  };
  drivers.push(coreDrivers);

  // 3c. BU
  const topBuSizes = extractTopDrivers(matrices.buDemandBySize, 5);
  const totalBuDemand = totalOfGroup(matrices.buDemandBySize);
  const buDrivers: DriverGroup = {
    title: 'BU Capacity Pressure',
    titleMessage: msg('riskBrief.driver.buTitle'),
    metric: 'buDemand',
    items: topBuSizes.map((s) => {
      const item = makeDriverItem(s.label, s.value, totalBuDemand, 'riskBrief.driver.buReason', 'riskBrief.driver.buZero');
      const shareStr = item.share !== undefined ? item.share.toFixed(1) : '-';
      item.reason = s.value > 0 ? `Drives ${shareStr}% of BU panel demand.` : 'No BU demand.';
      return item;
    }),
  };
  drivers.push(buDrivers);

  // 3d. Shortage exposure
  if (summary.shortageMonthCount > 0) {
    const topShortageSizes = extractTopDrivers(matrices.coreDemandBySize, 5);
    const totalShortage = totalOfGroup(matrices.coreDemandBySize);
    const shortageDrivers: DriverGroup = {
      title: 'Shortage Exposure',
      titleMessage: msg('riskBrief.driver.shortageTitle'),
      metric: 'shortageExposure',
      items: topShortageSizes.slice(0, 3).map((s) => {
        const share = safeShare(s.value, totalShortage);
        return {
          label: s.label,
          value: s.value,
          share,
          reason: s.value > 0 ? 'Highest Core demand during shortage periods.' : 'No exposure.',
          reasonMessage: s.value > 0 ? msg('riskBrief.driver.shortageReason') : msg('riskBrief.driver.shortageZero'),
        };
      }),
    };
    drivers.push(shortageDrivers);
  }

  // 3e. BP risk
  if (bpAnalysis && bpAnalysis.yearly.length > 0) {
    const bpMissYears = bpAnalysis.yearly.filter((r) => r.status === 'miss' || r.status === 'watch');
    if (bpMissYears.length > 0) {
      const bpDrivers: DriverGroup = {
        title: 'BP Risk',
        titleMessage: msg('riskBrief.driver.bpTitle'),
        metric: 'bpGap',
        items: bpMissYears.map((r) => {
          const attainment = (r.attainment !== null ? r.attainment * 100 : 0).toFixed(1);
          const gap = (r.gapMillionTwd ?? 0).toFixed(1);
          return {
            label: r.period,
            value: Math.abs(r.gapMillionTwd ?? 0),
            share: undefined,
            reason: `BP attainment ${attainment}%. Gap: ${gap}M TWD.`,
            reasonMessage: msg('riskBrief.driver.bpReason', { attainment, gap }),
          };
        }),
      };
      drivers.push(bpDrivers);
    }
  }

  // ============================================================
  // 4. Executive Summary
  // ============================================================

  const executiveSummary: string[] = [];
  const executiveSummaryMessages: LocalizedMessage[] = [];

  if (topRiskPeriods.length > 0) {
    const worst = topRiskPeriods[0];
    executiveSummary.push(`${worst.period} is the highest risk period: ${worst.reason}`);
    executiveSummaryMessages.push(
      msg('riskBrief.exec.highestRisk', { period: worst.period, reason: worst.reason })
    );
  }

  if (primaryBottleneck !== 'None') {
    const maxCoreUtil = Math.max(...yearlyHealth.map((y) => y.coreUtil ?? 0));
    const maxBuUtil = Math.max(...yearlyHealth.map((y) => y.buUtil ?? 0));
    const maxUtil = primaryBottleneck === 'Core' ? maxCoreUtil : maxBuUtil;
    const peakPct = (maxUtil * 100).toFixed(1);
    executiveSummary.push(`Primary bottleneck is ${primaryBottleneck}, peaking at ${peakPct}% utilization.`);
    executiveSummaryMessages.push(msg('riskBrief.exec.bottleneck', { bottleneck: primaryBottleneck, peakPct }));
  } else {
    executiveSummary.push('Capacity is stable; no structural Core or BU bottlenecks detected.');
    executiveSummaryMessages.push(msg('riskBrief.exec.noBottleneck'));
  }

  if (revenueDrivers.items.length > 0) {
    const top = revenueDrivers.items[0];
    if (top.share !== undefined) {
      const shareStr = top.share.toFixed(1);
      executiveSummary.push(`Top revenue driver is ${top.label} (${shareStr}% share).`);
      executiveSummaryMessages.push(msg('riskBrief.exec.topRevenue', { label: top.label, share: shareStr }));
    } else {
      executiveSummary.push(`Top revenue driver is ${top.label}.`);
      executiveSummaryMessages.push(msg('riskBrief.exec.topRevenueNoShare', { label: top.label }));
    }
  }

  if (bpAnalysis && bpAnalysis.yearly.length > 0) {
    const missYears = bpAnalysis.yearly.filter((r) => r.status === 'miss');
    if (missYears.length > 0) {
      const worst = missYears.reduce((a, b) => (a.gapMillionTwd ?? 0) < (b.gapMillionTwd ?? 0) ? a : b);
      const attainment = (worst.attainment !== null ? worst.attainment * 100 : 0).toFixed(1);
      const gap = Math.abs(worst.gapMillionTwd ?? 0).toFixed(1);
      executiveSummary.push(`BP target miss in ${worst.period}: attainment ${attainment}%, gap ${gap}M TWD.`);
      executiveSummaryMessages.push(msg('riskBrief.exec.bpMiss', { period: worst.period, attainment, gap }));
    } else {
      const hasTargets = bpAnalysis.yearly.some((r) => r.targetMillionTwd && r.targetMillionTwd > 0);
      if (hasTargets) {
        executiveSummary.push('All BP targets are met under current forecast.');
        executiveSummaryMessages.push(msg('riskBrief.exec.bpAllMet'));
      }
    }
  }

  const confLevel = quality.confidence.toUpperCase();
  const errorCount = quality.issues.filter((i) => i.severity === 'error').length;
  if (errorCount > 0) {
    executiveSummary.push(`Data confidence: ${confLevel}. ${errorCount} error(s) found.`);
    executiveSummaryMessages.push(msg('riskBrief.exec.confidenceWithErrors', { level: confLevel, errors: errorCount }));
  } else {
    executiveSummary.push(`Data confidence: ${confLevel}.`);
    executiveSummaryMessages.push(msg('riskBrief.exec.confidence', { level: confLevel }));
  }

  // ============================================================
  // 5. Confidence Explanation
  // ============================================================

  const { english: confidenceExplanation, message: confidenceExplanationMessage } = buildConfidenceExplanation(quality);

  // ============================================================
  // 6. Data Caveats
  // ============================================================

  const nonInfoIssues = quality.issues.filter((i) => i.severity !== 'info');
  const dataCaveats = {
    total: quality.issues.length,
    top: nonInfoIssues.length > 0 ? nonInfoIssues.slice(0, MAX_CAVEATS_DISPLAY) : quality.issues.slice(0, MAX_CAVEATS_DISPLAY),
  };

  // ============================================================
  // 7. Assumptions
  // ============================================================

  const workingDays = payload.assumptions.find((a) => a.includes('Working days'))?.match(/\d+/)?.[0] ?? '28';

  assumptions.push({
    id: 'assump-bp-allocation',
    severity: 'info',
    title: 'BP Target Allocation',
    detail: 'Yearly BP targets are evenly allocated to quarters (annual / 4) and months (annual / 12).',
    titleMessage: msg('riskBrief.assumption.bpAllocation.title'),
    detailMessage: msg('riskBrief.assumption.bpAllocation.detail'),
  });

  assumptions.push({
    id: 'assump-working-days',
    severity: 'info',
    title: 'Fixed Working Days',
    detail: `Working days are fixed across all months (${workingDays} days/month).`,
    titleMessage: msg('riskBrief.assumption.workingDays.title'),
    detailMessage: msg('riskBrief.assumption.workingDays.detail', { days: workingDays }),
  });

  assumptions.push({
    id: 'assump-revenue-usd',
    severity: 'info',
    title: 'Revenue Normalized to USD',
    detail: 'Revenue is calculated from normalized USD unit price. Product/Forecast source price may be USD/TWD/CNY but calculation revenue is USD.',
    titleMessage: msg('riskBrief.assumption.revenueUsd.title'),
    detailMessage: msg('riskBrief.assumption.revenueUsd.detail'),
  });

  assumptions.push({
    id: 'assump-bp-twd',
    severity: 'info',
    title: 'BP Target in Million TWD',
    detail: 'BP target remains in million TWD. USD revenue is converted to TWD before BP comparison.',
    titleMessage: msg('riskBrief.assumption.bpTwd.title'),
    detailMessage: msg('riskBrief.assumption.bpTwd.detail'),
  });

  assumptions.push({
    id: 'assump-core-steps',
    severity: 'info',
    title: 'Core Steps Fixed',
    detail: 'Core steps are fixed to 1 step for all layer count SKUs.',
    titleMessage: msg('riskBrief.assumption.coreSteps.title'),
    detailMessage: msg('riskBrief.assumption.coreSteps.detail'),
  });

  // ============================================================
  // 8. BP Risk
  // ============================================================

  let bpWorstPeriod: string | null = null;
  let bpWorstAttainment: number | null = null;
  let bpWorstGap: number | null = null;
  let bpStatement: BriefStatement | null = null;

  if (bpAnalysis && bpAnalysis.yearly.length > 0) {
    for (const r of bpAnalysis.yearly) {
      if (r.attainment !== null && r.attainment < 1.0) {
        if (bpWorstAttainment === null || r.attainment < bpWorstAttainment) {
          bpWorstAttainment = r.attainment;
          bpWorstPeriod = r.period;
          bpWorstGap = r.gapMillionTwd;
        }
      }
    }

    if (bpWorstPeriod) {
      const attainment = (bpWorstAttainment! * 100).toFixed(1);
      const gap = Math.abs(bpWorstGap!).toFixed(1);
      bpStatement = {
        id: 'bp-risk',
        severity: 'warning',
        title: `BP Target Miss in ${bpWorstPeriod}`,
        detail: `Attainment: ${attainment}%. Gap: ${gap}M TWD.`,
        titleMessage: msg('riskBrief.bp.title', { period: bpWorstPeriod }),
        detailMessage: msg('riskBrief.bp.detail', { attainment, gap }),
        evidence: { period: bpWorstPeriod, attainment: bpWorstAttainment, gapMillionTwd: bpWorstGap },
      };
    }
  }

  // ============================================================
  // 9. Role-Based Attention
  // ============================================================

  const attribution = payload.riskAttribution;
  const attributionDrivers = attribution.drivers;
  const skuHealthSignals = attribution.skuHealthSignals;
  const shortageMonths = attribution.shortageMonths;

  // Sales
  if (revenueDrivers.items.length > 0) {
    const top = revenueDrivers.items[0];
    if (top.share !== undefined) {
      const shareStr = top.share.toFixed(0);
      salesAttention.push(`Major revenue driver [${top.label}] contributes ${shareStr}% share. Secure their allocation planning immediately.`);
      salesAttentionMsgs.push(msg('riskBrief.role.sales.topDriver', { label: top.label, share: shareStr }));
    } else {
      salesAttention.push(`Major revenue driver [${top.label}] contributes significant share. Secure their allocation planning immediately.`);
      salesAttentionMsgs.push(msg('riskBrief.role.sales.topDriverNoShare', { label: top.label }));
    }
  }
  const shortageCustomerDrivers = attributionDrivers.filter((d) => d.dimension === 'customer' && (d.metric === 'shortageCoreDemand' || d.metric === 'shortageBuDemand'));
  if (shortageCustomerDrivers.length > 0) {
    const top = shortageCustomerDrivers[0];
    const shareStr = top.share !== undefined ? top.share.toFixed(1) : 'significant';
    const kind = top.metric === 'shortageCoreDemand' ? 'Core' : 'BU';
    salesAttention.push(`During shortage months, [${top.label}] drives ${shareStr}% of ${kind} pressure. Validate forecast accuracy and confirm pricing.`);
    salesAttentionMsgs.push(msg('riskBrief.role.sales.shortageCustomer', { label: top.label, share: shareStr, kind }));
  }
  if (summary.shortageMonthCount > 0) {
    salesAttention.push(`Review SKU delivery schedules during ${summary.shortageMonthCount} critical shortage months to mitigate customer complaint and contract risk.`);
    salesAttentionMsgs.push(msg('riskBrief.role.sales.reviewSchedules', { count: summary.shortageMonthCount }));
  } else {
    salesAttention.push('Normal customer order pipeline; no unfulfilled demand issues forecasted.');
    salesAttentionMsgs.push(msg('riskBrief.role.sales.normal'));
  }

  // Product Planning
  const lowValue = skuHealthSignals.filter((s) => s.classification === 'lowValueHighLoad');
  const drainers = skuHealthSignals.filter((s) => s.classification === 'capacityDrainer');
  if (lowValue.length > 0) {
    const skus = lowValue.slice(0, 3).map((s) => s.skuCode).join(', ');
    planningAttention.push(`Low-value-high-load SKU(s): ${skus}. Re-price or reduce capacity allocation.`);
    planningAttentionMsgs.push(msg('riskBrief.role.planning.lowValue', { skus }));
  }
  if (drainers.length > 0) {
    const skus = drainers.slice(0, 3).map((s) => s.skuCode).join(', ');
    planningAttention.push(`Capacity drainer SKU(s): ${skus}. Consume scarce capacity beyond their revenue share.`);
    planningAttentionMsgs.push(msg('riskBrief.role.planning.drainer', { skus }));
  }
  const topSkus = extractTopDrivers(matrices.revenueBySku, 3);
  if (topSkus.length > 0 && lowValue.length === 0 && drainers.length === 0) {
    const label = topSkus[0].label.split(' / ')[0];
    planningAttention.push(`Main demand SKU [${label}] consumes substantial panel resources. Monitor yield stability.`);
    planningAttentionMsgs.push(msg('riskBrief.role.planning.topSku', { label }));
  }
  if (planningAttention.length === 0) {
    planningAttention.push('Product mix sizing and layer counts are harmonized with capacity parameters.');
    planningAttentionMsgs.push(msg('riskBrief.role.planning.healthy'));
  }

  // Capacity
  if (primaryBottleneck !== 'None') {
    capacityAttention.push(`Bottleneck pointing to [${primaryBottleneck}]. Prioritize shift optimization and bottleneck relief at constraints.`);
    capacityAttentionMsgs.push(msg('riskBrief.role.capacity.bottleneck', { bottleneck: primaryBottleneck }));
  }
  const shortageSizeDriver = attributionDrivers.find((d) => d.dimension === 'size' && d.metric === 'capacityPressureIndex');
  const shortageAppDriver = attributionDrivers.find((d) => d.dimension === 'application' && d.metric === 'capacityPressureIndex');
  const shortageLayerDriver = attributionDrivers.find((d) => d.dimension === 'layerBucket' && d.metric === 'capacityPressureIndex');
  if (shortageSizeDriver) {
    const share = shortageSizeDriver.share !== undefined ? shortageSizeDriver.share.toFixed(1) : '-';
    capacityAttention.push(`Top shortage size: [${shortageSizeDriver.label}] (${share}%). Align panel layout planning.`);
    capacityAttentionMsgs.push(msg('riskBrief.role.capacity.size', { label: shortageSizeDriver.label, share }));
  }
  if (shortageAppDriver) {
    const share = shortageAppDriver.share !== undefined ? shortageAppDriver.share.toFixed(1) : '-';
    capacityAttention.push(`Top shortage application: [${shortageAppDriver.label}] (${share}%).`);
    capacityAttentionMsgs.push(msg('riskBrief.role.capacity.application', { label: shortageAppDriver.label, share }));
  }
  if (shortageLayerDriver) {
    const share = shortageLayerDriver.share !== undefined ? shortageLayerDriver.share.toFixed(1) : '-';
    capacityAttention.push(`Top shortage layer bucket: [${shortageLayerDriver.label}] (${share}%). Review yield + step constraints.`);
    capacityAttentionMsgs.push(msg('riskBrief.role.capacity.layer', { label: shortageLayerDriver.label, share }));
  }
  const zeroCapWarn = quality.issues.some((i) => i.id === 'bu-demand-zero-capacity');
  if (zeroCapWarn) {
    capacityAttention.push('Critical: BU demand detected but BU capacity set to 0. Update factory configurations in Parameters page.');
    capacityAttentionMsgs.push(msg('riskBrief.role.capacity.zeroBu'));
  }
  if (capacityAttention.length === 0) {
    capacityAttention.push('Working days and daily panel capacity outputs match default constraints.');
    capacityAttentionMsgs.push(msg('riskBrief.role.capacity.healthy'));
  }

  // Executive
  if (quality.status === 'error') {
    execAttention.push(`Data Quality Alert: Confidence is LOW due to ${errorCount} error(s). Clean up data before making capital investment decisions.`);
    execAttentionMsgs.push(msg('riskBrief.role.exec.lowQuality', { count: errorCount }));
  } else {
    execAttention.push(`Data Quality Rating is [${confLevel}]. Underlying calculation matrices are verified and decision-grade.`);
    execAttentionMsgs.push(msg('riskBrief.role.exec.qualityOk', { level: confLevel }));
  }
  const strategicCount = skuHealthSignals.filter((s) => s.classification === 'strategicGrowth').length;
  if (strategicCount > 0) {
    execAttention.push(`${strategicCount} strategic-growth SKU(s) flagged: high revenue share AND high capacity pressure. Prioritize capacity expansion to protect upside.`);
    execAttentionMsgs.push(msg('riskBrief.role.exec.strategic', { count: strategicCount }));
  }
  const dataIncompleteCount = skuHealthSignals.filter((s) => s.classification === 'dataIncomplete').length;
  if (dataIncompleteCount > 0 && quality.confidence !== 'high') {
    execAttention.push(`${dataIncompleteCount} SKU(s) classified as Data Incomplete. Resolve data cleanup before approving capital decisions.`);
    execAttentionMsgs.push(msg('riskBrief.role.exec.dataIncomplete', { count: dataIncompleteCount }));
  }
  if (bpWorstPeriod) {
    const gap = Math.abs(bpWorstGap!).toFixed(1);
    execAttention.push(`Approve capacity expansion or SKU redirection to resolve the ${gap}M TWD deficit in ${bpWorstPeriod}.`);
    execAttentionMsgs.push(msg('riskBrief.role.exec.bpMiss', { period: bpWorstPeriod, gap }));
  }

  return {
    generatedAt: new Date().toISOString(),
    confidence: quality.confidence,
    confidenceExplanation,
    confidenceExplanationMessage,
    executiveSummary,
    executiveSummaryMessages,
    facts,
    topRiskPeriods,
    drivers,
    attributionDrivers,
    shortageMonths,
    skuHealthSignals,
    assumptions,
    dataCaveats,
    bpRisk: bpWorstPeriod
      ? {
          worstPeriod: bpWorstPeriod,
          attainment: bpWorstAttainment,
          gapMillionTwd: bpWorstGap,
          statement: bpStatement,
        }
      : undefined,
    roleAttention: {
      sales: salesAttention,
      productPlanning: planningAttention,
      capacity: capacityAttention,
      executive: execAttention,
      salesMessages: salesAttentionMsgs,
      productPlanningMessages: planningAttentionMsgs,
      capacityMessages: capacityAttentionMsgs,
      executiveMessages: execAttentionMsgs,
    },
  };
}

// ============================================================
// Helper: compute primary bottleneck
// ============================================================

function computePrimaryBottleneck(
  yearlyHealth: AnalysisContractPayload['yearlyHealth']
): 'Core' | 'BU' | 'None' {
  let worstCoreUtil = 0;
  let worstBuUtil = 0;

  for (const y of yearlyHealth) {
    const coreUtil = y.coreUtil ?? 0;
    const buUtil = y.buUtil ?? 0;
    if (coreUtil > worstCoreUtil) worstCoreUtil = coreUtil;
    if (buUtil > worstBuUtil) worstBuUtil = buUtil;
  }

  if (worstCoreUtil > worstBuUtil && worstCoreUtil > 0.85) return 'Core';
  if (worstBuUtil >= worstCoreUtil && worstBuUtil > 0.85) return 'BU';
  return 'None';
}

// ============================================================
// Helper: build confidence explanation
// ============================================================

function buildConfidenceExplanation(quality: DataQualitySummary): { english: string; message: LocalizedMessage } {
  const errorCount = quality.issues.filter((i) => i.severity === 'error').length;
  const warningCount = quality.issues.filter((i) => i.severity === 'warning').length;

  if (quality.confidence === 'high') {
    return {
      english: 'All data inputs are complete and consistent. No errors or warnings found.',
      message: msg('riskBrief.confidence.high'),
    };
  }

  if (quality.confidence === 'medium') {
    if (warningCount > 0) {
      const topWarnings = quality.issues
        .filter((i) => i.severity === 'warning')
        .slice(0, 3)
        .map((i) => i.title)
        .join('; ');
      return {
        english: `${warningCount} warning-level issue(s) found: ${topWarnings}.`,
        message: msg('riskBrief.confidence.mediumWith', { count: warningCount, top: topWarnings }),
      };
    }
    return {
      english: 'Some data quality warnings detected. Review caveats for details.',
      message: msg('riskBrief.confidence.mediumGeneric'),
    };
  }

  if (quality.confidence === 'low') {
    const topErrors = quality.issues
      .filter((i) => i.severity === 'error')
      .slice(0, 3)
      .map((i) => i.title)
      .join('; ');
    return {
      english: `${errorCount} error-level issue(s) found: ${topErrors}. Results may not be reliable for capital decisions.`,
      message: msg('riskBrief.confidence.low', { count: errorCount, top: topErrors }),
    };
  }

  return {
    english: 'No active data loaded. Please import products and monthly forecasts.',
    message: msg('riskBrief.confidence.blocked'),
  };
}
