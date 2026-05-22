import type {
  SKU,
  Forecast,
  CapacityPlan,
  ProjectParameters,
  SkuCalculationResult,
  MonthlyCapacitySummary,
  CalculationResult,
} from '../types';
import { getYieldRate } from './yieldMatrix';
import { calculatePanelLayout } from './panelLayout';

export function calculateSteps(layerCount: number): { coreSteps: number; buSteps: number } {
  const coreSteps = 1;
  const buSteps = Math.max(Math.floor(layerCount / 2) - 1, 0);
  return { coreSteps, buSteps };
}

export function calculateSkuMonth(
  sku: SKU,
  forecast: Forecast,
  params: ProjectParameters
): SkuCalculationResult {
  const yieldRate = getYieldRate(sku.sizeCategory, sku.layerCount, params.yieldMatrix);
  const requiredInputPcs = Math.ceil(forecast.forecastPcs / yieldRate);
  const panelResult = calculatePanelLayout(sku.chipLengthMm, sku.chipWidthMm, params.panelParams);

  if (panelResult.error || panelResult.pcsPerPanel <= 0) {
    throw new Error(`Panel layout error for SKU ${sku.skuCode}: ${panelResult.error}`);
  }

  const pcsPerPanel = panelResult.pcsPerPanel;
  const requiredPanels = Math.ceil(requiredInputPcs / pcsPerPanel);
  const { coreSteps, buSteps } = calculateSteps(sku.layerCount);
  const corePanelDemand = requiredPanels * coreSteps;
  const buPanelDemand = requiredPanels * buSteps;
  const revenue = forecast.forecastPcs * forecast.unitPrice;

  return {
    skuId: sku.id,
    skuCode: sku.skuCode,
    month: forecast.month,
    forecastPcs: forecast.forecastPcs,
    unitPrice: forecast.unitPrice,
    yieldRate,
    requiredInputPcs,
    pcsPerPanel,
    requiredPanels,
    coreSteps,
    buSteps,
    corePanelDemand,
    buPanelDemand,
    revenue,
  };
}

export function runCalculation(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters
): CalculationResult {
  // Aggregate capacity by month (sum across factories)
  const capacityMap = new Map<string, { corePanelPerDay: number; buPanelPerDay: number }>();
  for (const cp of capacityPlans) {
    const existing = capacityMap.get(cp.month) || { corePanelPerDay: 0, buPanelPerDay: 0 };
    existing.corePanelPerDay += cp.corePanelPerDay;
    existing.buPanelPerDay += cp.buPanelPerDay;
    capacityMap.set(cp.month, existing);
  }

  const workingDays = params.defaultWorkingDays || 28;

  const skuResults: SkuCalculationResult[] = [];
  for (const sku of skus) {
    const skuForecasts = forecasts.filter((f) => f.skuId === sku.id);
    for (const fc of skuForecasts) {
      if (fc.forecastPcs <= 0) continue;
      const result = calculateSkuMonth(sku, fc, params);
      skuResults.push(result);
    }
  }

  const monthSet = new Set<string>();
  for (const fc of forecasts) {
    if (fc.forecastPcs > 0) monthSet.add(fc.month);
  }
  for (const cp of capacityPlans) {
    monthSet.add(cp.month);
  }

  const monthlySummaries: MonthlyCapacitySummary[] = [];
  const sortedMonths = Array.from(monthSet).sort();

  for (const month of sortedMonths) {
    const monthResults = skuResults.filter((r) => r.month === month);
    const totalCorePanelDemand = monthResults.reduce((sum, r) => sum + r.corePanelDemand, 0);
    const totalBuPanelDemand = monthResults.reduce((sum, r) => sum + r.buPanelDemand, 0);

    const cp = capacityMap.get(month);
    const coreCapacity = cp ? cp.corePanelPerDay * workingDays : 0;
    const buCapacity = cp ? cp.buPanelPerDay * workingDays : 0;

    const coreUtilization: number | null =
      coreCapacity > 0 ? totalCorePanelDemand / coreCapacity
        : totalCorePanelDemand > 0 ? null
        : 0;

    const buUtilization: number | null =
      buCapacity > 0 ? totalBuPanelDemand / buCapacity
        : totalBuPanelDemand > 0 ? null
        : 0;

    const coreShortage = Math.max(totalCorePanelDemand - coreCapacity, 0);
    const buShortage = Math.max(totalBuPanelDemand - buCapacity, 0);

    let bottleneck: 'Core' | 'BU' | 'None' = 'None';
    if (coreShortage > 0 && buShortage > 0) {
      bottleneck = coreShortage >= buShortage ? 'Core' : 'BU';
    } else if (coreShortage > 0) {
      bottleneck = 'Core';
    } else if (buShortage > 0) {
      bottleneck = 'BU';
    }

    monthlySummaries.push({
      month,
      totalCorePanelDemand,
      totalBuPanelDemand,
      coreCapacity,
      buCapacity,
      coreUtilization,
      buUtilization,
      coreShortage,
      buShortage,
      bottleneck,
    });
  }

  const totalRevenue = skuResults.reduce((sum, r) => sum + r.revenue, 0);
  const totalForecastPcs = skuResults.reduce((sum, r) => sum + r.forecastPcs, 0);

  const coreUtils = monthlySummaries
    .map((s) => (s.coreUtilization === null ? Infinity : s.coreUtilization))
    .filter((u) => u > 0);
  const buUtils = monthlySummaries
    .map((s) => (s.buUtilization === null ? Infinity : s.buUtilization))
    .filter((u) => u > 0);

  const maxCoreUtilization = coreUtils.length > 0 ? Math.max(...coreUtils) : null;
  const maxBuUtilization = buUtils.length > 0 ? Math.max(...buUtils) : null;

  const shortageMonths = monthlySummaries.filter(
    (s) => s.coreShortage > 0 || s.buShortage > 0
  );
  const shortageMonthCount = shortageMonths.length;

  let worstBottleneckMonth: string | null = null;
  if (shortageMonthCount > 0) {
    const worst = shortageMonths.reduce((a, b) =>
      a.coreShortage + a.buShortage >= b.coreShortage + b.buShortage ? a : b
    );
    worstBottleneckMonth = worst.month;
  }

  return {
    skuResults,
    monthlySummaries,
    totalRevenue,
    totalForecastPcs,
    maxCoreUtilization,
    maxBuUtilization,
    shortageMonthCount,
    worstBottleneckMonth,
  };
}
