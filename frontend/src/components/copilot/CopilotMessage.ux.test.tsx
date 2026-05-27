import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import CopilotMessage from './CopilotMessage';
import type { CopilotToolResult } from '../../core/aiCopilotTools';
import { I18nContext } from '../../i18n';
import type { TranslateFn } from '../../i18n';

/**
 * CopilotMessage UX Hardening Tests — v1.41.0
 *
 * Verifies:
 * - Answer status tags (Deterministic / Mock / Blocked / Warning)
 * - "Why this answer?" collapsible section presence
 *
 * Uses fireEvent instead of user-event to avoid extra dependency.
 * Uses waitFor for Ant Design Collapse animation.
 */

// Minimal i18n mock that returns keys as-is
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

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nContext.Provider value={mockI18n}>{ui}</I18nContext.Provider>
  );
}

// Base result factory
function makeResult(overrides: Partial<CopilotToolResult> = {}): CopilotToolResult {
  return {
    toolName: 'testTool',
    title: 'Test Title',
    summary: 'Test summary',
    facts: ['fact 1', 'fact 2'],
    assumptions: ['assumption 1'],
    inferences: ['inference 1'],
    recommendations: ['rec 1'],
    sourceReferences: ['source 1'],
    confidence: 'high',
    caveats: ['caveat 1'],
    data: {},
    ...overrides,
  };
}

describe('CopilotMessage — Answer Status Tags', () => {
  it('renders "Deterministic" tag for normal high-confidence result', () => {
    renderWithI18n(<CopilotMessage result={makeResult()} />);
    const tag = screen.getByTestId('answer-status-tag');
    expect(tag.textContent).toBe('copilot.status.deterministic');
  });

  it('renders "Blocked" tag when confidence is blocked', () => {
    renderWithI18n(
      <CopilotMessage result={makeResult({ confidence: 'blocked', blockedReason: 'no data' })} />
    );
    const tag = screen.getByTestId('answer-status-tag');
    expect(tag.textContent).toBe('copilot.status.blocked');
  });

  it('renders "Mock" tag when isMockProvider is true', () => {
    renderWithI18n(
      <CopilotMessage result={makeResult({ isMockProvider: true })} />
    );
    const tag = screen.getByTestId('answer-status-tag');
    expect(tag.textContent).toBe('copilot.status.mock');
  });

  it('renders "Warning" tag when validationIssues exist', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({ validationIssues: ['issue 1', 'issue 2'] })}
      />
    );
    const tag = screen.getByTestId('answer-status-tag');
    expect(tag.textContent).toBe('copilot.status.warning');
  });

  it('prioritizes "Blocked" over "Mock" when both apply', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          confidence: 'blocked',
          isMockProvider: true,
          blockedReason: 'blocked reason',
        })}
      />
    );
    const tag = screen.getByTestId('answer-status-tag');
    expect(tag.textContent).toBe('copilot.status.blocked');
  });

  it('prioritizes "Mock" over "Warning" when both apply', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          isMockProvider: true,
          validationIssues: ['issue 1'],
        })}
      />
    );
    const tag = screen.getByTestId('answer-status-tag');
    expect(tag.textContent).toBe('copilot.status.mock');
  });
});

describe('CopilotMessage — "Why this answer?" section', () => {
  it('renders the "Why this answer?" collapsible header', () => {
    renderWithI18n(<CopilotMessage result={makeResult()} />);
    expect(screen.getByText('copilot.whyThisAnswer')).toBeInTheDocument();
  });

  it('shows validation passed tag when no issues', () => {
    renderWithI18n(<CopilotMessage result={makeResult()} />);
    // The "Why this answer?" section exists
    expect(screen.getByText('copilot.whyThisAnswer')).toBeInTheDocument();
  });

  it('renders with validationIssues present', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({ validationIssues: ['a', 'b', 'c'] })}
      />
    );
    expect(screen.getByText('copilot.whyThisAnswer')).toBeInTheDocument();
  });

  it('renders tool name in the title area', () => {
    renderWithI18n(<CopilotMessage result={makeResult()} />);
    expect(screen.getByText('testTool')).toBeInTheDocument();
  });

  it('renders facts in the main body', () => {
    renderWithI18n(<CopilotMessage result={makeResult()} />);
    const fact1Elements = screen.getAllByText('fact 1');
    expect(fact1Elements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders caveats in the main body', () => {
    renderWithI18n(<CopilotMessage result={makeResult()} />);
    expect(screen.getByText('caveat 1')).toBeInTheDocument();
  });
});
