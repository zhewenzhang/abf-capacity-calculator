/**
 * ABF Capacity Calculator - Metric Registry
 * Defines core metrics, formulas, units, data sources, and target views.
 */

export type MetricUnit =
  | 'pcs'
  | 'panel'
  | 'percent'
  | 'usd'
  | 'millionTwd'
  | 'month'
  | 'text';

export type MetricSource =
  | 'products'
  | 'forecasts'
  | 'capacityPlans'
  | 'parameters'
  | 'calculation'
  | 'analytics'
  | 'bpTargets';

export type OwnerView =
  | 'sales'
  | 'productPlanning'
  | 'capacity'
  | 'executive';

export interface MetricDefinition {
  id: string;
  labelKey: string;
  definition: string;
  formula: string;
  unit: MetricUnit;
  source: MetricSource[];
  ownerView: OwnerView[];
  zeroHandling?: string;
  nullHandling?: string;
  caveats?: string[];
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    id: 'forecastPcs',
    labelKey: 'results.forecastPcs',
    definition: 'Customer monthly sales forecast volume in units (pcs).',
    formula: 'Input by SKU and month',
    unit: 'pcs',
    source: ['forecasts'],
    ownerView: ['sales', 'executive'],
  },
  {
    id: 'revenueUsd',
    labelKey: 'results.revenue',
    definition: 'Monthly forecast revenue in USD base.',
    formula: 'forecastPcs * unitPriceUsd',
    unit: 'usd',
    source: ['forecasts', 'products', 'calculation'],
    ownerView: ['sales', 'executive'],
    caveats: [
      'Original unit price may be entered in USD, TWD, or CNY; calculation normalizes it to USD first using parameters exchange rates.',
    ],
  },
  {
    id: 'coreDemand',
    labelKey: 'results.coreDemand',
    definition: 'Total required Core panels per month to satisfy forecast volume after yield adjustments.',
    formula: 'ceil(ceil(forecastPcs / yieldRate) / pcsPerPanel) * coreSteps',
    unit: 'panel',
    source: ['calculation'],
    ownerView: ['productPlanning', 'capacity'],
    caveats: ['coreSteps is fixed to 1 step for all layers.'],
  },
  {
    id: 'buDemand',
    labelKey: 'results.buDemand',
    definition: 'Total required Build-up (BU) panels per month after yield adjustments.',
    formula: 'ceil(ceil(forecastPcs / yieldRate) / pcsPerPanel) * buSteps',
    unit: 'panel',
    source: ['calculation'],
    ownerView: ['productPlanning', 'capacity'],
    caveats: ['buSteps is derived from layer count: max(layerCount / 2 - 1, 0).'],
  },
  {
    id: 'coreCapacity',
    labelKey: 'results.coreCapacity',
    definition: 'Total available monthly Core panels across all active factories.',
    formula: 'sum(corePanelPerDay * workingDays) per factory',
    unit: 'panel',
    source: ['capacityPlans'],
    ownerView: ['capacity'],
  },
  {
    id: 'buCapacity',
    labelKey: 'results.buCapacity',
    definition: 'Total available monthly Build-up (BU) panels across all active factories.',
    formula: 'sum(buPanelPerDay * workingDays) per factory',
    unit: 'panel',
    source: ['capacityPlans'],
    ownerView: ['capacity'],
  },
  {
    id: 'coreUtilization',
    labelKey: 'results.coreUtil',
    definition: 'Core panel production capacity utilization rate.',
    formula: 'coreDemand / coreCapacity',
    unit: 'percent',
    source: ['analytics'],
    ownerView: ['capacity', 'executive'],
    nullHandling: 'Returns null (over capacity) if coreCapacity is 0 and coreDemand > 0.',
  },
  {
    id: 'buUtilization',
    labelKey: 'results.buUtil',
    definition: 'Build-up (BU) panel production capacity utilization rate.',
    formula: 'buDemand / buCapacity',
    unit: 'percent',
    source: ['analytics'],
    ownerView: ['capacity', 'executive'],
    nullHandling: 'Returns null (over capacity) if buCapacity is 0 and buDemand > 0.',
    caveats: ['BU capacity = 0 and BU demand > 0 is flagged as severe risk.'],
  },
  {
    id: 'coreShortage',
    labelKey: 'results.coreShortage',
    definition: 'Unfilled Core panel demand due to capacity bottlenecks.',
    formula: 'max(coreDemand - coreCapacity, 0)',
    unit: 'panel',
    source: ['analytics'],
    ownerView: ['capacity'],
  },
  {
    id: 'buShortage',
    labelKey: 'results.buShortage',
    definition: 'Unfilled BU panel demand due to capacity bottlenecks.',
    formula: 'max(buDemand - buCapacity, 0)',
    unit: 'panel',
    source: ['analytics'],
    ownerView: ['capacity'],
  },
  {
    id: 'bottleneck',
    labelKey: 'results.bottleneck',
    definition: 'Identifies the constraining factory bottleneck resource for each month.',
    formula: 'Core (if coreUtil > buUtil) / BU (if buUtil >= coreUtil) / None',
    unit: 'text',
    source: ['analytics'],
    ownerView: ['capacity', 'executive'],
  },
  {
    id: 'bpTargetMillionTwd',
    labelKey: 'bp.target',
    definition: 'Annual Business Plan revenue targets in million TWD.',
    formula: 'User-defined yearly targets',
    unit: 'millionTwd',
    source: ['bpTargets'],
    ownerView: ['sales', 'executive'],
  },
  {
    id: 'bpForecastMillionTwd',
    labelKey: 'bp.forecast',
    definition: 'Monthly forecast revenue converted from normalized USD to TWD and expressed in millions.',
    formula: '(monthlyRevenueUsd * usdToTwdRate) / 1,000,000',
    unit: 'millionTwd',
    source: ['bpTargets', 'analytics'],
    ownerView: ['sales', 'executive'],
  },
  {
    id: 'bpAttainment',
    labelKey: 'bp.attainment',
    definition: 'Business Plan revenue target achievement rate.',
    formula: 'bpForecastMillionTwd / bpTargetMillionTwd',
    unit: 'percent',
    source: ['bpTargets'],
    ownerView: ['sales', 'executive'],
    nullHandling: 'Returns "-" (not treated as failure) if target is missing or 0.',
  },
  {
    id: 'bpGapMillionTwd',
    labelKey: 'bp.gap',
    definition: 'Difference between forecast revenue and BP revenue target in million TWD.',
    formula: 'bpForecastMillionTwd - bpTargetMillionTwd',
    unit: 'millionTwd',
    source: ['bpTargets'],
    ownerView: ['sales', 'executive'],
  },
];
