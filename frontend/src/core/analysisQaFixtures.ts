import type { SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';
import { DEFAULT_YIELD_MATRIX, DEFAULT_PANEL_PARAMS } from './defaults';
import { DEFAULT_CURRENCY_SETTINGS } from './currency';

export interface QaFixture {
  name: string;
  skus: SKU[];
  forecasts: Forecast[];
  capacityPlans: CapacityPlan[];
  params: ProjectParameters;
}

const DEFAULT_PARAMS: ProjectParameters = {
  defaultWorkingDays: 28,
  yieldMatrix: DEFAULT_YIELD_MATRIX,
  panelParams: DEFAULT_PANEL_PARAMS,
  currencySettings: DEFAULT_CURRENCY_SETTINGS,
  bpTargets: { mode: 'yearly', yearlyRevenueTargetsMillionTwd: {} },
};

// ----------------------------------------------------------------------------
// 1. Healthy Case
// ----------------------------------------------------------------------------
export const HEALTHY_FIXTURE: QaFixture = {
  name: 'Healthy Case',
  skus: [
    {
      id: 'sku-1',
      skuCode: 'S1',
      customer: 'C1',
      deviceName: 'D1',
      chipLengthMm: 10,
      chipWidthMm: 10,
      layerCount: 12,
      sizeCategory: 'small',
      unitPrice: 100,
      unitPriceCurrency: 'USD',
      osat: 'O1',
      application: 'A1',
      productGrade: 'G1',
    },
  ],
  forecasts: [
    { id: 'f1', skuId: 'sku-1', month: '2026-01', forecastPcs: 10000, unitPrice: 100, unitPriceCurrency: 'USD' },
  ],
  capacityPlans: [
    { id: 'c1', month: '2026-01', factoryId: 'f1', corePanelPerDay: 1000, buPanelPerDay: 5000 },
  ],
  params: {
    ...DEFAULT_PARAMS,
    bpTargets: { mode: 'yearly', yearlyRevenueTargetsMillionTwd: { '2026': 1 } }, // 1M TWD target
  },
};

// ----------------------------------------------------------------------------
// 2. Capacity Shortage Case
// ----------------------------------------------------------------------------
export const SHORTAGE_FIXTURE: QaFixture = {
  name: 'Capacity Shortage Case',
  skus: [
    {
      id: 'sku-short',
      skuCode: 'S-SHORT',
      customer: 'C-SHORT',
      deviceName: 'D2',
      chipLengthMm: 20,
      chipWidthMm: 20,
      layerCount: 20,
      sizeCategory: 'large',
      unitPrice: 50,
      unitPriceCurrency: 'USD',
      osat: 'O2',
      application: 'A2',
      productGrade: 'G2',
    },
  ],
  forecasts: [
    { id: 'f2-1', skuId: 'sku-short', month: '2026-06', forecastPcs: 10000000, unitPrice: 50, unitPriceCurrency: 'USD' },
    { id: 'f2-2', skuId: 'sku-short', month: '2026-07', forecastPcs: 10000000, unitPrice: 50, unitPriceCurrency: 'USD' },
    { id: 'f2-3', skuId: 'sku-short', month: '2026-08', forecastPcs: 10000000, unitPrice: 50, unitPriceCurrency: 'USD' },
  ],
  capacityPlans: [
    { id: 'c2-1', month: '2026-06', factoryId: 'f1', corePanelPerDay: 1000, buPanelPerDay: 1000 },
    { id: 'c2-2', month: '2026-07', factoryId: 'f1', corePanelPerDay: 1000, buPanelPerDay: 1000 },
    { id: 'c2-3', month: '2026-08', factoryId: 'f1', corePanelPerDay: 1000, buPanelPerDay: 1000 },
  ],
  params: DEFAULT_PARAMS,
};

// ----------------------------------------------------------------------------
// 3. BP Miss Case
// ----------------------------------------------------------------------------
export const BP_MISS_FIXTURE: QaFixture = {
  name: 'BP Miss Case',
  skus: [
    {
      id: 'sku-bp',
      skuCode: 'S-BP',
      customer: 'C-BP',
      deviceName: 'D3',
      chipLengthMm: 10,
      chipWidthMm: 10,
      layerCount: 8,
      sizeCategory: 'medium',
      unitPrice: 1,
      unitPriceCurrency: 'USD',
      osat: 'O3',
      application: 'A3',
      productGrade: 'G3',
    },
  ],
  forecasts: [
    { id: 'f3', skuId: 'sku-bp', month: '2026-01', forecastPcs: 1000, unitPrice: 1, unitPriceCurrency: 'USD' },
  ],
  capacityPlans: [
    { id: 'c3', month: '2026-01', factoryId: 'f1', corePanelPerDay: 1000, buPanelPerDay: 1000 },
  ],
  params: {
    ...DEFAULT_PARAMS,
    bpTargets: { mode: 'yearly', yearlyRevenueTargetsMillionTwd: { '2026': 100 } }, // High target (1亿 TWD)
  },
};

// ----------------------------------------------------------------------------
// 4. Dirty Data Case
// ----------------------------------------------------------------------------
export const DIRTY_DATA_FIXTURE: QaFixture = {
  name: 'Dirty Data Case',
  skus: [
    {
      id: 'sku-dirty',
      skuCode: 'S-DIRTY',
      customer: 'C-DIRTY',
      deviceName: 'D4',
      chipLengthMm: 0, // Error: zero dimension
      chipWidthMm: 10,
      layerCount: 12,
      sizeCategory: 'small',
      unitPrice: 0, // Error: zero price
      unitPriceCurrency: 'USD',
      osat: 'O4',
      application: 'A4',
      productGrade: 'G4',
    },
  ],
  forecasts: [
    { id: 'f4', skuId: 'sku-dirty', month: '2026-01', forecastPcs: 1000, unitPrice: 0, unitPriceCurrency: 'USD' },
    { id: 'f5', skuId: 'sku-orphan', month: '2026-02', forecastPcs: 500, unitPrice: 100, unitPriceCurrency: 'USD' }, // Error: orphan forecast
  ],
  capacityPlans: [
    // Missing capacity for 2026-01
  ],
  params: DEFAULT_PARAMS,
};

export const ALL_QA_FIXTURES = [
  HEALTHY_FIXTURE,
  SHORTAGE_FIXTURE,
  BP_MISS_FIXTURE,
  DIRTY_DATA_FIXTURE,
];
