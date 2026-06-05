import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CopilotChat from './CopilotChat';
import type { AiCopilotContext } from '../../core/aiCopilotContext';
import { I18nContext } from '../../i18n';
import type { TranslateFn } from '../../i18n';

/**
 * CopilotChat UI Tests — v1.58.2
 *
 * Verifies:
 * - Empty state when no messages
 * - Suggestion cards present and clickable
 * - Composer always present
 * - Message area has scrollable thread class
 * - No API key input field
 * - Status indicator in top bar
 * - Chinese suggestions localized
 * - Preset suggestion click shows user message immediately
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

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);

// Mock health check
vi.mock('../../services/aiChatService', () => ({
  checkAiProxyHealth: () => Promise.resolve(true),
}));

// Minimal mock context (the real builder uses many more fields)
function createMockContext(): AiCopilotContext {
  return {
    schemaVersion: '1.0',
    generatedAt: '2026-06-05T00:00:00.000Z',
    appVersion: 'v1.58.2',
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

function renderChat(context?: AiCopilotContext) {
  return render(
    <MemoryRouter>
      <I18nContext.Provider value={mockI18n}>
        <CopilotChat context={context || createMockContext()} />
      </I18nContext.Provider>
    </MemoryRouter>
  );
}

describe('CopilotChat — Empty State', () => {
  it('shows empty state heading when no messages', () => {
    renderChat();
    expect(screen.getByText('What would you like to analyze?')).toBeInTheDocument();
  });

  it('shows suggestion cards in empty state', () => {
    renderChat();
    expect(screen.getByText('Why did BP miss the 2026 target?')).toBeInTheDocument();
    expect(screen.getByText('Biggest capacity risk in 6 months?')).toBeInTheDocument();
    expect(screen.getByText('Which customers drive the most revenue?')).toBeInTheDocument();
    expect(screen.getByText('What analyses are impacted by data quality?')).toBeInTheDocument();
  });
});

describe('CopilotChat — Composer', () => {
  it('renders composer textarea with placeholder', () => {
    renderChat();
    expect(screen.getByPlaceholderText(/Ask about/)).toBeInTheDocument();
  });

  it('send button is present', () => {
    renderChat();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});

describe('CopilotChat — Layout Structure', () => {
  it('composer shell container exists', () => {
    renderChat();
    expect(document.querySelector('.ai-composer-shell')).toBeTruthy();
  });

  it('scrollable thread exists', () => {
    renderChat();
    expect(document.querySelector('.ai-chat-thread')).toBeTruthy();
  });
});

describe('CopilotChat — Suggestion Cards Interaction', () => {
  it('clicking suggestion immediately shows user message', async () => {
    renderChat();
    const suggestion = screen.getByText('Why did BP miss the 2026 target?');
    fireEvent.click(suggestion);

    // After clicking, a user message should appear immediately
    await waitFor(() => {
      const userMessages = document.querySelectorAll('.ai-message-user');
      expect(userMessages.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('CopilotChat — No API Key Input', () => {
  it('does not show API key input field', () => {
    renderChat();
    const apiKeyInputs = screen.queryByPlaceholderText(/API key|api key|sk-/i);
    expect(apiKeyInputs).not.toBeInTheDocument();
  });
});

describe('CopilotChat — Proxy Health Status', () => {
  it('shows status indicator in top bar', async () => {
    renderChat();
    const statusText = await screen.findByText(/DeepSeek.*Connected/);
    expect(statusText).toBeInTheDocument();
  });
});

describe('CopilotChat — Chinese Localization', () => {
  it('shows Chinese suggestions when lang is zh-TW', () => {
    const zhI18n = {
      lang: 'zh-TW' as const,
      setLang: () => {},
      t: mockT,
    };

    render(
      <MemoryRouter>
        <I18nContext.Provider value={zhI18n}>
          <CopilotChat context={createMockContext()} />
        </I18nContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('2026 年 BP 為什麼沒達標？')).toBeInTheDocument();
    expect(screen.getByText('未來 6 個月最大產能風險？')).toBeInTheDocument();
  });
});

describe('CopilotChat — Immediate User Message', () => {
  it('typing and sending shows user message in the chat', async () => {
    renderChat();
    const textarea = screen.getByPlaceholderText(/Ask about/);

    fireEvent.change(textarea, { target: { value: 'Tell me about BP' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    // After submitting, a user message should appear
    await waitFor(() => {
      expect(screen.getByText('Tell me about BP')).toBeInTheDocument();
    });
  });
});
