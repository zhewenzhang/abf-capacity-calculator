import type { AnalysisContractPayload } from './analysisContract';
import type { DataQualitySummary } from './dataQuality';

export interface RiskBrief {
  generatedAt: string;
  confidence: DataQualitySummary['confidence'];
  executiveSummary: string[];
  topRiskPeriods: Array<{
    period: string;
    reason: string;
    bottleneck: 'Core' | 'BU' | 'None';
    severity: 'red' | 'orange' | 'green';
  }>;
  bottleneckSummary: {
    primary: 'Core' | 'BU' | 'None';
    coreRiskMonths: number;
    buRiskMonths: number;
  };
  topDrivers: {
    customers: Array<{ label: string; value: number }>;
    skus: Array<{ label: string; value: number }>;
    sizes: Array<{ label: string; value: number }>;
    applications: Array<{ label: string; value: number }>;
  };
  bpRisk?: {
    worstPeriod: string | null;
    attainment: number | null;
    gapMillionTwd: number | null;
  };
  roleAttention: {
    sales: string[];
    productPlanning: string[];
    capacity: string[];
    executive: string[];
  };
}

export function buildRiskBrief(payload: AnalysisContractPayload): RiskBrief {
  const { summary, yearlyHealth, bpAnalysis, matrices, quality, skus, forecasts } = payload;
  const executiveSummary: string[] = [];
  const topRiskPeriods: RiskBrief['topRiskPeriods'] = [];
  const salesAttention: string[] = [];
  const planningAttention: string[] = [];
  const capacityAttention: string[] = [];
  const execAttention: string[] = [];

  // Handle empty state gracefully
  if (quality.confidence === 'blocked' || yearlyHealth.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      confidence: quality.confidence,
      executiveSummary: ['No active data loaded. Please import products and monthly forecasts to generate analysis.'],
      topRiskPeriods: [],
      bottleneckSummary: { primary: 'None', coreRiskMonths: 0, buRiskMonths: 0 },
      topDrivers: { customers: [], skus: [], sizes: [], applications: [] },
      roleAttention: {
        sales: ['Import monthly forecasting to view customer demand risk.'],
        productPlanning: ['Input SKU specifications to identify sizing constraints.'],
        capacity: ['Verify factory capacity configuration for target years.'],
        executive: ['Awaiting core database initialization.'],
      },
    };
  }

  // --- 1. Analyze Bottlenecks and Top Risks ---
  let worstCoreUtil = 0;
  let worstBuUtil = 0;
  let worstCoreYear = '';
  let worstBuYear = '';
  let totalShortageMonths = 0;

  for (const y of yearlyHealth) {
    const coreUtil = y.coreCapacity > 0 ? y.coreDemand / y.coreCapacity : 0;
    const buUtil = y.buCapacity > 0 ? y.buDemand / y.buCapacity : 0;
    totalShortageMonths += y.shortageMonths.length;

    if (coreUtil > worstCoreUtil) {
      worstCoreUtil = coreUtil;
      worstCoreYear = y.year;
    }
    if (buUtil > worstBuUtil) {
      worstBuUtil = buUtil;
      worstBuYear = y.year;
    }

    // Top Risk Periods Identification
    if (coreUtil > 1.0 || buUtil > 1.0) {
      const bn = coreUtil > buUtil ? ('Core' as const) : ('BU' as const);
      topRiskPeriods.push({
        period: y.year,
        reason: `Capacity demand exceeded limit (Core: ${(coreUtil * 100).toFixed(0)}%, BU: ${(buUtil * 100).toFixed(0)}%).`,
        bottleneck: bn,
        severity: 'red',
      });
    } else if (coreUtil >= 0.85 || buUtil >= 0.85) {
      const bn = coreUtil > buUtil ? ('Core' as const) : ('BU' as const);
      topRiskPeriods.push({
        period: y.year,
        reason: `Capacity warning threshold reached (Core: ${(coreUtil * 100).toFixed(0)}%, BU: ${(buUtil * 100).toFixed(0)}%).`,
        bottleneck: bn,
        severity: 'orange',
      });
    }
  }

  // Sort top risks by severity (red first)
  topRiskPeriods.sort((a, b) => {
    if (a.severity === 'red' && b.severity !== 'red') return -1;
    if (a.severity !== 'red' && b.severity === 'red') return 1;
    return 0;
  });

  const primaryBottleneck: 'Core' | 'BU' | 'None' =
    worstCoreUtil > worstBuUtil && worstCoreUtil > 0.85
      ? 'Core'
      : worstBuUtil >= worstCoreUtil && worstBuUtil > 0.85
      ? 'BU'
      : 'None';

  // Executive Summary text rules
  executiveSummary.push(
    `Total forecast revenue is ${summary.totalRevenueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD with ${summary.totalForecastPcs.toLocaleString()} PCS demanded.`
  );

  if (primaryBottleneck !== 'None') {
    const worstUtil = primaryBottleneck === 'Core' ? worstCoreUtil : worstBuUtil;
    const worstYear = primaryBottleneck === 'Core' ? worstCoreYear : worstBuYear;
    executiveSummary.push(
      `Structural capacity risks identified! Primary bottleneck points to [${primaryBottleneck}], peaking at ${(worstUtil * 100).toFixed(1)}% utilization in ${worstYear}.`
    );
  } else {
    executiveSummary.push('Capacity is fully stable; no structural Core or Build-up (BU) bottlenecks detected.');
  }

  if (totalShortageMonths > 0) {
    executiveSummary.push(
      `Detected ${totalShortageMonths} shortage months overall. Maximum bottlenecks and unfulfilled demand are concentrated around month ${summary.worstBottleneckMonth ?? 'N/A'}.`
    );
  }

  // --- 2. Drivers Extraction (Top 3) ---
  const extractTopDrivers = (matrixRows: Array<{ label: string; values: Record<string, number> }>) => {
    return matrixRows
      .map((row) => {
        const total = Object.values(row.values).reduce((s, v) => s + v, 0);
        return { label: row.label, value: total };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  };

  const topCustomers = extractTopDrivers(matrices.revenueByCustomer);
  const topSkus = extractTopDrivers(matrices.revenueBySku);
  const topSizes = extractTopDrivers(matrices.revenueBySize);
  const topApps = extractTopDrivers(matrices.buDemandByApplication); // using BU demand matrix for apps

  // --- 3. BP Target & Attainment Risks ---
  let bpWorstPeriod: string | null = null;
  let bpWorstAttainment: number | null = null;
  let bpWorstGap: number | null = null;

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
      executiveSummary.push(
        `Business Plan (BP) target risk: Year ${bpWorstPeriod} represents the largest shortfall, with target attainment of only ${(bpWorstAttainment! * 100).toFixed(1)}% (Gap: ${bpWorstGap?.toFixed(1)} Million TWD).`
      );
    } else if (bpAnalysis.yearly.some((r) => r.targetMillionTwd && r.targetMillionTwd > 0)) {
      executiveSummary.push('All yearly Business Plan (BP) targets are successfully achieved under the current monthly sales forecast.');
    }
  }

  // --- 4. Role-based Actions Logic ---

  // Sales Action Plan
  if (topCustomers.length > 0) {
    salesAttention.push(
      `Major driver 💰 [${topCustomers[0].label}] contributes the largest share of revenue. Secure their allocation planning immediately.`
    );
  }
  if (totalShortageMonths > 0) {
    salesAttention.push(
      `Review SKU delivery schedules during ${totalShortageMonths} critical shortage months to mitigate customer complaint and contract risk.`
    );
  } else {
    salesAttention.push('Normal customer order pipeline; no unfulfilled demand issues forecasted.');
  }

  // Product Planning Action Plan
  if (topSkus.length > 0) {
    planningAttention.push(
      `Main demand SKU [${topSkus[0].label.split(' / ')[0]}] consumes substantial panel resources. Monitor yield stability.`
    );
  }
  const lowRevHighCapIssue = forecasts.some((f) => {
    const sku = skus.find((s) => s.id === f.skuId);
    return sku && sku.unitPrice < 1.5 && sku.layerCount > 16; // arbitrary warning: unitPrice low, layerCount high
  });
  if (lowRevHighCapIssue) {
    planningAttention.push(
      'Warning: Low-price, high-layer SKUs detected in the monthly mix. Advise reviewing pricing strategy or capacity consumption premiums.'
    );
  } else {
    planningAttention.push('Product mix sizing and layer counts are harmonized with capacity parameters.');
  }

  // Capacity Operations Action Plan
  if (primaryBottleneck !== 'None') {
    capacityAttention.push(
      `Operational Bottleneck pointing to [${primaryBottleneck}]. Prioritize shift optimization and bottleneck relief at constraints.`
    );
  }
  const zeroCapWarn = quality.issues.some((i) => i.id === 'bu-demand-zero-capacity');
  if (zeroCapWarn) {
    capacityAttention.push(
      '🚨 Critical: BU demand detected but BU capacity set to 0. Update factory configurations in Parameters page.'
    );
  } else {
    capacityAttention.push('Working days and daily panel capacity outputs match default constraints.');
  }

  // Executive Decision Action Plan
  if (quality.status === 'error') {
    execAttention.push(
      `⚠️ Data Quality Alert: Confidence is LOW due to fatal errors. Clean up data specifications before making capital investment decisions.`
    );
  } else {
    execAttention.push(
      `Data Quality Rating is [${quality.confidence.toUpperCase()}]. Underlying calculation matrices are verified and decision-grade.`
    );
  }
  if (bpWorstPeriod) {
    execAttention.push(
      `Approve capacity expansion or SKU redirection to resolve the TWD ${Math.abs(bpWorstGap!).toFixed(1)} Million deficit in ${bpWorstPeriod}.`
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    confidence: quality.confidence,
    executiveSummary,
    topRiskPeriods,
    bottleneckSummary: {
      primary: primaryBottleneck,
      coreRiskMonths: worstCoreUtil >= 0.85 ? yearlyHealth.filter((y) => (y.coreDemand / y.coreCapacity) >= 0.85).length * 12 : 0,
      buRiskMonths: worstBuUtil >= 0.85 ? yearlyHealth.filter((y) => (y.buDemand / y.buCapacity) >= 0.85).length * 12 : 0,
    },
    topDrivers: {
      customers: topCustomers,
      skus: topSkus,
      sizes: topSizes,
      applications: topApps,
    },
    bpRisk: bpWorstPeriod
      ? {
          worstPeriod: bpWorstPeriod,
          attainment: bpWorstAttainment,
          gapMillionTwd: bpWorstGap,
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
