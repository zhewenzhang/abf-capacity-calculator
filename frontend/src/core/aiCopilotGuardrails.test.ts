import { describe, it, expect } from 'vitest';

/**
 * AI Copilot Guardrails Tests — v1.38.0
 *
 * Tests cover:
 * 1. hasSensitiveKeys detection
 * 2. hasSensitiveKeys clean objects
 * 3. validateNoExternalAiCall clean code
 * 4. validateNoExternalAiCall forbidden patterns
 * 5. validateContext clean context
 * 6. validateContext sensitive key detection
 * 7. getGuardrailSummary completeness
 */

import {
  AI_COPILOT_RED_LINES,
  AI_CONTEXT_SENSITIVE_KEYS,
  FORBIDDEN_EXTERNAL_PATTERNS,
  hasSensitiveKeys,
  validateNoExternalAiCall,
  validateContext,
  getGuardrailSummary,
} from './aiCopilotGuardrails';

// ============================================================
// hasSensitiveKeys
// ============================================================

describe('hasSensitiveKeys', () => {
  it('detects uid at top level', () => {
    const obj = { uid: 'abc123', name: 'test' };
    const result = hasSensitiveKeys(obj);
    expect(result).toContain('uid');
  });

  it('detects email at top level', () => {
    const obj = { email: 'user@example.com' };
    const result = hasSensitiveKeys(obj);
    expect(result).toContain('email');
  });

  it('detects token at top level', () => {
    const obj = { token: 'bearer-xyz' };
    const result = hasSensitiveKeys(obj);
    expect(result).toContain('token');
  });

  it('detects auth at top level', () => {
    const obj = { auth: { provider: 'google' } };
    const result = hasSensitiveKeys(obj);
    expect(result).toContain('auth');
  });

  it('detects apiKey at top level', () => {
    const obj = { apiKey: 'sk-123' };
    const result = hasSensitiveKeys(obj);
    expect(result).toContain('apiKey');
  });

  it('detects secret at top level', () => {
    const obj = { secret: 'my-secret' };
    const result = hasSensitiveKeys(obj);
    expect(result).toContain('secret');
  });

  it('detects password at top level', () => {
    const obj = { password: 'hunter2' };
    const result = hasSensitiveKeys(obj);
    expect(result).toContain('password');
  });

  it('detects workspaceId at top level', () => {
    const obj = { workspaceId: 'ws-001' };
    const result = hasSensitiveKeys(obj);
    expect(result).toContain('workspaceId');
  });

  it('detects userId at top level', () => {
    const obj = { userId: 'u-456' };
    const result = hasSensitiveKeys(obj);
    expect(result).toContain('userId');
  });

  it('detects ownerUid at top level', () => {
    const obj = { ownerUid: 'owner-789' };
    const result = hasSensitiveKeys(obj);
    expect(result).toContain('ownerUid');
  });

  it('detects member at top level', () => {
    const obj = { member: ['a', 'b'] };
    const result = hasSensitiveKeys(obj);
    expect(result).toContain('member');
  });

  it('detects sensitive keys in nested objects', () => {
    const obj = {
      safe: 'value',
      nested: {
        deep: {
          uid: 'hidden',
          email: 'hidden@example.com',
        },
      },
    };
    const result = hasSensitiveKeys(obj);
    expect(result).toContain('uid');
    expect(result).toContain('email');
  });

  it('detects sensitive keys inside arrays', () => {
    const obj = {
      items: [{ token: 'abc' }, { name: 'safe' }],
    };
    const result = hasSensitiveKeys(obj);
    expect(result).toContain('token');
  });

  it('detects case-insensitive matches (e.g., UID, Email)', () => {
    const obj = { UID: 'abc', Email: 'test@test.com', APIKEY: 'key' };
    const result = hasSensitiveKeys(obj);
    expect(result).toContain('UID');
    expect(result).toContain('Email');
    expect(result).toContain('APIKEY');
  });

  it('detects keys containing sensitive substrings (e.g., userAuthToken)', () => {
    const obj = { userAuthToken: 'xyz' };
    const result = hasSensitiveKeys(obj);
    expect(result).toContain('userAuthToken');
  });

  it('returns empty array for clean objects', () => {
    const obj = {
      schemaVersion: '1.0',
      totalRevenueUsd: 1000000,
      projectSummary: {
        skuCount: 5,
        forecastMonthCount: 12,
      },
    };
    const result = hasSensitiveKeys(obj);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty objects', () => {
    expect(hasSensitiveKeys({})).toEqual([]);
  });

  it('returns empty array for null-valued fields', () => {
    const obj = { value: null, nested: { data: undefined } };
    expect(hasSensitiveKeys(obj)).toEqual([]);
  });

  it('deduplicates repeated sensitive key names', () => {
    const obj = {
      uid: 'a',
      nested: { uid: 'b' },
    };
    const result = hasSensitiveKeys(obj);
    const uidCount = result.filter(k => k === 'uid').length;
    expect(uidCount).toBe(1);
  });
});

// ============================================================
// validateNoExternalAiCall
// ============================================================

describe('validateNoExternalAiCall', () => {
  it('returns true for clean code with no AI references', () => {
    const code = `
      function calculateRevenue(skus) {
        return skus.reduce((sum, s) => sum + s.price * s.volume, 0);
      }
    `;
    expect(validateNoExternalAiCall(code)).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(validateNoExternalAiCall('')).toBe(true);
  });

  it('returns true for code mentioning AI conceptually but not calling external APIs', () => {
    const code = `
      // This function uses ai copilot context but does not call external APIs
      const context = buildAiCopilotContext(skus, forecasts, capacityPlans, params, model);
    `;
    expect(validateNoExternalAiCall(code)).toBe(true);
  });

  it('returns false for OpenAI API calls', () => {
    const code = `fetch('https://api.openai.com/v1/chat/completions', { method: 'POST' })`;
    expect(validateNoExternalAiCall(code)).toBe(false);
  });

  it('returns false for Anthropic API calls', () => {
    const code = `const response = await fetch('https://api.anthropic.com/v1/messages')`;
    expect(validateNoExternalAiCall(code)).toBe(false);
  });

  it('returns false for Google Generative Language API calls', () => {
    const code = `const url = 'https://generativelanguage.googleapis.com/v1beta/models'`;
    expect(validateNoExternalAiCall(code)).toBe(false);
  });

  it('returns false for DeepSeek API calls', () => {
    const code = `const endpoint = 'https://api.deepseek.com/v1/chat'`;
    expect(validateNoExternalAiCall(code)).toBe(false);
  });

  it('returns false for Cohere API calls', () => {
    const code = `const url = 'https://api.cohere.com/v1/generate'`;
    expect(validateNoExternalAiCall(code)).toBe(false);
  });

  it('returns false for case-insensitive matches', () => {
    const code = `const url = 'HTTPS://API.OPENAI.COM/v1/models'`;
    expect(validateNoExternalAiCall(code)).toBe(false);
  });

  it('returns false for partial matches within larger URLs', () => {
    const code = `const proxy = 'https://my-proxy.com/forward?to=api.anthropic.com/v1'`;
    expect(validateNoExternalAiCall(code)).toBe(false);
  });

  it('returns true for comments mentioning forbidden domains without actual calls', () => {
    // Note: the check is conservative (matches anywhere), so even comments trigger false
    const code = `// TODO: do NOT call api.openai.com`;
    expect(validateNoExternalAiCall(code)).toBe(false);
  });
});

// ============================================================
// validateContext
// ============================================================

describe('validateContext', () => {
  const cleanContext = {
    schemaVersion: '1.0',
    generatedAt: '2026-05-27T00:00:00Z',
    appVersion: '1.38.0',
    role: 'viewer',
    projectSummary: {
      totalRevenueUsd: 5000000,
      totalForecastPcs: 100000,
      maxCoreUtilization: 0.85,
      maxBuUtilization: 0.72,
      shortageMonthCount: 3,
      worstBottleneckMonth: '2026-08',
      skuCount: 12,
      forecastMonthCount: 12,
    },
    dataQualitySummary: {
      confidence: 'medium',
      confidenceScore: 0.75,
      status: 'warning',
      issueCount: 2,
      topIssues: [],
    },
    riskBriefSummary: {
      shortageMonths: ['2026-07', '2026-08', '2026-09'],
      topDrivers: [],
    },
    scenarioSummary: null,
    bpSummary: {
      yearly: [],
      hasAnyMiss: false,
      worstPeriod: null,
    },
    capacitySummary: {
      monthlySummaries: [],
      worstMonth: null,
    },
    currencyAssumptions: {
      baseCurrency: 'USD',
      displayCurrency: 'TWD',
      exchangeRateMode: 'constant',
      usdToTwdRate: 32.0,
      usdToCnyRate: 7.25,
    },
    assumptions: ['Working days are fixed at 28 days/month.'],
  };

  it('validates a clean context successfully', () => {
    const result = validateContext(cleanContext);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('rejects null context', () => {
    const result = validateContext(null);
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('rejects undefined context', () => {
    const result = validateContext(undefined);
    expect(result.valid).toBe(false);
  });

  it('rejects non-object context', () => {
    const result = validateContext('not an object');
    expect(result.valid).toBe(false);
  });

  it('rejects context with sensitive keys', () => {
    const dirtyContext = {
      ...cleanContext,
      uid: 'user-123',
      email: 'user@example.com',
    };
    const result = validateContext(dirtyContext);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes('uid'))).toBe(true);
    expect(result.violations.some(v => v.includes('email'))).toBe(true);
  });

  it('rejects context with sensitive keys in nested objects', () => {
    const dirtyContext = {
      ...cleanContext,
      metadata: {
        token: 'secret-token',
      },
    };
    const result = validateContext(dirtyContext);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes('token'))).toBe(true);
  });

  it('rejects context missing schemaVersion', () => {
    const noSchema = { ...cleanContext };
    delete (noSchema as Record<string, unknown>).schemaVersion;
    const result = validateContext(noSchema);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes('schemaVersion'))).toBe(true);
  });

  it('rejects context missing role', () => {
    const noRole = { ...cleanContext };
    delete (noRole as Record<string, unknown>).role;
    const result = validateContext(noRole);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes('role'))).toBe(true);
  });

  it('rejects context with invalid role', () => {
    const badRoleContext = { ...cleanContext, role: 'admin' };
    const result = validateContext(badRoleContext);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes('admin'))).toBe(true);
  });

  it('rejects context with topIssues exceeding cap of 8', () => {
    const issues = Array.from({ length: 9 }, (_, i) => ({
      id: `issue-${i}`,
      severity: 'warning',
      domain: 'test',
      decisionImpact: 'low',
      titleMessage: { key: 'test' },
    }));
    const overCapContext = {
      ...cleanContext,
      dataQualitySummary: {
        ...cleanContext.dataQualitySummary,
        topIssues: issues,
      },
    };
    const result = validateContext(overCapContext);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes('topIssues'))).toBe(true);
  });

  it('rejects context with topDrivers exceeding cap of 5', () => {
    const drivers = Array.from({ length: 6 }, (_, i) => ({
      dimension: 'test',
      label: `driver-${i}`,
      metric: 'test',
      value: 100,
      severity: 'info',
      affectedPeriods: [],
    }));
    const overCapContext = {
      ...cleanContext,
      riskBriefSummary: {
        ...cleanContext.riskBriefSummary,
        topDrivers: drivers,
      },
    };
    const result = validateContext(overCapContext);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes('topDrivers'))).toBe(true);
  });

  it('rejects context with shortageMonths exceeding cap of 12', () => {
    const months = Array.from({ length: 13 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
    const overCapContext = {
      ...cleanContext,
      riskBriefSummary: {
        ...cleanContext.riskBriefSummary,
        shortageMonths: months,
      },
    };
    const result = validateContext(overCapContext);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes('shortageMonths'))).toBe(true);
  });
});

// ============================================================
// getGuardrailSummary
// ============================================================

describe('getGuardrailSummary', () => {
  it('returns descriptions for all 10 red lines', () => {
    const summary = getGuardrailSummary();
    expect(Object.keys(summary)).toHaveLength(10);
    for (const redLine of AI_COPILOT_RED_LINES) {
      expect(summary[redLine]).toBeDefined();
      expect(typeof summary[redLine]).toBe('string');
      expect(summary[redLine].length).toBeGreaterThan(0);
    }
  });

  it('includes all red line keys from the constant array', () => {
    const summary = getGuardrailSummary();
    for (const redLine of AI_COPILOT_RED_LINES) {
      expect(redLine in summary).toBe(true);
    }
  });

  it('returns non-empty description strings', () => {
    const summary = getGuardrailSummary();
    for (const desc of Object.values(summary)) {
      expect(desc.trim().length).toBeGreaterThan(10);
    }
  });

  it('each description mentions the core constraint', () => {
    const summary = getGuardrailSummary();
    // Spot-check a few
    expect(summary.NO_FORMULA_MODIFICATION).toMatch(/formula/i);
    expect(summary.NO_DATA_INVENTION).toMatch(/fabric|invent|hallucinat/i);
    expect(summary.NO_CURRENCY_CONFUSION).toMatch(/currency|USD|TWD/i);
    expect(summary.NO_AUTO_BUSINESS_DECISION).toMatch(/decision/i);
  });
});

// ============================================================
// Constants
// ============================================================

describe('Constants', () => {
  it('AI_COPILOT_RED_LINES has exactly 10 entries', () => {
    expect(AI_COPILOT_RED_LINES).toHaveLength(10);
  });

  it('AI_CONTEXT_SENSITIVE_KEYS has at least 10 entries', () => {
    expect(AI_CONTEXT_SENSITIVE_KEYS.length).toBeGreaterThanOrEqual(10);
  });

  it('FORBIDDEN_EXTERNAL_PATTERNS has at least 5 entries', () => {
    expect(FORBIDDEN_EXTERNAL_PATTERNS.length).toBeGreaterThanOrEqual(5);
  });

  it('all sensitive keys are non-empty strings', () => {
    for (const key of AI_CONTEXT_SENSITIVE_KEYS) {
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    }
  });
});
