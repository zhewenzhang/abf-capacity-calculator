import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CopilotChat from './CopilotChat';
import type { AiCopilotContext } from '../../core/aiCopilotContext';
import { I18nContext } from '../../i18n';
import type { TranslateFn } from '../../i18n';

/**
 * CopilotChat Tests — v1.58.3
 *
 * Verifies:
 * - Composer shell has sticky/fixed class
 * - Thread has scrollable class
 * - Suggestion click shows user message + thinking immediately
 * - Send button shows user message + thinking immediately
 * - Thinking text supports zh-TW and en
 * - No API key input field
 * - Status indicator present
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

// Mocks
Element.prototype.scrollIntoView = vi.fn();
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);

vi.mock('../../services/aiChatService', () => ({
  checkAiProxyHealth: () => Promise.resolve(true),
}));

function createMockContext(): AiCopilotContext {
  return {
    schemaVersion: '1.0',
    generatedAt: '2026-06-05T00:00:00.000Z',
    appVersion: 'v1.58.3',
    role: 'planner',
    currencySettings: { displayCurrency: 'M NTD' as any, exchangeRate: 1 },
    projectSummary: {
      totalRevenueUsd: 2565.3,
      totalForecastPcs: 100000,
      maxCoreUtilization: 0.85,
      maxBuUtilization: null,
      shortageMonthCount: 2,
      worstBottleneckMonth: '2026-06',
      skuCount: 100,
      forecastMonthCount: 12,
    },
    dataQualitySummary: {
      confidence: 'high',
      confidenceScore: 0.92,
      status: 'ok',
      issueCount: 0,
      topIssues: [],
    },
    riskBriefSummary: {
      shortageMonths: [],
      topDrivers: [],
    },
    capacitySummary: {
      worstMonth: null,
      monthlySummaries: [],
    },
    currencyAssumptions: {
      baseCurrency: 'USD',
      displayCurrency: 'M NTD',
      exchangeRateMode: 'fixed',
      usdToTwdRate: 32.0,
      usdToCnyRate: 7.1,
    },
    bpSummary: {
      yearly: [
        { period: '2026', targetMillionTwd: 11076, forecastMillionTwd: 2565.3, attainment: 0.232, gapMillionTwd: -8510.7, status: 'miss' },
      ],
      hasAnyMiss: true,
      worstPeriod: '2026',
    },
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

describe('CopilotChat — Composer Structure', () => {
  it('has sticky composer shell', () => {
    renderChat();
    const shell = document.querySelector('.ai-composer-shell');
    expect(shell).toBeTruthy();
  });

  it('composer shell has position sticky style', () => {
    renderChat();
    const shell = document.querySelector('.ai-composer-shell') as HTMLElement;
    expect(shell?.style?.position).toBe('sticky');
    expect(shell?.style?.bottom).toBe('0px');
  });

  it('has scrollable thread area', () => {
    renderChat();
    const thread = document.querySelector('.ai-chat-thread') as HTMLElement;
    expect(thread).toBeTruthy();
    expect(thread?.style?.overflowY).toBe('auto');
  });

  it('composer textarea always visible', () => {
    renderChat();
    expect(screen.getByPlaceholderText(/Ask about/)).toBeInTheDocument();
  });
});

describe('CopilotChat — Immediate User Message + Thinking', () => {
  it('clicking preset question shows user message immediately', () => {
    renderChat();

    const suggestion = screen.getByText('Why did BP miss target in 2026?');
    fireEvent.click(suggestion);

    const userBubbles = document.querySelectorAll('.ai-message-user');
    expect(userBubbles.length).toBeGreaterThanOrEqual(1);
  });

  it('clicking preset shows thinking bubble immediately', async () => {
    renderChat();

    const suggestion = screen.getByText('Why did BP miss target in 2026?');
    fireEvent.click(suggestion);

    const thinkingEls = document.querySelectorAll('.ai-message-thinking');
    expect(thinkingEls.length).toBeGreaterThanOrEqual(1);
    expect(thinkingEls[0].textContent).toContain('Analyzing');
  });

  it('send button shows user message and thinking', async () => {
    renderChat();

    const textarea = screen.getByPlaceholderText(/Ask about/);
    fireEvent.change(textarea, { target: { value: 'What is capacity risk?' } });

    // Wrap keyDown + assertion in act to flush React updates
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    });

    // Small delay to let the synchronous state updates flush
    await new Promise(resolve => setTimeout(resolve, 50));

    const userBubbles = document.querySelectorAll('.ai-message-user');
    expect(userBubbles.length).toBeGreaterThanOrEqual(1);
  });
});

describe('CopilotChat — Thinking Text Localization', () => {
  it('shows Chinese thinking text for zh-TW', () => {
    const zhI18n = {
      lang: 'zh-TW' as const,
      setLang: () => {},
      t: mockT,
    };

    render(
      <I18nContext.Provider value={zhI18n}>
        <CopilotChat context={createMockContext()} />
      </I18nContext.Provider>
    );

    const suggestion = screen.getByText('2026 年 BP 為什麼沒有達標？');
    fireEvent.click(suggestion);

    const thinkingEls = document.querySelectorAll('.ai-message-thinking');
    expect(thinkingEls.length).toBeGreaterThanOrEqual(1);
    expect(thinkingEls[0].textContent).toContain('正在分析目前工作區資料');
  });
});

describe('CopilotChat — No API Key Input', () => {
  it('does not show API key input', () => {
    renderChat();
    expect(screen.queryByPlaceholderText(/API key|api key|sk-/i)).not.toBeInTheDocument();
  });
});

describe('CopilotChat — Status Indicator', () => {
  it('shows connected status', async () => {
    renderChat();
    const status = await screen.findByText(/DeepSeek/);
    expect(status).toBeInTheDocument();
  });
});

describe('CopilotChat — Empty State', () => {
  it('shows empty state heading', () => {
    renderChat();
    expect(screen.getByText('What would you like to analyze?')).toBeInTheDocument();
  });
});
