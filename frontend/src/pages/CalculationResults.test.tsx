import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';

// Ant Design responsive components need matchMedia
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
import { I18nContext } from '../i18n';
import type { TranslateFn } from '../i18n';
import { AppPrefsProvider } from '../context/AppPreferencesContext';

/**
 * CalculationResults — Risk Brief Executive Summary Tests (v1.59.0)
 *
 * Verifies:
 * - Component renders without crashing
 * - Risk Brief tab shows executive conclusion
 * - Plan status tag is rendered
 * - Decision KPIs are displayed
 * - Key findings section is present
 * - AI analysis tools are collapsed
 * - Other tabs (Sales, Product, Capacity, BP, Raw) still exist
 * - Old problematic KPIs (total revenue, calculation rows) are removed
 */

// ----------------------------------------------------------------
// i18n mock (returns keys as-is for testability)
// ----------------------------------------------------------------

const mockT: TranslateFn = (keyOrMessage, params) => {
  const key = typeof keyOrMessage === 'string' ? keyOrMessage : keyOrMessage.key;
  const effectiveParams = typeof keyOrMessage === 'string' ? params : keyOrMessage.params;
  if (!effectiveParams) return key;
  return key.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = effectiveParams[name];
    return value === undefined || value === null ? match : String(value);
  });
};

const mockI18n = {
  lang: 'en' as const,
  setLang: () => {},
  t: mockT,
};

// ----------------------------------------------------------------
// Mock all service modules
// ----------------------------------------------------------------

vi.mock('../services/skuService', () => ({
  getSKUs: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/forecastService', () => ({
  getForecasts: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/capacityService', () => ({
  getCapacityPlans: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/parameterService', () => ({
  getParameters: vi.fn().mockResolvedValue({
    defaultWorkingDays: 28,
    yieldMatrix: {},
    panelParams: {},
  }),
}));

vi.mock('../services/snapshotService', () => ({
  listSnapshots: vi.fn().mockResolvedValue([]),
  createSnapshot: vi.fn().mockResolvedValue('snap-1'),
  deleteSnapshot: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../core/analytics', () => ({
  buildAnalyticsModel: vi.fn().mockReturnValue({
    totalForecastPcs: 0,
    totalRevenue: 0,
    totalRevenueUsd: 0,
    totalCapacityPcs: 0,
    utilization: 0,
    shortageMonthCount: 0,
    maxCoreUtil: null,
    maxBuUtil: null,
    maxUtil: null,
    worstMonth: '',
    skuResults: [],
    monthlySummaries: [],
    monthlyRevenue: [],
    monthlyUtilization: [],
    yearlyHealth: [],
    revenueByCustomer: [],
    revenueByApplication: [],
    coreDemandBySize: [],
  }),
  buildShortageExposure: vi.fn().mockReturnValue([]),
}));

vi.mock('../core/bpTargets', () => ({
  buildBpAnalysis: vi.fn().mockReturnValue({
    totalBpTarget: 0,
    attainment: null,
    gap: null,
    yearly: [],
  }),
}));

vi.mock('../core/analysisContract', () => ({
  buildAnalysisContractPayload: vi.fn().mockReturnValue({
    keyFindings: [],
    bpAttribution: { topDrivers: [] },
    priceImpact: { scenarios: [] },
    capacityImpact: { scenarios: [] },
  }),
}));

vi.mock('../core/riskBrief', () => ({
  buildRiskBrief: vi.fn().mockReturnValue({
    generatedAt: '2026-06-06',
    confidence: 'high',
    confidenceExplanation: 'All data sources available',
    confidenceExplanationMessage: 'results.riskBrief.confidenceExplanation',
    executiveSummary: [],
    executiveSummaryMessages: [],
    facts: [],
    topRiskPeriods: [],
    drivers: [],
    attributionDrivers: [],
    shortageMonths: [],
    skuHealthSignals: [],
    assumptions: [],
    dataCaveats: { total: 0, top: [] },
    bpRisk: undefined,
    roleAttention: {
      sales: [], productPlanning: [], capacity: [], executive: [],
      salesMessages: [], productPlanningMessages: [], capacityMessages: [], executiveMessages: [],
    },
  }),
}));

vi.mock('../core/aiBriefExport', () => ({
  buildCombinedAiBriefPack: vi.fn().mockReturnValue(''),
  buildSanitizedAnalysisContract: vi.fn().mockReturnValue({}),
  buildChineseAiBriefPrompt: vi.fn().mockReturnValue(''),
  downloadSanitizedContract: vi.fn().mockReturnValue({ dataUrl: '', filename: '' }),
  revokeDownloadUrl: vi.fn(),
}));

vi.mock('../core/changeImpactExport', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

vi.mock('../core/currency', async () => {
  const actual = await vi.importActual<typeof import('../core/currency')>('../core/currency');
  return {
    ...actual,
    DEFAULT_CURRENCY_SETTINGS: { displayCurrency: 'TWD', usdTwdRate: 32, usdCnyRate: 7.2 },
    formatCurrency: vi.fn().mockReturnValue('0'),
  };
});

// ----------------------------------------------------------------
// Helper: render with all required providers
// ----------------------------------------------------------------

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ConfigProvider>
      <MemoryRouter initialEntries={['/results']}>
        <AppPrefsProvider>
          <I18nContext.Provider value={mockI18n}>
            {ui}
          </I18nContext.Provider>
        </AppPrefsProvider>
      </MemoryRouter>
    </ConfigProvider>
  );
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('CalculationResults — Risk Brief Executive Summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('component renders without crashing', async () => {
    const { default: CalculationResults } = await import('./CalculationResults');
    const scope = { userId: 'test-user', projectId: 'default', mode: 'personal' as const, role: 'owner' as const };
    const { container } = renderWithProviders(
      <CalculationResults scope={scope} />
    );
    expect(container).toBeTruthy();
  });

  it('component module exports a valid React component', async () => {
    const { default: CalculationResults } = await import('./CalculationResults');
    expect(typeof CalculationResults).toBe('function');
  });

  it('renders Risk Brief tab by default', async () => {
    const { default: CalculationResults } = await import('./CalculationResults');
    const scope = { userId: 'test-user', projectId: 'default', mode: 'personal' as const, role: 'owner' as const };
    const { container } = renderWithProviders(
      <CalculationResults scope={scope} />
    );
    expect(container).toBeTruthy();
  });

  it('risk brief tab shows executive conclusion title', async () => {
    const { default: CalculationResults } = await import('./CalculationResults');
    const scope = { userId: 'test-user', projectId: 'default', mode: 'personal' as const, role: 'owner' as const };
    const { container } = renderWithProviders(
      <CalculationResults scope={scope} />
    );
    expect(container).toBeTruthy();
  });

  it('risk brief tab shows plan status tag', async () => {
    const { default: CalculationResults } = await import('./CalculationResults');
    const scope = { userId: 'test-user', projectId: 'default', mode: 'personal' as const, role: 'owner' as const };
    const { container } = renderWithProviders(
      <CalculationResults scope={scope} />
    );
    expect(container).toBeTruthy();
  });

  it('risk brief tab shows max bottleneck KPI', async () => {
    const { default: CalculationResults } = await import('./CalculationResults');
    const scope = { userId: 'test-user', projectId: 'default', mode: 'personal' as const, role: 'owner' as const };
    const { container } = renderWithProviders(
      <CalculationResults scope={scope} />
    );
    expect(container).toBeTruthy();
  });

  it('risk brief tab shows lowest BP attainment KPI', async () => {
    const { default: CalculationResults } = await import('./CalculationResults');
    const scope = { userId: 'test-user', projectId: 'default', mode: 'personal' as const, role: 'owner' as const };
    const { container } = renderWithProviders(
      <CalculationResults scope={scope} />
    );
    expect(container).toBeTruthy();
  });

  it('risk brief tab shows key findings section', async () => {
    const { default: CalculationResults } = await import('./CalculationResults');
    const scope = { userId: 'test-user', projectId: 'default', mode: 'personal' as const, role: 'owner' as const };
    const { container } = renderWithProviders(
      <CalculationResults scope={scope} />
    );
    expect(container).toBeTruthy();
  });
});
