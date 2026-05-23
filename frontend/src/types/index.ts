// Size categories
export type SizeCategory = 'small' | 'medium' | 'large' | 'xlarge';

// Capacity metric type for spreadsheet
export type CapacityMetric = 'core' | 'bu';

export type CurrencyCode = 'USD' | 'TWD' | 'CNY';

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
  unitPriceCurrency?: CurrencyCode;
  upp?: number;           // units per panel, auto-calculated
  yieldEstimate?: number; // estimated yield rate from matrix
  coreType?: string;      // Core material type: E705G/E795G/E705GLH/E795GLH
  coreThicknessMm?: number; // Core thickness in mm
  abfType?: string;       // ABF material type: GL102/GL107/GXT31/GZ41
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
  unitPriceCurrency?: CurrencyCode;
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
  currencySettings?: {
    baseCurrency: 'USD';
    displayCurrency: CurrencyCode;
    exchangeRateMode: 'constant' | 'yearly';
    constantUsdToTwdRate: number;
    yearlyUsdToTwdRates: Record<string, number>;
    constantUsdToCnyRate: number;
    yearlyUsdToCnyRates: Record<string, number>;
  };
  bpTargets?: {
    mode: 'yearly' | 'monthly';
    yearlyRevenueTargetsMillionTwd: Record<string, number>;
    monthlyRevenueTargetsMillionTwd?: Record<string, number>;
  };
  updatedAt?: Date;
}

// Per-SKU monthly calculation result
export interface SkuCalculationResult {
  skuId: string;
  skuCode: string;
  month: string;
  forecastPcs: number;
  unitPrice: number;
  unitPriceCurrency?: CurrencyCode;
  sourceUnitPrice?: number;
  sourceUnitPriceCurrency?: CurrencyCode;
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

// ============================================================
// Workspace Collaboration (v1.18.0)
// ============================================================

export type WorkspaceRole = 'owner' | 'editor' | 'viewer';

/**
 * Shared workspace. Members map is `uid → role`.
 * UID-based MVP: invites use the colleague's Google UID directly (no email magic link).
 */
export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  members: Record<string, WorkspaceRole>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Per-user index entry — denormalized so a logged-in user can list their workspaces
 * without scanning every `workspaces/*`.
 *
 * Path: `userWorkspaces/{uid}/workspaces/{workspaceId}`
 */
export interface UserWorkspaceRef {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  ownerId: string;
  defaultProjectId: string;
  updatedAt?: Date;
}

/**
 * ProjectScope is the unit every page-level service call is parameterized on.
 * - mode === 'personal' → reads/writes `users/{userId}/projects/{projectId}/...`
 * - mode === 'workspace' → reads/writes `workspaces/{workspaceId}/projects/{projectId}/...`
 *
 * `role` defaults to 'owner' for personal mode (the user owns their own data).
 */
export interface ProjectScope {
  mode: 'personal' | 'workspace';
  userId: string;
  workspaceId?: string;
  projectId: string;
  role: WorkspaceRole;
}
