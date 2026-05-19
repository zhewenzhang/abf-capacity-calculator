import type { YieldMatrix, PanelParams, FactoryDef } from '../types';

// Default yield matrix per task spec
export const DEFAULT_YIELD_MATRIX: YieldMatrix = {
  small: { '4-8L': 0.98, '10-14L': 0.96, '16-20L': 0.94, '20L+': 0.92 },
  medium: { '4-8L': 0.88, '10-14L': 0.86, '16-20L': 0.84, '20L+': 0.82 },
  large: { '4-8L': 0.82, '10-14L': 0.80, '16-20L': 0.78, '20L+': 0.76 },
  xlarge: { '4-8L': 0.75, '10-14L': 0.73, '16-20L': 0.71, '20L+': 0.69 },
};

// Default panel parameters
export const DEFAULT_PANEL_PARAMS: PanelParams = {
  panelLengthMm: 244.1,
  panelWidthMm: 246.2,
  marginLengthMm: 10,
  marginWidthMm: 5.3,
  toleranceMm: 0,
};

// Default working days per month
export const DEFAULT_WORKING_DAYS = 28;

// Factory definitions
export const DEFAULT_FACTORIES: FactoryDef[] = [
  { id: 'fab-a', name: 'Fab A' },
  { id: 'fab-b', name: 'Fab B' },
  { id: 'fab-c', name: 'Fab C' },
];

// Default capacity: generate monthly rows for 2026-2028
// 2026: Core 6000/day, BU 0/day
// 2027: Core +650 per quarter, BU +3000 per quarter
// 2028: Core +1800/year from 2027 exit level, BU +10000/year from 2027 exit level
export function generateDefaultCapacityPlans(): Array<{ month: string; corePanelPerDay: number; buPanelPerDay: number }> {
  const plans: Array<{ month: string; corePanelPerDay: number; buPanelPerDay: number }> = [];

  // 2026: flat 6000 Core, 0 BU
  let coreRate = 6000;
  let buRate = 0;
  for (let m = 0; m < 12; m++) {
    plans.push({
      month: `2026-${String(m + 1).padStart(2, '0')}`,
      corePanelPerDay: coreRate,
      buPanelPerDay: buRate,
    });
  }

  // 2027: Core +650 per quarter, BU +3000 per quarter
  for (let q = 0; q < 4; q++) {
    const rate = coreRate + 650 * (q + 1);
    const bu = buRate + 3000 * (q + 1);
    for (let m = 0; m < 3; m++) {
      const monthIdx = q * 3 + m;
      plans.push({
        month: `2027-${String(monthIdx + 1).padStart(2, '0')}`,
        corePanelPerDay: rate,
        buPanelPerDay: bu,
      });
    }
  }
  // End of 2027 rates
  coreRate = coreRate + 650 * 4; // 6000 + 2600 = 8600
  buRate = buRate + 3000 * 4;     // 0 + 12000 = 12000

  // 2028: Core +1800/year from 2027 exit, BU +10000/year from 2027 exit
  const core2028 = coreRate + 1800; // 10400
  const bu2028 = buRate + 10000;     // 22000
  for (let m = 0; m < 12; m++) {
    plans.push({
      month: `2028-${String(m + 1).padStart(2, '0')}`,
      corePanelPerDay: core2028,
      buPanelPerDay: bu2028,
    });
  }

  return plans;
}

// Generate months range
export function generateMonths(startYear: number, endYear: number): string[] {
  const months: string[] = [];
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
    }
  }
  return months;
}
