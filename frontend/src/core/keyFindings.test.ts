import { describe, it, expect } from 'vitest';
import { buildKeyFindings, MAX_FINDINGS } from './keyFindings';
import { buildDataQualitySummary } from './dataQuality';
import { runCalculation } from './calculationEngine';
import { buildAnalyticsModel } from './analytics';
import { buildRiskAttributionModel } from './riskAttribution';
import { buildBpAnalysis } from './bpTargets';
import { buildBpAttributionModel } from './bpAttribution';
import { buildPriceImpact, buildCapacityImpact } from './impactAnalysis';
import { DEFAULT_YIELD_MATRIX, DEFAULT_PANEL_PARAMS } from './defaults';
import type { SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';
import type { CurrencySettings } from './currency';

const currencySettings: CurrencySettings = {
  baseCurrency: 'USD',
  displayCurrency: 'USD',
  exchangeRateMode: 'constant',
  constantUsdToTwdRate: 32,
  yearlyUsdToTwdRates: {},
  constantUsdToCnyRate: 7.2,
  yearlyUsdToCnyRates: {},
};

const defaultParams: ProjectParameters = {
  defaultWorkingDays: 28,
  yieldMatrix: DEFAULT_YIELD_MATRIX,
  panelParams: DEFAULT_PANEL_PARAMS,
  currencySettings,
};

function makeSku(overrides: Partial<SKU> = {}): SKU {
  return {
    id: 'sku-1',
    skuCode: 'SKU-001',
    customer: 'Customer A',
    deviceName: 'Device-A',
    osat: 'ASE',
    application: 'Mobile',
    productGrade: 'A',
    sizeCategory: 'medium',
    chipLengthMm: 10,
    chipWidthMm: 10,
    layerCount: 8,
    unitPrice: 5.0,
    unitPriceCurrency: 'USD',
    ...overrides,
  };
}

function makeForecast(overrides: Partial<Forecast> = {}): Forecast {
  return {
    id: 'fc-1',
    skuId: 'sku-1',
    month: '2026-01',
    forecastPcs: 10000,
    unitPrice: 5.0,
    unitPriceCurrency: 'USD',
    ...overrides,
  };
}

function makeCapacity(overrides: Partial<CapacityPlan> = {}): CapacityPlan {
  return {
    id: 'cp-1',
    month: '2026-01',
    factoryId: 'fab-a',
    corePanelPerDay: 6000,
    buPanelPerDay: 5000,
    ...overrides,
  };
}

function buildYear(skus: SKU[], pcs: number, opts?: { core?: number; bu?: number }) {
  const forecasts: Forecast[] = [];
  const capacityPlans: CapacityPlan[] = [];
  let i = 0;
  for (let m = 1; m <= 12; m++) {
    const month = `2026-${String(m).padStart(2, '0')}`;
    for (const sku of skus) {
      i++;
      forecasts.push(makeForecast({ id: `fc-${i}`, skuId: sku.id, month, forecastPcs: pcs, unitPrice: sku.unitPrice }));
    }
    capacityPlans.push(makeCapacity({ id: `cp-${m}`, month, corePanelPerDay: opts?.core ?? 6000, buPanelPerDay: opts?.bu ?? 5000 }));
  }
  return { forecasts, capacityPlans };
}

describe('keyFindings — Phase 5.3B', () => {
  it('returns empty list when no inputs are provided', () => {
    expect(buildKeyFindings({})).toEqual([]);
  });

  it('returns at most MAX_FINDINGS findings', () => {
    // Build a noisy scenario that triggers many sources.
    const skus = [makeSku({ unitPrice: 10 })];
    const { forecasts, capacityPlans } = buildYear(skus, 100000, { core: 50, bu: 50 });
    const analytics = buildAnalyticsModel(skus, forecasts, capacityPlans, defaultParams);
    const calc = runCalculation(skus, forecasts, capacityPlans, defaultParams);
    const risk = buildRiskAttributionModel(analytics, skus);
    const bp = buildBpAnalysis(calc.skuResults, skus, calc.monthlySummaries, { '2026': 1000 }, currencySettings);
    const bpAttr = buildBpAttributionModel(bp, calc.skuResults, skus, currencySettings);
    const price = buildPriceImpact(skus, forecasts, capacityPlans, defaultParams, currencySettings, { '2026': 1000 });
    const cap = buildCapacityImpact(skus, forecasts, capacityPlans, defaultParams);
    const dq = buildDataQualitySummary({ skus, forecasts, capacityPlans, params: defaultParams });

    const findings = buildKeyFindings({
      risk,
      bp,
      bpAttribution: bpAttr,
      priceImpact: price,
      capacityImpact: cap,
      dataQuality: dq,
    });
    expect(findings.length).toBeLessThanOrEqual(MAX_FINDINGS);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('shortage months produce a capacity finding', () => {
    const skus = [makeSku()];
    // Mirror the shortage scenario used elsewhere: very small capacity vs huge pcs.
    const { forecasts, capacityPlans } = buildYear(skus, 10_000_000, { core: 10, bu: 10 });
    const analytics = buildAnalyticsModel(skus, forecasts, capacityPlans, defaultParams);
    const risk = buildRiskAttributionModel(analytics, skus);
    expect(risk.shortageMonths.length).toBeGreaterThan(0);
    const findings = buildKeyFindings({ risk });
    expect(findings.some((f) => f.id === 'kf-capacity-shortage')).toBe(true);
  });

  it('BP miss produces a BP finding', () => {
    const skus = [makeSku()];
    const { forecasts, capacityPlans } = buildYear(skus, 1000);
    const calc = runCalculation(skus, forecasts, capacityPlans, defaultParams);
    const bp = buildBpAnalysis(calc.skuResults, skus, calc.monthlySummaries, { '2026': 100000 }, currencySettings);
    const findings = buildKeyFindings({ bp });
    expect(findings.some((f) => f.id === 'kf-bp-miss')).toBe(true);
  });

  it('high price sensitivity produces a price finding', () => {
    const skus = [makeSku({ unitPrice: 10 })];
    const { forecasts, capacityPlans } = buildYear(skus, 1000);
    const priceImpact = buildPriceImpact(skus, forecasts, capacityPlans, defaultParams, currencySettings, { '2026': 50 });
    const findings = buildKeyFindings({ priceImpact });
    expect(findings.some((f) => f.id === 'kf-price-sensitivity')).toBe(true);
  });

  it('capacity improvement scenario produces a positive finding when it resolves months', () => {
    const skus = [makeSku()];
    const { forecasts, capacityPlans } = buildYear(skus, 100000, { core: 4400, bu: 4400 });
    const cap = buildCapacityImpact(skus, forecasts, capacityPlans, defaultParams);
    const findings = buildKeyFindings({ capacityImpact: cap });
    const remedy = findings.find((f) => f.id === 'kf-capacity-remedy');
    // Only assert positive existence when a scenario actually resolves at least one month.
    const anyResolved = cap.scenarios.some((s) => s.resolvedShortageMonths.length > 0);
    if (anyResolved) {
      expect(remedy).toBeDefined();
      expect(remedy!.severity).toBe('positive');
    }
  });

  it('high decisionImpact data quality issue produces a critical finding', () => {
    // Construct an "orphan forecast" via skuId that does not exist
    const skus = [makeSku()];
    const forecasts: Forecast[] = [makeForecast({ id: 'orphan', skuId: 'nope' })];
    const capacityPlans = [makeCapacity({ month: '2026-01' })];
    const dq = buildDataQualitySummary({ skus, forecasts, capacityPlans, params: defaultParams });
    const findings = buildKeyFindings({ dataQuality: dq });
    const dqFinding = findings.find((f) => f.id === 'kf-dq-high');
    expect(dqFinding).toBeDefined();
    expect(dqFinding!.severity).toBe('critical');
  });

  it('sorts critical before warning before info before positive', () => {
    const skus = [makeSku()];
    const { forecasts, capacityPlans } = buildYear(skus, 100000, { core: 50, bu: 50 });
    const analytics = buildAnalyticsModel(skus, forecasts, capacityPlans, defaultParams);
    const calc = runCalculation(skus, forecasts, capacityPlans, defaultParams);
    const risk = buildRiskAttributionModel(analytics, skus);
    const bp = buildBpAnalysis(calc.skuResults, skus, calc.monthlySummaries, { '2026': 100000 }, currencySettings);
    const findings = buildKeyFindings({ risk, bp });
    const rank = { critical: 0, warning: 1, info: 2, positive: 3 } as const;
    for (let i = 1; i < findings.length; i++) {
      expect(rank[findings[i].severity]).toBeGreaterThanOrEqual(rank[findings[i - 1].severity]);
    }
  });
});
