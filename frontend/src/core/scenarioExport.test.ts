/**
 * Tests for scenarioExport.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildScenarioExportPack,
  sanitizeExportPack,
  exportScenarioJson,
  downloadScenarioJson,
} from './scenarioExport';
import type { ScenarioExportPack } from './scenarioExport';
import type { ScenarioMultipliers, ScenarioDeltas } from './scenarioEngine';
import type { CalculationResult } from '../types';
import type { BpAnalysisModel } from './bpTargets';

// --- Test fixtures ---

const mockMultipliers: ScenarioMultipliers = {
  forecastVolume: 1.1,
  unitPrice: 0.95,
  coreCapacity: 1.0,
  buCapacity: 1.05,
};

const mockCalcResult: CalculationResult = {
  skuResults: [],
  monthlySummaries: [],
  totalRevenue: 5_000_000,
  totalForecastPcs: 100_000,
  maxCoreUtilization: 0.85,
  maxBuUtilization: 0.72,
  shortageMonthCount: 2,
  worstBottleneckMonth: '2026-06',
};

const mockScenarioCalcResult: CalculationResult = {
  ...mockCalcResult,
  totalRevenue: 5_500_000,
  totalForecastPcs: 110_000,
  shortageMonthCount: 1,
  maxCoreUtilization: 0.90,
  maxBuUtilization: 0.78,
};

const mockBpModel: BpAnalysisModel = {
  yearly: [
    {
      period: '2026',
      targetMillionTwd: 150,
      forecastMillionTwd: 130,
      attainment: 0.867,
      gapMillionTwd: -20,
      status: 'miss',
    },
  ],
  quarterly: [],
  monthly: [],
  customerRevenueByYear: [],
  skuRevenueByYear: [],
  customerRevenueByQuarter: [],
  skuRevenueByQuarter: [],
  customerRevenueByMonth: [],
  skuRevenueByMonth: [],
};

const mockScenarioBpModel: BpAnalysisModel = {
  ...mockBpModel,
  yearly: [
    {
      period: '2026',
      targetMillionTwd: 150,
      forecastMillionTwd: 140,
      attainment: 0.933,
      gapMillionTwd: -10,
      status: 'watch',
    },
  ],
};

const mockDeltas: ScenarioDeltas = {
  totalRevenueUsd: { base: 5_000_000, scenario: 5_500_000, delta: 500_000, deltaPercent: 10 },
  totalForecastPcs: { base: 100_000, scenario: 110_000, delta: 10_000, deltaPercent: 10 },
  maxCoreUtilization: { base: 0.85, scenario: 0.9, delta: 0.05, deltaPercent: 5.88 },
  maxBuUtilization: { base: 0.72, scenario: 0.78, delta: 0.06, deltaPercent: 8.33 },
  shortageMonthCount: { base: 2, scenario: 1, delta: -1, deltaPercent: -50 },
  bpAttainmentPct: { base: 0.867, scenario: 0.933, delta: 0.066, deltaPercent: 7.61 },
  bpGapMillionTwd: { base: -20, scenario: -10, delta: 10, deltaPercent: -50 },
};

function buildDefaultPack(): ScenarioExportPack {
  return buildScenarioExportPack(
    mockMultipliers,
    { calcResult: mockCalcResult, bpModel: mockBpModel },
    { calcResult: mockScenarioCalcResult, bpModel: mockScenarioBpModel },
    mockDeltas,
    ['SKU-001 has missing price data']
  );
}

// --- Tests ---

describe('buildScenarioExportPack', () => {
  it('sets scenarioNotCommitted to true', () => {
    const pack = buildDefaultPack();
    expect(pack.scenarioNotCommitted).toBe(true);
  });

  it('sets deterministic to true', () => {
    const pack = buildDefaultPack();
    expect(pack.deterministic).toBe(true);
  });

  it('sets generatedAt to ISO format', () => {
    const pack = buildDefaultPack();
    expect(pack.generatedAt).toBeTruthy();
    // ISO format check: contains T and Z or timezone offset
    expect(pack.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    // Should be parseable as a valid date
    expect(new Date(pack.generatedAt).toISOString()).toBe(pack.generatedAt);
  });

  it('includes multipliers in the export pack', () => {
    const pack = buildDefaultPack();
    expect(pack.multipliers).toEqual({
      forecastVolume: 1.1,
      unitPrice: 0.95,
      coreCapacity: 1.0,
      buCapacity: 1.05,
    });
  });

  it('includes baseline and scenario summaries', () => {
    const pack = buildDefaultPack();
    expect(pack.baselineSummary.totalRevenueUsd).toBe(5_000_000);
    expect(pack.baselineSummary.shortageMonthCount).toBe(2);
    expect(pack.scenarioSummary.totalRevenueUsd).toBe(5_500_000);
    expect(pack.scenarioSummary.shortageMonthCount).toBe(1);
  });

  it('includes deltas', () => {
    const pack = buildDefaultPack();
    expect(pack.deltas.totalRevenueUsd.delta).toBe(500_000);
    expect(pack.deltas.shortageMonthCount.delta).toBe(-1);
    expect(pack.deltas.bpAttainmentPct.base).toBe(0.867);
    expect(pack.deltas.bpAttainmentPct.scenario).toBe(0.933);
  });

  it('includes dq caveats', () => {
    const pack = buildDefaultPack();
    expect(pack.dqCaveats).toEqual(['SKU-001 has missing price data']);
  });
});

describe('sanitizeExportPack', () => {
  it('removes sensitive keys if somehow present', () => {
    const contaminated = {
      ...buildDefaultPack(),
      uid: 'user-123',
      email: 'test@example.com',
      token: 'secret-token',
      workspaceId: 'ws-456',
      userId: 'user-789',
      member: { name: 'Alice' },
      password: 'hunter2',
      secret: 'top-secret',
      apiKey: 'api-key-abc',
    } as unknown as ScenarioExportPack;

    const sanitized = sanitizeExportPack(contaminated);

    expect((sanitized as unknown as Record<string, unknown>).uid).toBeUndefined();
    expect((sanitized as unknown as Record<string, unknown>).email).toBeUndefined();
    expect((sanitized as unknown as Record<string, unknown>).token).toBeUndefined();
    expect((sanitized as unknown as Record<string, unknown>).workspaceId).toBeUndefined();
    expect((sanitized as unknown as Record<string, unknown>).userId).toBeUndefined();
    expect((sanitized as unknown as Record<string, unknown>).member).toBeUndefined();
    expect((sanitized as unknown as Record<string, unknown>).password).toBeUndefined();
    expect((sanitized as unknown as Record<string, unknown>).secret).toBeUndefined();
    expect((sanitized as unknown as Record<string, unknown>).apiKey).toBeUndefined();

    // Non-sensitive data should be preserved
    expect(sanitized.scenarioNotCommitted).toBe(true);
    expect(sanitized.deterministic).toBe(true);
  });

  it('removes nested sensitive keys', () => {
    const contaminated = {
      ...buildDefaultPack(),
      nested: {
        uid: 'hidden',
        safeField: 'keep',
      },
    } as unknown as ScenarioExportPack;

    const sanitized = sanitizeExportPack(contaminated);
    const nested = (sanitized as unknown as Record<string, unknown>).nested as Record<string, unknown>;
    expect(nested.uid).toBeUndefined();
    expect(nested.safeField).toBe('keep');
  });

  it('preserves all non-sensitive fields in a clean pack', () => {
    const pack = buildDefaultPack();
    const sanitized = sanitizeExportPack(pack);
    expect(sanitized).toEqual(pack);
  });
});

describe('exportScenarioJson', () => {
  it('produces valid JSON', () => {
    const pack = buildDefaultPack();
    const json = exportScenarioJson(pack);
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed.scenarioNotCommitted).toBe(true);
    expect(parsed.appVersion).toBe('v1.37.0');
  });

  it('has stable key ordering (alphabetical)', () => {
    const pack = buildDefaultPack();
    const json = exportScenarioJson(pack);
    const parsed = JSON.parse(json);
    const keys = Object.keys(parsed);
    const sortedKeys = [...keys].sort();
    expect(keys).toEqual(sortedKeys);
  });

  it('sorts nested keys alphabetically', () => {
    const pack = buildDefaultPack();
    const json = exportScenarioJson(pack);
    const parsed = JSON.parse(json);
    // multipliers keys should be alphabetical
    const multiplierKeys = Object.keys(parsed.multipliers);
    expect(multiplierKeys).toEqual([...multiplierKeys].sort());
  });

  it('does not contain sensitive keys in output', () => {
    const pack = buildDefaultPack();
    const json = exportScenarioJson(pack);
    const sensitiveTerms = ['uid', 'email', 'token', 'workspaceId', 'userId', 'member', 'password', 'secret', 'apiKey'];
    for (const term of sensitiveTerms) {
      // Use word boundary check to avoid false positives from substring matches
      const regex = new RegExp(`"${term}"\\s*:`, 'i');
      expect(json).not.toMatch(regex);
    }
  });
});

describe('downloadScenarioJson', () => {
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clickSpy = vi.fn();
    const mockLink = {
      href: '',
      download: '',
      click: clickSpy,
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement);
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as Node);
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as Node);
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('includes UTF-8 BOM in blob bytes', async () => {
    const pack = buildDefaultPack();
    downloadScenarioJson(pack);

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;

    // Read raw bytes to verify UTF-8 BOM (0xEF 0xBB 0xBF)
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
    // Verify remaining bytes are valid JSON (after 3-byte BOM)
    const jsonBytes = bytes.slice(3);
    const jsonText = new TextDecoder().decode(jsonBytes);
    expect(() => JSON.parse(jsonText)).not.toThrow();
    const parsed = JSON.parse(jsonText);
    expect(parsed.scenarioNotCommitted).toBe(true);
  });

  it('creates a download link and triggers click', () => {
    const pack = buildDefaultPack();
    downloadScenarioJson(pack);

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });

  it('uses custom filename when provided', () => {
    const pack = buildDefaultPack();
    downloadScenarioJson(pack, 'my-scenario.json');

    const mockLink = document.createElement('a') as unknown as { download: string };
    expect(mockLink.download).toBe('my-scenario.json');
  });

  it('uses default filename pattern when no filename provided', () => {
    const pack = buildDefaultPack();
    downloadScenarioJson(pack);

    const mockLink = document.createElement('a') as unknown as { download: string };
    expect(mockLink.download).toMatch(/^scenario-analysis-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('revokes the object URL after download', () => {
    const pack = buildDefaultPack();
    downloadScenarioJson(pack);

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });
});

describe('export pack content integrity', () => {
  it('does NOT contain any of: uid, email, token, workspaceId, userId, member', () => {
    const pack = buildDefaultPack();
    const json = JSON.stringify(pack);
    const forbidden = ['uid', 'email', 'token', 'workspaceId', 'userId', 'member'];

    for (const key of forbidden) {
      // Check that the key does not appear as a JSON property name
      const regex = new RegExp(`"${key}"\\s*:`, 'i');
      expect(json).not.toMatch(regex);
    }
  });

  it('contains expected top-level keys', () => {
    const pack = buildDefaultPack();
    const expectedKeys = [
      'scenarioNotCommitted',
      'deterministic',
      'generatedAt',
      'appVersion',
      'multipliers',
      'baselineSummary',
      'scenarioSummary',
      'deltas',
      'dqCaveats',
    ];

    for (const key of expectedKeys) {
      expect(pack).toHaveProperty(key);
    }
  });

  it('appVersion is v1.37.0', () => {
    const pack = buildDefaultPack();
    expect(pack.appVersion).toBe('v1.37.0');
  });
});
