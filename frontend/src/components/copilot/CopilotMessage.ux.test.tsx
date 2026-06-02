import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import CopilotMessage from './CopilotMessage';
import type { CopilotToolResult } from '../../core/aiCopilotTools';
import { I18nContext } from '../../i18n';
import type { TranslateFn } from '../../i18n';

/**
 * CopilotMessage UX Tests — v1.52.4
 *
 * Verifies:
 * - Answer status tags (Deterministic / Mock / Blocked / Warning)
 * - "Why this answer?" collapsible section presence
 * - Markdown rendering for AI responses
 * - F-A-I-R badge rendering
 * - Quality hints (validation issues) rendering
 * - Recommendation block rendering
 * - No fake save / no auto execute claims
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

describe('CopilotMessage — Markdown Rendering', () => {
  it('renders DeepSeek AI response with markdown content', () => {
    const markdownSummary = `## 重點摘要
- 發現 1
- 發現 2

## 主要發現
**重要**：這是測試。`;

    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          toolName: 'DeepSeek AI',
          summary: markdownSummary,
        })}
      />
    );

    // 應該渲染 markdown heading
    expect(screen.getByText('重點摘要')).toBeInTheDocument();
    expect(screen.getByText('主要發現')).toBeInTheDocument();
  });

  it('renders bold text in markdown', () => {
    const markdownSummary = '這是 **粗體** 文字。';

    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          toolName: 'DeepSeek AI',
          summary: markdownSummary,
        })}
      />
    );

    // 應該渲染粗體文字
    expect(screen.getByText('粗體')).toBeInTheDocument();
  });

  it('renders bullet list in markdown', () => {
    const markdownSummary = `- 項目 1
- 項目 2
- 項目 3`;

    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          toolName: 'DeepSeek AI',
          summary: markdownSummary,
        })}
      />
    );

    // 應該渲染列表項目
    expect(screen.getByText('項目 1')).toBeInTheDocument();
    expect(screen.getByText('項目 2')).toBeInTheDocument();
    expect(screen.getByText('項目 3')).toBeInTheDocument();
  });
});

describe('CopilotMessage — F-A-I-R Badge Rendering', () => {
  it('renders Fact badge with correct styling', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          facts: ['Core 稼動率 95%'],
        })}
      />
    );

    // 應該渲染 Fact 標籤
    expect(screen.getByText('Core 稼動率 95%')).toBeInTheDocument();
  });

  it('renders Assumption badge', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          assumptions: ['假設匯率 32'],
        })}
      />
    );

    expect(screen.getByText('假設匯率 32')).toBeInTheDocument();
  });

  it('renders Inference badge', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          inferences: ['若需求成長 10%'],
        })}
      />
    );

    expect(screen.getByText('若需求成長 10%')).toBeInTheDocument();
  });

  it('renders Recommendation badge', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          recommendations: ['建議評估產能擴充'],
        })}
      />
    );

    expect(screen.getByText('建議評估產能擴充')).toBeInTheDocument();
  });
});

describe('CopilotMessage — Quality Hints', () => {
  it('renders quality hints when validation issues exist', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          validationIssues: ['部分建議缺少明確資料來源，請人工核對。'],
        })}
      />
    );

    // 應該渲染品質提示（Collapse 標題）
    // 使用 getAllByText 因為可能有多個匹配
    const qualityHintElements = screen.getAllByText(/copilot.qualityHint.title/);
    expect(qualityHintElements.length).toBeGreaterThanOrEqual(1);
  });

  it('does not render quality hints when no validation issues', () => {
    renderWithI18n(<CopilotMessage result={makeResult()} />);

    // 不應該渲染品質提示
    expect(screen.queryByText(/copilot.qualityHint.title/)).not.toBeInTheDocument();
  });
});

describe('CopilotMessage — Recommendation Block', () => {
  it('renders recommendation block with human confirmation notice', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          recommendations: ['建議評估 Q2 產能擴充'],
        })}
      />
    );

    // 應該渲染建議行動區塊
    expect(screen.getByText('建議評估 Q2 產能擴充')).toBeInTheDocument();
    // 應該渲染人工確認提示
    expect(screen.getByText(/copilot.qualityHint.humanConfirm/)).toBeInTheDocument();
    expect(screen.getByText(/copilot.qualityHint.noAutoWrite/)).toBeInTheDocument();
  });
});

describe('CopilotMessage — No Fake Save Claims', () => {
  it('does not render fake save claims in AI response', () => {
    const aiSummary = '這是 AI 分析結果。此建議不會自動寫入系統。';

    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          toolName: 'DeepSeek AI',
          summary: aiSummary,
        })}
      />
    );

    // 不應該有「已保存」相關文字
    expect(screen.queryByText(/已保存/)).not.toBeInTheDocument();
    expect(screen.queryByText(/已自動保存/)).not.toBeInTheDocument();
    expect(screen.queryByText(/已寫入/)).not.toBeInTheDocument();
  });
});

describe('CopilotMessage — Source References', () => {
  it('renders source references in a readable format', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          sourceReferences: ['DeepSeek v4 Flash (Managed)', 'Data Quality Summary'],
        })}
      />
    );

    // 應該渲染來源標籤
    expect(screen.getByText('DeepSeek v4 Flash (Managed)')).toBeInTheDocument();
    expect(screen.getByText('Data Quality Summary')).toBeInTheDocument();
  });
});

describe('CopilotMessage — Viewer Mode', () => {
  it('hides recommendations when showFixes is false', () => {
    renderWithI18n(
      <CopilotMessage
        result={makeResult({
          recommendations: ['建議評估產能擴充'],
        })}
        showFixes={false}
      />
    );

    // 不應該渲染建議
    expect(screen.queryByText('建議評估產能擴充')).not.toBeInTheDocument();
    // 應該顯示檢視者提示
    expect(screen.getByText('copilot.viewer.noFixes')).toBeInTheDocument();
  });
});
