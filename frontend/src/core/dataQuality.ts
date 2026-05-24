import type { SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';
import { currencyOrUsd } from './currency';
import type { LocalizedMessage } from '../i18n';

function msg(key: string, params?: Record<string, string | number>): LocalizedMessage {
  return params ? { key, params } : { key };
}

export type DataQualitySeverity = 'error' | 'warning' | 'info';
export type DataQualityDomain =
  | 'products'
  | 'forecast'
  | 'capacity'
  | 'parameters'
  | 'bp'
  | 'currency'
  | 'analytics';

export interface DataQualityIssue {
  id: string;
  severity: DataQualitySeverity;
  domain: DataQualityDomain;
  /** Legacy English title; UI should prefer titleMessage. */
  title: string;
  /** Legacy English detail; UI should prefer detailMessage. */
  detail: string;
  titleMessage: LocalizedMessage;
  detailMessage: LocalizedMessage;
  affectedPeriods?: string[];
  affectedSkuIds?: string[];
  evidence?: Record<string, string | number | boolean | null>;
  /**
   * Phase 5.3B decision-impact priority. Independent of `severity`:
   * - `high` blocks core analytics or distorts BP/capacity numbers (orphan forecast,
   *   missing capacity, missing exchange rate, BU demand vs zero BU capacity).
   * - `medium` adds noise / partial coverage (zero price, partial-year forecast,
   *   missing BP target, unsupported currency).
   * - `low` is informational (capacity without demand, BP allocation info, fixed working days).
   *
   * If not explicitly assigned in the producer, `enrichDataQualityWithImpact` below
   * fills it deterministically by id pattern + severity.
   */
  decisionImpact?: 'high' | 'medium' | 'low';
}

export interface DataQualitySummary {
  status: 'ok' | 'warning' | 'error';
  confidence: 'high' | 'medium' | 'low' | 'blocked';
  issues: DataQualityIssue[];
}

export interface DataQualityInput {
  skus: SKU[];
  forecasts: Forecast[];
  capacityPlans: CapacityPlan[];
  params: ProjectParameters;
}

export function buildDataQualitySummary(input: DataQualityInput): DataQualitySummary {
  const { skus, forecasts, capacityPlans, params } = input;
  const issues: DataQualityIssue[] = [];

  // If there are no SKUs and no Forecasts, we are BLOCKED
  if (skus.length === 0 && forecasts.length === 0) {
    return {
      status: 'ok',
      confidence: 'blocked',
      issues: [
        {
          id: 'no-data-blocked',
          severity: 'info',
          domain: 'analytics',
          title: 'No Data Loaded',
          detail: 'Load products and monthly forecasts to unlock full capacity risk analytics.',
          titleMessage: msg('dq.noData.title'),
          detailMessage: msg('dq.noData.detail'),
          decisionImpact: 'low',
        },
      ],
    };
  }

  const skuMap = new Map<string, SKU>();
  for (const sku of skus) {
    skuMap.set(sku.id, sku);
  }

  // --- 1. Products Checks ---
  const invalidSkus = new Set<string>();
  for (const sku of skus) {
    const missingAttrs: string[] = [];
    if (!sku.chipLengthMm || sku.chipLengthMm <= 0) missingAttrs.push('chipLengthMm');
    if (!sku.chipWidthMm || sku.chipWidthMm <= 0) missingAttrs.push('chipWidthMm');
    if (sku.layerCount === undefined || sku.layerCount === null || sku.layerCount <= 0) missingAttrs.push('layerCount');
    if (!sku.sizeCategory) missingAttrs.push('sizeCategory');
    if (sku.unitPrice === undefined || sku.unitPrice === null || sku.unitPrice < 0) missingAttrs.push('unitPrice');

    if (missingAttrs.length > 0) {
      invalidSkus.add(sku.id);
      issues.push({
        id: `sku-missing-attr-${sku.id}`,
        severity: 'error',
        domain: 'products',
        title: 'SKU Missing Required Production Attributes',
        detail: `SKU ${sku.skuCode} has invalid or missing attributes: ${missingAttrs.join(', ')}.`,
        titleMessage: msg('dq.skuMissingAttr.title'),
        detailMessage: msg('dq.skuMissingAttr.detail', { skuCode: sku.skuCode, attrs: missingAttrs.join(', ') }),
        affectedSkuIds: [sku.id],
        evidence: { skuCode: sku.skuCode, missingCount: missingAttrs.length },
      });
    }

    if (sku.unitPrice === 0) {
      issues.push({
        id: `sku-zero-price-${sku.id}`,
        severity: 'warning',
        domain: 'products',
        title: 'SKU Unit Price is Zero',
        detail: `SKU ${sku.skuCode} has a set unit price of exactly 0.`,
        titleMessage: msg('dq.skuZeroPrice.title'),
        detailMessage: msg('dq.skuZeroPrice.detail', { skuCode: sku.skuCode }),
        affectedSkuIds: [sku.id],
      });
    }

    if (sku.unitPriceCurrency && !['USD', 'TWD', 'CNY'].includes(sku.unitPriceCurrency)) {
      issues.push({
        id: `sku-unsupported-currency-${sku.id}`,
        severity: 'warning',
        domain: 'products',
        title: 'SKU Unsupported Price Currency',
        detail: `SKU ${sku.skuCode} has an unsupported currency: ${sku.unitPriceCurrency}.`,
        titleMessage: msg('dq.skuUnsupportedCurrency.title'),
        detailMessage: msg('dq.skuUnsupportedCurrency.detail', { skuCode: sku.skuCode, currency: sku.unitPriceCurrency }),
        affectedSkuIds: [sku.id],
      });
    }
  }

  // --- 2. Forecast Checks ---
  const forecastYears = new Set<string>();
  const forecastMonths = new Set<string>();
  const forecastsBySkuYear = new Map<string, Set<string>>(); // "skuId::year" -> Set of months

  for (const fc of forecasts) {
    const year = fc.month.substring(0, 4);
    forecastYears.add(year);
    forecastMonths.add(fc.month);

    const key = `${fc.skuId}::${year}`;
    if (!forecastsBySkuYear.has(key)) forecastsBySkuYear.set(key, new Set());
    forecastsBySkuYear.get(key)!.add(fc.month);

    // Orphan Forecast Check
    if (!skuMap.has(fc.skuId)) {
      issues.push({
        id: `forecast-orphan-sku-${fc.id}`,
        severity: 'error',
        domain: 'forecast',
        title: 'Forecast References Missing SKU',
        detail: `Forecast for month ${fc.month} references skuId ${fc.skuId} which does not exist.`,
        titleMessage: msg('dq.forecastOrphan.title'),
        detailMessage: msg('dq.forecastOrphan.detail', { month: fc.month, skuId: fc.skuId }),
        evidence: { skuId: fc.skuId, month: fc.month },
      });
    }

    if (fc.unitPrice === 0) {
      issues.push({
        id: `forecast-zero-price-${fc.id}`,
        severity: 'warning',
        domain: 'forecast',
        title: 'Forecast Unit Price is Zero',
        detail: `Forecast for month ${fc.month} has a unit price of 0.`,
        titleMessage: msg('dq.forecastZeroPrice.title'),
        detailMessage: msg('dq.forecastZeroPrice.detail', { month: fc.month }),
        evidence: { forecastId: fc.id },
      });
    }
  }

  // Partial Year Check
  forecastsBySkuYear.forEach((months, key) => {
    const [skuId, year] = key.split('::');
    const sku = skuMap.get(skuId);
    if (sku && months.size < 12 && months.size > 0) {
      issues.push({
        id: `forecast-partial-year-${skuId}-${year}`,
        severity: 'warning',
        domain: 'forecast',
        title: 'Partial Year Forecast Data',
        detail: `SKU ${sku.skuCode} has forecast data for only ${months.size}/12 months in ${year}.`,
        titleMessage: msg('dq.forecastPartialYear.title'),
        detailMessage: msg('dq.forecastPartialYear.detail', { skuCode: sku.skuCode, count: months.size, year }),
        affectedSkuIds: [skuId],
        affectedPeriods: [year],
      });
    }
  });

  // --- 3. Capacity Checks ---
  const capacityMonths = new Set<string>();
  const capacityYears = new Set<string>();
  const monthlyBuCapacity = new Map<string, number>(); // month -> bu capacity sum

  for (const cp of capacityPlans) {
    capacityMonths.add(cp.month);
    const year = cp.month.substring(0, 4);
    capacityYears.add(year);

    const workingDays = params.defaultWorkingDays ?? 28;
    const capacityVal = cp.buPanelPerDay * workingDays;
    monthlyBuCapacity.set(cp.month, (monthlyBuCapacity.get(cp.month) || 0) + capacityVal);
  }

  // Missing Capacity check
  const missingCapMonths: string[] = [];
  for (const month of forecastMonths) {
    if (!capacityMonths.has(month)) {
      missingCapMonths.push(month);
    }
  }
  if (missingCapMonths.length > 0) {
    issues.push({
      id: 'forecast-missing-capacity',
      severity: 'error',
      domain: 'capacity',
      title: 'Missing Capacity Config for Forecast Period',
      detail: `Forecast demand exists for ${missingCapMonths.length} month(s) but no factory capacity config exists.`,
      titleMessage: msg('dq.missingCapacity.title'),
      detailMessage: msg('dq.missingCapacity.detail', { count: missingCapMonths.length }),
      affectedPeriods: missingCapMonths.sort(),
    });
  }

  // Capacity exists without forecast (Info check)
  const capacityWithoutDemand: string[] = [];
  for (const month of capacityMonths) {
    const hasDemand = forecasts.some((f) => f.month === month && f.forecastPcs > 0);
    if (!hasDemand) capacityWithoutDemand.push(month);
  }
  if (capacityWithoutDemand.length > 0) {
    issues.push({
      id: 'capacity-without-forecast',
      severity: 'info',
      domain: 'capacity',
      title: 'Capacity Exists Without Demand',
      detail: `Capacity configuration is defined for ${capacityWithoutDemand.length} month(s) with zero forecast demand.`,
      titleMessage: msg('dq.capacityWithoutForecast.title'),
      detailMessage: msg('dq.capacityWithoutForecast.detail', { count: capacityWithoutDemand.length }),
      affectedPeriods: capacityWithoutDemand.sort(),
    });
  }

  // BU Demand > 0 while BU Capacity = 0 (Severe Critical Check)
  const buIssues: string[] = [];
  for (const fc of forecasts) {
    const sku = skuMap.get(fc.skuId);
    if (!sku || invalidSkus.has(sku.id) || fc.forecastPcs <= 0) continue;
    const buSteps = Math.max(Math.floor(sku.layerCount / 2) - 1, 0);
    if (buSteps > 0) {
      const buCap = monthlyBuCapacity.get(fc.month) ?? 0;
      if (buCap === 0) {
        buIssues.push(`${fc.month}::${sku.skuCode}`);
      }
    }
  }
  if (buIssues.length > 0) {
    issues.push({
      id: 'bu-demand-zero-capacity',
      severity: 'error',
      domain: 'capacity',
      title: 'BU Demand Exists with Zero BU Capacity',
      detail: `Build-up (BU) panel demand is required for layered SKUs, but BU capacity is 0 in some months.`,
      titleMessage: msg('dq.buZeroCapacity.title'),
      detailMessage: msg('dq.buZeroCapacity.detail'),
      affectedPeriods: Array.from(new Set(buIssues.map((x) => x.split('::')[0]))).sort(),
    });
  }

  // --- 4. Currency Checks ---
  const displayCurrency = params.currencySettings?.displayCurrency ?? 'USD';
  const exchangeRateMode = params.currencySettings?.exchangeRateMode ?? 'constant';

  // Check currency rates if TWD or CNY conversions are needed
  const needsTwdRate = displayCurrency === 'TWD' || forecasts.some((f) => currencyOrUsd(f.unitPriceCurrency) === 'TWD') || skus.some((s) => currencyOrUsd(s.unitPriceCurrency) === 'TWD');
  const needsCnyRate = displayCurrency === 'CNY' || forecasts.some((f) => currencyOrUsd(f.unitPriceCurrency) === 'CNY') || skus.some((s) => currencyOrUsd(s.unitPriceCurrency) === 'CNY');

  if (needsTwdRate) {
    if (exchangeRateMode === 'constant') {
      if (!params.currencySettings?.constantUsdToTwdRate || params.currencySettings.constantUsdToTwdRate <= 0) {
        issues.push({
          id: 'missing-constant-twd-rate',
          severity: 'error',
          domain: 'currency',
          title: 'Missing TWD Exchange Rate',
          detail: 'TWD currency is required but constant exchange rate is missing or invalid.',
          titleMessage: msg('dq.missingTwdConstant.title'),
          detailMessage: msg('dq.missingTwdConstant.detail'),
        });
      }
    } else {
      const missingYears: string[] = [];
      for (const year of forecastYears) {
        const rate = params.currencySettings?.yearlyUsdToTwdRates?.[year];
        if (!rate || rate <= 0) missingYears.push(year);
      }
      if (missingYears.length > 0) {
        issues.push({
          id: 'missing-yearly-twd-rate',
          severity: 'error',
          domain: 'currency',
          title: 'Missing Yearly TWD Exchange Rate',
          detail: `Yearly exchange rate mode enabled but missing rates for years: ${missingYears.join(', ')}.`,
          titleMessage: msg('dq.missingTwdYearly.title'),
          detailMessage: msg('dq.missingTwdYearly.detail', { years: missingYears.join(', ') }),
          affectedPeriods: missingYears.sort(),
        });
      }
    }
  }

  if (needsCnyRate) {
    if (exchangeRateMode === 'constant') {
      if (!params.currencySettings?.constantUsdToCnyRate || params.currencySettings.constantUsdToCnyRate <= 0) {
        issues.push({
          id: 'missing-constant-cny-rate',
          severity: 'error',
          domain: 'currency',
          title: 'Missing CNY Exchange Rate',
          detail: 'CNY currency is required but constant exchange rate is missing or invalid.',
          titleMessage: msg('dq.missingCnyConstant.title'),
          detailMessage: msg('dq.missingCnyConstant.detail'),
        });
      }
    } else {
      const missingYears: string[] = [];
      for (const year of forecastYears) {
        const rate = params.currencySettings?.yearlyUsdToCnyRates?.[year];
        if (!rate || rate <= 0) missingYears.push(year);
      }
      if (missingYears.length > 0) {
        issues.push({
          id: 'missing-yearly-cny-rate',
          severity: 'error',
          domain: 'currency',
          title: 'Missing Yearly CNY Exchange Rate',
          detail: `Yearly exchange rate mode enabled but missing CNY rates for years: ${missingYears.join(', ')}.`,
          titleMessage: msg('dq.missingCnyYearly.title'),
          detailMessage: msg('dq.missingCnyYearly.detail', { years: missingYears.join(', ') }),
          affectedPeriods: missingYears.sort(),
        });
      }
    }
  }

  // --- 5. Business Plan (BP) Targets Checks ---
  const bpTargets = params.bpTargets?.yearlyRevenueTargetsMillionTwd ?? {};
  const activeBpYears = Object.entries(bpTargets)
    .filter((entry) => entry[1] > 0)
    .map(([year]) => year);

  // Warning: BP Target exists but Forecast Revenue is 0
  for (const year of activeBpYears) {
    const hasForecast = forecasts.some((f) => f.month.substring(0, 4) === year && f.forecastPcs > 0);
    if (!hasForecast) {
      issues.push({
        id: `bp-target-zero-forecast-${year}`,
        severity: 'warning',
        domain: 'bp',
        title: 'BP Target Exists Without Forecast Demand',
        detail: `BP target exists for year ${year} but no active monthly SKU forecast demand exists.`,
        titleMessage: msg('dq.bpTargetZeroForecast.title'),
        detailMessage: msg('dq.bpTargetZeroForecast.detail', { year }),
        affectedPeriods: [year],
      });
    }
  }

  // Warning: Forecast exists but BP target missing
  for (const year of forecastYears) {
    const bpTarget = bpTargets[year];
    if (bpTarget === undefined || bpTarget === null || bpTarget === 0) {
      issues.push({
        id: `forecast-missing-bp-target-${year}`,
        severity: 'warning',
        domain: 'bp',
        title: 'Forecast Exists Without BP Target Config',
        detail: `Forecast demand exists for year ${year} but no BP target is configured in Parameters.`,
        titleMessage: msg('dq.forecastMissingBpTarget.title'),
        detailMessage: msg('dq.forecastMissingBpTarget.detail', { year }),
        affectedPeriods: [year],
      });
    }
  }

  // --- 6. Systems Info Checks ---
  issues.push({
    id: 'bp-target-evenly-allocated',
    severity: 'info',
    domain: 'bp',
    title: 'BP Targets Allocation Method',
    detail: 'Yearly BP target targets are evenly allocated to quarter (annual / 4) and month (annual / 12) inside analysis.',
    titleMessage: msg('dq.bpAllocationInfo.title'),
    detailMessage: msg('dq.bpAllocationInfo.detail'),
  });

  issues.push({
    id: 'fixed-working-days',
    severity: 'info',
    domain: 'parameters',
    title: 'Fixed Working Days Configuration',
    detail: `Working days are fixed across all monthly summaries (Default: ${params.defaultWorkingDays ?? 28} days/month).`,
    titleMessage: msg('dq.fixedWorkingDays.title'),
    detailMessage: msg('dq.fixedWorkingDays.detail', { days: params.defaultWorkingDays ?? 28 }),
  });

  // --- Determine Status and Confidence ---
  const hasErrors = issues.some((i) => i.severity === 'error');
  const hasWarnings = issues.some((i) => i.severity === 'warning');

  let status: DataQualitySummary['status'] = 'ok';
  let confidence: DataQualitySummary['confidence'] = 'high';

  if (hasErrors) {
    status = 'error';
    confidence = 'low';
  } else if (hasWarnings) {
    status = 'warning';
    confidence = 'medium';
  }

  return {
    status,
    confidence,
    issues: issues.map(enrichWithImpact),
  };
}

/**
 * Phase 5.3B — assign decisionImpact to each issue deterministically by id pattern.
 * Producers do not need to set this manually. The enrichment is layered ON TOP of
 * severity so a "warning" can still be high-impact (e.g., orphan forecast warnings).
 */
function enrichWithImpact(issue: DataQualityIssue): DataQualityIssue {
  if (issue.decisionImpact !== undefined) return issue;
  const id = issue.id;
  let impact: 'high' | 'medium' | 'low' = 'low';
  if (
    id.startsWith('forecast-orphan-sku-') ||
    id === 'forecast-missing-capacity' ||
    id === 'bu-demand-zero-capacity' ||
    id === 'missing-constant-twd-rate' ||
    id === 'missing-yearly-twd-rate' ||
    id === 'missing-constant-cny-rate' ||
    id === 'missing-yearly-cny-rate' ||
    id.startsWith('sku-missing-attr-')
  ) {
    impact = 'high';
  } else if (
    id.startsWith('sku-zero-price-') ||
    id.startsWith('forecast-zero-price-') ||
    id.startsWith('forecast-partial-year-') ||
    id.startsWith('sku-unsupported-currency-') ||
    id.startsWith('forecast-missing-bp-target-') ||
    id.startsWith('bp-target-zero-forecast-')
  ) {
    impact = 'medium';
  } else if (
    id === 'capacity-without-forecast' ||
    id === 'bp-target-evenly-allocated' ||
    id === 'fixed-working-days' ||
    id === 'no-data-blocked'
  ) {
    impact = 'low';
  } else {
    // Fallback: derive from severity
    if (issue.severity === 'error') impact = 'high';
    else if (issue.severity === 'warning') impact = 'medium';
  }
  return { ...issue, decisionImpact: impact };
}
