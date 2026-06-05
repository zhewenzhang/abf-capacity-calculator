import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import CopilotMessage from './CopilotMessage';
import type { CopilotToolResult } from '../../core/aiCopilotTools';
import { I18nContext } from '../../i18n';
import type { TranslateFn } from '../../i18n';

/**
 * CopilotMessage UX Tests — v1.58.1 (Simplified Chat UI)
 *
 * Verifies:
 * - Markdown rendering for AI responses
 * - Blocked status shows error alert
 * - Source references are collapsible
 * - Validation issues are collapsible
 * - No raw i18n keys in rendered output
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
    facts: ['fact 1'],
    assumptions: [],
    inferences: [],
    recommendations: [],
    sourceReferences: ['source 1'],
    confidence: 'high',
    caveats: [],
    data: {},
    ...overrides,
  };
}

describe('CopilotMessage — Markdown Rendering', () => {
  it('renders DeepSeek AI response with markdown content', () => {
    const markdownSummary = `## Key Summary\n- Found 1\n- Found 2`;

    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          toolName: 'DeepSeek AI',
          summary: markdownSummary,
        })}
      />
    );

    expect(screen.getByText('Key Summary')).toBeInTheDocument();
    expect(screen.getByText('Found 1')).toBeInTheDocument();
    expect(screen.getByText('Found 2')).toBeInTheDocument();
  });

  it('renders bold text in markdown', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          toolName: 'DeepSeek AI',
          summary: 'This is **bold** text.',
        })}
      />
    );

    expect(screen.getByText('bold')).toBeInTheDocument();
  });

  it('renders bullet list in markdown', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          toolName: 'DeepSeek AI',
          summary: '- Item 1\n- Item 2',
        })}
      />
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('renders non-AI summary as plain text', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          toolName: 'bpGap',
          summary: 'Plain text result',
        })}
      />
    );

    expect(screen.getByText('Plain text result')).toBeInTheDocument();
  });
});

describe('CopilotMessage — Status & Blocked', () => {
  it('shows blocked tag for blocked results', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          confidence: 'blocked',
          blockedReason: 'Content filtered',
        })}
      />
    );

    expect(screen.getByText('copilot.status.blocked')).toBeInTheDocument();
    expect(screen.getByText('Content filtered')).toBeInTheDocument();
  });

  it('does not show blocked tag for normal results', () => {
    renderWithI18n(<CopilotMessage result={makeResult()} />);

    expect(screen.queryByText('copilot.status.blocked')).not.toBeInTheDocument();
  });
});

describe('CopilotMessage — Source References', () => {
  it('shows collapsed source reference line', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          sourceReferences: ['DeepSeek v4 Flash (Managed)', 'Data Quality Summary'],
        })}
      />
    );

    expect(screen.getByText(/copilot.source/)).toBeInTheDocument();
  });

  it('expands source references on click', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          sourceReferences: ['DeepSeek v4 Flash (Managed)'],
        })}
      />
    );

    const sourceText = screen.getByText(/copilot.source/);
    fireEvent.click(sourceText);

    expect(screen.getByText('DeepSeek v4 Flash (Managed)')).toBeInTheDocument();
  });
});

describe('CopilotMessage — Validation Issues', () => {
  it('shows collapsible quality notice when issues exist', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          validationIssues: ['Some recommendations lack data sources'],
        })}
      />
    );

    expect(screen.getByText(/copilot.qualityHint.title/)).toBeInTheDocument();
  });

  it('expands quality notice on click', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          validationIssues: ['Missing source for recommendation'],
        })}
      />
    );

    const notice = screen.getByText(/copilot.qualityHint.title/);
    fireEvent.click(notice);
  });

  it('does not render quality notice when no validation issues', () => {
    renderWithI18n(<CopilotMessage result={makeResult()} />);

    expect(screen.queryByText(/copilot.qualityHint.title/)).not.toBeInTheDocument();
  });
});

describe('CopilotMessage — No Raw i18n Keys in Output', () => {
  it('renders summary text without raw i18n keys', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          toolName: 'bpGap',
          summary: 'BP gap is 10%',
          sourceReferences: [],
        })}
      />
    );

    // The summary text should appear cleanly (not as an i18n key)
    expect(screen.getByText('BP gap is 10%')).toBeInTheDocument();
    // Summary text should not contain i18n patterns
    expect(screen.queryByText(/^copilot\.[a-z]/)).not.toBeInTheDocument();
  });

  it('renders summary without raw keys for AI results', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          toolName: 'DeepSeek AI',
          summary: '## Conclusion\nBP gap is significant.',
        })}
      />
    );

    expect(screen.getByText('Conclusion')).toBeInTheDocument();
    expect(screen.getByText('BP gap is significant.')).toBeInTheDocument();
  });
});

describe('CopilotMessage — No Recommendations Template', () => {
  it('does not render large recommendation block by default', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          recommendations: ['Recommendation 1'],
        })}
      />
    );

    // The simplified CopilotMessage no longer renders recommendations in a large block
    // It only shows recommendations via the old RecommendationBlock which is removed
    // So recommendations content should not appear
    expect(screen.queryByText('Recommendation 1')).not.toBeInTheDocument();
  });
});

describe('CopilotMessage — Caveats', () => {
  it('renders caveats as small secondary text when present', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          caveats: ['AI-generated response — verify with data'],
        })}
      />
    );

    expect(screen.getByText('· AI-generated response — verify with data')).toBeInTheDocument();
  });

  it('does not render caveats section when empty', () => {
    renderWithI18n(<CopilotMessage result={makeResult()} />);

    expect(screen.queryByText(/AI-generated/)).not.toBeInTheDocument();
  });
});
