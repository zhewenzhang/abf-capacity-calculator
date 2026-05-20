/**
 * Analytics helper layer for Dashboard and Results pages.
 * Consumes SKU[], Forecast[], CapacityPlan[], ProjectParameters
 * and produces derived structures for analysis.
 */

import type {
  SKU,
  Forecast,
  CapacityPlan,
  ProjectParameters,
  SkuCalculationResult,
  MonthlyCapacitySummary,
} from '../types';
import { runCalculation } from './calculationEngine';

// --- Time helpers ---

function parseMonth(m: string) {
  const [y, mo] = m.split('-').map(Number);
  return { year: y, month: mo };
}

export function toQuarter(m: string): string {
  const { year, month } = parseMonth(m);
  const q = Math.ceil(month / 3);
  return `${year}-Q${q}`;
}

export function toYear(m: string): string {
  return String(parseMonth(m).year);
}

export function quarterMonths(q: string): string[] {
  const [yStr, qStr] = q.split('-Q');
  const y = parseInt(yStr, 10);
  const qNum = parseInt(qStr, 10);
  const startM = (qNum - 1) * 3 + 1;
  return [startM, startM + 1, startM + 2].map(m => `${y}-${String(m).padStart(2, '0')}`);
}

export function yearMonths(y: string): string[] {
  const yNum = parseInt(y, 10);
  return Array.from({ length: 12 }, (_, i) => `${yNum}-${String(i + 1).padStart(2, '0')}`);
}

function monthsToYears(months: string[]): string[] {
  const set = new Set<string>();
  months.forEach(m => set.add(toYear(m)));
  return Array.from(set).sort();
}

// --- Core analytics model ---

export interface YearlyHealth {
  year: string;
  revenue: number;
  forecastPcs: number;
  coreDemand: number;
  coreCapacity: number;
  coreUtil: number | null; // null = over capacity
  buDemand: number;
  buCapacity: number;
  buUtil: number | null;
  shortageMonths: string[];
  bottleneck: 'Core' | 'BU' | 'None';
  severity: 'red' | 'orange' | 'green';
}

export interface DimensionRow {
  label: string;
  values: Record<string, number>; // timePeriod -> value
}

export interface AnalyticsModel {
  // Raw calculation results
  skuResults: SkuCalculationResult[];
  monthlySummaries: MonthlyCapacitySummary[];
  totalRevenue: number;
  totalForecastPcs: number;
  maxCoreUtil: number | null;
  maxBuUtil: number | null;
  shortageMonthCount: number;
  worstMonth: string | null;
  allMonths: string[];

  // Yearly health
  yearlyHealth: YearlyHealth[];

  // Monthly revenue by year for chart
  monthlyRevenue: { month: string; revenue: number }[];

  // Monthly utilization for chart
  monthlyUtilization: { month: string; coreUtil: number | null; buUtil: number | null }[];

  // Dimension matrices
  revenueByCustomer: DimensionRow[];
  forecastByCustomer: DimensionRow[];
  revenueBySku: DimensionRow[];
  revenueBySize: DimensionRow[];
  coreDemandBySize: DimensionRow[];
  buDemandBySize: DimensionRow[];
  coreDemandByApplication: DimensionRow[];
  buDemandByApplication: DimensionRow[];
  revenueByApplication: DimensionRow[];
  revenueByProductGrade: DimensionRow[];
  coreDemandByProductGrade: DimensionRow[];
  buDemandByProductGrade: DimensionRow[];
  coreDemandByLayerBucket: DimensionRow[];
  buDemandByLayerBucket: DimensionRow[];
}

function getLayerBucket(layerCount: number): string {
  if (layerCount <= 8) return '2-8L';
  if (layerCount <= 14) return '10-14L';
  if (layerCount <= 20) return '16-20L';
  return '20L+';
}

export function buildAnalyticsModel(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters
): AnalyticsModel {
  const calc = runCalculation(skus, forecasts, capacityPlans, params);

  const {
    skuResults,
    monthlySummaries,
    totalRevenue,
    totalForecastPcs,
    maxCoreUtilization: maxCoreUtil,
    maxBuUtilization: maxBuUtil,
    shortageMonthCount,
    worstBottleneckMonth: worstMonth,
  } = calc;

  const allMonths = monthlySummaries.map(s => s.month);
  const years = monthsToYears(allMonths);
  const workingDays = params.defaultWorkingDays ?? 28;

  // Build capacityMap
  const capacityMap = new Map<string, { corePanelPerDay: number; buPanelPerDay: number }>();
  for (const cp of capacityPlans) {
    const existing = capacityMap.get(cp.month) || { corePanelPerDay: 0, buPanelPerDay: 0 };
    existing.corePanelPerDay += cp.corePanelPerDay;
    existing.buPanelPerDay += cp.buPanelPerDay;
    capacityMap.set(cp.month, existing);
  }

  // SKU lookup
  const skuMap = new Map<string, SKU>();
  skus.forEach(s => skuMap.set(s.id, s));

  // --- Yearly health ---
  const yearlyHealth: YearlyHealth[] = years.map(year => {
    const months = yearMonths(year);
    const relevantMonths = months.filter(m => monthlySummaries.some(s => s.month === m));
    if (relevantMonths.length === 0) {
      return {
        year, revenue: 0, forecastPcs: 0, coreDemand: 0, coreCapacity: 0,
        coreUtil: 0, buDemand: 0, buCapacity: 0, buUtil: 0,
        shortageMonths: [], bottleneck: 'None' as const, severity: 'green' as const,
      };
    }

    let revenue = 0;
    let forecastPcs = 0;
    let coreDemand = 0;
    let coreCapacity = 0;
    let buDemand = 0;
    let buCapacity = 0;
    const shortageMonths: string[] = [];
    let maxCoreUtil: number | null = null;
    let maxBuUtil: number | null = null;
    let bottleneck: 'Core' | 'BU' | 'None' = 'None';

    for (const m of relevantMonths) {
      const summary = monthlySummaries.find(s => s.month === m);
      if (!summary) continue;
      // Revenue and forecast from skuResults
      const monthResults = skuResults.filter(r => r.month === m);
      revenue += monthResults.reduce((s, r) => s + r.revenue, 0);
      forecastPcs += monthResults.reduce((s, r) => s + r.forecastPcs, 0);
      coreDemand += summary.totalCorePanelDemand;
      buDemand += summary.totalBuPanelDemand;

      const cp = capacityMap.get(m);
      const cc = cp ? cp.corePanelPerDay * workingDays : 0;
      const bc = cp ? cp.buPanelPerDay * workingDays : 0;
      coreCapacity += cc;
      buCapacity += bc;

      if (summary.coreUtilization !== null) {
        if (maxCoreUtil === null || summary.coreUtilization > maxCoreUtil) maxCoreUtil = summary.coreUtilization;
      } else if (summary.totalCorePanelDemand > 0) {
        maxCoreUtil = null;
      }
      if (summary.buUtilization !== null) {
        if (maxBuUtil === null || summary.buUtilization > maxBuUtil) maxBuUtil = summary.buUtilization;
      } else if (summary.totalBuPanelDemand > 0) {
        maxBuUtil = null;
      }

      if (summary.coreShortage > 0 || summary.buShortage > 0) {
        shortageMonths.push(m);
      }
      if (summary.bottleneck !== 'None') {
        if (bottleneck === 'None') bottleneck = summary.bottleneck;
      }
    }

    // Compute yearly util as demand/capacity
    const coreUtil = coreCapacity > 0 ? coreDemand / coreCapacity : (coreDemand > 0 ? null : 0);
    const buUtil = buCapacity > 0 ? buDemand / buCapacity : (buDemand > 0 ? null : 0);

    // Severity: red if any month >100%, orange if >=85%, else green
    const severity = shortageMonths.length > 0
      ? 'red'
      : (coreUtil !== null && coreUtil >= 0.85) || (buUtil !== null && buUtil >= 0.85)
        ? 'orange'
        : 'green';

    return {
      year, revenue, forecastPcs, coreDemand, coreCapacity, coreUtil,
      buDemand, buCapacity, buUtil, shortageMonths, bottleneck, severity,
    };
  });

  // --- Monthly revenue for chart ---
  const monthlyRevenue = allMonths.map(m => {
    const monthResults = skuResults.filter(r => r.month === m);
    return {
      month: m,
      revenue: monthResults.reduce((s, r) => s + r.revenue, 0),
    };
  });

  // --- Monthly utilization for chart ---
  const monthlyUtilization = monthlySummaries.map(s => ({
    month: s.month,
    coreUtil: s.coreUtilization,
    buUtil: s.buUtilization,
  }));

  // --- Dimension matrices ---
  // Helper: group skuResults by a dimension key, aggregate by year
  function buildDimensionMatrix(
    dimensionFn: (sku: SKU) => string,
    valueFn: (r: SkuCalculationResult) => number,
    timeFn: (m: string) => string = toYear
  ): DimensionRow[] {
    const dimMap = new Map<string, Map<string, number>>();
    for (const r of skuResults) {
      const sku = skuMap.get(r.skuId);
      if (!sku) continue;
      const dim = dimensionFn(sku);
      const time = timeFn(r.month);
      if (!dimMap.has(dim)) dimMap.set(dim, new Map());
      const timeMap = dimMap.get(dim)!;
      timeMap.set(time, (timeMap.get(time) || 0) + valueFn(r));
    }
    const rows: DimensionRow[] = [];
    for (const [label, timeMap] of dimMap) {
      const values: Record<string, number> = {};
      timeMap.forEach((v, t) => { values[t] = v; });
      rows.push({ label, values });
    }
    rows.sort((a, b) => {
      const aTotal = Object.values(a.values).reduce((s, v) => s + v, 0);
      const bTotal = Object.values(b.values).reduce((s, v) => s + v, 0);
      return bTotal - aTotal; // descending
    });
    return rows;
  }

  const revenueByCustomer = buildDimensionMatrix(s => s.customer, r => r.revenue);
  const forecastByCustomer = buildDimensionMatrix(s => s.customer, r => r.forecastPcs);
  const revenueBySku = buildDimensionMatrix(s => s.skuCode, r => r.revenue);
  const revenueBySize = buildDimensionMatrix(s => s.sizeCategory, r => r.revenue);
  const coreDemandBySize = buildDimensionMatrix(s => s.sizeCategory, r => r.corePanelDemand);
  const buDemandBySize = buildDimensionMatrix(s => s.sizeCategory, r => r.buPanelDemand);
  const coreDemandByApplication = buildDimensionMatrix(s => s.application, r => r.corePanelDemand);
  const buDemandByApplication = buildDimensionMatrix(s => s.application, r => r.buPanelDemand);
  const revenueByApplication = buildDimensionMatrix(s => s.application, r => r.revenue);
  const revenueByProductGrade = buildDimensionMatrix(s => s.productGrade, r => r.revenue);
  const coreDemandByProductGrade = buildDimensionMatrix(s => s.productGrade, r => r.corePanelDemand);
  const buDemandByProductGrade = buildDimensionMatrix(s => s.productGrade, r => r.buPanelDemand);
  const coreDemandByLayerBucket = buildDimensionMatrix(s => getLayerBucket(s.layerCount), r => r.corePanelDemand);
  const buDemandByLayerBucket = buildDimensionMatrix(s => getLayerBucket(s.layerCount), r => r.buPanelDemand);

  return {
    skuResults,
    monthlySummaries,
    totalRevenue,
    totalForecastPcs,
    maxCoreUtil,
    maxBuUtil,
    shortageMonthCount,
    worstMonth,
    allMonths,
    yearlyHealth,
    monthlyRevenue,
    monthlyUtilization,
    revenueByCustomer,
    forecastByCustomer,
    revenueBySku,
    revenueBySize,
    coreDemandBySize,
    buDemandBySize,
    coreDemandByApplication,
    buDemandByApplication,
    revenueByApplication,
    revenueByProductGrade,
    coreDemandByProductGrade,
    buDemandByProductGrade,
    coreDemandByLayerBucket,
    buDemandByLayerBucket,
  };
}

// --- Dashboard highlights ---

export interface DashboardHighlights {
  worstYear: string | null;
  revenueTrend: 'up' | 'down' | 'flat';
  peakRevenueYear: string | null;
  bottleneckDriver: 'Core' | 'BU' | 'None';
  topCustomer: string | null;
  topSizeCategory: string | null;
}

export function getDashboardHighlights(model: AnalyticsModel): DashboardHighlights {
  // Worst year: highest utilization or most shortage months
  const problematicYears = model.yearlyHealth.filter(y => y.severity === 'red' || y.severity === 'orange');
  const worstYear = problematicYears.length > 0
    ? problematicYears.reduce((a, b) => {
        const aScore = a.shortageMonths.length * 100 + (a.coreUtil !== null && a.coreUtil > 1 ? a.coreUtil * 1000 : 0) + (a.buUtil !== null && a.buUtil > 1 ? a.buUtil * 1000 : 0);
        const bScore = b.shortageMonths.length * 100 + (b.coreUtil !== null && b.coreUtil > 1 ? b.coreUtil * 1000 : 0) + (b.buUtil !== null && b.buUtil > 1 ? b.buUtil * 1000 : 0);
        return aScore >= bScore ? a : b;
      }).year
    : null;

  // Revenue trend: compare first half vs second half of years
  const years = model.yearlyHealth.filter(y => y.revenue > 0);
  let revenueTrend: 'up' | 'down' | 'flat' = 'flat';
  if (years.length >= 2) {
    const firstHalf = years.slice(0, Math.ceil(years.length / 2));
    const secondHalf = years.slice(Math.ceil(years.length / 2));
    const firstAvg = firstHalf.reduce((s, y) => s + y.revenue, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, y) => s + y.revenue, 0) / secondHalf.length;
    if (secondAvg > firstAvg * 1.1) revenueTrend = 'up';
    else if (secondAvg < firstAvg * 0.9) revenueTrend = 'down';
  }

  const peakRevenueYear = years.length > 0
    ? years.reduce((a, b) => a.revenue >= b.revenue ? a : b).year
    : null;

  // Bottleneck driver
  let coreMonths = 0, buMonths = 0;
  model.monthlySummaries.forEach(s => {
    if (s.bottleneck === 'Core') coreMonths++;
    if (s.bottleneck === 'BU') buMonths++;
  });
  const bottleneckDriver = coreMonths > buMonths ? 'Core' : buMonths > coreMonths ? 'BU' : 'None';

  // Top customer
  const topCustomer = model.revenueByCustomer.length > 0
    ? model.revenueByCustomer[0].label
    : null;

  // Top size category
  const topSizeCategory = model.revenueBySize.length > 0
    ? model.revenueBySize[0].label
    : null;

  return { worstYear, revenueTrend, peakRevenueYear, bottleneckDriver, topCustomer, topSizeCategory };
}

// --- Shortage exposure by customer ---
// For months with shortage, sum up the demand from each customer's SKUs
export interface ShortageExposure {
  customer: string;
  values: Record<string, number>; // year -> core demand in shortage months
}

export function buildShortageExposure(model: AnalyticsModel, skus: SKU[]): ShortageExposure[] {
  const skuMap = new Map<string, SKU>();
  skus.forEach(s => skuMap.set(s.id, s));

  const shortageMonthSet = new Set(
    model.monthlySummaries.filter(s => s.coreShortage > 0 || s.buShortage > 0).map(s => s.month)
  );

  const expMap = new Map<string, Map<string, number>>();
  for (const r of model.skuResults) {
    if (!shortageMonthSet.has(r.month)) continue;
    const sku = skuMap.get(r.skuId);
    if (!sku) continue;
    const customer = sku.customer;
    const year = toYear(r.month);
    if (!expMap.has(customer)) expMap.set(customer, new Map());
    const yMap = expMap.get(customer)!;
    yMap.set(year, (yMap.get(year) || 0) + r.corePanelDemand);
  }

  const rows: ShortageExposure[] = [];
  expMap.forEach((yMap, customer) => {
    const values: Record<string, number> = {};
    yMap.forEach((v, y) => { values[y] = v; });
    rows.push({ customer, values });
  });
  rows.sort((a, b) => {
    const aTotal = Object.values(a.values).reduce((s, v) => s + v, 0);
    const bTotal = Object.values(b.values).reduce((s, v) => s + v, 0);
    return bTotal - aTotal;
  });
  return rows;
}
