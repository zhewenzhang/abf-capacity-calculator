import type { AnalysisContractPayload } from './analysisContract';
import type { DataQualitySummary, DataQualityIssue } from './dataQuality';
import type { RiskDriver, SkuHealthSignal } from './riskAttribution';

// ============================================================
// Types — Decision-Grade Risk Brief
// ============================================================

export type BriefSeverity = 'critical' | 'warning' | 'info' | 'positive';

export interface BriefStatement {
  id: string;
  severity: BriefSeverity;
  title: string;
  detail: string;
  evidence?: Record<string, string | number | null>;
}

export type DriverMetric = 'revenue' | 'coreDemand' | 'buDemand' | 'shortageExposure' | 'bpGap';

export interface DriverItem {
  label: string;
  value: number;
  share?: number; // 0-100 percentage of group total
  reason: string;
}

export interface DriverGroup {
  title: string;
  metric: DriverMetric;
  items: DriverItem[];
}

export interface RiskBrief {
  generatedAt: string;
  confidence: DataQualitySummary['confidence'];
  confidenceExplanation: string;
  executiveSummary: string[];
  facts: BriefStatement[];
  topRiskPeriods: Array<{
    period: string;
    reason: string;
    bottleneck: 'Core' | 'BU' | 'None';
    severity: 'red' | 'orange' | 'green';
    score: number; // for deterministic sorting
  }>;
  /**
   * Overall Contribution drivers — answers "who is biggest across all periods".
   * Keep as context; not the primary risk attribution.
   */
  drivers: DriverGroup[];
  /**
   * Risk Period Attribution — answers "who drives pressure during shortage months".
   * Derived from RiskAttributionModel.drivers.
   */
  attributionDrivers: RiskDriver[];
  /**
   * Months that triggered shortage attribution.
   */
  shortageMonths: string[];
  /**
   * Deterministic SKU Health Signals MVP.
   */
  skuHealthSignals: SkuHealthSignal[];
  assumptions: BriefStatement[];
  dataCaveats: {
    total: number;
    top: DataQualityIssue[]; // limited to top 5
  };
  bpRisk?: {
    worstPeriod: string | null;
    attainment: number | null;
    gapMillionTwd: number | null;
    statement: BriefStatement | null;
  };
  roleAttention: {
    sales: string[];
    productPlanning: string[];
    capacity: string[];
    executive: string[];
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
  return Math.round((value / total) * 1000) / 10; // 1 decimal
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
  // Scoring: shortage months > utilization over 100% > utilization >= 85% > BP gap
  let score = 0;
  const coreUtil = rp.coreUtil ?? 0;
  const buUtil = rp.buUtil ?? 0;

  // Shortage months (highest weight)
  score += rp.shortageMonths.length * 100;

  // Utilization over 100%
  if (coreUtil > 1.0) score += 50;
  if (buUtil > 1.0) score += 50;

  // Utilization >= 85%
  if (coreUtil >= 0.85 && coreUtil <= 1.0) score += 20;
  if (buUtil >= 0.85 && buUtil <= 1.0) score += 20;

  // BP gap (negative gap adds score)
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

  // --- Empty / Blocked state ---
  if (quality.confidence === 'blocked' || yearlyHealth.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      confidence: quality.confidence,
      confidenceExplanation: 'No active data loaded. Please import products and monthly forecasts.',
      executiveSummary: ['No active data loaded. Please import products and monthly forecasts to generate analysis.'],
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
      },
    };
  }

  // ============================================================
  // 1. Facts — what the system determined
  // ============================================================

  const primaryBottleneck = computePrimaryBottleneck(yearlyHealth);

  facts.push({
    id: 'fact-revenue',
    severity: 'positive',
    title: 'Total Forecast Revenue',
    detail: `${summary.totalRevenueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD across ${summary.totalForecastPcs.toLocaleString()} PCS.`,
    evidence: { totalRevenueUsd: summary.totalRevenueUsd, totalForecastPcs: summary.totalForecastPcs },
  });

  if (primaryBottleneck !== 'None') {
    const maxCoreUtil = Math.max(...yearlyHealth.map((y) => y.coreUtil ?? 0));
    const maxBuUtil = Math.max(...yearlyHealth.map((y) => y.buUtil ?? 0));
    const maxUtil = primaryBottleneck === 'Core' ? maxCoreUtil : maxBuUtil;
    facts.push({
      id: 'fact-bottleneck',
      severity: 'critical',
      title: `Structural Bottleneck: ${primaryBottleneck}`,
      detail: `${primaryBottleneck} utilization peaks at ${(maxUtil * 100).toFixed(1)}%. Capacity cannot meet forecast demand in some periods.`,
      evidence: { bottleneck: primaryBottleneck, peakUtilization: maxUtil },
    });
  } else {
    facts.push({
      id: 'fact-no-bottleneck',
      severity: 'positive',
      title: 'No Structural Bottleneck',
      detail: 'Both Core and BU capacity are sufficient for all forecast periods.',
    });
  }

  if (summary.shortageMonthCount > 0) {
    facts.push({
      id: 'fact-shortage',
      severity: 'critical',
      title: `${summary.shortageMonthCount} Shortage Month(s) Detected`,
      detail: `Unfulfilled demand concentrated around ${summary.worstBottleneckMonth ?? 'N/A'}.`,
      evidence: { shortageMonthCount: summary.shortageMonthCount, worstMonth: summary.worstBottleneckMonth },
    });
  }

  // ============================================================
  // 2. Top Risk Periods — calibrated scoring
  // ============================================================

  // Gather BP gaps per year for scoring
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

  const topRiskPeriods: RiskBrief['topRiskPeriods'] = [];

  for (const rp of rawPeriods) {
    const coreUtil = rp.coreUtil ?? 0;
    const buUtil = rp.buUtil ?? 0;
    const bn: 'Core' | 'BU' | 'None' = (coreUtil > 0 || buUtil > 0) ? (coreUtil >= buUtil ? 'Core' : 'BU') : 'None';

    let severity: 'red' | 'orange' | 'green' = 'green';
    let reason = '';

    if (rp.shortageMonths.length > 0 || coreUtil > 1.0 || buUtil > 1.0) {
      severity = 'red';
      reason = `Capacity exceeded: Core ${(coreUtil * 100).toFixed(0)}%, BU ${(buUtil * 100).toFixed(0)}%. ${rp.shortageMonths.length} shortage month(s).`;
    } else if (coreUtil >= 0.85 || buUtil >= 0.85) {
      severity = 'orange';
      reason = `Warning threshold: Core ${(coreUtil * 100).toFixed(0)}%, BU ${(buUtil * 100).toFixed(0)}%.`;
    }

    if (severity !== 'green') {
      const score = scoreRiskPeriod(rp);
      topRiskPeriods.push({ period: rp.period, reason, bottleneck: bn, severity, score });
    }
  }

  // Sort by score descending (deterministic), then by period as tiebreaker
  topRiskPeriods.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.period.localeCompare(b.period);
  });

  // ============================================================
  // 3. Drivers — separated by type with share
  // ============================================================

  // 3a. Revenue drivers
  const topCustomers = extractTopDrivers(matrices.revenueByCustomer, 5);
  const totalRevenue = totalOfGroup(matrices.revenueByCustomer);
  const revenueDrivers: DriverGroup = {
    title: 'Revenue Drivers',
    metric: 'revenue',
    items: topCustomers.map((c) => ({
      label: c.label,
      value: c.value,
      share: safeShare(c.value, totalRevenue),
      reason: c.value > 0 ? `Contributes ${safeShare(c.value, totalRevenue)?.toFixed(1)}% of total forecast revenue.` : 'No revenue contribution.',
    })),
  };
  drivers.push(revenueDrivers);

  // 3b. Core pressure drivers (by size)
  const topCoreSizes = extractTopDrivers(matrices.coreDemandBySize, 5);
  const totalCoreDemand = totalOfGroup(matrices.coreDemandBySize);
  const coreDrivers: DriverGroup = {
    title: 'Core Capacity Pressure',
    metric: 'coreDemand',
    items: topCoreSizes.map((s) => ({
      label: s.label,
      value: s.value,
      share: safeShare(s.value, totalCoreDemand),
      reason: s.value > 0 ? `Drives ${safeShare(s.value, totalCoreDemand)?.toFixed(1)}% of Core panel demand.` : 'No Core demand.',
    })),
  };
  drivers.push(coreDrivers);

  // 3c. BU pressure drivers (by size)
  const topBuSizes = extractTopDrivers(matrices.buDemandBySize, 5);
  const totalBuDemand = totalOfGroup(matrices.buDemandBySize);
  const buDrivers: DriverGroup = {
    title: 'BU Capacity Pressure',
    metric: 'buDemand',
    items: topBuSizes.map((s) => ({
      label: s.label,
      value: s.value,
      share: safeShare(s.value, totalBuDemand),
      reason: s.value > 0 ? `Drives ${safeShare(s.value, totalBuDemand)?.toFixed(1)}% of BU panel demand.` : 'No BU demand.',
    })),
  };
  drivers.push(buDrivers);

  // 3d. Shortage exposure drivers (by customer, only if shortage exists)
  if (summary.shortageMonthCount > 0) {
    // Build shortage exposure from revenueByCustomer in shortage-context
    // Use coreDemandBySize as proxy for shortage exposure (simplified)
    const topShortageSizes = extractTopDrivers(matrices.coreDemandBySize, 5);
    const totalShortage = totalOfGroup(matrices.coreDemandBySize);
    const shortageDrivers: DriverGroup = {
      title: 'Shortage Exposure',
      metric: 'shortageExposure',
      items: topShortageSizes.slice(0, 3).map((s) => ({
        label: s.label,
        value: s.value,
        share: safeShare(s.value, totalShortage),
        reason: s.value > 0 ? `Highest Core demand during shortage periods.` : 'No exposure.',
      })),
    };
    drivers.push(shortageDrivers);
  }

  // 3e. BP risk drivers (from bpAnalysis customer contribution)
  if (bpAnalysis && bpAnalysis.yearly.length > 0) {
    const bpMissYears = bpAnalysis.yearly.filter((r) => r.status === 'miss' || r.status === 'watch');
    if (bpMissYears.length > 0) {
      const bpDrivers: DriverGroup = {
        title: 'BP Risk',
        metric: 'bpGap',
        items: bpMissYears.map((r) => ({
          label: r.period,
          value: Math.abs(r.gapMillionTwd ?? 0),
          share: undefined,
          reason: `BP attainment ${(r.attainment !== null ? r.attainment * 100 : 0).toFixed(1)}%. Gap: ${(r.gapMillionTwd ?? 0).toFixed(1)}M TWD.`,
        })),
      };
      drivers.push(bpDrivers);
    }
  }

  // ============================================================
  // 4. Executive Summary — decision-oriented
  // ============================================================

  const executiveSummary: string[] = [];

  // Highest risk period
  if (topRiskPeriods.length > 0) {
    const worst = topRiskPeriods[0];
    executiveSummary.push(
      `${worst.period} is the highest risk period: ${worst.reason}`
    );
  }

  // Primary bottleneck
  if (primaryBottleneck !== 'None') {
    const maxCoreUtil = Math.max(...yearlyHealth.map((y) => y.coreUtil ?? 0));
    const maxBuUtil = Math.max(...yearlyHealth.map((y) => y.buUtil ?? 0));
    const maxUtil = primaryBottleneck === 'Core' ? maxCoreUtil : maxBuUtil;
    executiveSummary.push(
      `Primary bottleneck is ${primaryBottleneck}, peaking at ${(maxUtil * 100).toFixed(1)}% utilization.`
    );
  } else {
    executiveSummary.push('Capacity is stable; no structural Core or BU bottlenecks detected.');
  }

  // Top driver
  if (revenueDrivers.items.length > 0) {
    const top = revenueDrivers.items[0];
    executiveSummary.push(
      `Top revenue driver is ${top.label}${top.share !== undefined ? ` (${top.share.toFixed(1)}% share)` : ''}.`
    );
  }

  // BP risk
  if (bpAnalysis && bpAnalysis.yearly.length > 0) {
    const missYears = bpAnalysis.yearly.filter((r) => r.status === 'miss');
    if (missYears.length > 0) {
      const worst = missYears.reduce((a, b) => (a.gapMillionTwd ?? 0) < (b.gapMillionTwd ?? 0) ? a : b);
      executiveSummary.push(
        `BP target miss in ${worst.period}: attainment ${(worst.attainment !== null ? worst.attainment * 100 : 0).toFixed(1)}%, gap ${Math.abs(worst.gapMillionTwd ?? 0).toFixed(1)}M TWD.`
      );
    } else {
      const hasTargets = bpAnalysis.yearly.some((r) => r.targetMillionTwd && r.targetMillionTwd > 0);
      if (hasTargets) {
        executiveSummary.push('All BP targets are met under current forecast.');
      }
    }
  }

  // Confidence
  executiveSummary.push(
    `Data confidence: ${quality.confidence.toUpperCase()}.${quality.issues.filter((i) => i.severity === 'error').length > 0 ? ` ${quality.issues.filter((i) => i.severity === 'error').length} error(s) found.` : ''}`
  );

  // ============================================================
  // 5. Confidence Explanation
  // ============================================================

  const confidenceExplanation = buildConfidenceExplanation(quality);

  // ============================================================
  // 6. Data Caveats — top 5 + total count
  // ============================================================

  const nonInfoIssues = quality.issues.filter((i) => i.severity !== 'info');
  const dataCaveats = {
    total: quality.issues.length,
    top: nonInfoIssues.length > 0 ? nonInfoIssues.slice(0, MAX_CAVEATS_DISPLAY) : quality.issues.slice(0, MAX_CAVEATS_DISPLAY),
  };

  // ============================================================
  // 7. Assumptions
  // ============================================================

  assumptions.push({
    id: 'assump-bp-allocation',
    severity: 'info',
    title: 'BP Target Allocation',
    detail: 'Yearly BP targets are evenly allocated to quarters (annual / 4) and months (annual / 12).',
  });

  assumptions.push({
    id: 'assump-working-days',
    severity: 'info',
    title: 'Fixed Working Days',
    detail: `Working days are fixed across all months (${payload.assumptions.find((a) => a.includes('Working days'))?.match(/\d+/)?.[0] ?? '28'} days/month).`,
  });

  assumptions.push({
    id: 'assump-revenue-usd',
    severity: 'info',
    title: 'Revenue Normalized to USD',
    detail: 'Revenue is calculated from normalized USD unit price. Product/Forecast source price may be USD/TWD/CNY but calculation revenue is USD.',
  });

  assumptions.push({
    id: 'assump-bp-twd',
    severity: 'info',
    title: 'BP Target in Million TWD',
    detail: 'BP target remains in million TWD. USD revenue is converted to TWD before BP comparison.',
  });

  assumptions.push({
    id: 'assump-core-steps',
    severity: 'info',
    title: 'Core Steps Fixed',
    detail: 'Core steps are fixed to 1 step for all layer count SKUs.',
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
      bpStatement = {
        id: 'bp-risk',
        severity: 'warning',
        title: `BP Target Miss in ${bpWorstPeriod}`,
        detail: `Attainment: ${(bpWorstAttainment! * 100).toFixed(1)}%. Gap: ${Math.abs(bpWorstGap!).toFixed(1)}M TWD.`,
        evidence: { period: bpWorstPeriod, attainment: bpWorstAttainment, gapMillionTwd: bpWorstGap },
      };
    }
  }

  // ============================================================
  // 9. Role-Based Attention — informed by Risk Attribution + SKU Health
  // ============================================================

  const attribution = payload.riskAttribution;
  const attributionDrivers = attribution.drivers;
  const skuHealthSignals = attribution.skuHealthSignals;
  const shortageMonths = attribution.shortageMonths;

  // Sales — overall revenue + shortage customer attribution + BP risk
  if (revenueDrivers.items.length > 0) {
    const top = revenueDrivers.items[0];
    salesAttention.push(
      `Major revenue driver [${top.label}] contributes ${top.share?.toFixed(0) ?? 'significant'}% share. Secure their allocation planning immediately.`
    );
  }
  const shortageCustomerDrivers = attributionDrivers.filter((d) => d.dimension === 'customer' && (d.metric === 'shortageCoreDemand' || d.metric === 'shortageBuDemand'));
  if (shortageCustomerDrivers.length > 0) {
    const top = shortageCustomerDrivers[0];
    salesAttention.push(
      `During shortage months, [${top.label}] drives ${top.share?.toFixed(1) ?? 'significant'}% of ${top.metric === 'shortageCoreDemand' ? 'Core' : 'BU'} pressure. Validate forecast accuracy and confirm pricing.`
    );
  }
  if (summary.shortageMonthCount > 0) {
    salesAttention.push(
      `Review SKU delivery schedules during ${summary.shortageMonthCount} critical shortage months to mitigate customer complaint and contract risk.`
    );
  } else {
    salesAttention.push('Normal customer order pipeline; no unfulfilled demand issues forecasted.');
  }

  // Product Planning — SKU Health Signals
  const lowValue = skuHealthSignals.filter((s) => s.classification === 'lowValueHighLoad');
  const drainers = skuHealthSignals.filter((s) => s.classification === 'capacityDrainer');
  if (lowValue.length > 0) {
    planningAttention.push(
      `Low-value-high-load SKU(s): ${lowValue.slice(0, 3).map((s) => s.skuCode).join(', ')}. Re-price or reduce capacity allocation.`
    );
  }
  if (drainers.length > 0) {
    planningAttention.push(
      `Capacity drainer SKU(s): ${drainers.slice(0, 3).map((s) => s.skuCode).join(', ')}. Consume scarce capacity beyond their revenue share.`
    );
  }
  const topSkus = extractTopDrivers(matrices.revenueBySku, 3);
  if (topSkus.length > 0 && lowValue.length === 0 && drainers.length === 0) {
    planningAttention.push(
      `Main demand SKU [${topSkus[0].label.split(' / ')[0]}] consumes substantial panel resources. Monitor yield stability.`
    );
  }
  if (planningAttention.length === 0) {
    planningAttention.push('Product mix sizing and layer counts are harmonized with capacity parameters.');
  }

  // Capacity — bottleneck + shortage attribution by size/application/layer
  if (primaryBottleneck !== 'None') {
    capacityAttention.push(
      `Bottleneck pointing to [${primaryBottleneck}]. Prioritize shift optimization and bottleneck relief at constraints.`
    );
  }
  const shortageSizeDriver = attributionDrivers.find((d) => d.dimension === 'size' && d.metric === 'capacityPressureIndex');
  const shortageAppDriver = attributionDrivers.find((d) => d.dimension === 'application' && d.metric === 'capacityPressureIndex');
  const shortageLayerDriver = attributionDrivers.find((d) => d.dimension === 'layerBucket' && d.metric === 'capacityPressureIndex');
  if (shortageSizeDriver) {
    capacityAttention.push(
      `Top shortage size: [${shortageSizeDriver.label}] (${shortageSizeDriver.share?.toFixed(1) ?? '-'}%). Align panel layout planning.`
    );
  }
  if (shortageAppDriver) {
    capacityAttention.push(
      `Top shortage application: [${shortageAppDriver.label}] (${shortageAppDriver.share?.toFixed(1) ?? '-'}%).`
    );
  }
  if (shortageLayerDriver) {
    capacityAttention.push(
      `Top shortage layer bucket: [${shortageLayerDriver.label}] (${shortageLayerDriver.share?.toFixed(1) ?? '-'}%). Review yield + step constraints.`
    );
  }
  const zeroCapWarn = quality.issues.some((i) => i.id === 'bu-demand-zero-capacity');
  if (zeroCapWarn) {
    capacityAttention.push(
      'Critical: BU demand detected but BU capacity set to 0. Update factory configurations in Parameters page.'
    );
  }
  if (capacityAttention.length === 0) {
    capacityAttention.push('Working days and daily panel capacity outputs match default constraints.');
  }

  // Executive — data quality + strategic signals + BP miss
  if (quality.status === 'error') {
    execAttention.push(
      `Data Quality Alert: Confidence is LOW due to ${quality.issues.filter((i) => i.severity === 'error').length} error(s). Clean up data before making capital investment decisions.`
    );
  } else {
    execAttention.push(
      `Data Quality Rating is [${quality.confidence.toUpperCase()}]. Underlying calculation matrices are verified and decision-grade.`
    );
  }
  const strategicCount = skuHealthSignals.filter((s) => s.classification === 'strategicGrowth').length;
  if (strategicCount > 0) {
    execAttention.push(
      `${strategicCount} strategic-growth SKU(s) flagged: high revenue share AND high capacity pressure. Prioritize capacity expansion to protect upside.`
    );
  }
  const dataIncompleteCount = skuHealthSignals.filter((s) => s.classification === 'dataIncomplete').length;
  if (dataIncompleteCount > 0 && quality.confidence !== 'high') {
    execAttention.push(
      `${dataIncompleteCount} SKU(s) classified as Data Incomplete. Resolve data cleanup before approving capital decisions.`
    );
  }
  if (bpWorstPeriod) {
    execAttention.push(
      `Approve capacity expansion or SKU redirection to resolve the ${Math.abs(bpWorstGap!).toFixed(1)}M TWD deficit in ${bpWorstPeriod}.`
    );
  }

  // ============================================================
  // Assemble
  // ============================================================

  return {
    generatedAt: new Date().toISOString(),
    confidence: quality.confidence,
    confidenceExplanation,
    executiveSummary,
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
    },
  };
}

// ============================================================
// Helper: compute primary bottleneck from yearly health
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

function buildConfidenceExplanation(quality: DataQualitySummary): string {
  const errorCount = quality.issues.filter((i) => i.severity === 'error').length;
  const warningCount = quality.issues.filter((i) => i.severity === 'warning').length;

  if (quality.confidence === 'high') {
    return 'All data inputs are complete and consistent. No errors or warnings found.';
  }

  if (quality.confidence === 'medium') {
    if (warningCount > 0) {
      const topWarnings = quality.issues
        .filter((i) => i.severity === 'warning')
        .slice(0, 3)
        .map((i) => i.title)
        .join('; ');
      return `${warningCount} warning-level issue(s) found: ${topWarnings}.`;
    }
    return 'Some data quality warnings detected. Review caveats for details.';
  }

  if (quality.confidence === 'low') {
    const topErrors = quality.issues
      .filter((i) => i.severity === 'error')
      .slice(0, 3)
      .map((i) => i.title)
      .join('; ');
    return `${errorCount} error-level issue(s) found: ${topErrors}. Results may not be reliable for capital decisions.`;
  }

  return 'No active data loaded. Please import products and monthly forecasts.';
}
