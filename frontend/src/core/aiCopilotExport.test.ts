/**
 * AI Copilot Export tests (v1.38.0)
 *
 * Tests for:
 * 1. buildAiCopilotExportJson produces valid JSON
 * 2. No sensitive keys in output
 * 3. Keys are sorted alphabetically
 * 4. buildAiCopilotCombinedPack includes both prompt and JSON
 * 5. Includes guardrails text in prompt
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildAiCopilotExportJson,
  buildAiCopilotCombinedPack,
  downloadAiCopilotPack,
  copyAiCopilotPrompt,
  copyAiCopilotPack,
  sortKeysDeep,
  removeSensitiveData,
} from './aiCopilotExport';
import { buildAiCopilotPromptPack, buildCopilotSystemPrompt } from './aiCopilotPrompt';
import type { AiCopilotContext } from './aiCopilotContext';

// ============================================================
// Test fixture
// ============================================================

function createMockContext(): AiCopilotContext {
  return {
    schemaVersion: '1.0',
    generatedAt: '2026-05-27T00:00:00.000Z',
    appVersion: 'v1.38.0',
    projectSummary: {
      totalRevenueUsd: 5000000,
      totalForecastPcs: 100000,
      maxCoreUtilization: 0.95,
      maxBuUtilization: 0.82,
      shortageMonthCount: 3,
      worstBottleneckMonth: '2026-06',
      skuCount: 25,
      forecastMonthCount: 36,
    },
    dataQualitySummary: {
      confidence: 'medium',
      confidenceScore: 75,
      status: 'warning',
      issueCount: 4,
      topIssues: [
        {
          id: 'forecast-missing-capacity',
          severity: 'error',
          domain: 'capacity',
          decisionImpact: 'high',
          titleMessage: { key: 'dq.missingCapacity.title' },
        },
        {
          id: 'sku-zero-price-1',
          severity: 'warning',
          domain: 'products',
          decisionImpact: 'medium',
          titleMessage: { key: 'dq.skuZeroPrice.title', params: { skuCode: 'SKU-001' } },
        },
      ],
    },
    riskBriefSummary: {
      shortageMonths: ['2026-04', '2026-05', '2026-06'],
      topDrivers: [
        {
          dimension: 'customer',
          label: 'TSMC',
          metric: 'coreDemand',
          value: 5000,
          share: 45.2,
          severity: 'critical',
          affectedPeriods: ['2026-04', '2026-05', '2026-06'],
        },
        {
          dimension: 'size',
          label: 'large',
          metric: 'coreDemand',
          value: 3000,
          share: 27.1,
          severity: 'warning',
          affectedPeriods: ['2026-05'],
        },
      ],
    },
    scenarioSummary: null,
    bpSummary: {
      yearly: [
        {
          period: '2026',
          targetMillionTwd: 150,
          forecastMillionTwd: 130,
          attainment: 0.867,
          gapMillionTwd: -20,
          status: 'miss',
        },
        {
          period: '2027',
          targetMillionTwd: 180,
          forecastMillionTwd: 185,
          attainment: 1.028,
          gapMillionTwd: 5,
          status: 'hit',
        },
      ],
      hasAnyMiss: true,
      worstPeriod: '2026',
    },
    capacitySummary: {
      monthlySummaries: [
        { month: '2026-04', coreUtilization: 0.95, buUtilization: 0.82, coreShortage: 500, buShortage: 0, bottleneck: 'Core' },
        { month: '2026-05', coreUtilization: 1.02, buUtilization: 0.88, coreShortage: 1200, buShortage: 0, bottleneck: 'Core' },
      ],
      worstMonth: '2026-05',
    },
    currencyAssumptions: {
      baseCurrency: 'USD',
      displayCurrency: 'USD',
      exchangeRateMode: 'constant',
      usdToTwdRate: 32,
      usdToCnyRate: 7.2,
    },
    assumptions: [
      'Working days are fixed at 28 days/month across all capacity analyses.',
      'Core steps are fixed to 1 step for all layer count SKUs.',
      'All revenue calculations normalize to USD before aggregation.',
    ],
    role: 'viewer',
  };
}

// ============================================================
// sortKeysDeep tests
// ============================================================

describe('sortKeysDeep', () => {
  it('returns null/undefined as-is', () => {
    expect(sortKeysDeep(null)).toBeNull();
    expect(sortKeysDeep(undefined)).toBeUndefined();
  });

  it('returns primitives as-is', () => {
    expect(sortKeysDeep(42)).toBe(42);
    expect(sortKeysDeep('hello')).toBe('hello');
    expect(sortKeysDeep(true)).toBe(true);
  });

  it('sorts top-level keys alphabetically', () => {
    const input = { zebra: 1, apple: 2, mango: 3 };
    const result = sortKeysDeep(input) as Record<string, unknown>;
    expect(Object.keys(result)).toEqual(['apple', 'mango', 'zebra']);
  });

  it('sorts nested keys alphabetically', () => {
    const input = { b: { z: 1, a: 2 }, a: 1 };
    const result = sortKeysDeep(input) as Record<string, unknown>;
    expect(Object.keys(result)).toEqual(['a', 'b']);
    expect(Object.keys(result.b as Record<string, unknown>)).toEqual(['a', 'z']);
  });

  it('sorts keys inside arrays of objects', () => {
    const input = [{ z: 1, a: 2 }, { c: 3, b: 4 }];
    const result = sortKeysDeep(input) as Array<Record<string, unknown>>;
    expect(Object.keys(result[0])).toEqual(['a', 'z']);
    expect(Object.keys(result[1])).toEqual(['b', 'c']);
  });
});

// ============================================================
// removeSensitiveData tests
// ============================================================

describe('removeSensitiveData', () => {
  it('removes top-level sensitive keys', () => {
    const input = { uid: 'u1', email: 'a@b.com', token: 'secret', safe: 'keep' };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.uid).toBeUndefined();
    expect(result.email).toBeUndefined();
    expect(result.token).toBeUndefined();
    expect(result.safe).toBe('keep');
  });

  it('removes nested sensitive keys', () => {
    const input = { data: { uid: 'hidden', value: 42 }, safe: true };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    const nested = result.data as Record<string, unknown>;
    expect(nested.uid).toBeUndefined();
    expect(nested.value).toBe(42);
  });

  it('removes sensitive keys in arrays', () => {
    const input = [{ uid: 'u1', name: 'Alice' }, { email: 'x@y.com', id: 2 }];
    const result = removeSensitiveData(input) as Array<Record<string, unknown>>;
    expect(result[0].uid).toBeUndefined();
    expect(result[0].name).toBe('Alice');
    expect(result[1].email).toBeUndefined();
    expect(result[1].id).toBe(2);
  });

  it('returns null/undefined as-is', () => {
    expect(removeSensitiveData(null)).toBeNull();
    expect(removeSensitiveData(undefined)).toBeUndefined();
  });

  it('returns primitives as-is', () => {
    expect(removeSensitiveData(42)).toBe(42);
    expect(removeSensitiveData('text')).toBe('text');
  });

  it('handles password, secret, apiKey, workspaceId, userId, ownerUid, member', () => {
    const input = {
      password: 'p',
      secret: 's',
      apiKey: 'k',
      workspaceId: 'w',
      userId: 'u',
      ownerUid: 'o',
      member: 'm',
      safeField: 'keep',
    };
    const result = removeSensitiveData(input) as Record<string, unknown>;
    expect(result.password).toBeUndefined();
    expect(result.secret).toBeUndefined();
    expect(result.apiKey).toBeUndefined();
    expect(result.workspaceId).toBeUndefined();
    expect(result.userId).toBeUndefined();
    expect(result.ownerUid).toBeUndefined();
    expect(result.member).toBeUndefined();
    expect(result.safeField).toBe('keep');
  });
});

// ============================================================
// buildAiCopilotExportJson tests
// ============================================================

describe('buildAiCopilotExportJson', () => {
  it('produces valid JSON', () => {
    const context = createMockContext();
    const json = buildAiCopilotExportJson(context);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('has keys sorted alphabetically at top level', () => {
    const context = createMockContext();
    const json = buildAiCopilotExportJson(context);
    const parsed = JSON.parse(json);
    const keys = Object.keys(parsed);
    expect(keys).toEqual([...keys].sort());
  });

  it('has keys sorted alphabetically at nested levels', () => {
    const context = createMockContext();
    const json = buildAiCopilotExportJson(context);
    const parsed = JSON.parse(json);
    const psKeys = Object.keys(parsed.projectSummary);
    expect(psKeys).toEqual([...psKeys].sort());
    const dqKeys = Object.keys(parsed.dataQualitySummary);
    expect(dqKeys).toEqual([...dqKeys].sort());
  });

  it('does not contain sensitive keys', () => {
    const context = createMockContext();
    // Inject sensitive data to verify stripping
    const contaminated = {
      ...context,
      uid: 'user-123',
      email: 'test@example.com',
      token: 'secret-token',
      workspaceId: 'ws-456',
    } as unknown as AiCopilotContext;
    const json = buildAiCopilotExportJson(contaminated);
    const sensitiveTerms = ['uid', 'email', 'token', 'workspaceId', 'userId', 'ownerUid', 'member', 'password', 'secret', 'apiKey'];
    for (const term of sensitiveTerms) {
      const regex = new RegExp(`"${term}"\\s*:`, 'i');
      expect(json).not.toMatch(regex);
    }
  });

  it('uses 2-space indentation', () => {
    const context = createMockContext();
    const json = buildAiCopilotExportJson(context);
    const lines = json.split('\n');
    expect(lines[1]).toMatch(/^ {2}/);
  });

  it('preserves non-sensitive context data', () => {
    const context = createMockContext();
    const json = buildAiCopilotExportJson(context);
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe('1.0');
    expect(parsed.appVersion).toBe('v1.38.0');
    expect(parsed.projectSummary.totalRevenueUsd).toBe(5000000);
    expect(parsed.role).toBe('viewer');
  });
});

// ============================================================
// buildAiCopilotCombinedPack tests
// ============================================================

describe('buildAiCopilotCombinedPack', () => {
  it('includes prompt text', () => {
    const context = createMockContext();
    const pack = buildAiCopilotCombinedPack(context);
    expect(pack).toContain('ABF Capacity Calculator');
    expect(pack).toContain('AI Data Copilot Context Pack');
  });

  it('includes JSON fence block', () => {
    const context = createMockContext();
    const pack = buildAiCopilotCombinedPack(context);
    expect(pack).toContain('```json');
    expect(pack).toContain('```');
  });

  it('includes both prompt and valid JSON', () => {
    const context = createMockContext();
    const pack = buildAiCopilotCombinedPack(context);
    const match = pack.match(/```json\n([\s\S]*?)\n```/);
    expect(match).not.toBeNull();
    const jsonContent = match![1];
    expect(() => JSON.parse(jsonContent)).not.toThrow();
  });

  it('includes guardrails text in the prompt portion', () => {
    const context = createMockContext();
    const pack = buildAiCopilotCombinedPack(context);
    expect(pack).toContain('AI 安全規則');
    expect(pack).toContain('禁止修改計算公式');
    expect(pack).toContain('禁止猜測缺失資料');
    expect(pack).toContain('禁止混淆 USD / TWD / CNY / Million TWD');
    expect(pack).toContain('禁止將比例歸因說成因果關係');
    expect(pack).toContain('Fact / Assumption / Inference / Recommendation');
  });

  it('includes Chinese section headers', () => {
    const context = createMockContext();
    const pack = buildAiCopilotCombinedPack(context);
    expect(pack).toContain('## 使用者資訊');
    expect(pack).toContain('## 專案摘要');
    expect(pack).toContain('## 資料品質');
    expect(pack).toContain('## 產能風險');
    expect(pack).toContain('## BP 達成分析');
    expect(pack).toContain('## 風險歸因');
    expect(pack).toContain('## 貨幣假設');
    expect(pack).toContain('## 假設條件');
    expect(pack).toContain('## AI 安全規則');
    expect(pack).toContain('## 使用者角色');
  });
});

// ============================================================
// buildAiCopilotPromptPack tests
// ============================================================

describe('buildAiCopilotPromptPack', () => {
  it('contains user info disclaimer', () => {
    const context = createMockContext();
    const prompt = buildAiCopilotPromptPack(context);
    expect(prompt).toContain('此資料由 ABF Capacity Calculator v1.38.0 本地產生');
    expect(prompt).toContain('所有分析為確定性計算結果');
    expect(prompt).toContain('建議需人工確認後方可執行');
  });

  it('contains project summary data', () => {
    const context = createMockContext();
    const prompt = buildAiCopilotPromptPack(context);
    expect(prompt).toContain('95.0%');
    expect(prompt).toContain('82.0%');
  });

  it('contains data quality summary', () => {
    const context = createMockContext();
    const prompt = buildAiCopilotPromptPack(context);
    expect(prompt).toContain('medium');
    expect(prompt).toContain('75/100');
  });

  it('contains BP analysis data', () => {
    const context = createMockContext();
    const prompt = buildAiCopilotPromptPack(context);
    expect(prompt).toContain('存在未達成 BP 目標的年度');
    expect(prompt).toContain('最差期間: 2026');
    expect(prompt).toContain('miss');
  });

  it('contains risk attribution data', () => {
    const context = createMockContext();
    const prompt = buildAiCopilotPromptPack(context);
    expect(prompt).toContain('TSMC');
    expect(prompt).toContain('customer');
    expect(prompt).toContain('coreDemand');
  });

  it('contains currency assumptions', () => {
    const context = createMockContext();
    const prompt = buildAiCopilotPromptPack(context);
    expect(prompt).toContain('USD');
    expect(prompt).toContain('32');
    expect(prompt).toContain('7.2');
  });

  it('contains assumptions list', () => {
    const context = createMockContext();
    const prompt = buildAiCopilotPromptPack(context);
    expect(prompt).toContain('Working days are fixed at 28');
    expect(prompt).toContain('Core steps are fixed to 1');
  });

  it('contains role', () => {
    const context = createMockContext();
    const prompt = buildAiCopilotPromptPack(context);
    expect(prompt).toContain('viewer');
  });

  it('contains guardrails', () => {
    const context = createMockContext();
    const prompt = buildAiCopilotPromptPack(context);
    expect(prompt).toContain('禁止修改計算公式');
    expect(prompt).toContain('禁止猜測缺失資料');
    expect(prompt).toContain('禁止混淆 USD / TWD / CNY / Million TWD');
    expect(prompt).toContain('禁止將比例歸因說成因果關係');
    expect(prompt).toContain('Fact / Assumption / Inference / Recommendation');
    expect(prompt).toContain('source references');
    expect(prompt).toContain('Low confidence 時必須降級語氣');
  });

  it('includes scenario section when scenario is active', () => {
    const context = createMockContext();
    (context as unknown as Record<string, unknown>).scenarioSummary = {
      isActive: true,
      multipliers: { forecastVolume: 1.1, unitPrice: 0.95, coreCapacity: 1.0, buCapacity: 1.0 },
      deltas: {
        totalRevenueUsd: { base: 5000000, scenario: 5500000, delta: 500000 },
        shortageMonthCount: { base: 3, scenario: 2, delta: -1 },
        bpAttainmentPct: { base: 0.867, scenario: 0.933, delta: 0.066 },
      },
    };
    const prompt = buildAiCopilotPromptPack(context);
    expect(prompt).toContain('## 情境分析');
    expect(prompt).toContain('1.1');
    expect(prompt).toContain('0.95');
  });

  it('does not include scenario section when scenario is null', () => {
    const context = createMockContext();
    (context as unknown as Record<string, unknown>).scenarioSummary = null;
    const prompt = buildAiCopilotPromptPack(context);
    expect(prompt).not.toContain('## 情境分析');
  });

  it('does not include scenario section when scenario is not active', () => {
    const context = createMockContext();
    (context as unknown as Record<string, unknown>).scenarioSummary = {
      isActive: false,
      multipliers: { forecastVolume: 1.0, unitPrice: 1.0, coreCapacity: 1.0, buCapacity: 1.0 },
      deltas: {
        totalRevenueUsd: { base: null, scenario: null, delta: null },
        shortageMonthCount: { base: null, scenario: null, delta: null },
        bpAttainmentPct: { base: null, scenario: null, delta: null },
      },
    };
    const prompt = buildAiCopilotPromptPack(context);
    expect(prompt).not.toContain('## 情境分析');
  });
});

// ============================================================
// buildCopilotSystemPrompt tests
// ============================================================

describe('buildCopilotSystemPrompt', () => {
  it('contains identity declaration', () => {
    const context = createMockContext();
    const prompt = buildCopilotSystemPrompt(context);
    expect(prompt).toContain('你是 ABF Capacity Calculator 的 AI 資料分析助手');
    expect(prompt).toContain('確定性分析工具');
  });

  it('contains 10 safety rules', () => {
    const context = createMockContext();
    const prompt = buildCopilotSystemPrompt(context);
    expect(prompt).toContain('1. 禁止修改計算公式');
    expect(prompt).toContain('2. 禁止猜測或補充缺失資料');
    expect(prompt).toContain('3. 禁止混淆 USD / TWD / CNY / Million TWD');
    expect(prompt).toContain('4. 禁止將比例歸因');
    expect(prompt).toContain('5. 禁止在 confidence');
    expect(prompt).toContain('6. 禁止在 confidence');
    expect(prompt).toContain('7. 禁止將 Weighted Pressure Index');
    expect(prompt).toContain('8. 禁止忽略資料品質警告');
    expect(prompt).toContain('9. 所有結論必須標示 F-A-I-R 分類');
    expect(prompt).toContain('10. 所有建議必須引用 source references');
  });

  it('contains F-A-I-R classification rules', () => {
    const context = createMockContext();
    const prompt = buildCopilotSystemPrompt(context);
    expect(prompt).toContain('Fact:');
    expect(prompt).toContain('Assumption:');
    expect(prompt).toContain('Inference:');
    expect(prompt).toContain('Recommendation:');
  });

  it('contains context data as JSON', () => {
    const context = createMockContext();
    const prompt = buildCopilotSystemPrompt(context);
    expect(prompt).toContain('## Context Data');
    expect(prompt).toContain('```json');
    const match = prompt.match(/```json\n([\s\S]*?)\n```/);
    expect(match).not.toBeNull();
    expect(() => JSON.parse(match![1])).not.toThrow();
  });
});

// ============================================================
// downloadAiCopilotPack tests (require jsdom / document)
// ============================================================

const hasDocument = typeof document !== 'undefined';

describe('downloadAiCopilotPack', () => {
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    if (!hasDocument) return;
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
    if (!hasDocument) return;
    const context = createMockContext();
    downloadAiCopilotPack(context);

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
  });

  it('contains valid JSON after BOM', async () => {
    if (!hasDocument) return;
    const context = createMockContext();
    downloadAiCopilotPack(context);

    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const jsonBytes = bytes.slice(3);
    const jsonText = new TextDecoder().decode(jsonBytes);
    expect(() => JSON.parse(jsonText)).not.toThrow();
  });

  it('creates a download link and triggers click', () => {
    if (!hasDocument) return;
    const context = createMockContext();
    downloadAiCopilotPack(context);

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });

  it('uses custom filename when provided', () => {
    if (!hasDocument) return;
    const context = createMockContext();
    downloadAiCopilotPack(context, 'my-copilot.json');

    const mockLink = document.createElement('a') as unknown as { download: string };
    expect(mockLink.download).toBe('my-copilot.json');
  });

  it('uses default filename pattern when no filename provided', () => {
    if (!hasDocument) return;
    const context = createMockContext();
    downloadAiCopilotPack(context);

    const mockLink = document.createElement('a') as unknown as { download: string };
    expect(mockLink.download).toMatch(/^ai-copilot-context-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('revokes the object URL after download', () => {
    if (!hasDocument) return;
    const context = createMockContext();
    downloadAiCopilotPack(context);

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });
});

// ============================================================
// copyAiCopilotPrompt tests (require navigator.clipboard)
// ============================================================

describe('copyAiCopilotPrompt', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('copies prompt pack to clipboard', async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    const context = createMockContext();
    await copyAiCopilotPrompt(context);

    expect(mockWriteText).toHaveBeenCalledTimes(1);
    const copiedText = mockWriteText.mock.calls[0][0] as string;
    expect(copiedText).toContain('ABF Capacity Calculator');
    expect(copiedText).toContain('AI 安全規則');
  });
});

// ============================================================
// copyAiCopilotPack tests (require navigator.clipboard)
// ============================================================

describe('copyAiCopilotPack', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('copies combined pack to clipboard', async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    const context = createMockContext();
    await copyAiCopilotPack(context);

    expect(mockWriteText).toHaveBeenCalledTimes(1);
    const copiedText = mockWriteText.mock.calls[0][0] as string;
    expect(copiedText).toContain('ABF Capacity Calculator');
    expect(copiedText).toContain('```json');
  });
});

// ============================================================
// Content integrity tests
// ============================================================

describe('content integrity', () => {
  it('JSON export does not contain any sensitive key patterns', () => {
    const context = createMockContext();
    const json = buildAiCopilotExportJson(context);
    const forbidden = ['uid', 'email', 'token', 'workspaceId', 'userId', 'ownerUid', 'member', 'password', 'secret', 'apiKey'];
    for (const key of forbidden) {
      const regex = new RegExp(`"${key}"\\s*:`, 'i');
      expect(json).not.toMatch(regex);
    }
  });

  it('prompt pack contains all required section headers', () => {
    const context = createMockContext();
    const prompt = buildAiCopilotPromptPack(context);
    const requiredHeaders = [
      '## 使用者資訊',
      '## 專案摘要',
      '## 資料品質',
      '## 產能風險',
      '## BP 達成分析',
      '## 風險歸因',
      '## 貨幣假設',
      '## 假設條件',
      '## AI 安全規則',
      '## 使用者角色',
    ];
    for (const header of requiredHeaders) {
      expect(prompt).toContain(header);
    }
  });

  it('combined pack JSON is valid and parseable', () => {
    const context = createMockContext();
    const pack = buildAiCopilotCombinedPack(context);
    const match = pack.match(/```json\n([\s\S]*?)\n```/);
    expect(match).not.toBeNull();
    const parsed = JSON.parse(match![1]);
    expect(parsed.schemaVersion).toBe('1.0');
    expect(parsed.projectSummary).toBeDefined();
    expect(parsed.dataQualitySummary).toBeDefined();
  });
});
