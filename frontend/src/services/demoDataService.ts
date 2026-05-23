import { saveSKU } from './skuService';
import { saveForecast } from './forecastService';
import { saveCapacityPlan } from './capacityService';
import { saveParameters } from './parameterService';
import { generateDefaultCapacityPlans, DEFAULT_YIELD_MATRIX, DEFAULT_PANEL_PARAMS, DEFAULT_FACTORIES, DEFAULT_WORKING_DAYS } from '../core/defaults';
import type { ProjectParameters, SizeCategory, ProjectScope } from '../types';
import { assertCanWrite } from './projectScope';

// UPP calculation
function calculateUPP(chipLengthMm: number, chipWidthMm: number): number {
  const PL = 244.1, PW = 246.2, ML = 10, MW = 5.3, T = 0.3;
  const nL1 = Math.floor((PL - ML + T) / (chipLengthMm + T));
  const nW1 = Math.floor((PW - MW + T) / (chipWidthMm + T));
  const nL2 = Math.floor((PL - ML + T) / (chipWidthMm + T));
  const nW2 = Math.floor((PW - MW + T) / (chipLengthMm + T));
  return Math.max(nL1 * nW1 * 4, nL2 * nW2 * 4, 0);
}

function getYieldEstimate(sizeCategory: SizeCategory, layerCount: number): number {
  const bucket = layerCount <= 8 ? '4-8L' : layerCount <= 14 ? '10-14L' : layerCount <= 20 ? '16-20L' : '20L+';
  return DEFAULT_YIELD_MATRIX[sizeCategory][bucket] || 0;
}

// Demo SKUs
const DEMO_SKUS = [
  {
    skuCode: 'ABF-ML-1020',
    customer: 'TSMC',
    deviceName: 'TM5210',
    osat: 'ASE',
    application: 'Mobile SoC',
    productGrade: 'A',
    sizeCategory: 'small' as const,
    chipLengthMm: 8.5,
    chipWidthMm: 8.2,
    layerCount: 4,
    unitPrice: 12.5,
  },
  {
    skuCode: 'ABF-SL-2040',
    customer: 'Intel',
    deviceName: 'IN-8076',
    osat: 'SPIL',
    application: 'Server CPU',
    productGrade: 'A',
    sizeCategory: 'medium' as const,
    chipLengthMm: 14.3,
    chipWidthMm: 12.1,
    layerCount: 8,
    unitPrice: 18.75,
  },
  {
    skuCode: 'ABF-LL-3060',
    customer: 'AMD',
    deviceName: 'AM-9380',
    osat: 'JCET',
    application: 'AI Accelerator',
    productGrade: 'A+',
    sizeCategory: 'large' as const,
    chipLengthMm: 19.8,
    chipWidthMm: 17.5,
    layerCount: 14,
    unitPrice: 32.0,
  },
  {
    skuCode: 'ABF-XL-4080',
    customer: 'NVIDIA',
    deviceName: 'NV-H200',
    osat: 'ASE',
    application: 'GPU',
    productGrade: 'A+',
    sizeCategory: 'xlarge' as const,
    chipLengthMm: 24.5,
    chipWidthMm: 22.0,
    layerCount: 20,
    unitPrice: 48.5,
  },
  {
    skuCode: 'ABF-SM-0612',
    customer: 'Qualcomm',
    deviceName: 'QM-8475',
    osat: 'SPIL',
    application: '5G Modem',
    productGrade: 'A',
    sizeCategory: 'small' as const,
    chipLengthMm: 6.2,
    chipWidthMm: 6.0,
    layerCount: 6,
    unitPrice: 8.25,
  },
];

// Generate demo forecasts for 2026 H1 with varying demand
function generateDemoForecasts(skuIds: string[]): Array<{ skuId: string; month: string; forecastPcs: number; unitPrice: number }> {
  const forecasts: Array<{ skuId: string; month: string; forecastPcs: number; unitPrice: number }> = [];
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
  const prices = [12.5, 18.75, 32.0, 48.5, 8.25];

  // Demand per SKU per month (realistic ramp-up pattern)
  const demand = [
    // SKU 0: ABF-ML-1020 (high volume, small chip)
    [500000, 550000, 620000, 680000, 750000, 800000],
    // SKU 1: ABF-SL-2040 (medium volume)
    [200000, 220000, 250000, 280000, 310000, 340000],
    // SKU 2: ABF-LL-3060 (lower volume, high layers - heavy BU usage)
    [80000, 90000, 100000, 115000, 130000, 150000],
    // SKU 3: ABF-XL-4080 (low volume, very high layers - max BU demand)
    [40000, 45000, 55000, 65000, 75000, 90000],
    // SKU 4: ABF-SM-0612 (high volume, small chip)
    [700000, 750000, 800000, 850000, 920000, 1000000],
  ];

  for (let i = 0; i < skuIds.length; i++) {
    for (let m = 0; m < months.length; m++) {
      forecasts.push({
        skuId: skuIds[i],
        month: months[m],
        forecastPcs: demand[i][m],
        unitPrice: prices[i],
      });
    }
  }
  return forecasts;
}

export async function loadDemoData(scope: ProjectScope): Promise<string> {
  // Fail fast for viewer scopes so the user sees one clear error instead of
  // five cascading throws from the underlying save* calls.
  assertCanWrite(scope);

  // 1. Save default parameters
  const params: ProjectParameters = {
    defaultWorkingDays: DEFAULT_WORKING_DAYS,
    yieldMatrix: DEFAULT_YIELD_MATRIX,
    panelParams: DEFAULT_PANEL_PARAMS,
  };
  await saveParameters(scope, params);

  // 2. Save SKUs
  const skuIds: string[] = [];
  for (const sku of DEMO_SKUS) {
    const skuWithCalc = {
      ...sku,
      upp: calculateUPP(sku.chipLengthMm, sku.chipWidthMm),
      yieldEstimate: getYieldEstimate(sku.sizeCategory as SizeCategory, sku.layerCount),
    };
    const id = await saveSKU(scope, skuWithCalc as any);
    skuIds.push(id);
  }

  // 3. Save forecasts
  const forecasts = generateDemoForecasts(skuIds);
  for (const fc of forecasts) {
    await saveForecast(scope, {
      skuId: fc.skuId,
      month: fc.month,
      forecastPcs: fc.forecastPcs,
      unitPrice: fc.unitPrice,
    });
  }

  // 4. Generate default capacity plans (2026-2028), spread across factories
  const capacityPlans = generateDefaultCapacityPlans();
  let planCount = 0;
  for (const cp of capacityPlans) {
    const perFactoryCore = Math.floor(cp.corePanelPerDay / DEFAULT_FACTORIES.length);
    const remainderCore = cp.corePanelPerDay - perFactoryCore * DEFAULT_FACTORIES.length;
    const perFactoryBu = Math.floor(cp.buPanelPerDay / DEFAULT_FACTORIES.length);
    const remainderBu = cp.buPanelPerDay - perFactoryBu * DEFAULT_FACTORIES.length;
    for (let i = 0; i < DEFAULT_FACTORIES.length; i++) {
      await saveCapacityPlan(scope, {
        month: cp.month,
        factoryId: DEFAULT_FACTORIES[i].id,
        corePanelPerDay: perFactoryCore + (i < remainderCore ? 1 : 0),
        buPanelPerDay: perFactoryBu + (i < remainderBu ? 1 : 0),
      });
      planCount++;
    }
  }

  return `Loaded ${DEMO_SKUS.length} SKUs, ${forecasts.length} forecasts, ${planCount} capacity rows (${DEFAULT_FACTORIES.length} factories × ${capacityPlans.length} months)`;
}
