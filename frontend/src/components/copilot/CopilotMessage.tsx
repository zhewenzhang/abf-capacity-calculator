import React, { useState } from 'react';
import { Tag, Typography } from 'antd';
import {
  WarningOutlined,
  InfoCircleOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import type { CopilotToolResult } from '../../core/aiCopilotTools';

const { Text } = Typography;

interface Props {
  result: CopilotToolResult;
}

// --- Action chip type ---
type AssistantAction = {
  label: string;
  to: string;
  kind: 'navigate';
};

// Page routing map for action chips
const NAV_MAP: Record<string, string> = {
  '產能規劃': '/capacity',
  '產能': '/capacity',
  capacity: '/capacity',
  'BP 目標': '/bp-targets',
  'BP': '/bp-targets',
  'bp-targets': '/bp-targets',
  '預測': '/forecasts',
  forecast: '/forecasts',
  '情境': '/scenario',
  scenario: '/scenario',
  '營運': '/operations',
  operations: '/operations',
  '資料品質': '/operations',
  '設定': '/parameters',
  parameters: '/parameters',
  '產品': '/products',
  products: '/products',
  '結果': '/results',
  results: '/results',
};

/**
 * Extract page navigation hints from AI summary text.
 * Looks for patterns like "查看XXX頁面" or "至XXX頁面"
 */
function extractActions(summary: string, lang: string): AssistantAction[] {
  const actions: AssistantAction[] = [];
  const seen = new Set<string>();

  // zh-TW patterns
  const zhPatterns = summary.match(/(?:查看|前往|至|於|在)\s*(產能規劃|產能|BP 目標|BP|預測|情境|營運|資料品質|設定|產品|結果)(?:頁面)?/g);
  if (zhPatterns) {
    for (const p of zhPatterns) {
      for (const [key, path] of Object.entries(NAV_MAP)) {
        if (p.includes(key) && !seen.has(path)) {
          seen.add(path);
          actions.push({
            label: lang === 'zh-TW' ? `前往 ${key}` : `Go to ${key}`,
            to: path,
            kind: 'navigate',
          });
          break;
        }
      }
    }
  }

  // EN patterns
  const enPatterns = summary.match(/(?:go to|visit|check|open)\s+(capacity|bp-targets|forecasts|scenario|operations|parameters|products|results)/gi);
  if (enPatterns) {
    for (const p of enPatterns) {
      const lower = p.toLowerCase();
      for (const [key, path] of Object.entries(NAV_MAP)) {
        if (lower.includes(key) && !seen.has(path)) {
          seen.add(path);
          actions.push({ label: `Go to ${key}`, to: path, kind: 'navigate' });
          break;
        }
      }
    }
  }

  return actions.slice(0, 3);
}

/**
 * Action chips component — renders clickable navigation chips.
 */
const ActionChips: React.FC<{ actions: AssistantAction[] }> = ({ actions }) => {
  const navigate = useNavigate();
  if (actions.length === 0) return null;

  return (
    <div className="ai-action-chips" style={{
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      marginTop: 10,
      paddingTop: 10,
      borderTop: '1px solid #f0f0f0',
    }}>
      {actions.map((action, i) => (
        <Tag
          key={i}
          style={{
            cursor: 'pointer',
            padding: '4px 14px',
            borderRadius: 16,
            fontSize: 13,
            border: '1px solid #52c41a',
            color: '#52c41a',
            background: '#f6ffed',
          }}
          onClick={() => navigate(action.to)}
        >
          {action.label} →
        </Tag>
      ))}
    </div>
  );
};

/**
 * Markdown renderer with clean prose styling.
 */
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="copilot-markdown-content" style={{
      fontSize: 15,
      lineHeight: 1.65,
      color: '#1a1a1a',
    }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 style={{ fontSize: 17, fontWeight: 600, marginTop: 14, marginBottom: 6, color: '#1a1a1a' }}>
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h4 style={{ fontSize: 15, fontWeight: 600, marginTop: 12, marginBottom: 5, color: '#1a1a1a' }}>
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h5 style={{ fontSize: 14, fontWeight: 600, marginTop: 10, marginBottom: 4, color: '#1a1a1a' }}>
              {children}
            </h5>
          ),
          p: ({ children }) => (
            <p style={{ marginBottom: 8, lineHeight: 1.65 }}>{children}</p>
          ),
          ul: ({ children }) => (
            <ul style={{ paddingLeft: 20, margin: '4px 0 8px', lineHeight: 1.65 }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ paddingLeft: 20, margin: '4px 0 8px', lineHeight: 1.65 }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: 3 }}>{children}</li>
          ),
          strong: ({ children }) => (
            <strong style={{ fontWeight: 600 }}>{children}</strong>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code style={{
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: '#f5f5f5',
                border: '1px solid #e8e8e8',
                fontSize: 13,
                fontFamily: 'monospace',
              }}>
                {children}
              </code>
            ) : (
              <pre style={{
                padding: 12,
                borderRadius: 8,
                backgroundColor: '#f5f5f5',
                border: '1px solid #e8e8e8',
                overflow: 'auto',
                fontSize: 13,
              }}>
                <code>{children}</code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

/**
 * Source references — collapsible, minimal.
 */
const SourceLine: React.FC<{ sources: string[]; t: (key: string) => string }> = ({ sources, t }) => {
  const [expanded, setExpanded] = useState(false);
  if (sources.length === 0) return null;

  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{
          marginTop: 6,
          fontSize: 12,
          color: '#8c8c8c',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <RightOutlined style={{ fontSize: 10 }} />
        <span>{t('copilot.source')} ({sources.length})</span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 6, padding: '6px 10px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
      <div
        onClick={() => setExpanded(false)}
        style={{
          fontSize: 12,
          color: '#8c8c8c',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 4,
        }}
      >
        <DownOutlined style={{ fontSize: 10 }} />
        <span>{t('copilot.source')} ({sources.length})</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {sources.map((ref, i) => (
          <Tag key={i} style={{ fontSize: 11, margin: 0 }}>{ref}</Tag>
        ))}
      </div>
    </div>
  );
};

/**
 * Validation notice — collapsible, minimal.
 */
const ValidationNotice: React.FC<{ issues: string[]; blockedReason?: string; t: (key: string) => string }> = ({
  issues,
  blockedReason,
  t,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (blockedReason) {
    return <div style={{ marginTop: 8, fontSize: 13, color: '#ff4d4f', padding: '6px 10px', background: '#fff2f0', borderRadius: 8, border: '1px solid #ffccc7' }}>{blockedReason}</div>;
  }

  if (issues.length === 0) return null;

  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{
          marginTop: 6,
          fontSize: 12,
          color: '#8c8c8c',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <InfoCircleOutlined style={{ fontSize: 12 }} />
        <span>{t('copilot.qualityHint.title')} ({issues.length})</span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 6, padding: '6px 10px', background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f' }}>
      <div
        onClick={() => setExpanded(false)}
        style={{
          fontSize: 12,
          color: '#8c8c8c',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 4,
        }}
      >
        <WarningOutlined style={{ color: '#faad14', fontSize: 12 }} />
        <span>{t('copilot.qualityHint.title')} ({issues.length})</span>
      </div>
      {issues.map((issue, i) => (
        <div key={i} style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 2, paddingLeft: 4 }}>
          · {issue}
        </div>
      ))}
    </div>
  );
};

// ============================================================
// Artifact container (v1.58.2)
// ============================================================

type AssistantArtifact =
  | { type: 'kpi'; data: Record<string, string | number> }
  | { type: 'line-chart'; title: string }
  | { type: 'bar-chart'; title: string }
  | { type: 'table'; title: string };

/**
 * ArtifactContainer — reserved container for future chart/table artifacts.
 * Currently renders a collapsible section for when artifacts are present.
 * Default collapsed unless there's a clear reason to expand.
 */
const ArtifactContainer: React.FC<{ artifacts: AssistantArtifact[] }> = ({ artifacts }) => {
  const [expanded, setExpanded] = useState(false);
  if (artifacts.length === 0) return null;

  return (
    <div className="ai-artifact-container" style={{ marginTop: 10 }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          fontSize: 13,
          color: '#1677ff',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {expanded ? <DownOutlined style={{ fontSize: 10 }} /> : <RightOutlined style={{ fontSize: 10 }} />}
        <span>{expanded ? '收起圖表分析' : '查看圖表分析'}</span>
      </div>
      {expanded && (
        <div style={{
          marginTop: 8,
          padding: 16,
          background: '#fafafa',
          borderRadius: 8,
          border: '1px solid #f0f0f0',
          minHeight: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8c8c8c',
          fontSize: 13,
        }}>
          圖表容器 — 待後續版本實現
        </div>
      )}
    </div>
  );
};

// ============================================================
// Main CopilotMessage Component
// ============================================================

const CopilotMessage: React.FC<Props> = ({ result }) => {
  const { t, lang } = useI18n();
  const isAiResponse = result.toolName === 'DeepSeek AI' || result.toolName === 'unknown';
  const hasBlocked = result.confidence === 'blocked';

  // Extract action chips from summary
  const actions = extractActions(result.summary, lang);

  // Reserved artifact container (empty for now)
  const artifacts: AssistantArtifact[] = [];

  return (
    <div className="ai-message-content" style={{ marginBottom: 4 }}>
      {/* Blocked status */}
      {hasBlocked && (
        <div style={{ marginBottom: 6 }}>
          <Tag color="red" style={{ borderRadius: 4, fontSize: 12 }}>
            {t('copilot.status.blocked')}
          </Tag>
        </div>
      )}

      {/* Main content */}
      {isAiResponse ? (
        <MarkdownRenderer content={result.summary} />
      ) : (
        <div style={{ fontSize: 15, lineHeight: 1.65, color: '#1a1a1a' }}>
          {result.summary}
        </div>
      )}

      {/* Validation / blocked notice */}
      <ValidationNotice
        issues={result.validationIssues ?? []}
        blockedReason={result.blockedReason}
        t={t}
      />

      {/* Source references */}
      {!hasBlocked && result.sourceReferences.length > 0 && (
        <SourceLine sources={result.sourceReferences} t={t} />
      )}

      {/* Caveats */}
      {result.caveats.length > 0 && !hasBlocked && (
        <div style={{ marginTop: 6 }}>
          {result.caveats.map((caveat, i) => (
            <Text key={i} type="secondary" style={{ fontSize: 12, display: 'block' }}>
              · {caveat}
            </Text>
          ))}
        </div>
      )}

      {/* Action chips */}
      {!hasBlocked && <ActionChips actions={actions} />}

      {/* Artifact container */}
      {!hasBlocked && <ArtifactContainer artifacts={artifacts} />}
    </div>
  );
};

export default CopilotMessage;
