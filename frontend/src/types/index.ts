// Size categories
export type SizeCategory = 'small' | 'medium' | 'large' | 'xlarge';

// Layer buckets for yield matrix
export type LayerBucket = '4-8L' | '10-14L' | '16-20L' | '20L+';

// SKU/Product data
export interface SKU {
  id: string;
  skuCode: string;
  customer: string;
  deviceName: string;
  osat: string;
  application: string;
  productGrade: string;
  sizeCategory: SizeCategory;
  chipLengthMm: number;
  chipWidthMm: number;
  layerCount: number;
  unitPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Monthly forecast
export interface Forecast {
  id: string;
  skuId: string;
  month: string; // YYYY-MM
  forecastPcs: number;
  unitPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Factory definition
export interface FactoryDef {
  id: string;
  name: string;
}

// Monthly capacity plan (per factory per month)
export interface CapacityPlan {
  id: string;
  month: string; // YYYY-MM
  factoryId: string;
  corePanelPerDay: number;
  buPanelPerDay: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Yield matrix parameters
export interface YieldMatrix {
  small: Record<LayerBucket, number>;
  medium: Record<LayerBucket, number>;
  large: Record<LayerBucket, number>;
  xlarge: Record<LayerBucket, number>;
}

// Panel layout parameters
export interface PanelParams {
  panelLengthMm: number;
  panelWidthMm: number;
  marginLengthMm: number;
  marginWidthMm: number;
  toleranceMm: number;
}

// Project parameters
export interface ProjectParameters {
  yieldMatrix: YieldMatrix;
  panelParams: PanelParams;
  defaultWorkingDays?: number;
  factories?: FactoryDef[];
  updatedAt?: Date;
}

// Per-SKU monthly calculation result
export interface SkuCalculationResult {
  skuId: string;
  skuCode: string;
  month: string;
  forecastPcs: number;
  unitPrice: number;
  yieldRate: number;
  requiredInputPcs: number;
  pcsPerPanel: number;
  requiredPanels: number;
  coreSteps: number;
  buSteps: number;
  corePanelDemand: number;
  buPanelDemand: number;
  revenue: number;
}

// Monthly capacity summary
export interface MonthlyCapacitySummary {
  month: string;
  totalCorePanelDemand: number;
  totalBuPanelDemand: number;
  coreCapacity: number;
  buCapacity: number;
  coreUtilization: number | null; // null means Infinity (capacity 0, demand > 0)
  buUtilization: number | null;
  coreShortage: number;
  buShortage: number;
  bottleneck: 'Core' | 'BU' | 'None';
}

// Full calculation result
export interface CalculationResult {
  skuResults: SkuCalculationResult[];
  monthlySummaries: MonthlyCapacitySummary[];
  totalRevenue: number;
  totalForecastPcs: number;
  maxCoreUtilization: number | null;
  maxBuUtilization: number | null;
  shortageMonthCount: number;
  worstBottleneckMonth: string | null;
}

// Validation error
export interface ValidationError {
  field: string;
  message: string;
}

// Project
export interface Project {
  id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}
