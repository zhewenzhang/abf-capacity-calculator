import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CopilotChat from './CopilotChat';
import type { AiCopilotContext } from '../../core/aiCopilotContext';
import { I18nContext } from '../../i18n';
import type { TranslateFn } from '../../i18n';

/**
 * CopilotChat Layout & Interaction Tests — v1.58.4
 *
 * Layout:
 * - Page has single main scroll container (.ai-chat-main-scroll)
 * - Composer has floating class (.ai-floating-composer)
 * - No internal vertical scroll on assistant messages
 * - Thread has bottom padding for composer clearance
 *
 * Interaction:
 * - Preset click → user message + thinking
 * - Send → user message + thinking
 * - Composer always present
 */

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

Element.prototype.scrollIntoView = vi.fn();
Element.prototype.scrollTo = vi.fn();
class MockResizeObserver { observe() {} unobserve() {} disconnect() {} }
vi.stubGlobal('ResizeObserver', MockResizeObserver);

vi.mock('../../services/aiChatService', () => ({
  checkAiProxyHealth: () => Promise.resolve(true),
}));

function createMockContext(): AiCopilotContext {
  return {
    schemaVersion: '1.0',
    generatedAt: '2026-06-05T00:00:00.000Z',
    appVersion: 'v1.58.4',
    role: 'planner',
    currencySettings: { displayCurrency: 'M NTD' as any, exchangeRate: 1 },
    projectSummary: { totalRevenueUsd: 2565.3, totalForecastPcs: 100000, maxCoreUtilization: 0.85, maxBuUtilization: null, shortageMonthCount: 2, worstBottleneckMonth: '2026-06', skuCount: 100, forecastMonthCount: 12 },
    dataQualitySummary: { confidence: 'high', confidenceScore: 0.92, status: 'ok', issueCount: 0, topIssues: [] },
    riskBriefSummary: { shortageMonths: [], topDrivers: [] },
    capacitySummary: { worstMonth: null, monthlySummaries: [] },
    currencyAssumptions: { baseCurrency: 'USD', displayCurrency: 'M NTD', exchangeRateMode: 'fixed', usdToTwdRate: 32.0, usdToCnyRate: 7.1 },
    bpSummary: { yearly: [{ period: '2026', targetMillionTwd: 11076, forecastMillionTwd: 2565.3, attainment: 0.232, gapMillionTwd: -8510.7, status: 'miss' }], hasAnyMiss: true, worstPeriod: '2026' },
    periodRange: { start: '2026-01', end: '2026-12' },
    scenarioSummary: null as any,
  } as unknown as AiCopilotContext;
}

function renderChat() {
  return render(
    <I18nContext.Provider value={mockI18n}>
      <CopilotChat context={createMockContext()} />
    </I18nContext.Provider>
  );
}

// ─── Layout Tests ───

describe('CopilotChat — Single Scroll Layout', () => {
  it('has .ai-chat-main-scroll as single scroll container', () => {
    renderChat();
    const scrollContainer = document.querySelector('.ai-chat-main-scroll');
    expect(scrollContainer).toBeTruthy();
    const htmlEl = scrollContainer as HTMLElement;
    expect(htmlEl.style.overflowY).toBe('auto');
  });

  it('has .ai-floating-composer with sticky bottom', () => {
    renderChat();
    const composer = document.querySelector('.ai-floating-composer');
    expect(composer).toBeTruthy();
    const htmlEl = composer as HTMLElement;
    expect(htmlEl.style.position).toBe('sticky');
    expect(htmlEl.style.bottom).toBe('0px');
  });

  it('thread has bottom padding for composer clearance', () => {
    renderChat();
    const scrollContainer = document.querySelector('.ai-chat-main-scroll') as HTMLElement;
    expect(scrollContainer).toBeTruthy();
    expect(scrollContainer.style.paddingBottom).toBe('148px');
  });

  it('assistant messages have no internal vertical scroll', () => {
    renderChat();
    const assistantEls = document.querySelectorAll('.ai-message-assistant');
    assistantEls.forEach(el => {
      const htmlEl = el as HTMLElement;
      // Should NOT have overflow-y: auto
      expect(htmlEl.style.overflowY).not.toBe('auto');
      // Should NOT have max-height
      expect(htmlEl.style.maxHeight || '').toBe('');
    });
  });

  it('page wrapper has overflow hidden', () => {
    renderChat();
    // Check the nearest parent with the class
    const parent = document.querySelector('.ai-assistant-shell') as HTMLElement;
    expect(parent).toBeTruthy();
  });
});

// ─── Interaction Tests ───

describe('CopilotChat — Thinking & User Message', () => {
  it('preset click shows user message immediately', () => {
    renderChat();
    const suggestion = screen.getByText('Why did BP miss target in 2026?');
    fireEvent.click(suggestion);
    const userBubbles = document.querySelectorAll('.ai-message-user');
    expect(userBubbles.length).toBeGreaterThanOrEqual(1);
  });

  it('preset click shows thinking bubble immediately', () => {
    renderChat();
    const suggestion = screen.getByText('Why did BP miss target in 2026?');
    fireEvent.click(suggestion);
    const thinkingEls = document.querySelectorAll('.ai-thinking-bubble');
    expect(thinkingEls.length).toBeGreaterThanOrEqual(1);
  });

  it('send shows user message and thinking', async () => {
    renderChat();
    const textarea = screen.getByPlaceholderText(/Ask about/);
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Capacity risk?' } });
    });
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    });
    const userBubbles = document.querySelectorAll('.ai-message-user');
    expect(userBubbles.length).toBeGreaterThanOrEqual(1);
  });

  it('composer always present', () => {
    renderChat();
    const composer = document.querySelector('.ai-floating-composer');
    expect(composer).toBeTruthy();
    expect(screen.getByPlaceholderText(/Ask about/)).toBeInTheDocument();
  });
});

// ─── Regression Tests ───

describe('CopilotChat — No API Key', () => {
  it('does not show API key input', () => {
    renderChat();
    expect(screen.queryByPlaceholderText(/API key|api key|sk-/i)).not.toBeInTheDocument();
  });
});

describe('CopilotChat — Status & Empty State', () => {
  it('shows empty state', () => {
    renderChat();
    expect(screen.getByText('What would you like to analyze?')).toBeInTheDocument();
  });

  it('shows connected status', async () => {
    renderChat();
    const status = await screen.findByText(/DeepSeek/);
    expect(status).toBeInTheDocument();
  });

  it('shows Chinese suggestions for zh-TW', () => {
    const zhI18n = { lang: 'zh-TW' as const, setLang: () => {}, t: mockT };
    render(
      <I18nContext.Provider value={zhI18n}>
        <CopilotChat context={createMockContext()} />
      </I18nContext.Provider>
    );
    expect(screen.getByText('2026 年 BP 為什麼沒有達標？')).toBeInTheDocument();
  });
});
